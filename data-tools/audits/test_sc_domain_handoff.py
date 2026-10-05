import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from sc_domain_handoff import compose


def fixture():
    owner = {"sourceName": "Fixture", "ownerName": "Fixture", "ownerLegacyId": 99,
             "nameZh": "测试", "sharedRulesKey": None, "entryIds": ["sc-entry"]}
    inputs = {"powers": {"rulebookId": 86, "language": "zh", "domains": [owner]},
              "inventory": {"occurrences": []}, "summaries": [], "tuples": [],
              "markers": {"occurrences": [], "machine": []},
              "snapshot": {"readOnly": True, "queryOnly": True, "before": {"size": 1},
                           "after": {"size": 1}, "spells": [], "names": [], "entries": []}}
    decisions = {"reviewStatus": "source-reviewed-proposal-awaiting-main-gate", "occurrences": [], "footnotes": {}}
    for level in range(1, 10):
        book = 86 if level == 1 else 6
        title = "Geas/Quest" if level == 2 else f"Fixture {level}"
        key = f"book:86:p270:b1:l{level}"
        row = {"sourceKey": key, "owner": "Fixture", "level": level, "printedName": title,
               "summaryText": "Synthetic source.", "scope": "sc-body" if book == 86 else "outside-sc-body",
               "daggerPrinted": level == 8, "scSpellIds": ["spell:1"] if book == 86 else []}
        inputs["inventory"]["occurrences"].append(row)
        inputs["snapshot"]["spells"].append({"id": f"spell:{level}", "legacySpellId": level,
                                             "canonicalName": title, "sourceRulebookId": book})
        inputs["snapshot"]["names"].append({"spellId": level, "lang": "zh", "variant": "chm", "name": f"法术{level}"})
        inputs["summaries"].append({"spellId": level, "rulebookId": book, "lang": "zh", "variant": "chm",
                                    "summaryText": "合成摘要。", "reviewStatus": "accepted",
                                    "sourceKey": f"synthetic:{level}", "sourceKind": "synthetic"})
        rel_ids = ["sc-entry"] if level == 1 else []
        if rel_ids:
            inputs["snapshot"]["entries"].append({"id": "sc-entry", "spellId": "spell:1", "ownerLegacyId": 99,
                                                   "level": 1, "rulebookId": 86, "reviewStatus": "accepted"})
            inputs["tuples"].append({"entry": {"id": "sc-entry"}, "sourceKeys": [key]})
        decisions["occurrences"].append({"sourceKey": key, "ownerLegacyId": 99, "level": level,
                                         "identityMethod": "explicit", "identityReason": "Synthetic reviewed identity.",
                                         "bindings": [{"spellLegacyId": level, "sourceRulebookId": book,
                                                       "nameVariant": "chm", "summaryVariant": "chm",
                                                       "relationshipEntryIds": rel_ids,
                                                       "relationshipDisposition": "existing-accepted" if rel_ids else "source-bound-handoff-only"}],
                                         "summaryOverride": None, "readerNotes": []})
        inputs["markers"]["occurrences"].append({"sourceKey": key, "status": "out-of-scope",
                                                 "evidence": {"id": key + ":s0", "markers": "MF" if level == 2 else ""}})
    return inputs, decisions


class DomainHandoffTests(unittest.TestCase):
    def test_dagger_uses_bound_book_and_links_use_correct_destination(self):
        inputs, decisions = fixture()
        rows = compose(inputs, decisions)["domains"][0]["occurrences"]
        self.assertFalse(rows[0]["sourceEvidence"]["daggerPrinted"])
        self.assertTrue(rows[0]["bindings"][0]["daggerDisplay"])
        self.assertEqual(rows[0]["bindings"][0]["link"], {"kind": "local", "href": "F.html#spell-1"})
        self.assertTrue(rows[7]["sourceEvidence"]["daggerPrinted"])
        self.assertFalse(rows[7]["bindings"][0]["daggerDisplay"])
        self.assertEqual(rows[7]["bindings"][0]["link"]["href"], "https://www.d20spellcodex.com/spells/8")
        self.assertEqual(rows[1]["printedMarkers"], "MF")
        self.assertEqual(len(rows[1]["bindings"]), 1)  # Slash in canonical name is not an alternative.

    def test_unknown_markers_are_independent_of_corrected_dagger(self):
        inputs, decisions = fixture()
        inputs["markers"]["occurrences"][1]["status"] = "unknown"
        rows = compose(inputs, decisions)["domains"][0]["occurrences"]
        self.assertIsNone(rows[0]["printedMarkers"])
        self.assertTrue(rows[0]["bindings"][0]["daggerDisplay"])
        self.assertIsNone(rows[1]["printedMarkers"])

    def test_existing_machine_marker_must_bind_this_source_occurrence(self):
        inputs, decisions = fixture()
        record = {"listEntryId": "sc-entry", "sourceKey": "book:86:p270:b1:l1:s0", "rulebookId": 86, "markers": "X"}
        inputs["markers"]["machine"] = [{"record": record}]
        self.assertEqual(compose(inputs, decisions)["domains"][0]["occurrences"][0]["printedMarkers"], "X")
        record["sourceKey"] = "different:s0"
        with self.assertRaisesRegex(ValueError, "Marker occurrence"):
            compose(inputs, decisions)

    def test_alternatives_keep_one_occurrence_and_separate_effects(self):
        inputs, decisions = fixture()
        row = inputs["inventory"]["occurrences"][2]
        row["printedName"] = "Fixture 3/Fixture 4*"
        row["listFootnotes"] = [{"text": "*Synthetic restriction.", "locator": {"pageIndex": 270}}]
        decisions["footnotes"]["Fixture"] = [{"symbol": "*", "text": "合成限定。", "sourceText": "*Synthetic restriction.", "sourceLocator": {"pageIndex": 270}}]
        decisions["occurrences"][2]["bindings"].append(copy.deepcopy(decisions["occurrences"][3]["bindings"][0]))
        rows = compose(inputs, decisions)["domains"][0]["occurrences"]
        self.assertEqual(len(rows), 9)
        self.assertEqual([b["spellLegacyId"] for b in rows[2]["bindings"]], [3, 4])
        self.assertEqual(rows[2]["summaryText"], "法术3：合成摘要；法术4：合成摘要。")
        self.assertEqual(rows[2]["footnoteSymbols"], ["*"])
        self.assertEqual(rows[2]["alternativePolicy"], "alignment")

    def test_planar_rows_have_two_choices_per_level(self):
        inputs, decisions = fixture()
        inputs["powers"]["domains"][0]["sharedRulesKey"] = "planar"
        with self.assertRaisesRegex(ValueError, "Incomplete levels"):
            compose(inputs, decisions)
        for row, decision, marker in zip(copy.deepcopy(inputs["inventory"]["occurrences"]),
                                         copy.deepcopy(decisions["occurrences"]),
                                         copy.deepcopy(inputs["markers"]["occurrences"])):
            row["sourceKey"] += "-second"
            decision["sourceKey"] = row["sourceKey"]
            marker["sourceKey"] = row["sourceKey"]
            marker["evidence"]["id"] = row["sourceKey"] + ":s0"
            inputs["inventory"]["occurrences"].append(row)
            decisions["occurrences"].append(decision)
            inputs["markers"]["occurrences"].append(marker)
            if row["level"] == 1:
                inputs["tuples"][0]["sourceKeys"].append(row["sourceKey"])
        result = compose(inputs, decisions)["domains"][0]
        self.assertEqual(len(result["occurrences"]), 18)
        self.assertEqual(result["occurrences"][0]["choiceGroup"], result["occurrences"][9]["choiceGroup"])
        self.assertEqual(result["levelChoiceCount"], 1)

    def test_duplicate_missing_or_extra_rows_are_rejected(self):
        for kind in ["duplicate", "missing", "extra"]:
            inputs, decisions = fixture()
            if kind == "duplicate":
                decisions["occurrences"].append(decisions["occurrences"][0])
            elif kind == "missing":
                decisions["occurrences"].pop()
            else:
                decisions["occurrences"].append({"sourceKey": "not-in-source"})
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                compose(inputs, decisions)

    def test_unaccepted_wrong_edition_or_empty_summary_is_rejected(self):
        for field, value in [("reviewStatus", "candidate"), ("rulebookId", 19), ("summaryText", " ")]:
            inputs, decisions = fixture()
            inputs["summaries"][1][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "Missing accepted Chinese summary"):
                compose(inputs, decisions)

    def test_translated_gap_cannot_overwrite_verified_summary(self):
        inputs, decisions = fixture()
        decisions["occurrences"][1]["summaryOverride"] = {"text": "新增译文。", "reason": "Synthetic gap."}
        with self.assertRaisesRegex(ValueError, "replace an existing"):
            compose(inputs, decisions)
        inputs["summaries"].pop(1)
        self.assertEqual(compose(inputs, decisions)["coverage"]["newSummaryOccurrences"], 1)

    def test_identity_owner_and_fixed_tuple_drift_is_rejected(self):
        changes = [lambda i, d: d["occurrences"][0].update(ownerLegacyId=55),
                   lambda i, d: i["snapshot"]["spells"][0].update(sourceRulebookId=6),
                   lambda i, d: i["snapshot"]["spells"][1].update(canonicalName="Other"),
                   lambda i, d: i["tuples"][0].update(sourceKeys=[])]
        for change in changes:
            inputs, decisions = fixture()
            change(inputs, decisions)
            with self.assertRaises(ValueError):
                compose(inputs, decisions)

    def test_footnotes_and_readonly_metadata_cannot_drift(self):
        inputs, decisions = fixture()
        inputs["inventory"]["occurrences"][1]["summaryText"] += "*"
        with self.assertRaisesRegex(ValueError, "Unbound source footnote"):
            compose(inputs, decisions)
        inputs, decisions = fixture()
        inputs["snapshot"]["after"]["size"] = 2
        with self.assertRaisesRegex(ValueError, "read-only database"):
            compose(inputs, decisions)

    def test_cli_works_outside_checkout_and_refuses_overwrite(self):
        inputs, decisions = fixture()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name, value in [("input", inputs), ("decisions", decisions)]:
                (root / (name + ".json")).write_text(json.dumps(value), encoding="utf-8")
            command = [sys.executable, "-B", str(Path(__file__).with_name("sc_domain_handoff.py")),
                       "--input", str(root / "input.json"), "--decisions", str(root / "decisions.json"),
                       "--output", str(root / "output.json")]
            result = subprocess.run(command, cwd=root, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            original = (root / "output.json").read_bytes()
            self.assertNotEqual(subprocess.run(command, cwd=root, capture_output=True).returncode, 0)
            self.assertEqual((root / "output.json").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
