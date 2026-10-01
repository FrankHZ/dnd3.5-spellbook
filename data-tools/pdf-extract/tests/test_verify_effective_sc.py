import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

import pymupdf

from pdf_extract.extraction import extract_page
from pdf_extract.verify_evidence import verify_evidence
from pdf_extract.verify_effective_sc import (derive_sc_evidence, read_accepted_json,
                                             require_accepted_evidence, verify_sc_authority)


class AcceptedScSourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sources = {}
        self.authority = {"sources": {}}
        self.pages = []
        for source, texts in (("sc", ("Synthetic printing identity", "Unrelated real page")),
                              ("errata", ("Complete synthetic errata",))):
            path = self.root / f"{source}.pdf"
            with pymupdf.open() as document:
                for text in texts:
                    document.new_page().insert_text((72, 72), text)
                document.save(path)
            self.sources[source] = path
            with pymupdf.open(path) as document:
                for index in range(document.page_count):
                    actual = json.loads(json.dumps(extract_page(document[index], {})))
                    metadata = {k: actual[k] for k in ("extractor", "options", "geometry")}
                    span = actual["blocks"][0]["lines"][0]["spans"][0]
                    self.pages.append({"sourceId": source, "pageIndex": index, "pageCount": document.page_count,
                                       **metadata, "spans": [{"block": 0, "line": 0, "span": 0, "value": span}]})
                    if index == 0:
                        self.authority["sources"][source] = {"pageIndex": index, "pageCount": document.page_count,
                                                            **metadata, "spans": [{"ref": [0, 0, 0], "value": span}]}
        self.native = [{"targetId": 7, "sourceKey": "synthetic:1", "descriptionHtml": "<pre>三轮</pre>"}]
        self.decisions = [{"targetId": 7, "sourceKey": "synthetic:1", "fields": {
            "descriptionHtml": {"status": "accepted", "replacementText": "<pre>三轮</pre>"}}}]
        self.original = {"schema": 1, "pages": self.pages, "bindings": [{
            "targetId": 7, "sourceKey": "synthetic:1", "field": "descriptionHtml", "status": "accepted",
            "effectiveText": "<pre>三轮</pre>", "reason": "Accepted original review", "visualReview": "Accepted page inspected",
            "pages": [{"sourceId": "sc", "pageIndex": 0, "spanRefs": [[0, 0, 0]]}]}]}
        self.accepted = derive_sc_evidence(self.native, [], [self.original])

    def test_original_bindings_and_authority_pass(self):
        require_accepted_evidence(copy.deepcopy(self.accepted), self.accepted)
        self.assertEqual(verify_sc_authority(self.authority, self.sources), {"sc": 1, "errata": 1})
        self.assertEqual(verify_evidence(self.accepted, self.decisions, self.sources)["fields"], 1)

    def test_real_unrelated_span_cannot_replace_native_original_page(self):
        candidate = copy.deepcopy(self.accepted)
        candidate["bindings"][0]["pages"] = [{"sourceId": "sc", "pageIndex": 1, "spanRefs": [[0, 0, 0]]}]
        # Demonstrate the exact old hole: the supplemental verifier alone passes.
        self.assertEqual(verify_evidence(candidate, self.decisions, self.sources)["fields"], 1)
        with self.assertRaisesRegex(ValueError, "accepted original bindings"):
            require_accepted_evidence(candidate, self.accepted)

    def test_visual_or_reason_relabelling_cannot_reauthenticate(self):
        for field in ("visualReview", "reason"):
            candidate = copy.deepcopy(self.accepted)
            candidate["bindings"][0][field] = "Invented synthetic claim"
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "visual claims"):
                require_accepted_evidence(candidate, self.accepted)

    def test_missing_original_native_binding_fails_derivation(self):
        original = copy.deepcopy(self.original)
        original["bindings"] = []
        with self.assertRaisesRegex(ValueError, "coverage mismatch"):
            derive_sc_evidence(self.native, [], [original])

    def test_missing_or_changed_authority_actual_pdf_fails(self):
        for source in ("sc", "errata"):
            with self.subTest(source=source), self.assertRaisesRegex(ValueError, "authority source"):
                verify_sc_authority(self.authority, {k: v for k, v in self.sources.items() if k != source})
        wrong = self.root / "wrong-errata.pdf"
        with pymupdf.open() as document:
            document.new_page().insert_text((72, 72), "Changed synthetic errata")
            document.save(wrong)
        with self.assertRaisesRegex(ValueError, "authority span errata"):
            verify_sc_authority(self.authority, {**self.sources, "errata": wrong})
        incomplete = copy.deepcopy(self.authority)
        del incomplete["sources"]["errata"]
        with self.assertRaisesRegex(ValueError, "SC/errata authority"):
            verify_sc_authority(incomplete, self.sources)

    def test_authority_must_exist_and_match_accepted_git_snapshot(self):
        def git(*args):
            return subprocess.check_output(["git", "-C", str(self.root), *args], text=True).strip()
        git("init", "-q")
        git("config", "user.email", "synthetic@example.invalid")
        git("config", "user.name", "Synthetic fixture")
        git("config", "core.autocrlf", "false")
        path = self.root / "source-authority.json"
        text = json.dumps(self.authority, indent=2) + "\n"
        path.write_text(text, "utf8", newline="\n")
        git("add", "source-authority.json")
        git("commit", "-qm", "Synthetic accepted source fixture")
        revision = git("rev-parse", "HEAD")
        self.assertEqual(read_accepted_json(self.root, revision, path.name), self.authority)
        path.write_bytes(text.replace("\n", "\r\n").encode())
        self.assertEqual(read_accepted_json(self.root, revision, path.name), self.authority)
        changed = copy.deepcopy(self.authority)
        changed["sources"]["errata"]["spans"] = []
        path.write_text(json.dumps(changed), "utf8")
        with self.assertRaisesRegex(ValueError, "changed accepted source input"):
            read_accepted_json(self.root, revision, path.name)
        path.unlink()
        with self.assertRaises(FileNotFoundError):
            read_accepted_json(self.root, revision, path.name)


if __name__ == "__main__":
    unittest.main()
