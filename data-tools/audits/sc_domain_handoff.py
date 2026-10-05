"""Compose domain-list display data from fixed evidence and explicit decisions.

No database, renderer, network, source extraction or acceptance writes. The
caller supplies frozen inputs; the resulting proposal needs main-gate acceptance.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

from sc_domain_lists import name_key


def unique(rows, key, label):
    result = {}
    for row in rows:
        value = key(row)
        if value in result:
            raise ValueError(f"Duplicate {label}: {value}")
        result[value] = row
    return result


def require(condition, message):
    if not condition:
        raise ValueError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def compose(inputs, decisions, complete=True):
    """Keep one output per source occurrence, with ordered spell bindings.

    complete=False is for the representative pilot only. Normal CLI builds
    require all levels and both choices of each supplied planar owner.
    """
    powers = inputs["powers"]
    require(powers["rulebookId"] == 86 and powers["language"] == "zh",
            "Wrong domain owner edition/language")
    owners = unique(powers["domains"], lambda d: d["sourceName"], "source owner")
    unique(owners.values(), lambda d: d["ownerLegacyId"], "stable owner")
    require(all(d["ownerLegacyId"] != 28 for d in owners.values()), "Special feat owner excluded")
    all_rows = unique(inputs["inventory"]["occurrences"], lambda r: r["sourceKey"], "source row")
    rows = [r for r in all_rows.values() if r["owner"] in owners]
    by_owner = {name: [] for name in owners}
    for row in rows:
        by_owner[row["owner"]].append(row)
    selected = unique(decisions["occurrences"], lambda d: d["sourceKey"], "decision")
    require(set(selected) == {r["sourceKey"] for r in rows}, "Decision coverage differs from source rows")
    require(decisions["reviewStatus"] == "source-reviewed-proposal-awaiting-main-gate",
            "Decisions must retain their proposal boundary")

    snapshot = inputs["snapshot"]
    require(snapshot["readOnly"] and snapshot["queryOnly"] and snapshot["before"] == snapshot["after"],
            "Snapshot must record unchanged read-only database metadata")
    spells = unique(snapshot["spells"], lambda s: s["legacySpellId"], "spell")
    names = unique(snapshot["names"], lambda n: (n["spellId"], n["lang"], n["variant"]), "name")
    entries = unique(snapshot["entries"], lambda e: e["id"], "relationship")
    summaries = unique(inputs["summaries"],
                       lambda s: (s["spellId"], s["rulebookId"], s["lang"], s["variant"]), "summary")
    tuples = unique(inputs["tuples"], lambda t: t["entry"]["id"], "SC tuple")
    markers = unique(inputs["markers"]["occurrences"], lambda m: m["sourceKey"], "marker row")
    machine = unique(inputs["markers"]["machine"], lambda m: m["record"]["listEntryId"], "machine marker")
    output_domains = []
    counts = Counter()
    for source_name, owner in owners.items():
        source_rows = by_owner[source_name]
        planar = owner["sharedRulesKey"] == "planar"
        if complete:
            require(Counter(r["level"] for r in source_rows) ==
                    Counter({level: 2 if planar else 1 for level in range(1, 10)}),
                    f"Incomplete levels/planar choices: {source_name}")
        printed_notes = [f for r in source_rows for f in r.get("listFootnotes", [])]
        notes = decisions["footnotes"].get(source_name, [])
        require([(f["text"], f["locator"]) for f in printed_notes] ==
                [(f["sourceText"], f["sourceLocator"]) for f in notes],
                f"Footnote source evidence changed: {source_name}")
        require(all(nonempty(f["text"]) for f in notes), f"Missing Chinese footnote: {source_name}")
        domain_rows = []
        for row in source_rows:
            decision = selected[row["sourceKey"]]
            require(decision["ownerLegacyId"] == owner["ownerLegacyId"] and
                    decision["level"] == row["level"], f"Owner/level drift: {row['sourceKey']}")
            require(nonempty(decision["identityReason"]), "Missing identity decision evidence")
            require(decision["bindings"], "Unbound source occurrence")
            unique(decision["bindings"], lambda b: b["spellLegacyId"], "row binding")
            # Geas/Quest and Blindness/Deafness are single canonical identities.
            # Only explicitly selected multiple bindings split a printed label.
            label_parts = (row["printedName"].split("/") if len(decision["bindings"]) > 1
                           else [row["printedName"]])
            source_labels = [name_key(p.strip().rstrip("*†")) for p in label_parts]
            require(len(source_labels) == len(decision["bindings"]), "Alternative binding count differs")
            bindings = []
            for label, binding in zip(source_labels, decision["bindings"]):
                spell = spells[binding["spellLegacyId"]]
                spell_id, book = spell["legacySpellId"], spell["sourceRulebookId"]
                require(spell["id"] == f"spell:{spell_id}" and book == binding["sourceRulebookId"],
                        "Spell identity/book drift")
                require(name_key(spell["canonicalName"]) == label, "Bound spell differs from complete source label")
                if row["scope"] == "sc-body":
                    require(book == 86 and spell["id"] in row["scSpellIds"], "SC tuple edition drift")
                else:
                    require(row["scope"] == "outside-sc-body" and book != 86, "Outside-SC identity drift")
                name = names[(spell_id, "zh", binding["nameVariant"])]
                require(nonempty(name["name"]), f"Missing Chinese name: {spell_id}")
                rel_ids = binding["relationshipEntryIds"]
                for entry_id in rel_ids:
                    entry = entries[entry_id]
                    require(entry["spellId"] == spell["id"] and entry["ownerLegacyId"] == owner["ownerLegacyId"]
                            and entry["level"] == row["level"] and entry["reviewStatus"] == "accepted",
                            "Relationship binding drift")
                    if book == 86:
                        require(entry_id in owner["entryIds"] and entry["rulebookId"] == 86 and
                                row["sourceKey"] in tuples[entry_id]["sourceKeys"], "Fixed SC source tuple drift")
                require(bool(rel_ids) == (binding["relationshipDisposition"] == "existing-accepted"),
                        "Relationship disposition drift")
                require(rel_ids or binding["relationshipDisposition"] == "source-bound-handoff-only",
                        "Missing source-only relationship disposition")
                require(book != 86 or rel_ids, "SC binding requires its existing fixed tuple")
                summary = summaries.get((spell_id, book, "zh", binding["summaryVariant"]))
                override = decision["summaryOverride"]
                if override is None:
                    require(summary is not None and summary["reviewStatus"] == "accepted" and
                            nonempty(summary["summaryText"]), f"Missing accepted Chinese summary: {spell_id}")
                    summary_text = summary["summaryText"]
                    provenance = {k: summary[k] for k in
                                  ["spellId", "rulebookId", "lang", "variant", "sourceKey", "sourceKind", "reviewStatus"]}
                else:
                    require(summary is None or not nonempty(summary["summaryText"]),
                            "Do not replace an existing verified summary")
                    require(nonempty(override["text"]) and nonempty(override["reason"]), "Missing summary translation")
                    summary_text = override["text"]
                    provenance = {"sourceKey": row["sourceKey"], "sourceKind": "sc-appendix-direct-translation",
                                  "reviewStatus": "proposal", "reason": override["reason"]}
                bindings.append({"spellId": spell["id"], "spellLegacyId": spell_id,
                                 "sourceRulebookId": book, "canonicalName": spell["canonicalName"],
                                 "nameZh": name["name"], "nameVariant": binding["nameVariant"],
                                 "summaryText": summary_text, "summaryProvenance": provenance,
                                 "relationshipEntryIds": rel_ids,
                                 "relationshipDisposition": binding["relationshipDisposition"],
                                 "daggerDisplay": book == 86,
                                 "link": ({"kind": "local", "href": f"{spell['canonicalName'][0].upper()}.html#spell-{spell_id}"}
                                          if book == 86 else {"kind": "online", "href": f"https://www.d20spellcodex.com/spells/{spell_id}"})})
                counts["bindings"] += 1
                counts["sourceOnlyBindings"] += not bool(rel_ids)
            marker = markers[row["sourceKey"]]
            letters = marker["evidence"]["markers"]
            if row["scope"] == "sc-body":
                records = [machine[e]["record"] for b in bindings for e in b["relationshipEntryIds"] if e in machine]
                require(all(m["sourceKey"].rsplit(":s", 1)[0] == row["sourceKey"] and
                            m["rulebookId"] == 86 for m in records), "Marker occurrence binding drift")
                letters = records[0]["markers"] if len(records) == 1 else None
            elif marker["status"] != "out-of-scope":
                letters = None
            require(letters is None or re.fullmatch(r"M?F?X?", letters) is not None, "Invalid printed M/F/X")
            stars = list(dict.fromkeys(re.findall(r"\*+", row["printedName"] + " " + row["summaryText"])))
            require(all(star in {f["symbol"] for f in notes} for star in stars), "Unbound source footnote")
            summary_text = (bindings[0]["summaryText"] if len(bindings) == 1 else
                            "；".join(b["nameZh"] + "：" + b["summaryText"].rstrip("。") for b in bindings) + "。")
            domain_rows.append({"sourceKey": row["sourceKey"], "level": row["level"],
                                "choiceGroup": f"domain:{owner['ownerLegacyId']}:level:{row['level']}" if planar else None,
                                "alternativePolicy": "alignment" if len(bindings) > 1 else None,
                                "bindings": bindings, "summaryText": summary_text,
                                "printedMarkers": letters, "markerStatus": "unknown" if letters is None else "printed",
                                "markerSourceKey": marker["evidence"]["id"],
                                "footnoteSymbols": stars, "readerNotes": decision["readerNotes"],
                                "sourceEvidence": row,
                                "identityMethod": decision["identityMethod"], "identityReason": decision["identityReason"]})
            counts["occurrences"] += 1
            counts["scOccurrences" if row["scope"] == "sc-body" else "nonScOccurrences"] += 1
            counts["unknownMarkers"] += letters is None
            counts["newSummaryOccurrences"] += decision["summaryOverride"] is not None
            counts["daggerPresentationDifferences"] += row["daggerPrinted"] != any(b["daggerDisplay"] for b in bindings)
        output_domains.append({"ownerLegacyId": owner["ownerLegacyId"], "ownerName": owner["ownerName"],
                               "sourceName": source_name, "nameZh": owner["nameZh"],
                               "levelChoiceCount": 1, "planar": planar, "footnotes": notes, "occurrences": domain_rows})
    return {"schemaVersion": 1, "rulebookId": 86, "language": "zh",
            "reviewStatus": "source-reviewed-proposal-awaiting-main-gate", "domains": output_domains,
            "coverage": {"owners": len(owners), **dict(counts)}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ["input", "decisions", "output"]:
        parser.add_argument("--" + option, required=True, type=Path)
    args = parser.parse_args()
    require(all(p.is_absolute() for p in [args.input, args.decisions, args.output]), "Use absolute input/output paths")
    result = compose(json.loads(args.input.read_text(encoding="utf-8-sig")),
                     json.loads(args.decisions.read_text(encoding="utf-8-sig")))
    with args.output.open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["coverage"]))


if __name__ == "__main__":
    main()
