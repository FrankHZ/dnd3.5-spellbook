"""Read-only #344 evidence reconciliation; no importer or acceptance decisions.

Python standard library suffices. Optional original-span replay uses the existing
PDF extractor and an explicitly supplied, already installed PyMuPDF runtime.
All evidence is read through Git at explicit revisions and compared with working
text (allowing Git checkout CRLF). Output never contains source or translated text.
"""
import argparse
import ast
import collections
import copy
from contextlib import closing
import json
from html.parser import HTMLParser
from pathlib import Path
import sqlite3
import subprocess
import sys

BOOK = 'dice-qa/books/86/'
UNION = '296903c61e20ce359812148fc0faa234ca2508e7'
AMENDMENTS = '6a73f4d64682325c67e2c40595008344fb5c3be5'
FIELDS = {'castingTime': 'casting_time', 'range': 'range', 'target': 'target',
          'effect': 'effect', 'area': 'area', 'duration': 'duration',
          'savingThrow': 'saving_throw', 'spellResistance': 'spell_resistance',
          'description': 'description', 'descriptionHtml': 'description_html',
          'page': 'page', 'subschoolId': 'sub_school_id'}
COMPONENTS = {'verbal': 'verbal_component', 'somatic': 'somatic_component',
              'material': 'material_component', 'arcaneFocus': 'arcane_focus_component',
              'divineFocus': 'divine_focus_component', 'xp': 'xp_component',
              'metaBreath': 'meta_breath_component', 'trueName': 'true_name_component',
              'corrupt': 'corrupt_component', 'extra': 'extra_components'}
MISSING = [3846, 4521, 4611, 4612, 4613, 4614, 4616, 4617, 4677]
RETAINED_BODIES = [3855, 4546, 4583, 4726, 4761]


def require(condition, message):
    if not condition:
        raise ValueError(message)


class Evidence:
    def __init__(self, root, revision):
        self.root = Path(root).resolve(strict=True)
        self.revision = self.git('rev-parse', revision + '^{commit}')
        self.files = {}

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args],
                                       encoding='utf8').strip()

    def text(self, path, revision=None):
        revision = revision or self.revision
        key = (revision, path)
        if key not in self.files:
            raw = subprocess.check_output(['git', '-C', str(self.root), 'show',
                                           revision + ':' + path])
            require((self.root / path).read_text('utf8') == raw.decode('utf8').replace('\r\n', '\n'),
                    'working evidence differs from Git: ' + path)
            self.files[key] = raw.decode('utf8')
        return self.files[key]

    def read(self, path, revision=None):
        text = self.text(path, revision)
        return ([json.loads(line) for line in text.splitlines() if line.strip()]
                if path.endswith('.jsonl') else json.loads(text))

    def book(self, path, revision=None):
        return self.read(BOOK + path, revision)


def readonly(path):
    path = Path(path).resolve(strict=True)
    require(path.name in ['rules-clean.sqlite', 'content.sqlite'], 'unexpected DB role')
    db = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
    db.execute('PRAGMA query_only=ON')
    db.text_factory = lambda value: value.decode('utf8', errors='replace')
    db.row_factory = sqlite3.Row
    return closing(db)


def rows(db, query):
    return [dict(row) for row in db.execute(query)]


def html_text_matches(html, text):
    """Same whitespace-insensitive text parity boundary as effective.ts.

    Text parity is a representation check, not a new semantic/visual review.
    """
    class Text(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.parts = []
        def handle_data(self, data):
            self.parts.append(data)
    parser = Text()
    parser.feed(html or '')
    return ''.join(''.join(parser.parts).split()) == ''.join((text or '').split())


def current_inputs(rules, content, evidence):
    """Compare the current baseline and guarded patch to the accepted snapshot.

    This only projects declared edits into Python values for comparison. It does
    not execute SQL, rebuild indexes, back up databases or implement an importer.
    The maintained rules patch/QA/writer remain the execution owners.
    """
    with readonly(rules) as db:
        spells = {r['id']: r for r in rows(db, 'SELECT * FROM dnd_spell WHERE rulebook_id=86')}
        baseline = {r['id']: r for r in evidence.book('issue-259/baseline-spells.jsonl')}
        require(spells == baseline, 'operator SC baseline differs from reviewed baseline')
        school = {r['id']: r['name'] for r in rows(db, 'SELECT id,name FROM dnd_spellschool')}
        sub = {r['id']: r['name'] for r in rows(db, 'SELECT id,name FROM dnd_spellsubschool')}
        classes = {r['name']: r['id'] for r in rows(db, 'SELECT id,name FROM dnd_characterclass')}
        edition = db.execute('SELECT dnd_edition_id FROM dnd_rulebook WHERE id=86').fetchone()[0]
        descriptors = collections.defaultdict(list)
        for r in rows(db, 'SELECT sd.spell_id,d.name FROM dnd_spell_descriptors sd '
                          'JOIN dnd_spelldescriptor d ON d.id=sd.spelldescriptor_id '
                          'ORDER BY sd.spell_id,d.name'):
            descriptors[r['spell_id']].append(r['name'])
        class_levels = collections.defaultdict(list)
        for r in rows(db, 'SELECT * FROM dnd_spellclasslevel ORDER BY id'):
            class_levels[r['spell_id']].append([r['character_class_id'], r['level'], r['extra']])
        domains = collections.defaultdict(list)
        for r in rows(db, 'SELECT * FROM dnd_spelldomainlevel ORDER BY id'):
            domains[r['spell_id']].append([r['domain_id'], r['level'], r['extra']])
    patch = evidence.read('rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl')
    for op in patch:
        require(op['op'] == 'updateSpell' and op['id'] in spells, 'unexpected patch operation')
        spell = spells[op['id']]
        for field, value in op.get('expected', {}).get('spell', {}).items():
            if field == 'components':
                require(all(spell[COMPONENTS[k]] == v for k, v in value.items()), 'component guard differs')
            else:
                require(spell[FIELDS[field]] == value, 'spell guard differs: ' + str(op['id']))
        if 'descriptors' in op.get('expected', {}):
            require(sorted(descriptors[op['id']]) == sorted(op['expected']['descriptors']), 'descriptor guard differs')
        for field, value in op.get('spell', {}).items():
            if field == 'components':
                spell.update({COMPONENTS[k]: v for k, v in value.items()})
            else:
                spell[FIELDS[field]] = value
        if 'descriptors' in op:
            descriptors[op['id']] = sorted(op['descriptors'])
        for item in op.get('levels', {}).get('classes', []):
            current = class_levels[op['id']]
            found = [r for r in current if r[0] == classes[item['class']] and r[2] == item['extra']]
            require(len(found) <= 1 and (found[0][1] if found else None) == item['expectedLevel'],
                    'class-level guard differs')
            if found:
                found[0][1] = item['level']
            else:
                current.append([classes[item['class']], item['level'], item['extra']])
    with readonly(content) as db:
        chinese = {r['spellId']: {'name': r['name'], 'descriptionText': r['descriptionText'],
                                 'descriptionHtml': r['descriptionHtml']}
                   for r in rows(db, "SELECT spellId,name,descriptionText,descriptionHtml FROM I18nSpellText "
                                     "WHERE rulebookId=86 AND lang='zh' AND variant='chm'")}
    current = {}
    for tid, s in spells.items():
        mechanics = {k: s[v] for k, v in FIELDS.items() if k not in ['description', 'descriptionHtml', 'page', 'subschoolId']}
        mechanics.update(school=school[s['school_id']], subschool=sub.get(s['sub_school_id']),
                         descriptors=descriptors[tid], components={k: s[v] for k, v in COMPONENTS.items()},
                         classLevels=class_levels[tid], domainLevels=domains[tid])
        current[tid] = {'targetId': tid, 'english': {'name': s['name'], 'rulebookId': 86,
                        'editionId': edition, 'description': s['description'], 'mechanics': mechanics},
                        'englishHtml': s['description_html'],
                        'chinese': chinese.get(tid, {'name': None, 'descriptionText': None, 'descriptionHtml': None})}
    snapshot = {r['targetId']: r for r in evidence.book('issue-329/current-inputs.json', UNION)['inputs']}
    # Class/domain relation insertion order is not semantic, but all tuple values
    # and multiplicities are. The maintained snapshot also preserves that order.
    for tid, actual in current.items():
        expected = copy.deepcopy(snapshot[tid])
        for k in ['classLevels', 'domainLevels']:
            actual['english']['mechanics'][k].sort()
            expected['english']['mechanics'][k].sort()
        require(actual == expected, 'current accepted input differs: ' + str(tid))
    require(current.keys() == snapshot.keys(), 'SC target universe differs')
    return snapshot, {'operatorBaselineRows': len(spells), 'guardedPatchOperations': len(patch),
                      'completeCurrentInputMatches': len(snapshot), 'databaseWrites': False}


def canonical_reviews(evidence):
    entries = {r['targetId']: r for r in evidence.book('issue-259/pdf-entry-packets.json')}
    boundaries = {'a': (5, 78), 'b': (124, 243), 'c': (99, 123), 'd': (79, 98)}
    result = {}
    for owner, (lo, hi) in boundaries.items():
        path = BOOK + f'issue-259/review-{owner}/joint-review-results.jsonl'
        for line, row in enumerate(evidence.read(path), 1):
            if lo <= entries[row['targetId']]['startPageIndex'] <= hi:
                require(row['targetId'] not in result and row['english']['status'] != 'unreviewed',
                        'duplicate/unread canonical review')
                result[row['targetId']] = (row, path + ':' + str(line))
            else:
                require(owner == 'a' and row['english']['status'] == 'unreviewed', 'unexpected transferred row')
    require(len(result) == len(entries) == 1001, 'canonical original-entry coverage differs')
    return result


def reviewed_english(row):
    current = copy.deepcopy(row['inputBinding']['english'])
    html = row['inputBinding']['englishHtml']
    for edit in row['english']['edits']:
        if edit['field'] == 'descriptionHtml':
            html = edit['new']
        else:
            current[edit['field']] = edit['new']
    for edit in row['mechanics']['edits']:
        if edit['field'] == 'page':
            continue  # Original entry locator; separately bound by the guarded patch.
        target = current['mechanics']
        parts = edit['field'].split('.')
        for part in parts[:-1]:
            target = target[part]
        target[parts[-1]] = edit['new']
    for k in ['classLevels', 'domainLevels']:
        current['mechanics'][k].sort()
    return current, html


def selected_fields(evidence, current):
    native = evidence.book('issue-329/native-accepted.jsonl', UNION)
    independent = evidence.book('issue-329/independent-proposed-union.jsonl', UNION)
    selected = {}
    audits = {r['targetId']: (r, i) for i, r in enumerate(evidence.book('issue-259/fresh-qa/full-body-audit.jsonl'), 1)}
    decisions = {r['sourceKey']: r for r in evidence.book('issue-259/fresh-qa/decisions.jsonl')}
    for line, row in enumerate(native, 1):
        decision = decisions[row['sourceKey']]
        before, bound = current[row['targetId']], decision['input']
        require(bound['englishName'] == before['english']['name'] and
                bound['englishDescription'] == before['english']['description'] and
                bound['englishMechanics'] == before['english']['mechanics'] and
                bound['baselineName'] == before['chinese']['name'] and
                bound['baselineBody'] == before['chinese']['descriptionText'], 'native current binding differs')
        for field in ['name', 'descriptionHtml']:
            if field in row:
                require(decision['fields'][field]['status'] == 'accepted', 'native field was not accepted')
                if field == 'descriptionHtml':
                    audit, audit_line = audits[row['targetId']]
                    require(audit['sourceKey'] == row['sourceKey'] and audit['effectiveText'] == row[field],
                            'native full-body audit differs')
                selected[row['targetId'], 'name' if field == 'name' else 'body'] = {
                    'value': row[field], 'owner': 'native', 'row': row,
                    'ref': BOOK + 'issue-329/native-accepted.jsonl:' + str(line),
                    **({'fullBodyAuditRef': BOOK + 'issue-259/fresh-qa/full-body-audit.jsonl:' + str(audit_line)}
                       if field == 'descriptionHtml' else {})}
    for line, row in enumerate(independent, 1):
        key = (row['targetId'], 'name' if row['field'] == 'name' else 'body')
        require(key not in selected, 'accepted owner overlap')
        require(row['input'] == current[row['targetId']] or
                {**row['input'], 'targetId': row['targetId']} == current[row['targetId']],
                'independent current-input binding differs: ' + str(key))
        selected[key] = {'value': row['after'] if key[1] == 'name' else row['proposedHtml'],
                         'owner': 'independent', 'row': row,
                         'ref': BOOK + 'issue-329/independent-proposed-union.jsonl:' + str(line)}
    for line, amendment in enumerate(evidence.book('issue-335/validated-amendments.jsonl', AMENDMENTS), 1):
        key = (amendment['targetId'], 'body')
        prior = selected[key]
        require(prior['owner'] == amendment['prior']['owner'] and prior['row'] == amendment['prior']['acceptedRow'],
                'amendment prior owner/row differs')
        prior.update(value=amendment['review']['proposedHtml'], row=amendment['review'],
                     priorRef=prior['ref'], ref=BOOK + 'issue-335/validated-amendments.jsonl:' + str(line))
        if 'fullBodyAuditRef' in prior:
            prior['priorFullBodyAuditRef'] = prior.pop('fullBodyAuditRef')
        audit = amendment['review']['fullBodyAudit']
        require(audit['effectiveHtml'] == prior['value'] and audit['effectiveText'] == amendment['review']['after'],
                'amendment full-body binding differs')
    require(len(selected) == 1026, 'accepted field coverage differs')
    return selected


def name_coverage(tid, current, review, selected):
    accepted = selected.get((tid, 'name'))
    if accepted:
        return {'status': 'accepted-source-bound', 'evidence': accepted['ref']}
    if tid == 4837:
        return {'status': 'identity-outside-SC', 'issue': 197}
    if tid in MISSING:
        return {'status': 'missing-Chinese', 'issue': 343}
    row, ref = review
    same = current['chinese']['name'] == row['chinese']['effectiveName']
    return {'status': ('reviewed-retention' if row['chinese']['name']['status'] == 'source-correct' and same
                       else 'unresolved-terminology' if same else 'changed-since-name-review'),
            'currentValueMatches': same, 'priorStatus': row['chinese']['name']['status'], 'evidence': ref}


def slices(uncovered, current, size=50):
    """Exact field inventory, ordered by source page rather than alphabetic ID."""
    ordered = sorted(uncovered, key=lambda tid: (current[tid].get('page', 0), tid))
    return [{'kind': 'summary-source-QA', 'fields': {str(t): uncovered[t] for t in ordered[i:i + size]},
             'sourcePagesByTarget': {str(t): current[t].get('sourcePages', []) for t in ordered[i:i + size]},
             'sourceDependencies': ['SC complete entry and direct parents', 'SC applicable printing and complete official errata'],
             'scope': 'Only listed current summary rows; retain paired English/mechanics/Chinese context and existing passes'}
            for i in range(0, len(ordered), size)]


def original_replay(evidence, reviews, code_root, runtime):
    sys.path[:0] = [str(Path(runtime).resolve(strict=True)), str(Path(code_root) / 'data-tools/pdf-extract/src')]
    import pymupdf
    from pdf_extract.extraction import extract_page
    pymupdf.TOOLS.mupdf_display_errors(False)  # Known PHB embedded color-profile warnings, not text/span mismatches.
    # Old extractor caches are ignored/untracked. They are comparison aids only;
    # Git-authenticated review locators and printing/errata remain the evidence.
    caches = set()
    def cache(path):
        caches.add(path)
        return [json.loads(line) for line in (evidence.root / path).read_text('utf8').splitlines() if line.strip()]
    saved = {('sc', r['page_index']): r for r in cache('artifacts/pdf-extract/issue-259/sc-pages-005-243.jsonl')}
    saved.update({('errata', r['page_index']): r for r in cache('artifacts/pdf-extract/issue-259/errata-000.jsonl')})
    used = collections.defaultdict(set)
    sources = {'sc': 'artifacts/pdf/spell-compendium/Spell Compendium.pdf',
               'errata': 'artifacts/pdf/spell-compendium/SpellComp_Errata.pdf',
               'phb': 'artifacts/pdf/phb3.5/Player Handbook v3.5.pdf'}
    for row, _ in reviews.values():
        for page in row['sourcePages']:
            key = (page['sourceId'], page['pageIndex'])
            if key not in saved:
                old = page['extractPath'].replace('\\', '/')
                marker = '/dice-qa/' if '/dice-qa/' in old else '/artifacts/'
                require(marker in old, 'unrecognized legacy extraction path')
                logical = marker[1:] + old.split(marker, 1)[1]
                matches = [r for r in cache(logical) if r['page_index'] == page['pageIndex']]
                require(len(matches) == 1, 'missing directed extraction')
                saved[key] = matches[0]
            used[key].update(tuple(r) for r in page['spanRefs'])
    for (sid, pi), refs in used.items():
        with pymupdf.open(evidence.root / sources[sid]) as pdf:
            actual = json.loads(json.dumps(extract_page(pdf[pi], {})))
        expected = saved[sid, pi]
        require(all(actual[k] == expected[k] for k in ['extractor', 'options', 'geometry']), 'PDF geometry/extractor differs')
        for b, line, span in refs:
            require(actual['blocks'][b]['lines'][line]['spans'][span] == expected['blocks'][b]['lines'][line]['spans'][span],
                    'original PDF span differs')
    authority = evidence.book('issue-259/source-authority.json')
    for sid in ['sc', 'errata']:
        source = authority['sources'][sid]
        with pymupdf.open(evidence.root / sources[sid]) as pdf:
            require(pdf.page_count == source['pageCount'], 'authority page count differs')
            actual = json.loads(json.dumps(extract_page(pdf[source['pageIndex']], {})))
        for span in source['spans']:
            b, line, s = span['ref']
            require(actual['blocks'][b]['lines'][line]['spans'][s] == span['value'], 'printing/complete errata differs')
    return {'pages': len(used), 'spans': sum(map(len, used.values())),
            'printingAndCompleteOfficialErrata': 'matched', 'semanticRereview': False,
            'ignoredExtractionCaches': sorted(caches), 'cacheRole': 'comparison-only; no Git historical continuity claim'}


def audit(args):
    code = Evidence(args.code_root, args.public_helper_revision)
    code.text('data-tools/audits/sc_coverage.py')
    evidence = Evidence(args.data_root, args.private_revision)
    current, db_checks = current_inputs(args.rules_db, args.content_db, evidence)
    reviews = canonical_reviews(evidence)
    selected = selected_fields(evidence, current)
    coverage = []
    for tid, value in sorted(current.items()):
        review = reviews.get(tid)
        english = {'status': 'identity-outside-SC'}
        if review:
            row, ref = review
            en, html = reviewed_english(row)
            actual = copy.deepcopy(value['english'])
            for k in ['classLevels', 'domainLevels']:
                actual['mechanics'][k].sort()
            english = {'nameMatches': en['name'] == actual['name'],
                       'bodyMatches': en['description'] == actual['description'],
                       'htmlMatches': html == value['englishHtml'],
                       'mechanicsMatches': en['mechanics'] == actual['mechanics'],
                       'englishDisposition': row['english']['status'],
                       'mechanicsDisposition': row['mechanics']['status'], 'evidence': ref}
        body = selected.get((tid, 'body'))
        if body:
            body_evidence = {'status': body['row'].get('status', 'accepted-native-source-bound'),
                             'evidence': body['ref'], 'owner': body['owner'],
                             'sourceIssues': [q['id'] for q in body['row'].get('retainedSourceIssues', {}).get('issues', [])]}
            if 'fullBodyAuditRef' in body:
                body_evidence['fullBodyAuditEvidence'] = body['fullBodyAuditRef']
        else:
            status = ('missing-Chinese' if tid in MISSING else 'verified-retention' if tid in RETAINED_BODIES
                      else 'external-operative-expansion' if tid in [3997, 4097] else 'identity-outside-SC')
            body_evidence = {'status': status, 'evidence': review[1] if review else BOOK + 'issue-259/source-anomaly-4837.json'}
            if tid in RETAINED_BODIES:
                row = review[0]
                same = ((row['chinese'].get('effectiveBodyText') or row['inputBinding'].get('fallbackZhBody')) == value['chinese']['descriptionText'])
                body_evidence['currentTextMatches'] = same
                body_evidence['priorReviewBoundHtml'] = row['inputBinding']['effectiveZhHtml'] is not None
                body_evidence['currentHtmlTextParity'] = html_text_matches(value['chinese']['descriptionHtml'],
                                                                           value['chinese']['descriptionText'])
                require(same and body_evidence['currentHtmlTextParity'], 'retained body text/parity differs')
        coverage.append({'targetId': tid, 'englishAndMechanics': english,
                         'chineseName': name_coverage(tid, value, review, selected), 'chineseBody': body_evidence})
    summaries = [r for r in evidence.read('short-desc-normalized/summaries.generated.jsonl') if r['rulebookId'] == 86]
    decisions = {(r['targetId'], r['lang']): r for r in evidence.book('issue-323/decisions.jsonl')}
    summary_map, uncovered = [], collections.defaultdict(list)
    for r in summaries:
        key = (r['spellId'], r['lang'])
        decision = decisions.get(key)
        exact = bool(decision and r['summaryText'] == decision['correctedSummaryText']
                     and r['stableKey'] == decision['stableKey']
                     and r['sourceKind'] == 'reviewed-summary-correction')
        summary_map.append({'targetId': r['spellId'], 'lang': r['lang'], 'variant': r['variant'],
                            'stableKey': r['stableKey'], 'sourceKind': r['sourceKind'],
                            'status': 'exact-reviewed-correction' if exact else 'no-exact-source-summary-pass-located',
                            'evidence': BOOK + 'issue-323/decisions.jsonl' if exact else None})
        if not exact:
            uncovered[r['spellId']].append(r['stableKey'])
    require(sum(r['status'] == 'exact-reviewed-correction' for r in summary_map) == 29, 'summary correction binding differs')
    source_questions = []
    module = ast.parse(evidence.text(BOOK + 'issue-264/review_items.py'))
    items = next(ast.literal_eval(n.value) for n in module.body if isinstance(n, ast.Assign)
                 and any(isinstance(t, ast.Name) and t.id == 'ITEMS' for t in n.targets))
    for tid, topic, category, fields, *_ in items:
        active = selected.get((tid, 'body'), {}).get('row', {})
        notes = active.get('retainedSourceIssues', {}).get('issues', [])
        linked = [q['id'] for q in notes if q['id'] == topic or q['id'] == f'{tid}:{topic}']
        source_questions.append({'targetId': tid, 'questionId': f'{tid}:{topic}', 'fields': fields,
                                 'status': 'official-correction' if tid == 4709 else
                                           'faithful-unresolved-source-note' if linked else 'requires-source-disposition-reconciliation',
                                 'activeNoteIds': linked})
    for tid in [3958, 4153, 4743]:
        active = selected[tid, 'body']['row']
        source_questions.extend({'targetId': tid, 'questionId': q['id'], 'fields': ['chinese.body', 'mechanics'],
                                 'status': 'faithful-unresolved-source-note', 'activeNoteIds': [q['id']]}
                                for q in active['retainedSourceIssues']['issues'])
    # Reconcile every old question by exact field ownership, without calling a
    # body acceptance a source/relationship/identity ruling.
    later = {}
    for issue in [321, 324, 326, 329]:
        path = BOOK + f'issue-{issue}/dispositions.jsonl'
        for line, row in enumerate(evidence.read(path), 1):
            later[row['targetId']] = (row, path + ':' + str(line))
    residuals = []
    name_by_id = {r['targetId']: r['chineseName'] for r in coverage}
    question_by_id = {r['questionId']: r for r in source_questions}
    for row in evidence.book('issue-264/residuals.jsonl'):
        tid, problem = row['targetId'], row['problemId']
        followup = later.get(tid)
        if problem in question_by_id:
            status = question_by_id[problem]['status']
            ref = selected.get((tid, 'body'), {}).get('ref')
        elif row['category'] == 'terminology':
            if all(f.startswith('name') for f in row['affectedFields']):
                status = name_by_id[tid]['status']
                ref = name_by_id[tid].get('evidence')
            else:
                status, ref = 'accepted-body-terminology-disposition', selected[tid, 'body']['ref']
        elif row['category'] == 'identity-mapping':
            status = ('excluded-null-candidate' if tid is None else 'missing-Chinese' if tid in MISSING
                      else 'identity-outside-SC' if tid == 4837 else 'candidate-mapping-boundary-preserved')
            ref = None
        elif problem.endswith(':relation-source'):
            status, ref = 'unverified-extra-relationship-source', None
        elif tid in [3997, 4097]:
            status, ref = 'external-operative-expansion', None
        elif followup and followup[0]['retiredHistoricalObligation']:
            status, ref = 'historical-claim-retired-without-authentication', followup[1]
            require(selected[tid, 'body']['value'] == followup[0]['finalBodyHtml'] or
                    tid in [3781, 3942, 3989, 4089, 4306, 4369, 4376, 4600, 4618, 4736],
                    'later disposition no longer binds selected body')
        elif tid in [4455, 4469, 4477, 4478, 4483, 4486, 4743] and (tid, 'body') in selected:
            status, ref = 'named-reference-without-external-capability-certification', selected[tid, 'body']['ref']
        else:
            status, ref = 'requires-field-disposition-reconciliation', None
        residuals.append({'targetId': tid, 'problemId': problem, 'originalCategory': row['category'],
                          'fields': row['affectedFields'], 'currentStatus': status, 'evidence': ref})
    relations = [r for r in residuals if r['currentStatus'] == 'unverified-extra-relationship-source']
    counts = collections.Counter(r['chineseName']['status'] for r in coverage)
    body_counts = collections.Counter(r['chineseBody']['status'] for r in coverage)
    mismatches = [{ 'targetId': r['targetId'], 'fields': [k for k, v in r['englishAndMechanics'].items()
                   if k.endswith('Matches') and not v]} for r in coverage]
    mismatches = [r for r in mismatches if r['fields']]
    result = {'issue': 344, 'publicBase': args.public_base, 'publicHelperRevision': code.revision,
              'privateInputRevision': evidence.revision,
              'acceptedUnionRevision': UNION, 'acceptedAmendmentRevision': AMENDMENTS,
              'bindingMethod': 'Git show plus working-text (checkout CRLF allowed) and current-field comparison; no new hashes',
              'databaseChecks': db_checks, 'coverage': {'targets': len(current), 'SCOriginalEntries': len(reviews),
                  'nameDispositions': dict(counts), 'bodyDispositions': dict(body_counts),
                  'englishOrMechanicsBindingGaps': mismatches, 'currentSummaryRows': len(summaries),
                  'exactSourceReviewedSummaryRows': 29, 'summaryRowsWithoutExactPass': len(summaries) - 29,
                  'summaryTargetsWithoutExactPass': len(uncovered),
                  'oldResidualDispositions': dict(collections.Counter(r['currentStatus'] for r in residuals))},
              'targets': coverage, 'summaryRows': summary_map, 'sourceQuestions': source_questions,
              'oldResidualReconciliation': residuals,
              'missingSummaryRows': {lang: sorted(set(current) - {r['targetId'] for r in summary_map if r['lang'] == lang})
                                     for lang in ['en', 'zh']},
              'suggestedContentSlices': [
                  {'kind': 'terminology', 'targetIds': [3935, 3944, 4007], 'fields': ['chinese.name'],
                   'ownerIssue': 347, 'ownerStatus': 'in-progress-unaccepted; do not redispatch',
                   'sourceDependencies': ['SC original headings and complete entries', 'applicable Beastlands/Belker/Kolyarut terminology; MM159 for Kolyarut']},
                  {'kind': 'external-operative-expansion', 'targetIds': [3997, 4097], 'fields': ['chinese.body'],
                   'ownerIssue': 347, 'ownerStatus': 'in-progress-unaccepted; do not redispatch',
                   'sourceDependencies': ['SC40 (physical index 39) and SC174 complete entries', 'DMG224/149 only if retaining operative expanded rules; latest authorization allows faithful SC translation with named DMG references and removal of unsupported old expansion']},
                  {'kind': 'relationship-source', 'targets': relations,
                   'sourceDependencies': ['SC full headers/indexes', 'applicable original source for each actual extra membership; compiled DB alone is insufficient']},
                  {'kind': 'prose', 'targetIds': [4736], 'fields': ['chinese.body.flavor'],
                   'ownerIssue': 347, 'ownerStatus': 'in-progress-unaccepted; do not redispatch',
                   'sourceDependencies': ['SC219-220 complete entry and inherited 4727', 'accepted #335 exact current body; preserve operative rules']},
                  {'kind': 'missing-Chinese', 'targetIds': MISSING, 'ownerIssue': 343},
                  {'kind': 'identity', 'targetIds': [4837], 'historicalIssue': 197, 'ownerIssue': 349,
                   'ownerStatus': 'in-progress-unaccepted; no reassignment in this baseline',
                   'sourceDependencies': ['Applicable Magic of Eberron publication and original entry proof; official sample table of contents is new evidence under #349, not SC body QA']},
              ],
              'suggestedSummarySlices': slices(uncovered, {tid: {'page': reviews[tid][0]['sourcePages'][0]['pageIndex'],
                                                                'sourcePages': sorted({(p['sourceId'], p['pageIndex'], p['printedPage'])
                                                                  for p in reviews[tid][0]['sourcePages'] +
                                                                  selected.get((tid, 'body'), {}).get('row', {}).get('sourcePages', [])})}
                                                         for tid in uncovered if tid in reviews} |
                                                        {4837: {'page': 999}}),
              'evidenceFiles': [{'revision': rev, 'path': path} for rev, path in sorted(evidence.files)],
              'contentAcceptance': False, 'databaseWrites': False, 'activation': False}
    if args.pdf_runtime:
        result['originalSpanReplay'] = original_replay(evidence, reviews, args.code_root, args.pdf_runtime)
        result['evidenceFiles'] = [{'revision': rev, 'path': path} for rev, path in sorted(evidence.files)]
    return result


def public_report(result):
    """Compact source-free evidence map, not another live progress ledger."""
    def groups(select):
        grouped = collections.defaultdict(list)
        for row in result['targets']:
            grouped[select(row)].append(row['targetId'])
        return dict(grouped)
    return {k: result[k] for k in ['issue', 'publicBase', 'publicHelperRevision', 'privateInputRevision', 'acceptedUnionRevision',
                                   'acceptedAmendmentRevision', 'bindingMethod', 'databaseChecks', 'coverage',
                                   'sourceQuestions', 'oldResidualReconciliation', 'missingSummaryRows',
                                   'suggestedContentSlices', 'evidenceFiles',
                                   'contentAcceptance', 'databaseWrites', 'activation']} | {
        'nameGroups': groups(lambda row: row['chineseName']['status']),
        'bodyGroups': groups(lambda row: row['chineseBody']['status']),
        'englishDispositionGroups': groups(lambda row: row['englishAndMechanics'].get('englishDisposition', 'identity-outside-SC')),
        'mechanicsDispositionGroups': groups(lambda row: row['englishAndMechanics'].get('mechanicsDisposition', 'identity-outside-SC')),
        'exactReviewedSummaryKeys': [r['stableKey'] for r in result['summaryRows'] if r['status'] == 'exact-reviewed-correction'],
        'suggestedSummarySlices': [
            {k: v for k, v in batch.items() if k != 'sourcePagesByTarget'} |
            {'sourcePages': sorted({tuple(page) for pages in batch['sourcePagesByTarget'].values() for page in pages})}
            for batch in result['suggestedSummarySlices']],
        **({'originalSpanReplay': result['originalSpanReplay']} if 'originalSpanReplay' in result else {}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['data-root', 'private-revision', 'public-base', 'public-helper-revision', 'rules-db', 'content-db', 'output']:
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--code-root', default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument('--pdf-runtime')
    parser.add_argument('--public-output', help='Optional compact source-free JSON under this checkout data-tools/reports')
    args = parser.parse_args()
    # Fail before any output write if either destination already exists.
    require(not Path(args.output).exists(), 'private output exists')
    if args.public_output:
        require(not Path(args.public_output).exists(), 'public output exists')
    result = audit(args)
    output = Path(args.output).resolve()
    require(output.is_relative_to(Path(args.data_root).resolve() / BOOK / 'issue-344'), 'output outside #344 boundary')
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf8', newline='\n') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write('\n')
    if args.public_output:
        public = Path(args.public_output).resolve()
        require(public.is_relative_to(Path(args.code_root).resolve() / 'data-tools/reports'), 'public output outside reports')
        public.parent.mkdir(parents=True, exist_ok=True)
        with public.open('x', encoding='utf8', newline='\n') as f:
            json.dump(public_report(result), f, ensure_ascii=False, indent=2)
            f.write('\n')
    print(json.dumps(result['coverage'], ensure_ascii=False))


if __name__ == '__main__':
    main()
