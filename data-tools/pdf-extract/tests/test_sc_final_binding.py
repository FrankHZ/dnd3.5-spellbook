"""Synthetic #365 source-authority and candidate rejection checks."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

AUDITS = Path(__file__).resolve().parents[2] / 'audits'
sys.path.insert(0, str(AUDITS))
import sc_final_binding as final
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


if __name__ == '__main__':
    unittest.main()
