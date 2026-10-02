"""Authenticate SC's accepted evidence before fresh supplemental verification.

The fixed input paths and reconstruction come from the accepted #311 handoff.
Generated evidence is comparison-only; it never supplies acceptance authority.
"""
import argparse
import copy
import json
import re
import subprocess
from pathlib import Path

import pymupdf

from .extraction import extract_page
from .verify_evidence import read_jsonl, require, verify_evidence

EFFECTIVE879_REVISION = "da691dacd3973d38a9d0f66a08d78fdb1eaafd47"
UNION_REVISION = "296903c61e20ce359812148fc0faa234ca2508e7"
CURRENT_REVISION = "6a73f4d64682325c67e2c40595008344fb5c3be5"


def read_accepted_json(data_root: Path, revision: str, relative_path: str):
    """Use the existing Git snapshot/direct comparison mechanism, without hashes.

    Current files must exist and match the explicitly accepted commit. JSON
    checkout CRLF/LF normalization is the only permitted byte difference.
    Derive from committed bytes, rather than from a caller's generated output.
    """
    require(re.fullmatch(r"[0-9a-f]{40}", revision) is not None, "require exact accepted revision")
    committed = subprocess.check_output(
        ["git", "-C", str(data_root), "show", f"{revision}:{relative_path}"])
    current = (data_root / relative_path).read_bytes()
    require(current.replace(b"\r\n", b"\n") == committed.replace(b"\r\n", b"\n"),
            f"changed accepted source input {relative_path}")
    text = committed.decode("utf8")
    return [json.loads(line) for line in text.splitlines() if line.strip()] if relative_path.endswith(".jsonl") else json.loads(text)


def derive_sc_evidence(native: list[dict], independent: list[dict], documents: list[dict]) -> dict:
    """Preserve the accepted native binding and each independent original review.

    This is #311's existing page/span union and visual-binding reconstruction.
    In particular, native pages/reason/visualReview come from the original
    accepted supplemental evidence, not from current replacement text alone.
    """
    pages = {}
    saved_bindings = []
    for evidence in documents:
        saved_bindings.extend(evidence["bindings"])
        for page in evidence["pages"]:
            key = (page["sourceId"], page["pageIndex"])
            metadata = {k: copy.deepcopy(v) for k, v in page.items() if k != "spans"}
            if key not in pages:
                pages[key] = {**metadata, "spans": {}}
            else:
                require(metadata == {k: v for k, v in pages[key].items() if k != "spans"},
                        f"conflicting accepted PDF metadata {key}")
            for span in page["spans"]:
                ref = (span["block"], span["line"], span["span"])
                require(ref not in pages[key]["spans"] or pages[key]["spans"][ref] == span,
                        f"conflicting accepted PDF span {key} {ref}")
                pages[key]["spans"][ref] = copy.deepcopy(span)
    native_keys = {(r["targetId"], field, r["sourceKey"]) for r in native
                   for field in ("name", "descriptionHtml") if field in r}
    bindings = [copy.deepcopy(b) for b in documents[0]["bindings"]
                if b["status"] == "accepted" and (b["targetId"], b["field"], b["sourceKey"]) in native_keys]
    require(len(bindings) == len(native_keys) and
            {(b["targetId"], b["field"], b["sourceKey"]) for b in bindings} == native_keys,
            "accepted native PDF binding coverage mismatch")
    for row in independent:
        matching = [b for b in saved_bindings if b["sourceKey"] is None
                    and b["targetId"] == row["targetId"] and b["field"] == row["field"]
                    and b["status"] == row["status"] and b["effectiveText"] == row["after"]
                    and b["pages"] == row["sourcePages"]]
        visual = row.get("visualEvidence") or (matching[-1]["visualReview"] if matching else None)
        require(bool(visual), f"missing accepted independent visual review {row['targetId']}:{row['field']}")
        bindings.append({"sourceKey": None, "targetId": row["targetId"], "field": row["field"],
                         "status": row["status"], "effectiveText": row["after"], "reason": row["reason"],
                         "visualReview": visual if isinstance(visual, str) else json.dumps(visual, ensure_ascii=False),
                         "pages": copy.deepcopy(row["sourcePages"])})
    return {"schema": 1, "pages": [{**p, "spans": list(p["spans"].values())} for p in pages.values()],
            "bindings": bindings}


def load_accepted_sc_sources(data_root: Path, revision: str) -> tuple[dict, dict, int]:
    require(revision == EFFECTIVE879_REVISION, "unsupported exact accepted SC baseline")
    book = "dice-qa/books/86/"
    paths = [book + "issue-259/fresh-qa/supplemental-pdf-evidence.json"] + [
        book + f"issue-{issue}/pdf-evidence.json" for issue in (265, 268, 272, 274, 276, 278, 280, 282, 284, 286, 290, 292)] + [
        book + f"issue-{issue}/batch-{batch:02}/pdf-evidence.json" for issue, batch in ((294, 1), (303, 2), (305, 3), (307, 4))]
    documents = [read_accepted_json(data_root, revision, path) for path in paths]
    native = read_accepted_json(data_root, revision, book + "issue-311/batch-06/native-accepted.jsonl")
    independent = read_accepted_json(data_root, revision, book + "issue-311/batch-06/independent-accepted.jsonl")
    authority = read_accepted_json(data_root, revision, book + "issue-259/source-authority.json")
    return derive_sc_evidence(native, independent, documents), authority, len(paths) + 3


def amend_sc_evidence(union: dict, amendments: list[dict], document: dict) -> dict:
    """Bind the active amendment review separately; preserve the original union.

    A null review source key identifies the amendment evidence, not a change in
    original native ownership. The projection carries that original ledger row.
    """
    keys = {(row["targetId"], "descriptionText") for row in amendments}
    require(len(keys) == len(amendments), "duplicate accepted amendment")
    require(len(document["bindings"]) == len(keys), "incomplete accepted amendment bindings")
    for row in amendments:
        review = row["review"]
        matching = [binding for binding in document["bindings"]
                    if binding["targetId"] == row["targetId"] and binding["field"] == row["field"]]
        require(len(matching) == 1, "missing or duplicate accepted amendment binding")
        binding = matching[0]
        require(binding["sourceKey"] is None and binding["effectiveText"] == review["after"]
                and binding["status"] == review["status"] and binding["pages"] == review["sourcePages"]
                and binding["reason"] == review["reason"], "stale accepted amendment evidence")
    # Reuse the existing conflict-checked page/span merge. No amended value is
    # routed through the ordinary independent overlap validator.
    pages = derive_sc_evidence([], [], [union, document])["pages"]
    retained = [b for b in union["bindings"] if
                (b["targetId"], "descriptionText" if b["field"] == "descriptionHtml" else b["field"]) not in keys]
    require(len(retained) == len(union["bindings"]) - len(keys), "amendment is not an existing accepted body")
    return {"schema": 1, "pages": pages, "bindings": retained + copy.deepcopy(document["bindings"])}


def load_current_sc_sources(data_root: Path) -> tuple[dict, dict, dict, dict, list[dict], int]:
    book = "dice-qa/books/86/"
    paths = [book + "issue-259/fresh-qa/supplemental-pdf-evidence.json"] + [
        book + f"issue-{issue}/pdf-evidence.json" for issue in (265, 268, 272, 274, 276, 278, 280, 282, 284, 286, 290, 292)] + [
        book + f"issue-{issue}/batch-{batch:02}/pdf-evidence.json" for issue, batch in
        ((294, 1), (303, 2), (305, 3), (307, 4), (309, 5), (311, 6))] + [
        book + f"issue-{issue}/pdf-evidence.json" for issue in (321, 324, 326, 329)]
    documents = [read_accepted_json(data_root, UNION_REVISION, path) for path in paths]
    native_path = book + "issue-329/native-accepted.jsonl"
    independent_path = book + "issue-329/independent-proposed-union.jsonl"
    native = read_accepted_json(data_root, UNION_REVISION, native_path)
    independent = read_accepted_json(data_root, UNION_REVISION, independent_path)
    union = derive_sc_evidence(native, independent, documents)
    amendments = read_accepted_json(data_root, CURRENT_REVISION, book + "issue-335/validated-amendments.jsonl")
    require([a["targetId"] for a in amendments] == [3781, 3942, 3989, 4089, 4306, 4369, 4376, 4600, 4618, 4736],
            "complete accepted amendment set changed")
    for row in amendments:
        prior = row["prior"]
        n = [r for r in native if r["targetId"] == row["targetId"] and "descriptionHtml" in r]
        i = [r for r in independent if r["targetId"] == row["targetId"] and r["field"] == "descriptionText"]
        require(len(n) + len(i) == 1, "missing or overlapping prior accepted body")
        require(prior == {"owner": "native" if n else "independent", "revision": UNION_REVISION,
                          "path": native_path if n else independent_path, "acceptedRow": (n or i)[0]},
                "stale or forged prior accepted amendment owner/row")
    document = read_accepted_json(data_root, CURRENT_REVISION, book + "issue-335/pdf-evidence.json")
    final = amend_sc_evidence(union, amendments, document)
    authority = read_accepted_json(data_root, UNION_REVISION, book + "issue-259/source-authority.json")
    return union, document, final, authority, amendments, len(paths) + 5


def require_accepted_evidence(candidate: dict, accepted: dict) -> None:
    require(candidate == accepted, "generated PDF evidence differs from accepted original bindings/pages/visual claims")


def verify_sc_authority(authority: dict, sources: dict[str, Path]) -> dict:
    """Recheck #259's SC printing and complete official errata page contract."""
    require(set(authority["sources"]) == {"sc", "errata"}, "missing accepted SC/errata authority")
    counts = {}
    for source_id, saved in authority["sources"].items():
        require(source_id in sources, f"missing explicit authority source {source_id}")
        with pymupdf.open(sources[source_id]) as document:
            require(document.is_pdf and not document.needs_pass, f"unreadable authority PDF {source_id}")
            require(document.page_count == saved["pageCount"], f"changed authority page count {source_id}")
            actual = json.loads(json.dumps(extract_page(document[saved["pageIndex"]], {})))
        for field in ("extractor", "options", "geometry"):
            require(actual[field] == saved[field], f"changed authority {field} {source_id}")
        require(bool(saved["spans"]), f"missing accepted authority spans {source_id}")
        for fragment in saved["spans"]:
            b, line, span = fragment["ref"]
            require(actual["blocks"][b]["lines"][line]["spans"][span] == fragment["value"],
                    f"changed authority span {source_id} {fragment['ref']}")
        counts[source_id] = len(saved["spans"])
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--accepted-baseline", required=True)
    parser.add_argument("--decisions", type=Path, required=True)
    parser.add_argument("--amendment-decisions", type=Path)
    parser.add_argument("--evidence", type=Path, help="Optional comparison-only generated evidence")
    parser.add_argument("--source", action="append", required=True, metavar="ID=PDF")
    args = parser.parse_args()
    # Keep diagnostics separate from the machine-readable verification result.
    import sys
    pymupdf.set_messages(stream=sys.stderr)
    data_root = args.data_root.resolve(strict=True)
    current = args.accepted_baseline == CURRENT_REVISION
    if current:
        union, amendment_evidence, evidence, authority, amendments, files = load_current_sc_sources(data_root)
        require(args.amendment_decisions is not None, "missing complete amendment decisions")
        amendment_reviews = read_jsonl(args.amendment_decisions)
        require(amendment_reviews == [row["review"] for row in amendments], "unauthenticated amendment decisions")
    else:
        require(args.amendment_decisions is None, "amendments require explicit current accepted baseline")
        evidence, authority, files = load_accepted_sc_sources(data_root, args.accepted_baseline)
    if args.evidence is not None:
        require_accepted_evidence(json.loads(args.evidence.read_text("utf8")), evidence)
    sources = {}
    for value in args.source:
        source_id, separator, path = value.partition("=")
        require(bool(source_id and separator and path) and source_id not in sources, "require unique --source ID=PDF")
        sources[source_id] = Path(path).resolve(strict=True)
    authority_result = verify_sc_authority(authority, sources)
    decisions = read_jsonl(args.decisions)
    if current:
        # Verify all 1,026 original fields, including the ten superseded values,
        # then verify all ten active amendments and actual pages independently.
        original_result = verify_evidence(union, decisions, sources)
        amendment_result = verify_evidence(amendment_evidence, amendment_reviews, sources)
        keys = {(row["targetId"], row["field"]) for row in amendment_reviews}
        final_decisions = [row for row in decisions if row["sourceKey"] is not None or
                           (row["targetId"], row["field"]) not in keys] + amendment_reviews
        result = verify_evidence(evidence, final_decisions, sources)
        result.update({"acceptedUnionRevision": UNION_REVISION, "originalUnion": original_result,
                       "activeAmendments": amendment_result})
    else:
        result = verify_evidence(evidence, decisions, sources)
    print(json.dumps({**result, "acceptedSourceRevision": args.accepted_baseline,
                      "acceptedSourceInputFiles": files, "authoritySpans": authority_result}))


if __name__ == "__main__":
    main()
