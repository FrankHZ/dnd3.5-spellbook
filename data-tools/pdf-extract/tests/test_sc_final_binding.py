"""Synthetic #365 source-authority and candidate rejection checks."""
import copy
import json
import html
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

AUDITS = Path(__file__).resolve().parents[2] / 'audits'
sys.path.insert(0, str(AUDITS))
import sc_final_binding as final
import sc_final_auth as auth
import sc_prismatic_ray as title
from sc_coverage import Evidence


def synthetic():
    retained = [3855, 4546, 4583, 4726, 4761]
    ids = list(range(1, 997)) + retained
    english = {'name': 'Synthetic', 'description': 'Protected source body', 'rulebookId': 86,
               'mechanics': {'classLevels': [], 'domainLevels': []}}
    pages = [{'sourceId': 'sc', 'pageIndex': 0, 'printedPage': 1, 'spanRefs': [[0, 0, 0]]}]
    derived = {'inputs': [], 'output': [], 'native': [], 'independent': [], 'rebound': [],
               'additions': [], 'amendments': [], 'replacement': []}
    reviews = {}
    for tid in ids:
        zh = {'name': '保留名称', 'descriptionText': '保留正文', 'descriptionHtml': '<p>保留正文</p>'}
        derived['inputs'].append({'targetId': tid, 'english': copy.deepcopy(english),
                                  'englishHtml': '<p>Protected source body</p>', 'chinese': zh})
        name = {'text': '修改名称' if tid <= 53 else zh['name'],
                'origin': {'kind': 'native', 'sourceKey': 'synthetic:' + str(tid)} if tid <= 53
                          else {'kind': 'chm', 'sourceKey': 'chm:' + str(tid)}}
        body = {'text': '修改正文', 'html': '<pre>修改正文</pre>',
                'origin': {'kind': 'native', 'sourceKey': 'synthetic:' + str(tid)}} if tid not in retained else {
                    'text': zh['descriptionText'], 'html': zh['descriptionHtml'],
                    'origin': {'kind': 'chm', 'sourceKey': 'chm:' + str(tid)}}
        derived['output'].append({'targetId': tid, 'rulebookId': 86, 'name': name, 'body': body})
        if tid <= 53 or tid not in retained:
            derived['native'].append({'targetId': tid, 'rulebookId': 86, 'sourceKey': 'synthetic:' + str(tid),
                **({'name': name['text']} if tid <= 53 else {}),
                **({'descriptionHtml': body['html']} if tid not in retained else {})})
        reviews[tid] = ({'english': {'status': 'source-correct', 'edits': []}, 'mechanics': {'edits': []},
            'inputBinding': {'english': copy.deepcopy(english), 'englishHtml': '<p>Protected source body</p>',
                             'fallbackZhBody': zh['descriptionText'], 'effectiveZhHtml': None},
            'chinese': {'name': {'status': 'source-correct'}, 'body': {'status': 'source-correct'},
                        'effectiveName': zh['name'], 'effectiveBodyText': zh['descriptionText']},
            'sourcePages': copy.deepcopy(pages)}, 'synthetic-original.jsonl:' + str(tid))
    return derived, reviews


class FinalBindingTests(unittest.TestCase):
    def test_english_title_requires_exact_independent_acceptance(self):
        snapshot = {'number': 434, 'comments': [{'url': title.COMMENT, 'author': {'login': 'FrankHZ'},
            'authorAssociation': 'OWNER', 'body': 'Main-gate 来源接受决定：接受固定 private ' + title.CANDIDATE +
            ' target3958 paired description / descriptionHtml'}]}
        title.validate_acceptance(snapshot)
        for change in ['missing', 'wrong-url', 'wrong-owner', 'wrong-association', 'wrong-revision', 'wrong-issue', 'caller-status']:
            wrong = copy.deepcopy(snapshot)
            if change == 'missing': wrong['comments'] = []
            elif change == 'wrong-url': wrong['comments'][0]['url'] += 'stale'
            elif change == 'wrong-owner': wrong['comments'][0]['author']['login'] = 'caller'
            elif change == 'wrong-association': wrong['comments'][0]['authorAssociation'] = 'NONE'
            elif change == 'wrong-revision': wrong['comments'][0]['body'] = wrong['comments'][0]['body'].replace(title.CANDIDATE, 'f' * 40)
            elif change == 'wrong-issue': wrong['number'] = 345
            else: wrong['comments'][0]['body'] = 'accepted=true target3958 description descriptionHtml'
            with self.subTest(change=change), self.assertRaises(ValueError): title.validate_acceptance(wrong)

    def test_reader_note_composition_keeps_independent_prefixes_and_history(self):
        derived, reviews = synthetic()
        fields = final.bind_fields(derived, reviews)
        for old, new in zip([1, 2, 3], final.NOTE_TARGETS):
            for field in fields:
                if field['targetId'] == old:
                    field['targetId'] = new
        amendments = []
        for tid in final.NOTE_TARGETS:
            body = next(r for r in fields if r['targetId'] == tid and r['field'] == 'body')
            name = next(r for r in fields if r['targetId'] == tid and r['field'] == 'name')
            body['text'] += ' '  # Authoritative text has a space absent from HTML.
            body['origin']['activeAmendment'] = {'prior': {'history': ['protected']}}
            suffix = '\n\n原文疑义备注（本项目说明，非官方勘误）\n合成疑义 <保留>'
            amendments.append({'targetId': tid, 'rulebookId': 86, 'field': 'descriptionText',
                'prior': {'owner': body['origin']['kind'], 'revision': final.CANDIDATE,
                    'path': final.BOOK + 'issue-365/field-dispositions.jsonl',
                    'acceptedRow': copy.deepcopy(body), 'nameRow': copy.deepcopy(name)},
                'review': {'targetId': tid, 'rulebookId': 86, 'field': 'descriptionText',
                    'before': body['text'], 'after': body['text'] + suffix,
                    'input': {'chinese': {'descriptionHtml': body['html']}},
                    'proposedHtml': body['html'][:-6] + html.escape(suffix, quote=False) + '</pre>'}})
        untouched = copy.deepcopy(fields)
        output = final.compose_reader_notes(fields, amendments)
        self.assertEqual(fields, untouched)
        self.assertEqual(sum(a == b for a, b in zip(fields, output)), 1999)
        for before, after in zip(fields, output):
            if before != after:
                self.assertEqual(after['origin'], before['origin'])
                self.assertEqual(after['review'], before['review'])
                self.assertTrue(after['text'].startswith(before['text']))
                self.assertTrue(after['html'].startswith(before['html'][:-6]))
                self.assertEqual(after['readerNoteAddendum']['amendment']['prior']['acceptedRow'], before)
        for label in ['missing', 'duplicate', 'wrong', 'cross-target', 'stale-origin', 'stale-review',
                      'outside-text', 'outside-html', 'normalize-html']:
            rows = copy.deepcopy(amendments)
            if label == 'missing': rows.pop()
            elif label == 'duplicate': rows.append(copy.deepcopy(rows[0]))
            elif label == 'wrong': rows[0]['targetId'] = 3996
            elif label == 'cross-target': rows[0]['review']['targetId'] = 4111
            elif label == 'stale-origin': rows[0]['prior']['acceptedRow']['origin'] = {}
            elif label == 'stale-review': rows[0]['prior']['acceptedRow']['review'] = {}
            elif label == 'outside-text': rows[0]['review']['after'] = 'forged' + rows[0]['review']['after']
            elif label == 'outside-html': rows[0]['review']['proposedHtml'] = '<pre>forged</pre>'
            else: rows[0]['review']['proposedHtml'] = '<pre>' + html.escape(rows[0]['review']['after'], quote=False) + '</pre>'
            with self.subTest(label=label), self.assertRaises(ValueError):
                final.compose_reader_notes(fields, rows)

    def test_reader_note_source_page_mismatch_rejects(self):
        import pymupdf
        sys.path.insert(0, str(AUDITS.parent / 'pdf-extract/src'))
        from pdf_extract.extraction import extract_page
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'synthetic.pdf'
            with pymupdf.open() as document:
                page = document.new_page()
                page.insert_text((72, 72), 'Synthetic source ambiguity')
                document.save(source)
            with pymupdf.open(source) as document:
                fresh = json.loads(json.dumps([{'sourceId': 'sc', 'sourcePath': source.name,
                    'pageIndex': 0, 'pageCount': 1, 'printedPage': 1, **extract_page(document[0], {})}]))
            final.fresh_note_pages(directory, fresh, {'sc': source.name})
            for key in ['blocks', 'geometry', 'pageCount']:
                stale = copy.deepcopy(fresh)
                stale[0][key] = [] if key == 'blocks' else {} if key == 'geometry' else 2
                with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'PDF text/geometry mismatch'):
                    final.fresh_note_pages(directory, stale, {'sc': source.name})

    def test_exact_scope_and_real_retention_pass_required(self):
        derived, reviews = synthetic()
        self.assertEqual(len(final.bind_fields(derived, reviews)), 2002)
        for label in ['missing', 'extra', 'no-original-review', 'equality-only', 'wrong-descriptor',
                      'tampered-name', 'tampered-body', 'tampered-full-html']:
            d, r = copy.deepcopy(derived), copy.deepcopy(reviews)
            if label == 'missing':
                d['inputs'].pop()
            elif label == 'extra':
                d['inputs'].append({**d['inputs'][0], 'targetId': 4837})
            elif label == 'no-original-review':
                del r[100]
            elif label == 'equality-only':
                r[100][0]['chinese']['name']['status'] = 'unreviewed'
            elif label == 'wrong-descriptor':
                d['inputs'][0]['english']['mechanics']['descriptors'] = ['Wrong']
            elif label == 'tampered-name':
                d['output'][0]['name']['text'] += 'tampered'
            elif label == 'tampered-body':
                d['output'][0]['body']['text'] += 'tampered'
            else:
                d['output'][-1]['body']['html'] = '<p>Other</p>'
            with self.subTest(label=label), self.assertRaises(ValueError):
                final.bind_fields(d, r)

    def test_missing_body_source_proof_is_not_legacy_equality(self):
        derived, reviews = synthetic()
        tid = 3855
        value = next(row['body'] for row in derived['output'] if row['targetId'] == tid)
        current = next(row for row in derived['inputs'] if row['targetId'] == tid)
        self.assertEqual(final.retained_proof(tid, 'body', value, current, reviews[tid])['disposition'],
                         'source-reviewed-retention')
        reviews[tid][0]['chinese']['body']['status'] = 'unreviewed'
        with self.assertRaisesRegex(ValueError, 'retained-body source proof'):
            final.retained_proof(tid, 'body', value, current, reviews[tid])

    def test_candidate_has_exact_selection_and_no_projection_authority(self):
        with self.assertRaises(ValueError):
            final.exact_candidate('HEAD')
        with self.assertRaises(ValueError):
            final.exact_candidate('0' * 40)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, 'invoking helper checkout'):
                final.derive_final(SimpleNamespace(code_root=root, data_root=root, runtime_root=root))
            git = lambda *args: subprocess.check_output(['git', '-C', str(root), *args], encoding='utf8').strip()
            git('init', '--quiet'); git('config', 'user.name', 'Synthetic'); git('config', 'user.email', 'synthetic@example.invalid')
            owned = root / final.BOOK / 'issue-365'
            owned.mkdir(parents=True)
            file = owned / 'field-dispositions.jsonl'
            original = {'targetId': 4736, 'prior': {'owner': 'native', 'currentAmendment': {'acceptedRow': 'protected'}}}
            file.write_text(json.dumps(original) + '\n', 'utf8')
            git('add', '--', str(file)); git('commit', '--quiet', '-m', 'Synthetic source-bound candidate')
            revision = git('rev-parse', 'HEAD')
            result = {'field-dispositions.jsonl': [original]}
            final.compare_candidate(Evidence(root, revision), result)
            # A full prior envelope or projection change cannot become authority
            # even when committed at a fresh revision and otherwise valid JSON.
            changed = copy.deepcopy(original)
            changed['prior']['currentAmendment']['acceptedRow'] = 'forged'
            file.write_text(json.dumps(changed) + '\n', 'utf8')
            with self.assertRaisesRegex(ValueError, 'dirty candidate'):
                final.compare_candidate(Evidence(root, revision), result)
            git('add', '--', str(file)); git('commit', '--quiet', '-m', 'Synthetic forged prior')
            with self.assertRaisesRegex(ValueError, 'complete derivation'):
                final.compare_candidate(Evidence(root, git('rev-parse', 'HEAD')), result)
            file.unlink()
            with self.assertRaises(ValueError):
                final.compare_candidate(Evidence(root, revision), result)

    def test_node_exact_input_authentication_and_refresh(self):
        subprocess.run(['node', str(AUDITS / 'test-sc-final-inputs.cjs')], check=True,
                       capture_output=True, text=True, encoding='utf8')

    def test_dirty_summary_parser_rejected_before_final_source_replay(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            git = lambda *args: subprocess.check_output(['git', '-C', str(root), *args], encoding='utf8').strip()
            git('init', '--quiet'); git('config', 'user.name', 'Synthetic')
            git('config', 'user.email', 'synthetic@example.invalid')
            parser = root / 'data-tools/src/short-desc/summary-row-schema.ts'
            parser.parent.mkdir(parents=True)
            parser.write_text('// synthetic committed parser\n', 'utf8')
            git('add', '--', str(parser)); git('commit', '--quiet', '-m', 'Synthetic parser')
            revision = git('rev-parse', 'HEAD')
            parser.write_text('// uncommitted parser substitution\n', 'utf8')
            argv = ['sc_final_auth.py', '--code-root', str(root), '--helper-revision', revision,
                    '--runtime-root', str(root), '--data-root', str(root),
                    '--rules-db', str(root / 'never-open-rules.sqlite'),
                    '--content-db', str(root / 'never-open-content.sqlite'),
                    '--accepted-baseline', final.CANDIDATE]
            with patch.object(sys, 'argv', argv), patch.object(auth, 'derive_final') as replay:
                with self.assertRaisesRegex(ValueError, 'dirty/stale source authentication helpers'):
                    auth.main()
                replay.assert_not_called()
            self.assertFalse((root / 'never-open-rules.sqlite').exists())
            self.assertFalse((root / 'never-open-content.sqlite').exists())


if __name__ == '__main__':
    unittest.main()
