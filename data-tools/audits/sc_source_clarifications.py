"""Authenticate the three accepted Chinese-only clarifications after #473."""
import copy
import json
from pathlib import Path
from sc_coverage import Evidence, require
from sc_source_fidelity import PUNCTUATION_CANDIDATE, PUNCTUATION_ACCEPTANCE

CANDIDATE = 'cb2f661ef8935ecbf6bd09bae106e067493d5c67'
ACCEPTANCE = '10c65744f9b525db0c48115eea6ccefd96f4b4cd'
DIRECTORY = 'dice-qa/books/86/issue-476/main-gate-source-review/'
PATH = DIRECTORY + 'selected-candidates.json'
IDS = [4465, 4564, 3901]


def validate_acceptance(snapshot):
    require(snapshot['id'] == 5987792514 and snapshot['user']['login'] == 'FrankHZ' and
            snapshot['author_association'] == 'OWNER' and
            snapshot['issue_url'] == 'https://api.github.com/repos/FrankHZ/dnd3.5-spellbook/issues/476' and
            snapshot['html_url'] == 'https://github.com/FrankHZ/dnd3.5-spellbook/issues/476#issuecomment-5987792514',
            'Chinese clarification acceptance identity differs')
    require('Main-gate SOURCE ACCEPTANCE for exact candidate revision `' + CANDIDATE + '`' in snapshot['body'] and
            PATH in snapshot['body'] and
            'Accept only the six Chinese text/HTML after fields for IDs 4465,4564,3901' in snapshot['body'] and
            'Preserve both English fields, all mechanics, names, priorBody lineage, summaries, reader notes and all other entries' in snapshot['body'],
            'Chinese clarification acceptance does not bind exact scope')


def authenticate(args, result):
    revisions = result['report.json']['sourceRevisions']
    require(revisions.get('sourcePunctuationCandidate') == PUNCTUATION_CANDIDATE and
            revisions.get('sourcePunctuationAcceptance') == PUNCTUATION_ACCEPTANCE,
            'Chinese clarification requires authenticated #473 predecessor')
    evidence = Evidence(args.data_root, CANDIDATE)
    validate_acceptance(Evidence(args.data_root, ACCEPTANCE).read(DIRECTORY + 'acceptance.json'))
    rows = evidence.read(PATH)
    review = evidence.read(DIRECTORY + 'review.json')
    require([r['targetId'] for r in rows] == IDS and review['recommendedChanges'] == IDS,
            'Chinese clarification target scope differs')
    require(len(review['entries']) == 23 and sum(r['recommendation'] == 'retain' for r in review['entries']) == 20,
            'Chinese clarification retention dispositions differ')
    from pdf_extract.extraction import extract_page
    import pymupdf
    root = Path(args.data_root) / 'artifacts/pdf/spell-compendium'
    pages = {}
    with pymupdf.open(root / 'SpellComp_Errata.pdf') as errata:
        current_errata = [page.get_text() for page in errata]
    result = copy.deepcopy(result)
    with pymupdf.open(root / 'Spell Compendium.pdf') as original:
        for row in rows:
            tid = row['targetId']
            source = Evidence(args.data_root, row['sourceProposalRevision'])
            # Earlier diagnostic files have accepted later revisions. Bind their
            # immutable historical blobs, not today's working copy of that path.
            historical = lambda name: json.loads(source.git('show', row['sourceProposalRevision'] + ':' + name))
            packet = next(r for r in historical(row['sourceProposalPath']) if r['targetId'] == tid)
            require(historical(str(Path(row['sourceProposalPath']).parent / 'errata-review.json').replace('\\', '/'))['pages'] == current_errata,
                    'Chinese clarification complete errata changed')
            require(packet['acceptedInput'] == row['acceptedInput'], 'stale original Chinese clarification before fields')
            for unit in packet['source']['units']:
                for span in unit['spans']:
                    page = span['pageIndex']
                    if page not in pages:
                        pages[page] = json.loads(json.dumps(extract_page(original[page], {})['blocks']))
                    b, line, s = span['spanRef']
                    require(pages[page][b]['lines'][line]['spans'][s] == {k: span[k] for k in ['text', 'bbox', 'origin', 'font', 'size', 'flags']},
                            'Chinese clarification original source span changed')
            body = [f for f in result['field-dispositions.jsonl'] if f['targetId'] == tid and f['field'] == 'body']
            require(len(body) == 1 and body[0]['text'] == row['acceptedInput']['chineseText'] and
                    body[0]['html'] == row['acceptedInput']['chineseHtml'] and 'sourceCorrection' not in body[0],
                    'stale Chinese clarification predecessor')
            require(all(row['acceptedInput'][key] == row['proposedInput'][key] for key in ['englishText', 'englishHtml']),
                    'Chinese clarification changes English')
            values = copy.deepcopy(row['acceptedInput'])
            for edit in row['minimalEdits']:
                key, start, end = edit['field'], edit['start'], edit['end']
                require(key in ['chineseText', 'chineseHtml'] and values[key][start:end] == edit['before'] and
                        values[key].count(edit['before']) == 1, 'stale Chinese clarification edit')
                values[key] = values[key][:start] + edit['after'] + values[key][end:]
            require(values == row['proposedInput'], 'unlisted Chinese clarification edit')
            prior = copy.deepcopy(body[0])
            body[0]['text'], body[0]['html'] = values['chineseText'], values['chineseHtml']
            body[0]['sourceCorrection'] = dict(revision=CANDIDATE, acceptanceRevision=ACCEPTANCE,
                path=PATH, targetId=tid, prior=prior)
    result['report.json']['sourceRevisions'].update(sourceClarificationCandidate=CANDIDATE, sourceClarificationAcceptance=ACCEPTANCE)
    return result
