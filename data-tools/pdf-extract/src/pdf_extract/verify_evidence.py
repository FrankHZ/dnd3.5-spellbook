"""Re-read explicit PDF spans and bind supplemental review to current decisions.

This is an additional evidence check, not a replacement for dice QA, source
identity/authority review, or human visual and semantic review.
"""

import argparse
import json
from pathlib import Path

import pymupdf

from .extraction import extract_page


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines()
            if line.strip()]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def verify_evidence(evidence: dict, decisions: list[dict], sources: dict[str, Path]) -> dict:
    """Compare recorded page geometry/spans and exact effective field bindings.

    Source paths are explicitly supplied by the caller, rather than executed or
    trusted from an evidence file. Size/mtime are not used as proof. Every saved
    span (text, bbox, font, origin and flags) is compared with a fresh extraction.
    """
    require(evidence.get("schema") == 1, "unsupported supplemental evidence schema")
    def review_key(row):
        return (row["targetId"], row["field"]) if row["sourceKey"] is None else row["sourceKey"]

    reviews = {review_key(row): row for row in decisions}
    require(len(reviews) == len(decisions), "duplicate decision sourceKey/target/field")
    pages = evidence["pages"]
    require(bool(pages), "missing PDF pages")
    seen_pages = set()
    verified_spans = {}
    verified_text = {}
    span_count = 0
    for saved in pages:
        key = (saved["sourceId"], saved["pageIndex"])
        require(key not in seen_pages, f"duplicate PDF page {key}")
        seen_pages.add(key)
        require(key[0] in sources, f"missing explicit PDF source {key[0]}")
        with pymupdf.open(sources[key[0]]) as document:
            require(document.is_pdf and not document.needs_pass, f"unreadable PDF {key[0]}")
            require(document.page_count == saved["pageCount"], f"changed PDF page count {key[0]}")
            require(0 <= key[1] < document.page_count, f"invalid PDF page {key}")
            # Match the JSONL contract: engine tuples become JSON arrays.
            actual = json.loads(json.dumps(extract_page(document[key[1]], {}), allow_nan=False))
        for field in ("extractor", "options", "geometry"):
            require(actual[field] == saved[field], f"changed PDF {field} {key}")
        require(bool(saved["spans"]), f"missing PDF spans {key}")
        seen_spans = set()
        for fragment in saved["spans"]:
            loc = (fragment["block"], fragment["line"], fragment["span"])
            require(loc not in seen_spans, f"duplicate PDF span {key} {loc}")
            seen_spans.add(loc)
            require(all(isinstance(i, int) and i >= 0 for i in loc), f"invalid PDF span {key} {loc}")
            try:
                span = actual["blocks"][loc[0]]["lines"][loc[1]]["spans"][loc[2]]
            except IndexError as error:
                raise ValueError(f"missing PDF span {key} {loc}") from error
            require(span == fragment["value"], f"changed PDF span {key} {loc}")
            verified_text[(key, loc)] = span["text"]
            span_count += 1
        verified_spans[key] = seen_spans

    seen_bindings = set()
    bindings = evidence["bindings"]
    require(bool(bindings), "missing field bindings")
    for binding in bindings:
        independent = binding["sourceKey"] is None
        decision_key = (binding["targetId"], binding["field"]) if independent else binding["sourceKey"]
        key = (decision_key, binding["field"])
        require(key not in seen_bindings, f"duplicate field binding {key}")
        seen_bindings.add(key)
        review = reviews.get(decision_key)
        require(review is not None and review["targetId"] == binding["targetId"],
                f"stale target/source binding {key}")
        require(key[1] in (("name", "descriptionText") if independent else ("name", "descriptionHtml")),
                f"invalid bound field {key}")
        decision = review if independent else review["fields"][key[1]]
        require(decision["status"] == binding["status"], f"stale field status {key}")
        if decision["status"] == "accepted" or (independent and decision["status"] == "accepted-with-source-issues"):
            effective = decision["after"] if independent else decision["replacementText"]
        else:
            require(decision["status"] == "deferred", f"unsupported evidence disposition {key}")
            effective = review["before"] if independent else review["input"]["baselineName" if key[1] == "name" else "baselineBody"]
        require(effective == binding["effectiveText"], f"stale effective field text {key}")
        require(bool(binding["reason"].strip()) and bool(binding["visualReview"].strip()),
                f"incomplete semantic/visual review {key}")
        require(bool(binding["pages"]), f"missing bound PDF pages {key}")
        if independent:
            require(binding["pages"] == review["sourcePages"], f"stale original source pages {key}")
        for page in binding["pages"]:
            page_key = (page["sourceId"], page["pageIndex"])
            require(page_key in seen_pages,
                    f"unverified bound PDF page {key}")
            require(bool(page["spanRefs"]), f"missing bound PDF spans {key}")
            require(all(tuple(loc) in verified_spans[page_key] for loc in page["spanRefs"]),
                    f"unverified bound PDF span {key}")
        if independent and review.get("retainedSourceIssues"):
            for issue in review["retainedSourceIssues"]["issues"]:
                for statement in issue["statements"]:
                    page_key = (statement["sourceId"], statement["pageIndex"])
                    require(page_key in seen_pages and all(tuple(loc) in verified_spans[page_key]
                            for loc in statement["spanRefs"]), f"unverified source issue span {key}")
                    quote = "\n".join(verified_text[(page_key, tuple(loc))] for loc in statement["spanRefs"])
                    require(statement["sourceQuote"] == quote, f"stale source issue quote {key}")
    return {"validation": "verified-supplemental-pdf-bindings", "pages": len(pages),
            "spans": span_count, "fields": len(bindings)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, required=True)
    parser.add_argument("--source", action="append", required=True, metavar="ID=PDF",
                        help="Explicit read-only PDF source; repeat for multiple sources")
    args = parser.parse_args()
    sources = {}
    for value in args.source:
        source_id, separator, path = value.partition("=")
        require(bool(source_id and separator and path) and source_id not in sources,
                "require unique --source ID=PDF")
        sources[source_id] = Path(path).resolve(strict=True)
    result = verify_evidence(json.loads(args.evidence.read_text(encoding="utf-8-sig")),
                             read_jsonl(args.decisions), sources)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
