"""Fixed #467 source package, independently accepted after the #461 transition."""
import copy
import json
from pathlib import Path
from sc_coverage import Evidence, require

CANDIDATE = '996a41671f7cb61e9f7fa6cce48a912695694c7c'
DIRECTORY = 'dice-qa/books/86/issue-467/'
ACCEPTANCE = '775005e96a5caa9a83bbf523f716946b2fe890a0'
COMMENT = 'https://github.com/FrankHZ/dnd3.5-spellbook/issues/467#issuecomment-5976286296'
IDS = [4033, 4247, 4345, 4349, 4354, 4355]

def validate_acceptance(snapshot):
    require(ACCEPTANCE is not None and COMMENT is not None, 'Issue467 independent source acceptance pending')
    require(snapshot['issue_url'] == 'https://api.github.com/repos/FrankHZ/dnd3.5-spellbook/issues/467' and
            snapshot['html_url'] == COMMENT and snapshot['user']['login'] == 'FrankHZ' and
            snapshot['author_association'] == 'OWNER', 'source fidelity acceptance identity differs')
    require('Main-gate SOURCE ACCEPTANCE for exact candidate revision `' + CANDIDATE + '`' in snapshot['body'] and
            all(str(i) in snapshot['body'] for i in IDS) and
            snapshot['id'] == 5976286296 and all(k in snapshot['body'] for k in ['all four complete before fields', 'each priorBody', "4345's description value is unchanged", 'The two Chinese corrections do not enter this rules patch']),
            'acceptance does not bind six exact four-field pairs')

def authenticate(args, result):
    require(ACCEPTANCE is not None and COMMENT is not None, 'Issue467 independent source acceptance pending')
    candidate = Evidence(args.data_root, CANDIDATE)
    validate_acceptance(Evidence(args.data_root, ACCEPTANCE).read(DIRECTORY + 'main-gate/acceptance.json'))
    for name in ['candidate.json', 'rules-patch.jsonl', 'fresh-pages.json', 'source-review.json']:
        require(not candidate.git('status', '--porcelain', '--', DIRECTORY + name), 'dirty source fidelity evidence')
        candidate.text(DIRECTORY + name)
    frozen = candidate.read(DIRECTORY + 'fresh-pages.json')
    require([(p['sourceId'],p['pageIndex']) for p in frozen] == [('sc',48),('sc',54),('sc',59),('sc',60),('sc',61),('errata',0)], 'source fidelity page scope differs')
    import pymupdf
    from pdf_extract.extraction import extract_page
    fresh=[]
    for p in frozen:
        with pymupdf.open(Path(args.data_root)/'artifacts/pdf/spell-compendium'/('Spell Compendium.pdf' if p['sourceId']=='sc' else 'SpellComp_Errata.pdf')) as doc:
            fresh.append(dict(sourceId=p['sourceId'],pageIndex=p['pageIndex'],pageCount=len(doc),printedPage=p['printedPage'],**extract_page(doc[p['pageIndex']],{})))
    require(json.loads(json.dumps(fresh)) == frozen, 'source fidelity original text/geometry differs')
    rows=candidate.read(DIRECTORY+'candidate.json')['candidates']
    require([r['targetId'] for r in rows] == IDS, 'source fidelity target scope differs')
    result=copy.deepcopy(result)
    for row in rows:
        body=[f for f in result['field-dispositions.jsonl'] if f['targetId']==row['targetId'] and f['field']=='body']
        require(len(body)==1 and body[0]==row['priorBody'], 'stale full source fidelity Chinese envelope')
        for key in row['before']:
            value=row['before'][key]
            for edit in [e for e in row['minimalEdits'] if e['field']==key]:
                require(value[edit['start']:edit['end']]==edit['before'] and value.count(edit['before'])==1, 'stale minimal source edit')
                value=value[:edit['start']]+edit['after']+value[edit['end']:]
            require(value==row['after'][key], 'unlisted four-field source edit')
        if row['targetId'] in [4033,4349]:
            body[0]['text'],body[0]['html']=row['after']['chineseText'],row['after']['chineseHtml']
            body[0]['sourceCorrection']=dict(revision=CANDIDATE,acceptanceRevision=ACCEPTANCE,path=DIRECTORY+'candidate.json',targetId=row['targetId'],prior=row['priorBody'])
    result['report.json']['sourceRevisions'].update(sourceFidelityCandidate=CANDIDATE,sourceFidelityAcceptance=ACCEPTANCE)
    return result
