"""Exact #365 source-bound candidate replay. Read-only; never writer authority.

Reuses complete historical QA, maintained in-memory rules patching, PDF bindings
and frozen original coverage. Candidate files are comparisons with derivation,
not a caller-authored substitute for accepted sources.
"""
import argparse
import copy
import html
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

from sc_coverage import (Evidence, canonical_reviews, reviewed_english,
                         original_replay, html_text_matches, require)

BOOK = 'dice-qa/books/86/'
UNION = '296903c61e20ce359812148fc0faa234ca2508e7'
CURRENT = '6a73f4d64682325c67e2c40595008344fb5c3be5'
COVERAGE = 'a9cbe07747b1bc908ff4ebcd24244e38e58cb411'
MISSING = 'db04cc54684c8e63407341717cb9e00e883f1203'
RESIDUAL = '00e3c9836be40c878fafe74eb1ad0d915f6d4028'
IDENTITY = 'b30ef4390aff768ee337a142c11233b2ece3327c'
RELATIONS = '7e9186706482f672b36019e7734dc6531267628a'
CANDIDATE = '0688739d92a2aa9fb3eceeb444daa7260e711058'
NOTE_REVISION = 'c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4'
NOTE_PATH = BOOK + 'issue-407/amendments.jsonl'
NOTE_TARGETS = [4088, 4111, 4229]


def compose_reader_notes(fields, amendments):
    """Append fixed accepted notes without rebasing any existing field evidence."""
    require(len(fields) == 2002 and len({(r['targetId'], r['field']) for r in fields}) == 2002,
            'incomplete/duplicate final fields')
    require([a['targetId'] for a in amendments] == NOTE_TARGETS, 'wrong/duplicate/missing reader notes')
    indexed = {(r['targetId'], r['field']): r for r in fields}
    output = copy.deepcopy(fields)
    for line, amendment in enumerate(amendments, 1):
        tid, review = amendment['targetId'], amendment['review']
        before = indexed[tid, 'body']
        require(amendment['rulebookId'] == review['rulebookId'] == before['rulebookId'] == 86 and
                review['targetId'] == tid and amendment['field'] == review['field'] == 'descriptionText',
                'cross-target reader note')
        require(amendment['prior'] == {'owner': before['origin']['kind'], 'revision': CANDIDATE,
                'path': BOOK + 'issue-365/field-dispositions.jsonl', 'acceptedRow': before,
                'nameRow': indexed[tid, 'name']}, 'stale reader-note prior')
        require(review['before'] == before['text'] and
                review['input']['chinese']['descriptionHtml'] == before['html'], 'stale reader-note body')
        suffix = review['after'][len(before['text']):]
        require(suffix.startswith('\n\n原文疑义备注（本项目说明，非官方勘误）\n') and
                review['after'] == before['text'] + suffix and before['html'].endswith('</pre>') and
                review['proposedHtml'] == before['html'][:-6] + html.escape(suffix, quote=False) + '</pre>',
                'reader note changes authoritative text/HTML prefixes')
        row = next(r for r in output if (r['targetId'], r['field']) == (tid, 'body'))
        row.update(text=review['after'], html=review['proposedHtml'], readerNoteAddendum={
            'revision': NOTE_REVISION, 'path': NOTE_PATH, 'rowRef': NOTE_PATH + ':' + str(line),
            'amendment': copy.deepcopy(amendment)})
    return output


def fresh_note_pages(data, fresh, sources):
    """Reopen bounded originals, comparing full page text and geometry."""
    import pymupdf
    from pdf_extract.extraction import extract_page
    actual = []
    for frozen in fresh:
        sid, pi = frozen['sourceId'], frozen['pageIndex']
        with pymupdf.open(Path(data) / sources[sid]) as document:
            actual.append({'sourceId': sid, 'sourcePath': sources[sid], 'pageIndex': pi,
                'pageCount': len(document), 'printedPage': pi + 1 if sid == 'sc' else pi if sid == 'phb' else None,
                **extract_page(document[pi], {})})
    actual = json.loads(json.dumps(actual))
    require(actual == fresh, 'reader-note original PDF text/geometry mismatch')
    return actual


def authenticate_reader_notes(args, result):
    """Reuse the fixed accepted #407 verifier, never execute its authoring CLI."""
    evidence = Evidence(args.data_root, NOTE_REVISION)
    prefix = BOOK + 'issue-407/'
    files = ['prepare.py', 'author.py', 'verify.py', 'packets.json', 'fresh-pages.json',
             'amendments.jsonl', 'dispositions.jsonl']
    require(not evidence.git('status', '--porcelain', '--', *[prefix + f for f in files]),
            'dirty accepted reader-note helper/input')
    for file in files:
        evidence.text(prefix + file)
    # All imported private code has first been compared with its fixed Git bytes.
    sys.path.insert(0, str(evidence.root / prefix))
    try:
        spec = importlib.util.spec_from_file_location('accepted_sc_reader_notes', evidence.root / prefix / 'verify.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
    finally:
        sys.path.pop(0)
    packets, fresh = (evidence.read(prefix + f) for f in ['packets.json', 'fresh-pages.json'])
    amendments, dispositions = (evidence.read(prefix + f) for f in ['amendments.jsonl', 'dispositions.jsonl'])
    snapshot = Evidence(args.data_root, UNION).book('issue-329/current-inputs.json')['inputs']
    contexts = {}
    for issue, revision in helper.CONTEXT.items():
        for row in Evidence(args.data_root, revision).book(f'issue-{issue}/decisions.jsonl'):
            if row['targetId'] in helper.IDS and row.get('sourceNotes'):
                contexts.setdefault(row['targetId'], {'issue': issue, 'revision': revision,
                    'sourceNotes': row['sourceNotes'], 'sourcePages': row['originalPages']})
    expected_pages = {('sc', 1), ('errata', 0), ('phb-errata', 0), ('phb-errata', 1), ('phb-errata', 2),
                      ('phb', 146), ('phb', 174), ('phb', 175), ('phb', 176), ('phb', 296)}
    for context in contexts.values():
        expected_pages.update((s['sourceId'], s['pageIndex']) for s in context['sourcePages'])
    require([(r['sourceId'], r['pageIndex']) for r in fresh] == sorted(expected_pages),
            'missing/duplicate/cross-target reader-note PDF pages')
    verification = helper.validate(packets, fresh, amendments, dispositions, result['field-dispositions.jsonl'],
        snapshot, contexts, fresh_note_pages(args.data_root, fresh, helper.SOURCES))
    result = copy.deepcopy(result)
    result['field-dispositions.jsonl'] = compose_reader_notes(result['field-dispositions.jsonl'], amendments)
    report = result['report.json']
    report['sourceRevisions']['readerNotes'] = NOTE_REVISION
    report['readerNoteAddendum'] = {'revision': NOTE_REVISION, 'path': NOTE_PATH,
                                  'targets': NOTE_TARGETS, 'verification': verification}
    report['sourceQuestionIds'] = [{'targetId': r['targetId'], 'field': r['field'],
        'ids': r['review'].get('sourceQuestionIds', []) + ([q['id'] for q in
        r['readerNoteAddendum']['amendment']['review']['retainedSourceIssues']['issues']]
        if 'readerNoteAddendum' in r else [])} for r in result['field-dispositions.jsonl']
        if r['review'].get('sourceQuestionIds') or 'readerNoteAddendum' in r]
    return result


def exact_candidate(revision):
    require(re.fullmatch(r'[0-9a-f]{40}', revision) is not None and revision == CANDIDATE,
            'unsupported exact #365 candidate baseline')


def compare_candidate(evidence, result):
    for name, expected in result.items():
        logical = BOOK + 'issue-365/' + name
        require(not evidence.git('status', '--porcelain', '--', logical), 'dirty candidate input: ' + name)
        require(evidence.read(logical) == expected, 'candidate differs from complete derivation: ' + name)


def retained_proof(tid, field, value, input_row, review):
    """Equality is necessary only after locating an actual original-source pass."""
    row, ref = review
    chinese = row['chinese']
    if field == 'name':
        require(chinese['name']['status'] == 'source-correct', 'missing retained-name source proof')
        require(value['text'] == chinese['effectiveName'] == input_row['chinese']['name'],
                'retained-name source value mismatch')
    else:
        require(chinese['body']['status'] == 'source-correct', 'missing retained-body source proof')
        text = chinese.get('effectiveBodyText') or row['inputBinding'].get('fallbackZhBody')
        require(value['text'] == text == input_row['chinese']['descriptionText'],
                'retained-body source value mismatch')
        require(value['html'] == input_row['chinese']['descriptionHtml'] and
                html_text_matches(value['html'], value['text']), 'retained full HTML binding mismatch')
    require(row['sourcePages'] and row['english']['status'] != 'unreviewed', 'missing original retention entry')
    return {'disposition': 'source-reviewed-retention', 'revision': COVERAGE, 'rowRef': ref,
            'sourcePages': row['sourcePages'], 'priorDisposition': chinese[field]['status'],
            **({'htmlEvidence': 'complete current baseline HTML bound; original text review plus representation parity',
                'priorReviewBoundHtml': row['inputBinding']['effectiveZhHtml'] is not None,
                'newVisualHtmlReview': False} if field == 'body' else {})}


def bind_fields(derived, reviews):
    inputs = {r['targetId']: r for r in derived['inputs']}
    require(set(inputs) == set(reviews) and len(inputs) == 1001, 'missing/extra original 1001 scope')
    require([r['targetId'] for r in derived['output']] == sorted(inputs), 'projection scope mismatch')
    additions = {(r['targetId'], 'name' if r['field'] == 'name' else 'body'): r
                 for r in derived['rebound'] + derived['additions']}
    amendments = {r['targetId']: r for r in derived['amendments']}
    amendments.update({r['targetId']: r for r in derived['replacement']})
    native = {r['targetId']: (r, line) for line, r in enumerate(derived['native'], 1)}
    independent = {(r['targetId'], 'name' if r['field'] == 'name' else 'body'): (r, line)
                   for line, r in enumerate(derived['independent'], 1)}
    fields, retained_names, retained_bodies = [], [], []
    for output in derived['output']:
        tid = output['targetId']
        canonical, ref = reviews[tid]
        en, html = reviewed_english(canonical)
        actual = copy.deepcopy(inputs[tid]['english'])
        for key in ['classLevels', 'domainLevels']:
            actual['mechanics'][key].sort()
        require(en == actual and html == inputs[tid]['englishHtml'], 'original current English binding differs: ' + str(tid))
        for field in ['name', 'body']:
            value = output[field]
            original = value['origin']
            require(value['text'], 'empty final field')
            review = additions.get((tid, field))
            if review:
                issue = 343 if tid in [3846, 4521, 4677, 4611, 4612, 4613, 4614, 4616, 4617] else 347
                source_path = 'issue-343/independent-proposed.jsonl' if issue == 343 else 'issue-347/validated-proposals.jsonl'
                proof = {'disposition': review['status'], 'revision': MISSING if issue == 343 else RESIDUAL,
                         'path': BOOK + source_path, 'sourcePages': review['sourcePages'],
                         'sourceQuestionIds': [q['id'] for q in review.get('retainedSourceIssues', {}).get('issues', [])]}
                require(value['text'] == review['after'] and
                        (field == 'name' or value['html'] == review['proposedHtml']), 'accepted new field tampered')
                if issue == 343:
                    proof['currentInputBinding'] = BOOK + 'issue-365/missing-translations-rebound.jsonl'
            elif original['kind'] == 'chm':
                proof = retained_proof(tid, field, value, inputs[tid], reviews[tid])
                (retained_names if field == 'name' else retained_bodies).append(tid)
            else:
                require(original['kind'] in ['native', 'independent'], 'unreviewed final fallback')
                if original['kind'] == 'native':
                    accepted, line = native[tid]
                    require(accepted['sourceKey'] == original['sourceKey'], 'native owner changed')
                    proof = {'disposition': 'accepted-native-source-bound', 'revision': UNION,
                             'rowRef': BOOK + 'issue-329/native-accepted.jsonl:' + str(line)}
                    if field == 'body':
                        require(accepted.get('descriptionHtml'), 'missing native body owner')
                    else:
                        require(value['text'] == accepted['name'], 'native name tampered')
                else:
                    accepted, line = independent[tid, field]
                    proof = {'disposition': accepted['status'], 'revision': UNION,
                             'rowRef': BOOK + 'issue-329/independent-proposed-union.jsonl:' + str(line),
                             'sourcePages': accepted['sourcePages'],
                             'sourceQuestionIds': [q['id'] for q in accepted.get('retainedSourceIssues', {}).get('issues', [])]}
                    if field == 'name':
                        require(value['text'] == accepted['after'], 'independent name tampered')
                if field == 'body':
                    active = amendments.get(tid)
                    if active:
                        review = active['review']
                        require(value['text'] == review['after'] and value['html'] == review['proposedHtml'], 'active amendment tampered')
                        proof['activeAmendment'] = original['activeAmendment']
                        proof['disposition'] = review['status']
                        proof['sourcePages'] = review['sourcePages']
                        proof['sourceQuestionIds'] = [q['id'] for q in review.get('retainedSourceIssues', {}).get('issues', [])]
                    elif original['kind'] == 'independent':
                        require(value['text'] == accepted['after'] and value['html'] == accepted['proposedHtml'], 'independent body tampered')
                    else:
                        require(value['html'] == accepted['descriptionHtml'] and html_text_matches(value['html'], value['text']),
                                'native body tampered')
            proof['originalEntry'] = {'revision': COVERAGE, 'rowRef': ref, 'sourcePages': canonical['sourcePages'],
                                      'englishDisposition': canonical['english']['status']}
            fields.append({'targetId': tid, 'rulebookId': 86, 'field': field, **value, 'review': proof})
    require(len(retained_names) == 948, 'retained name source coverage differs')
    require(retained_bodies == [3855, 4546, 4583, 4726, 4761], 'retained body source coverage differs')
    return fields


def derive_final(args):
    code, data, runtime = (Path(getattr(args, key)).resolve(strict=True) for key in ['code_root', 'data_root', 'runtime_root'])
    require(code == Path(__file__).resolve().parents[2], 'code-root must match the invoking helper checkout')
    sys.path.insert(0, str(code / 'data-tools/pdf-extract/src'))
    from pdf_extract.verify_effective_sc import load_current_sc_sources, verify_sc_authority
    from pdf_extract.verify_evidence import verify_evidence
    import pymupdf
    pymupdf.TOOLS.mupdf_display_errors(False)  # Existing PHB embedded-profile diagnostics.
    source = {'sc': data / 'artifacts/pdf/spell-compendium/Spell Compendium.pdf',
              'errata': data / 'artifacts/pdf/spell-compendium/SpellComp_Errata.pdf',
              'phb': data / 'artifacts/pdf/phb3.5/Player Handbook v3.5.pdf',
              'phb-errata': data / 'artifacts/pdf/phb3.5/PHBErrata02172006.pdf'}
    node = subprocess.run(['node', str(code / 'data-tools/audits/sc-final-inputs.cjs'), str(code), str(runtime), str(data),
                           '--final-rules' if getattr(args, 'final_rules', False) else str(Path(args.original_rules).resolve(strict=True)), str(Path(args.rules_db).resolve(strict=True)),
                           str(Path(args.content_db).resolve(strict=True)),
                           *(['--accepted-english-title'] if getattr(args, 'accepted_english_title', False) else []),
                           *(['--accepted-source-pairs'] if getattr(args, 'accepted_source_pairs', False) else []),
                           *(['--accepted-source-fidelity'] if getattr(args, 'accepted_source_fidelity', False) else [])], capture_output=True, encoding='utf8')
    require(node.returncode == 0, 'complete QA/rules rehearsal failed: ' + node.stderr)
    derived = json.loads(node.stdout)
    evidence = Evidence(data, COVERAGE)
    reviews = canonical_reviews(evidence)
    fields = bind_fields(derived, reviews)
    union, old_amendment, _old_final, authority, _amendments, _count = load_current_sc_sources(data)
    original_pdf = {(row['targetId'], 'name' if row['field'] == 'name' else 'body'): row for row in union['bindings']}
    audits = {row['sourceKey']: (row, line) for line, row in enumerate(
        evidence.book('issue-259/fresh-qa/full-body-audit.jsonl'), 1)}
    originals = {row['targetId']: row for row in derived['native']}
    for row in fields:
        if row['origin']['kind'] in ['native', 'independent'] and row['review']['revision'] == UNION:
            binding = original_pdf[row['targetId'], row['field']]
            row['review']['originalAcceptedPdfBinding'] = {
                'revision': UNION, 'sourceKey': binding['sourceKey'], 'field': binding['field'],
                'sourcePages': binding['pages']}
            if row['origin']['kind'] == 'native':
                if 'activeAmendment' not in row['origin']:
                    row['review']['sourcePages'] = binding['pages']
                if row['field'] == 'body':
                    audit, line = audits[row['origin']['sourceKey']]
                    require(audit['targetId'] == row['targetId'] and
                            audit['effectiveText'] == originals[row['targetId']]['descriptionHtml'], 'native full-body audit mismatch')
                    row['review']['originalFullBodyAudit'] = {'revision': COVERAGE,
                        'rowRef': BOOK + 'issue-259/fresh-qa/full-body-audit.jsonl:' + str(line)}
    # Bind each superseded layer too; replacement4736 may not hide a forged prior.
    pdf = {'authority': verify_sc_authority(authority, source),
           'originalUnion': verify_evidence(union, derived['reviews'], source),
           'currentPrior': verify_evidence(old_amendment, [r['review'] for r in derived['amendments']], source)}
    for issue, revision, decisions in [(343, MISSING, derived['rebound']),
                                       (347, RESIDUAL, derived['additions'] + [r['review'] for r in derived['replacement']])]:
        document = Evidence(data, revision).book(f'issue-{issue}/pdf-evidence.json')
        pdf[str(issue)] = verify_evidence(document, decisions, source)
    pdf['frozenOriginalCoverage'] = original_replay(evidence, reviews, code,
        runtime / 'data-tools/pdf-extract/.venv/Lib/site-packages')
    # Publisher evidence authenticates ownership only. Recompare the accepted
    # helper's full page/text/geometry record without rerunning its sibling writes.
    identity = Evidence(data, IDENTITY)
    identity.text(BOOK + 'issue-349/verify_pdf.py')
    saved = identity.book('issue-349/pdf-verification.json')
    import hashlib
    sample = data / BOOK / 'issue-349/3729-sample.pdf'
    require(sample.stat().st_size == saved['pdfBytes'] and
            hashlib.sha256(sample.read_bytes()).hexdigest() == saved['pdfSha256'], 'publisher source differs')
    with pymupdf.open(sample) as document:
        require(document.page_count == saved['pdfPages'], 'publisher page count differs')
        for page in saved['freshPages']:
            actual = document[page['pageIndex']]
            require(actual.get_text() == page['text'] and
                    json.loads(json.dumps([b for b in actual.get_text('dict')['blocks'] if b['type'] == 0])) == page['blocks'],
                    'publisher identity evidence differs')
    pdf['publicationIdentity'] = {'revision': IDENTITY, 'path': BOOK + 'issue-349/pdf-verification.json',
                                  'acceptedPdfBytesAndPagesMatched': True, 'ownershipOnly': True, 'bodyQa': False}
    relationships = Evidence(data, RELATIONS).book('issue-354/decisions.json')
    require(relationships['targetCount'] == 17 and relationships['tupleCount'] == 20 and
            relationships['sourceCorrectClaims'] == 0 and not relationships['patchOperations'],
            'relationship disposition changed')
    retained = {'names': [r['targetId'] for r in fields if r['field'] == 'name' and r['review']['disposition'] == 'source-reviewed-retention'],
                'bodies': [r['targetId'] for r in fields if r['field'] == 'body' and r['review']['disposition'] == 'source-reviewed-retention']}
    report = {'issue': 365, 'codeBase': '37711b9b270b4f1931729dc3eccf3c67a9a5dd41',
              'sourceRevisions': {'union': UNION, 'currentPrior': CURRENT, 'originalCoverage': COVERAGE,
                                  'missingTranslations': MISSING, 'sourceResiduals': RESIDUAL,
                                  'identity': IDENTITY, 'unresolvedRelations': RELATIONS},
              'acceptedMissingAuthoringHelperRevision': 'bcb7252b979bc5d3102676d0fda432874898961f',
              'historicalSourceNamespace': '9847e70236cd4bcd841347ed1b42b2f478826268',
              'historicalMappingNamespace': '4cd593b44e73f591d46e2f35a90d882befc19702',
              'unchangedInputBindings': {'restoredCorpusQaRevision': 'fe089990e2a5eeac69c92e068ca695f10c42ec58',
                  'corpusDirectory': 'spells-dice-db-by-mo',
                  'intakeAndPublicationRevision': CURRENT,
                  'paths': ['dice-intake/candidates.jsonl', 'dice-intake/source-inventory.jsonl',
                            'dice-intake/publication-map.json', 'chm-mapping/enName-aliases-global.json',
                            'rulebook-publications/publications.jsonl'],
                  'freshGlobalIntake': True, 'changedCandidateSourceKeys': [r['sourceKey'] for r in derived['candidateChanges']]},
              'scope': len(derived['output']), 'fields': len(fields),
              'changedNames': len(derived['changed']['names']), 'changedBodies': len(derived['changed']['bodies']),
              'changedFields': sum(len(r) for r in derived['changed'].values()),
              'changedTargetIds': derived['changed'], 'retained': retained,
              'inputBindingChanges': derived['bindingChanges'], 'intakeCandidateChanges': len(derived['candidateChanges']),
              'rulesRehearsal': derived['rulesRehearsal'], 'pdfVerification': pdf,
              'unresolvedRelationships': {'revision': RELATIONS, 'path': BOOK + 'issue-354/decisions.json',
                                           'targets': 17, 'tuples': 20, 'status': 'unresolved-missing-other-original-books'},
              'sourceQuestionIds': [{'targetId': r['targetId'], 'field': r['field'], 'ids': r['review'].get('sourceQuestionIds', [])}
                                    for r in fields if r['review'].get('sourceQuestionIds')],
              'inspectionOnly': True, 'importable': False, 'candidateAccepted': False, 'wholeBookQaComplete': False,
              'operatorWrites': False, 'summariesReadOrEdited': False, 'appStateAccess': False,
              'postMigrationBoundary': 'full field/text/HTML and origin/review matching may use this exact derived candidate; '
                  'this replay itself requires original/patched/content rehearsal snapshots. #346 must supply final accepted-input '
                  'selection, final rules/content build provenance and post-write validation independent of removable rehearsal DBs.'}
    return {'current-inputs.json': {'inputs': derived['inputs']},
            'missing-translations-rebound.jsonl': derived['rebound'],
            'candidate-changes.jsonl': derived['candidateChanges'],
            'field-dispositions.jsonl': fields, 'report.json': report}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ['code-root', 'helper-revision', 'data-root', 'runtime-root', 'original-rules', 'rules-db', 'content-db', 'candidate-baseline', 'output']:
        parser.add_argument('--' + key, required=True)
    args = parser.parse_args()
    exact_candidate(args.candidate_baseline)
    destination = Path(args.output).resolve()
    require(destination.is_relative_to(Path(args.data_root).resolve() / BOOK / 'issue-365'), 'output outside own path')
    require(not destination.exists(), 'output exists')
    candidate = Evidence(args.data_root, args.candidate_baseline)
    require(re.fullmatch(r'[0-9a-f]{40}', args.helper_revision) is not None, 'require exact code helper revision')
    code = Evidence(args.code_root, args.helper_revision)
    for name in ['data-tools/audits/sc_final_binding.py', 'data-tools/audits/sc-final-inputs.cjs',
                 'data-tools/audits/sc_coverage.py']:
        code.text(name)
    helper_paths = ['data-tools/audits', 'data-tools/src/dice-intake', 'data-tools/src/rules',
                    'data-tools/src/shared', 'data-tools/pdf-extract/src']
    require(not code.git('diff', args.helper_revision, '--', *helper_paths) and
            not code.git('status', '--porcelain', '--', *helper_paths), 'changed code helpers/dependencies')
    result = derive_final(args)
    compare_candidate(candidate, result)
    with destination.open('x', encoding='utf8', newline='\n') as stream:
        json.dump({'candidateRevision': args.candidate_baseline, 'helperRevision': args.helper_revision,
                   **result['report.json']}, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps({'candidateRevision': args.candidate_baseline, 'scope': result['report.json']['scope'],
                      'changedFields': result['report.json']['changedFields'], 'output': str(destination)}))


if __name__ == '__main__':
    main()
