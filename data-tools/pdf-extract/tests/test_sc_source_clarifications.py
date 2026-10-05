import copy
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'audits'))
import sc_source_clarifications as source
from pdf_extract import extraction


class ClarificationsTest(unittest.TestCase):
    def receipt(self):
        return dict(id=5987792514, user={'login': 'FrankHZ'}, author_association='OWNER',
            issue_url='https://api.github.com/repos/FrankHZ/dnd3.5-spellbook/issues/476',
            html_url='https://github.com/FrankHZ/dnd3.5-spellbook/issues/476#issuecomment-5987792514',
            body='Main-gate SOURCE ACCEPTANCE for exact candidate revision `' + source.CANDIDATE + '` ' + source.PATH +
                ' Accept only the six Chinese text/HTML after fields for IDs 4465,4564,3901 ' +
                'Preserve both English fields, all mechanics, names, priorBody lineage, summaries, reader notes and all other entries')

    def test_exact_acceptance_identity_and_scope(self):
        source.validate_acceptance(self.receipt())
        for key, value in [('id', 0), ('user', {'login': 'other'}), ('author_association', 'NONE'),
                           ('body', 'accepted'), ('issue_url', 'wrong'), ('html_url', 'wrong')]:
            wrong = self.receipt(); wrong[key] = value
            with self.assertRaises(ValueError): source.validate_acceptance(wrong)

    def test_source_and_pair_authentication_without_database(self):
        span = dict(text='synthetic source', bbox=[0,0,1,1], origin=[0,0], font='synthetic', size=1, flags=0)
        rows, packets, bodies = [], [], []
        for tid in source.IDS:
            before = dict(englishText='protected', englishHtml='<p>protected</p>', chineseText='原文', chineseHtml='<pre>原文</pre>')
            after = {**before, 'chineseText': '新文', 'chineseHtml': '<pre>新文</pre>'}
            rows.append(dict(targetId=tid, acceptedInput=before, proposedInput=after, sourceProposalRevision='1'*40,
                sourceProposalPath='synthetic/content-candidates.json', minimalEdits=[
                    dict(field='chineseText', start=0, end=1, before='原', after='新'),
                    dict(field='chineseHtml', start=5, end=6, before='原', after='新')]))
            packets.append(dict(targetId=tid, acceptedInput=before, source={'units': [{'spans': [dict(span, pageIndex=0, spanRef=[0,0,0])]}]}))
            bodies.append(dict(targetId=tid, rulebookId=86, field='body', text=before['chineseText'], html=before['chineseHtml'], origin={'kind':'native'}, review={'synthetic':True}))
        result = {'field-dispositions.jsonl': bodies, 'report.json': {'sourceRevisions': {
            'sourcePunctuationCandidate': source.PUNCTUATION_CANDIDATE, 'sourcePunctuationAcceptance': source.PUNCTUATION_ACCEPTANCE}}}
        review = {'recommendedChanges': source.IDS, 'entries': [{'recommendation':'retain'}]*20 + [{'recommendation':'revise'}]*3}
        receipt = self.receipt()
        class Evidence:
            def __init__(self, *args): pass
            def git(self, command, name): return json.dumps(self.read(name.split(':', 1)[1]))
            def read(self, name):
                if name == source.PATH: return rows
                if name.endswith('acceptance.json'): return receipt
                if name.endswith('errata-review.json'): return {'pages':['complete errata']}
                if name.endswith('review.json'): return review
                return packets
        class Pdf:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def __iter__(self): return iter([self])
            def __getitem__(self, key): return self
            def get_text(self): return 'complete errata'
        with patch.object(source, 'Evidence', Evidence), patch('pymupdf.open', return_value=Pdf()), \
                patch.object(extraction, 'extract_page', return_value={'blocks':[{'lines':[{'spans':[span]}]}]}):
            accepted = source.authenticate(SimpleNamespace(data_root='synthetic'), result)
            self.assertEqual(result['field-dispositions.jsonl'], bodies)
            for body, prior in zip(accepted['field-dispositions.jsonl'], bodies):
                self.assertEqual(body['sourceCorrection']['prior'], prior)
                self.assertEqual(body['text'], '新文')
            wrong = copy.deepcopy(result); wrong['field-dispositions.jsonl'][0]['text'] = 'stale'
            with self.assertRaisesRegex(ValueError, 'stale Chinese'): source.authenticate(SimpleNamespace(data_root='synthetic'), wrong)
            wrong = copy.deepcopy(result); del wrong['report.json']['sourceRevisions']['sourcePunctuationAcceptance']
            with self.assertRaisesRegex(ValueError, '#473'): source.authenticate(SimpleNamespace(data_root='synthetic'), wrong)
            rows[0]['proposedInput']['englishText'] = 'forged'
            with self.assertRaisesRegex(ValueError, 'changes English'): source.authenticate(SimpleNamespace(data_root='synthetic'), result)
            rows[0]['proposedInput']['englishText'] = 'protected'
            with patch.object(extraction, 'extract_page', return_value={'blocks':[{'lines':[{'spans':[{**span,'text':'forged'}]}]}]}):
                with self.assertRaisesRegex(ValueError, 'original source span'): source.authenticate(SimpleNamespace(data_root='synthetic'), result)


if __name__ == '__main__':
    unittest.main()
