import copy
import json
import os
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

    def test_independent_retained_issue_bindings(self):
        pages = copy.deepcopy(self.evidence["bindings"][0]["pages"])
        quote = self.evidence["pages"][0]["spans"][0]["value"]["text"]
        review = {"sourceKey": None, "targetId": 7, "field": "descriptionText",
                  "status": "accepted-with-source-issues", "after": "三轮。原文疑义备注。",
                  "sourcePages": pages, "retainedSourceIssues": {"issues": [{"statements": [
                      {**pages[0], "sourceQuote": quote}]}]}}
        binding = self.evidence["bindings"][0]
        binding.update(sourceKey=None, field="descriptionText", status=review["status"], effectiveText=review["after"])
        other = {**copy.deepcopy(review), "targetId": 8}
        self.evidence["bindings"].append({**copy.deepcopy(binding), "targetId": 8})
        self.assertEqual(self.verify(decisions=[review, other])["fields"], 2)
        for mutate, pattern in (
            (lambda r: r.update(after="旧证据"), "stale effective"),
            (lambda r: r["sourcePages"][0].update(pageIndex=1), "stale original source pages"),
            (lambda r: r["retainedSourceIssues"]["issues"][0]["statements"][0].update(sourceQuote="unknown rule"), "stale source issue quote"),
            (lambda r: r["retainedSourceIssues"]["issues"][0]["statements"][0].update(sourceId="unknown-old-book"), "unverified source issue span"),
        ):
            changed = copy.deepcopy(review)
            mutate(changed)
            with self.subTest(pattern=pattern), self.assertRaisesRegex(ValueError, pattern):
                self.verify(decisions=[changed, other])


    def test_explicit_comparison_re_reads_both_actual_pdf_sources(self):
        comparison = Path(self.temp.name) / "comparison.pdf"
        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_text((72, 72), "Synthetic comparison: every two levels")
            document.new_page()
            document.save(comparison)
        with pymupdf.open(comparison) as document:
            page = json.loads(json.dumps(extract_page(document[0], {})))
        self.evidence["pages"].append({"sourceId": "comparison", "pageIndex": 0, "pageCount": 2,
            **{key: page[key] for key in ("extractor", "options", "geometry")},
            "spans": [{"block": 0, "line": 0, "span": 0, "value": page["blocks"][0]["lines"][0]["spans"][0]}]})
        pages = [{"sourceId": source, "pageIndex": 0, "printedPage": 1, "spanRefs": [[0, 0, 0]]}
                 for source in ("fixture", "comparison")]
        statements = [{**p, "contentLocation": location, "sourceQuote": saved["spans"][0]["value"]["text"]}
                      for p, location, saved in zip(pages, ("body", "note"), self.evidence["pages"])]
        review = {"sourceKey": None, "targetId": 7, "field": "descriptionText",
            "status": "accepted-with-source-issues", "after": "原述。对照备注。", "sourcePages": pages,
            "retainedSourceIssues": {"sourceId": "fixture", "comparisonSourceIds": ["comparison"],
                                     "issues": [{"statements": statements}]}}
        self.evidence["bindings"][0].update(sourceKey=None, field=review["field"], status=review["status"],
                                         effectiveText=review["after"], pages=pages)
        sources = {"fixture": self.pdf, "comparison": comparison}
        self.assertEqual(verify_evidence(self.evidence, [review], sources)["pages"], 2)
        for mutate, pattern in (
            (lambda r: r["retainedSourceIssues"]["issues"][0]["statements"][1].update(sourceQuote="stale quote"), "stale source issue quote"),
            (lambda r: r["retainedSourceIssues"]["issues"][0]["statements"][1].update(sourceId="fixture"), "stale source issue quote"),
            (lambda r: r["retainedSourceIssues"]["issues"][0]["statements"][1].update(spanRefs=[[9, 0, 0]]), "unverified source issue span"),
            (lambda r: r.update(after="stale comparison note"), "stale effective field"),
        ):
            changed = copy.deepcopy(review); mutate(changed)
            with self.subTest(pattern=pattern), self.assertRaisesRegex(ValueError, pattern):
                verify_evidence(self.evidence, [changed], sources)
        with self.assertRaisesRegex(ValueError, "missing explicit PDF source"):
            verify_evidence(self.evidence, [review], {"fixture": self.pdf})
        with self.assertRaisesRegex(ValueError, "same physical PDF"):
            verify_evidence(self.evidence, [review], {"fixture": self.pdf, "comparison": self.pdf})

        # Distinct, equally long wrong PDF: span verification still rejects it.
        wrong = Path(self.temp.name) / "wrong.pdf"
        with pymupdf.open() as document:
            document.new_page().insert_text((72, 72), "Synthetic unrelated rule")
            document.new_page()
            document.save(wrong)
        with self.assertRaisesRegex(ValueError, "changed PDF span"):
            verify_evidence(self.evidence, [review], {"fixture": self.pdf, "comparison": wrong})

        # Both source IDs now claim exactly the same real page, span and quote.
        # Text/geometry/page-count checks would all pass without file identity.
        aliased = copy.deepcopy(self.evidence["pages"][0])
        aliased["sourceId"] = "comparison"
        self.evidence["pages"][1] = aliased
        statements[1]["sourceQuote"] = statements[0]["sourceQuote"]
        nested = Path(self.temp.name) / "nested"
        nested.mkdir()
        hardlink = Path(self.temp.name) / "hardlink.pdf"
        os.link(self.pdf, hardlink)
        for alias in (self.pdf, nested / ".." / self.pdf.name, hardlink):
            with self.subTest(alias=alias), self.assertRaisesRegex(ValueError, "same physical PDF"):
                verify_evidence(self.evidence, [review], {"fixture": self.pdf, "comparison": alias})

        # Old records without a comparison declaration keep their previous path.
        legacy = copy.deepcopy(review)
        del legacy["retainedSourceIssues"]["comparisonSourceIds"]
        legacy["retainedSourceIssues"]["issues"][0]["statements"] = [legacy["retainedSourceIssues"]["issues"][0]["statements"][0]]
        self.assertEqual(verify_evidence(self.evidence, [legacy],
                                        {"fixture": self.pdf, "comparison": self.pdf})["pages"], 2)

        # Aliases between two comparison IDs also fail, even when the primary
        # PDF is a distinct file and every saved quote matches actual spans.
        sources["other-comparison"] = comparison
        third_page = {**copy.deepcopy(pages[1]), "sourceId": "other-comparison"}
        pages.append(third_page)
        review["retainedSourceIssues"]["comparisonSourceIds"].append("other-comparison")
        statements[1]["sourceQuote"] = page["blocks"][0]["lines"][0]["spans"][0]["text"]
        statements.append({**third_page, "sourceQuote": statements[1]["sourceQuote"]})
        self.evidence["pages"][1] = {**aliased, "spans": [{"block": 0, "line": 0, "span": 0,
                                                       "value": page["blocks"][0]["lines"][0]["spans"][0]}]}
        self.evidence["pages"].append({**copy.deepcopy(self.evidence["pages"][1]), "sourceId": "other-comparison"})
        with self.assertRaisesRegex(ValueError, "comparison, other-comparison"):
            verify_evidence(self.evidence, [review], sources)


if __name__ == "__main__":
    unittest.main()
