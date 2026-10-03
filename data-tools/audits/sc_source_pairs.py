"""Authenticate only the fixed #461 Chinese/English corrections after full QA."""
import copy
import json
from pathlib import Path
from sc_coverage import Evidence, require

CANDIDATE = 'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f'
DIRECTORY = 'dice-qa/books/86/issue-461/'
# Independent main-gate acceptance must bind the fixed four-field candidates.
ACCEPTANCE = '5f05fad7df5256a9c3c998d3be77aac238445107'
COMMENT = 'https://github.com/FrankHZ/dnd3.5-spellbook/issues/461#issuecomment-5974178676'


def validate_acceptance(snapshot):
    require(ACCEPTANCE is not None and COMMENT is not None, 'source pair acceptance pending')
    require(snapshot['issue_url'] == 'https://api.github.com/repos/FrankHZ/dnd3.5-spellbook/issues/461', 'cross-issue source pair acceptance')
    require(snapshot['html_url'] == COMMENT and snapshot['id'] == 5974178676, 'missing source pair acceptance')
    require(snapshot['user']['login'] == 'FrankHZ' and snapshot['author_association'] == 'OWNER', 'source pair acceptance owner differs')
    require('Main-gate SOURCE ACCEPTANCE for the exact candidate revision `' + CANDIDATE + '`' in snapshot['body'] and
            all(s in snapshot['body'] for s in ['3930', '3934', 'chineseText', 'chineseHtml', 'description/descriptionHtml']),
            'source pair acceptance does not bind exact pairs')


def authenticate(args, result):
    require(ACCEPTANCE is not None and COMMENT is not None, 'source pair acceptance pending')
    candidate = Evidence(args.data_root, CANDIDATE)
    accepted = Evidence(args.data_root, ACCEPTANCE)
    for name in ['candidate.json', 'rules-patch.jsonl', 'fresh-pages.json', 'source-review.json']:
        require(not candidate.git('status', '--porcelain', '--', DIRECTORY + name), 'dirty source pair evidence')
        candidate.text(DIRECTORY + name)
    validate_acceptance(accepted.read(DIRECTORY + 'main-gate/acceptance.json'))
    frozen = candidate.read(DIRECTORY + 'fresh-pages.json')
    require([(r['sourceId'], r['pageIndex']) for r in frozen] == [('sc', 23), ('sc', 24), ('errata', 0)], 'source pair scope differs')
    import pymupdf
    from pdf_extract.extraction import extract_page
    fresh = []
    for sid, name, pi in [('sc', 'Spell Compendium.pdf', 23), ('sc', 'Spell Compendium.pdf', 24), ('errata', 'SpellComp_Errata.pdf', 0)]:
        with pymupdf.open(Path(args.data_root) / 'artifacts/pdf/spell-compendium' / name) as doc:
            fresh.append({'sourceId': sid, 'pageIndex': pi, 'pageCount': len(doc),
                          'printedPage': pi + 1 if sid == 'sc' else None, **extract_page(doc[pi], {})})
    require(json.loads(json.dumps(fresh)) == frozen, 'source pair original PDF text/geometry differs')
    result = copy.deepcopy(result)
    rows = candidate.read(DIRECTORY + 'candidate.json')['candidates']
    for row in rows:
        bodies = [f for f in result['field-dispositions.jsonl'] if f['targetId'] == row['targetId'] and f['field'] == 'body']
        require(len(bodies) == 1 and bodies[0] == row['priorBody'], 'stale full prior source body')
        if row['targetId'] == 3930:
            body = bodies[0]
            body['text'], body['html'] = row['after']['chineseText'], row['after']['chineseHtml']
            body['sourceCorrection'] = {'revision': CANDIDATE, 'acceptanceRevision': ACCEPTANCE, 'path': DIRECTORY + 'candidate.json',
                                        'targetId': 3930, 'prior': row['priorBody']}
    result['report.json']['sourceRevisions'].update(sourcePairCandidate=CANDIDATE, sourcePairAcceptance=ACCEPTANCE)
    return result
