"""Authenticate the single English title amendment, retaining historical QA."""
import copy
import json
from pathlib import Path
from sc_coverage import Evidence, require

CANDIDATE = '790f9ebbd024916d16577d69c01d868155a9ccfd'
DIRECTORY = 'dice-qa/books/86/issue-434/'
# Set only after independent main-gate source acceptance of the concrete pair.
ACCEPTANCE = '7f8ea2df1104fe4345141f0712dbb43739e98b7e'
COMMENT = 'https://github.com/FrankHZ/dnd3.5-spellbook/issues/434#issuecomment-5972281973'


def validate_acceptance(snapshot):
    require(snapshot['number'] == 434, 'cross-issue English title acceptance')
    rows = [r for r in snapshot['comments'] if r['url'] == COMMENT]
    require(len(rows) == 1, 'missing English title acceptance')
    row = rows[0]
    require(row['author']['login'] == 'FrankHZ' and row['authorAssociation'] == 'OWNER',
            'English title acceptance owner differs')
    require(CANDIDATE in row['body'] and '3958' in row['body'] and
            'descriptionHtml' in row['body'] and 'description' in row['body'] and
            'Main-gate 来源接受决定：接受固定 private ' + CANDIDATE in row['body'],
            'English title acceptance does not bind exact pair')


def authenticate(args, result):
    require(ACCEPTANCE is not None and COMMENT is not None, 'English title source acceptance pending')
    candidate = Evidence(args.data_root, CANDIDATE)
    accepted = Evidence(args.data_root, ACCEPTANCE)
    for name in ['candidate.json', 'rules-patch.jsonl', 'fresh-pages.json', 'presentation.json']:
        require(not candidate.git('status', '--porcelain', '--', DIRECTORY + name), 'dirty English title evidence')
        candidate.text(DIRECTORY + name)
    validate_acceptance(accepted.read(DIRECTORY + 'acceptance.json'))
    frozen = candidate.read(DIRECTORY + 'fresh-pages.json')
    require([(r['sourceId'], r['pageIndex']) for r in frozen] == [('sc', 161), ('errata', 0)],
            'English title source scope differs')
    import pymupdf
    from pdf_extract.extraction import extract_page
    fresh = []
    for sid, name, pi in [('sc', 'Spell Compendium.pdf', 161), ('errata', 'SpellComp_Errata.pdf', 0)]:
        with pymupdf.open(Path(args.data_root) / 'artifacts/pdf/spell-compendium' / name) as doc:
            fresh.append({'sourceId': sid, 'pageIndex': pi, 'pageCount': len(doc),
                'printedPage': 162 if sid == 'sc' else None, **extract_page(doc[pi], {})})
    require(json.loads(json.dumps(fresh)) == frozen, 'English title original PDF text/geometry differs')
    result = copy.deepcopy(result)
    result['report.json']['sourceRevisions'].update(englishTitleCandidate=CANDIDATE, englishTitleAcceptance=ACCEPTANCE)
    result['report.json'].setdefault('inputBindingChanges', []).append({
        'targetId': 3958, 'inputFields': ['english.description', 'englishHtml'],
        'priorRevision': '296903c61e20ce359812148fc0faa234ca2508e7',
        'revision': CANDIDATE, 'path': DIRECTORY + 'candidate.json',
        'acceptanceRevision': ACCEPTANCE, 'acceptanceComment': COMMENT,
        'chineseFieldsAndReviewEnvelopesChanged': False})
    return result
