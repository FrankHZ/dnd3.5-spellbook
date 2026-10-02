"""Portable checks for the evidence audit's material failure boundaries."""
import copy
import json
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest

import sc_coverage as audit


class CoverageTests(unittest.TestCase):
    def test_current_name_change_cannot_reuse_source_correct_status(self):
        prior = ({'chinese': {'name': {'status': 'source-correct'}, 'effectiveName': 'reviewed'}}, 'review:1')
        current = {'chinese': {'name': 'changed'}}
        result = audit.name_coverage(1, current, prior, {})
        self.assertEqual(result['status'], 'changed-since-name-review')
        current['chinese']['name'] = 'reviewed'
        self.assertEqual(audit.name_coverage(1, current, prior, {})['status'], 'reviewed-retention')

    def test_missing_translation_and_identity_never_gain_retention_pass(self):
        current = {'chinese': {'name': None}}
        for tid in audit.MISSING:
            self.assertEqual(audit.name_coverage(tid, current, None, {})['status'], 'missing-Chinese')
        self.assertEqual(audit.name_coverage(4837, current, None, {})['status'], 'identity-outside-SC')
        prior = ({'chinese': {'name': {'status': 'unresolved'}, 'effectiveName': 'same'}}, 'review:2')
        self.assertEqual(audit.name_coverage(3935, {'chinese': {'name': 'same'}}, prior, {})['status'], 'unresolved-terminology')

    def test_complete_review_applies_html_and_nested_mechanics_without_mutating_evidence(self):
        row = {'inputBinding': {'english': {'name': 'A', 'description': 'old', 'mechanics': {
            'components': {'material': 0}, 'classLevels': [[2, 3, ''], [1, 3, '']], 'domainLevels': []}},
            'englishHtml': '<p>old</p>'},
            'english': {'edits': [{'field': 'description', 'new': 'new'}, {'field': 'descriptionHtml', 'new': '<p>new</p>'}]},
            'mechanics': {'edits': [{'field': 'components.material', 'new': 1}, {'field': 'page', 'new': 7}]}}
        frozen = copy.deepcopy(row)
        en, html = audit.reviewed_english(row)
        self.assertEqual(en['description'], 'new')
        self.assertEqual(html, '<p>new</p>')
        self.assertEqual(en['mechanics']['components']['material'], 1)
        self.assertEqual(en['mechanics']['classLevels'], [[1, 3, ''], [2, 3, '']])
        self.assertEqual(row, frozen)

    def test_html_text_parity_rejects_extra_operative_content(self):
        self.assertTrue(audit.html_text_matches('<p>A &amp; B</p>\n<p>2</p>', 'A & B\n2'))
        self.assertFalse(audit.html_text_matches('<p>A &amp; B</p><p>2 additional rule</p>', 'A & B\n2'))

    def test_exact_summary_slices_preserve_all_fields_without_overlap(self):
        fields = {tid: [f'{tid}:en:synthetic', f'{tid}:zh:synthetic'] for tid in range(103)}
        batches = audit.slices(fields, {tid: {'page': 103 - tid} for tid in fields})
        self.assertEqual([len(b['fields']) for b in batches], [50, 50, 3])
        merged = {int(k): v for b in batches for k, v in b['fields'].items()}
        self.assertEqual(merged, fields)
        self.assertEqual(sum(len(b['fields']) for b in batches), len(merged))
        self.assertEqual(next(iter(batches[0]['fields'])), '102')

    def test_git_revision_rejects_mutable_evidence_but_allows_checkout_crlf(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def git(*args):
                return subprocess.check_output(['git', '-C', tmp, *args], encoding='utf8').strip()
            git('init', '-q')
            git('config', 'user.name', 'Synthetic Audit')
            git('config', 'user.email', 'audit@example.invalid')
            git('config', 'core.autocrlf', 'false')
            path = root / 'evidence.json'
            path.write_bytes(b'{"field":"accepted"}\n')
            git('add', 'evidence.json')
            git('commit', '-qm', 'synthetic evidence')
            revision = git('rev-parse', 'HEAD')
            path.write_bytes(b'{"field":"accepted"}\r\n')
            self.assertEqual(audit.Evidence(root, revision).read('evidence.json'), {'field': 'accepted'})
            path.write_bytes(b'{"field":"changed"}\n')
            with self.assertRaisesRegex(ValueError, 'differs from Git'):
                audit.Evidence(root, revision).read('evidence.json')

    def test_sqlite_handle_is_readonly_and_app_state_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'rules-clean.sqlite'
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE synthetic(value TEXT)')
                db.execute("INSERT INTO synthetic VALUES('preserved')")
            db.close()
            with audit.readonly(path) as db:
                self.assertEqual(db.execute('SELECT value FROM synthetic').fetchone()[0], 'preserved')
                with self.assertRaises(sqlite3.OperationalError):
                    db.execute("UPDATE synthetic SET value='forbidden'")
            forbidden = Path(tmp) / 'app-state.sqlite'
            forbidden.touch()
            with self.assertRaisesRegex(ValueError, 'unexpected DB role'):
                audit.readonly(forbidden)


if __name__ == '__main__':
    unittest.main()
