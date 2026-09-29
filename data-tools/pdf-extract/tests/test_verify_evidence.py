import copy
import json
import tempfile
import unittest
from pathlib import Path

import pymupdf

from pdf_extract.extraction import extract_page
from pdf_extract.verify_evidence import verify_evidence


class SupplementalEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.pdf = Path(self.temp.name) / "synthetic.pdf"
        with pymupdf.open() as document:
            for text in ("Synthetic rule: three rounds", "Synthetic rule: five rounds"):
                page = document.new_page()
                page.insert_text((72, 72), text)
            document.save(self.pdf)
        with pymupdf.open(self.pdf) as document:
            page = extract_page(document[0], {})
        self.evidence = {
            "schema": 1,
            "pages": [{"sourceId": "fixture", "pageIndex": 0, "pageCount": 2,
                       **{key: page[key] for key in ("extractor", "options", "geometry")},
                       "spans": [{"block": 0, "line": 0, "span": 0,
                                  "value": page["blocks"][0]["lines"][0]["spans"][0]}]}],
            "bindings": [{"sourceKey": "synthetic:1", "targetId": 7,
                          "field": "descriptionHtml", "status": "accepted",
                          "effectiveText": "<pre>三轮</pre>", "reason": "Complete synthetic review",
                          "visualReview": "Synthetic page inspected",
                          "pages": [{"sourceId": "fixture", "pageIndex": 0,
                                     "spanRefs": [[0, 0, 0]]}]}],
        }
        self.decisions = [{"sourceKey": "synthetic:1", "targetId": 7,
                           "input": {"baselineBody": "原有正文"},
                           "fields": {"descriptionHtml": {"status": "accepted",
                                      "replacementText": "<pre>三轮</pre>"}}}]
        self.evidence = json.loads(json.dumps(self.evidence))

    def verify(self, evidence=None, decisions=None):
        return verify_evidence(evidence or self.evidence, decisions or self.decisions,
                               {"fixture": self.pdf})

    def test_re_read_spans_and_bind_effective_text(self):
        self.assertEqual(self.verify(), {"validation": "verified-supplemental-pdf-bindings",
                                        "pages": 1, "spans": 1, "fields": 1})

    def test_changed_text_or_layout_fails(self):
        for field, value in (("text", "Synthetic rule: five rounds"),
                             ("bbox", [0, 0, 100, 100])):
            evidence = copy.deepcopy(self.evidence)
            evidence["pages"][0]["spans"][0]["value"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "changed PDF span"):
                self.verify(evidence)

    def test_wrong_page_engine_or_options_fails(self):
        for field, value in (("pageIndex", 1), ("extractor", {}), ("options", {})):
            evidence = copy.deepcopy(self.evidence)
            evidence["pages"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.verify(evidence)

    def test_stale_effective_text_target_or_status_fails(self):
        for field, value in (("effectiveText", "<pre>五轮</pre>"),
                             ("targetId", 8), ("status", "deferred")):
            evidence = copy.deepcopy(self.evidence)
            evidence["bindings"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.verify(evidence)

    def test_deferred_binds_actual_fallback(self):
        self.decisions[0]["fields"]["descriptionHtml"] = {"status": "deferred"}
        self.evidence["bindings"][0].update(status="deferred", effectiveText="原有正文")
        self.assertEqual(self.verify()["fields"], 1)
        self.evidence["bindings"][0]["effectiveText"] = "未应用的候选正文"
        with self.assertRaisesRegex(ValueError, "stale effective field"):
            self.verify()

    def test_missing_span_binding_or_duplicate_review_fails(self):
        evidence = copy.deepcopy(self.evidence)
        evidence["bindings"][0]["pages"][0]["spanRefs"] = [[0, 1, 0]]
        with self.assertRaisesRegex(ValueError, "unverified bound PDF span"):
            self.verify(evidence)
        with self.assertRaisesRegex(ValueError, "duplicate decision"):
            self.verify(decisions=self.decisions * 2)


if __name__ == "__main__":
    unittest.main()
