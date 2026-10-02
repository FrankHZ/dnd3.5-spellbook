'use strict';

// Bounded #365 read-only candidate path. The historical effective entry and its
// writer remain unchanged; this helper derives inputs, never consumes a projection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createRequire, Module} = require('node:module');

const BOOK = 'dice-qa/books/86/';
const UNION = '296903c61e20ce359812148fc0faa234ca2508e7';
const CURRENT = '6a73f4d64682325c67e2c40595008344fb5c3be5';
const MISSING = 'db04cc54684c8e63407341717cb9e00e883f1203';
const RESIDUAL = '00e3c9836be40c878fafe74eb1ad0d915f6d4028';
const IDENTITY = 'b30ef4390aff768ee337a142c11233b2ece3327c';
const MISSING_IDS = [3846, 4521, 4677, 4611, 4612, 4613, 4614, 4616, 4617];

function readExact(data, revision, name) {
  assert.match(revision, /^[0-9a-f]{40}$/, 'require exact input revision');
  assert.equal(execFileSync('git', ['-C', data, 'status', '--porcelain', '--', name], {encoding: 'utf8'}).trim(),
    '', `dirty exact input ${name}`);
  const committed = execFileSync('git', ['-C', data, 'show', `${revision}:${name}`],
    {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  assert.equal(fs.readFileSync(path.join(data, name), 'utf8').replaceAll('\r\n', '\n'),
    committed.replaceAll('\r\n', '\n'), `changed exact input ${name}`);
  return name.endsWith('.jsonl') ? committed.split(/\r?\n/).filter(s => s.trim()).map(JSON.parse)
    : name.endsWith('.json') ? JSON.parse(committed) : committed;
}

function refreshMissing(reviews, english, englishHtml, patchRows) {
  const rebound = structuredClone(reviews);
  for (const row of rebound) {
    const before = row.input.english, after = english.get(row.targetId);
    assert(after, 'missing translation target');
    if (row.targetId === 4617) {
      assert.deepEqual(before.mechanics.descriptors, []);
      assert.deepEqual(after.mechanics.descriptors, ['Sonic'], 'wrong accepted Sonic descriptor');
      assert.deepEqual({...after, mechanics: {...after.mechanics, descriptors: []}}, before,
        'unrelated translation input changed');
      row.input.english = after;
    } else if (row.targetId === 4521) {
      const operations = patchRows.filter(op => op.id === 4521);
      assert.equal(operations.length, 1, 'missing accepted Fly Mass patch');
      const op = operations[0], expected = structuredClone(before);
      assert.deepEqual(Object.keys(op.spell).sort(), ['castingTime', 'description', 'descriptionHtml',
        'duration', 'savingThrow', 'spellResistance']);
      for (const [field, value] of Object.entries(op.spell)) {
        if (field === 'descriptionHtml') {
          assert.equal(row.input.englishHtml, op.expected.spell[field]);
          assert.equal(englishHtml.get(row.targetId), value);
          row.input.englishHtml = value;
        } else if (field === 'description') {
          assert.equal(before.description, op.expected.spell[field]); expected.description = value;
        } else {
          assert.equal(before.mechanics[field], op.expected.spell[field]); expected.mechanics[field] = value;
        }
      }
      assert.deepEqual(after, expected, 'unlisted Fly Mass English change');
      if (row.field === 'descriptionText') {
        const oldParagraphs = before.description.split('\n\n'), paragraphs = after.description.split('\n\n');
        assert.equal(paragraphs.length, oldParagraphs.length, 'Fly Mass paragraph structure changed');
        assert.deepEqual(row.fullBodyAudit.englishEvidence, oldParagraphs);
        assert.deepEqual(row.rulePairs.map(pair => pair.english), oldParagraphs);
        row.fullBodyAudit.englishEvidence = paragraphs;
        row.rulePairs.forEach((pair, i) => {pair.english = paragraphs[i];});
      }
      row.input.english = after;
    } else {
      assert.deepEqual(after, before, 'unrelated translation binding changed');
      assert.equal(englishHtml.get(row.targetId), row.input.englishHtml, 'unrelated translation HTML changed');
    }
  }
  return rebound;
}

// Raw BLOBs preserve the legacy invalid UTF-8 values outside this slice.
function rawRows(db, table) {
  const q = name => '"' + name.replaceAll('"', '""') + '"';
  const columns = db.prepare(`PRAGMA table_info(${q(table)})`).all();
  const fields = columns.map(c => `CASE WHEN typeof(${q(c.name)})='text' THEN CAST(${q(c.name)} AS BLOB)` +
    ` ELSE ${q(c.name)} END AS ${q(c.name)}`);
  return db.prepare(`SELECT ${fields.join(',')} FROM ${q(table)}`).all()
    .map(row => JSON.stringify(row)).sort();
}

function rehearseRules(api, DB, data, originalPath, patchedPath) {
  const original = new DB(originalPath, {readonly: true, fileMustExist: true});
  const patched = new DB(patchedPath, {readonly: true, fileMustExist: true});
  original.pragma('query_only=ON'); patched.pragma('query_only=ON');
  const memory = new DB(original.serialize());
  try {
    memory.pragma('foreign_keys=OFF'); // Maintained legacy patch workflow.
    const indexes = ['create-idx-spell-class-level.sql', 'create-idx-spell-domain-level.sql',
      'derive-spell-class-domain-mapping.sql'].map(name => {
      const sqlPath = path.join(data, 'rules-patches/applied/legacy-sql', name);
      return {sqlPath, sql: readExact(data, CURRENT, 'rules-patches/applied/legacy-sql/' + name)};
    });
    readExact(data, CURRENT, 'rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl');
    const baseline = api.validatePatch(memory,
      path.join(data, 'rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl'));
    assert.deepEqual(baseline.errors, []); assert.equal(baseline.operations.length, 315);
    assert(baseline.operations.every(row => row.kind === 'updateSpell'));
    api.applySpellPatchAtomically(memory, [], baseline.operations, indexes);
    const tables = patched.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all().map(row => row.name);
    const schema = db => db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
    assert.deepEqual(schema(memory), schema(patched), '315 schema mismatch');
    for (const table of tables) assert.deepEqual(rawRows(memory, table), rawRows(patched, table),
      `315 baseline table mismatch ${table}`);
    const ids = memory.prepare('SELECT id FROM dnd_spell ORDER BY id').all();
    assert.equal(ids.length, 5097, 'total IDs changed');
    const sonicProposal = readExact(data, MISSING, BOOK + 'issue-343/rules-patch.jsonl');
    const baselineRows = readExact(data, CURRENT, 'rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl');
    const baselineSonic = baselineRows.filter(row => row.id === 4617);
    const edit = row => {const {source: _source, ...value} = row; return value;};
    assert.equal(sonicProposal.length, 1); assert.equal(baselineSonic.length, 1);
    assert.deepEqual(edit(sonicProposal[0]), edit(baselineSonic[0]), 'Sonic proposal differs from accepted315');
    const repeated = api.validatePatch(memory, path.join(data, BOOK, 'issue-343/rules-patch.jsonl'));
    assert(repeated.errors.some(error => error.includes('expected descriptors')), 'repeated Sonic must reject');
    const beforeIdentity = new Map(tables.map(table => [table, rawRows(memory, table)]));
    assert.throws(() => api.applySpellPatchAtomically(memory, [],
      baseline.operations.filter(row => row.spellId === 4617), indexes), /expected descriptors/);
    for (const table of tables) assert.deepEqual(rawRows(memory, table), beforeIdentity.get(table), 'repeat rollback differs');
    memory.exec(readExact(data, IDENTITY, BOOK + 'issue-349/identity-4837.sql'));
    // Existing maintained index SQL is executed, not hand-adjusted expected rows.
    for (const index of indexes) memory.exec(index.sql);
    const changes = [];
    for (const table of tables) {
      const before = rawRows(patched, table), after = rawRows(memory, table);
      if (table === 'dnd_spell_descriptors') {
        assert.deepEqual(after, before, 'Sonic already belongs to accepted315');
        assert.deepEqual(after, beforeIdentity.get(table), 'identity changed descriptors');
      } else if (table === 'dnd_spell') {
        const expected = before.map(s => {const r = JSON.parse(s); if (r.id === 4837) r.rulebook_id = 9;
          return JSON.stringify(r);}).sort();
        assert.deepEqual(after, expected, 'unlisted spell scalar changed');
        changes.push({table, changedRows: 1, targetId: 4837, field: 'rulebook_id'});
      } else if (table === 'idx_spell_class_level' || table === 'idx_spell_domain_level') {
        const expected = before.map(s => {const r = JSON.parse(s); if (r.spell_id === 4837) {
          r.rulebook_id = 9; r.edition_id = 3;
        } return JSON.stringify(r);}).sort();
        assert.deepEqual(after, expected, 'unlisted index row changed');
        const count = before.filter(s => JSON.parse(s).spell_id === 4837).length;
        if (count) changes.push({table, changedRows: count});
      } else assert.deepEqual(after, before, `unlisted table changed ${table}`);
    }
    assert.deepEqual(memory.prepare('SELECT id FROM dnd_spell ORDER BY id').all(), ids);
    assert.deepEqual(schema(memory), schema(patched), 'new delta changed schema');
    assert.equal(memory.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    return {db: memory, report: {baselineOperations: 315, totalSpellIds: ids.length, tables: tables.length,
      changes, sonicIncludedIn315: true, duplicate343SonicGuardRejected: true,
      allUnlistedFieldsAndRelationsPreserved: true, persistedDatabaseCopies: 0, operatorWrites: false}};
  } catch (error) {memory.close(); throw error;}
  finally {original.close(); patched.close();}
}

function derive(options) {
  const {code, runtime, data, originalRules, rules, content} = options;
  assert.equal(fs.realpathSync(code), fs.realpathSync(path.resolve(__dirname, '../..')),
    'code root must match the invoking helper checkout');
  process.env.NODE_PATH = path.join(runtime, 'node_modules'); Module._initPaths();
  const req = createRequire(path.join(runtime, 'package.json')), ts = req('tsx/cjs/api');
  const load = file => ts.require(path.join(code, 'data-tools/src', file), __filename);
  const qa = load('dice-intake/qa.ts'), effective = load('dice-intake/effective-cli.ts');
  const fallback = load('dice-intake/source-bound-fallback.ts');
  const DB = req('better-sqlite3');
  const exact = (revision, name) => readExact(data, revision, BOOK + name);
  // All original QA, corpus/inventory/mapping and current snapshot checks run first.
  const old = effective.preflightEffectiveSc(data, CURRENT, rules, content);
  const native = exact(UNION, 'issue-329/native-accepted.jsonl');
  const independent = exact(UNION, 'issue-329/independent-proposed-union.jsonl');
  const currentAmendments = exact(CURRENT, 'issue-335/validated-amendments.jsonl');
  readExact(data, CURRENT, 'rulebook-publications/publications.jsonl');
  const {db, report} = rehearseRules(load('rules/spells.ts'), DB, data, originalRules, rules);
  try {
    const english = qa.loadEnglishRecords(db), englishHtml = new Map(db.prepare(
      'SELECT id, CAST(description_html AS BLOB) AS html FROM dnd_spell').all()
      .map(row => [row.id, row.html?.toString('utf8') ?? null]));
    const snapshot = exact(UNION, 'issue-329/current-inputs.json').inputs;
    for (const row of snapshot) {
      const current = english.get(row.targetId);
      const expected = structuredClone(row.english);
      if (row.targetId === 4617) expected.mechanics.descriptors = ['Sonic'];
      if (row.targetId === 4837) {expected.rulebookId = 9; expected.editionId = 3;}
      assert.deepEqual(current, expected, `unlisted English binding changed ${row.targetId}`);
      assert.equal(englishHtml.get(row.targetId), row.englishHtml);
    }
    const targets = new Map([...english].map(([id, row]) => [id, {rulebookId: row.rulebookId,
      zhName: snapshot.find(s => s.targetId === id)?.chinese.name ?? null,
      zhBody: snapshot.find(s => s.targetId === id)?.chinese.descriptionText ?? null}]));
    // Include complete non-SC CHM inputs when replaying global intake.
    const contentDb = new DB(content, {readonly: true, fileMustExist: true});
    try {
      contentDb.pragma('query_only=ON');
      for (const row of contentDb.prepare("SELECT spellId,name,descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'").all()) {
        const target = targets.get(row.spellId); if (target) {target.zhName = row.name; target.zhBody = row.descriptionText;}
      }
    } finally {contentDb.close();}
    const sourceRevision = '9847e70236cd4bcd841347ed1b42b2f478826268';
    const files = fs.readdirSync(path.join(data, 'spells-dice-db-by-mo')).filter(n => n.endsWith('.txt')).sort();
    const parsed = files.map(name => {
      const bytes = fs.readFileSync(path.join(data, 'spells-dice-db-by-mo', name));
      return {bytes: bytes.length, parsed: load('dice-intake/parse.ts').parseDiceFile(name, bytes)};
    });
    const candidates = readExact(data, CURRENT, 'dice-intake/candidates.jsonl');
    const inventory = readExact(data, CURRENT, 'dice-intake/source-inventory.jsonl');
    qa.validateSourceCoverage(parsed, inventory, candidates);
    const refreshed = load('dice-intake/reconcile.ts').reconcile(parsed.flatMap(f => f.parsed.records),
      readExact(data, CURRENT, 'dice-intake/publication-map.json'), db.prepare(
        'SELECT id,dnd_edition_id AS editionId,name FROM dnd_rulebook').all(),
      [...targets].map(([id, target]) => ({id, rulebookId: target.rulebookId,
        enName: english.get(id).name, zhName: target.zhName, zhBody: target.zhBody})), sourceRevision,
      readExact(data, CURRENT, 'chm-mapping/enName-aliases-global.json')).candidates;
    assert.equal(refreshed.length, candidates.length);
    const candidateChanges = refreshed.flatMap((row, i) => JSON.stringify(row) === JSON.stringify(candidates[i])
      ? [] : [{sourceKey: row.sourceKey, before: candidates[i], after: row, reason: 'accepted-4837-publication-identity'}]);
    assert.equal(candidateChanges.length, 1, 'unexpected refreshed intake delta');
    assert.equal(candidateChanges[0].before.targetId, null);
    assert.equal(candidateChanges[0].after.targetId, 4837);
    assert.equal(candidateChanges[0].after.rulebookId, 9);
    assert.equal(candidateChanges[0].after.editionId, 3);
    const scope = qa.selectRulebookScope(86, refreshed, targets, inventory);
    assert.equal(scope.targets.size, 1001, 'missing/extra final SC scope');
    // Native input bindings are unchanged. Revalidation against refreshed intake
    // proves that identity4837 did not silently alter native field ownership.
    const nativeQa = qa.validateReviews(scope.candidates, old.reviews.filter(r => r.sourceKey !== null),
      '4cd593b44e73f591d46e2f35a90d882befc19702', english, scope.targets,
      exact('fe089990e2a5eeac69c92e068ca695f10c42ec58', 'issue-259/fresh-qa/corrections.jsonl'));
    assert.deepEqual(nativeQa.accepted, native);
    const missing = exact(MISSING, 'issue-343/independent-proposed.jsonl');
    assert.deepEqual(missing, exact(MISSING, 'issue-343/source-reviews.jsonl'), 'missing translation accepted export differs');
    assert.deepEqual(missing.map(r => `${r.targetId}:${r.field}`),
      MISSING_IDS.flatMap(id => [`${id}:name`, `${id}:descriptionText`]));
    const rebound = refreshMissing(missing, english, englishHtml,
      readExact(data, CURRENT, 'rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl'));
    const chinese = new Map(old.output.map(row => [row.targetId,
      {name: row.name.text, descriptionText: row.body.text, descriptionHtml: row.body.html}]));
    // Absent translation fields retain their true null baseline, not English fallback.
    for (const id of MISSING_IDS) chinese.set(id, snapshot.find(row => row.targetId === id).chinese);
    fallback.validateSourceBoundFallbackReviews(rebound, 86, english, englishHtml, chinese, native);
    const additions = exact(RESIDUAL, 'issue-347/validated-proposals.jsonl');
    const residualReviews = exact(RESIDUAL, 'issue-347/source-reviews.jsonl');
    assert.deepEqual(additions, residualReviews.slice(0, -1), 'residual accepted export differs');
    assert.deepEqual(additions.map(r => `${r.targetId}:${r.field}`),
      ['3935:name', '3944:name', '4007:name', '3997:descriptionText', '4097:descriptionText']);
    fallback.validateSourceBoundFallbackReviews(additions, 86, english, englishHtml, chinese, native);
    const replacement = exact(RESIDUAL, 'issue-347/validated-amendments.jsonl');
    assert.deepEqual(replacement.map(row => row.review), residualReviews.slice(-1), 'replacement review differs');
    assert.deepEqual(replacement.map(r => r.targetId), [4736]);
    fallback.validateAcceptedBodyAmendments(replacement, {revision: UNION,
      native: {path: BOOK + 'issue-329/native-accepted.jsonl', rows: native},
      independent: {path: BOOK + 'issue-329/independent-proposed-union.jsonl', rows: independent},
      currentAmendments: {revision: CURRENT, path: BOOK + 'issue-335/validated-amendments.jsonl', rows: currentAmendments}},
    86, english, englishHtml, chinese);
    const output = structuredClone(old.output.filter(row => scope.targets.has(row.targetId)));
    const byId = new Map(output.map(row => [row.targetId, row]));
    for (const review of [...rebound, ...additions]) {
      const row = byId.get(review.targetId), field = review.field === 'name' ? 'name' : 'body';
      assert(row && !['native', 'independent'].includes(row[field].origin.kind), 'new field overlaps accepted ledger');
      const origin = {kind: 'independent', sourceKey: null, sourceRef: review.sourceRef,
        sourcePages: review.sourcePages, status: review.status};
      row[field] = field === 'name' ? {text: review.after, origin}
        : {text: review.after, html: review.proposedHtml, origin};
    }
    const amendment = replacement[0], body = byId.get(4736).body;
    assert(body.origin.kind === amendment.prior.owner && body.origin.activeAmendment, 'lost original/current amendment owner');
    body.text = amendment.review.after; body.html = amendment.review.proposedHtml;
    body.origin.activeAmendment = {revision: RESIDUAL, path: BOOK + 'issue-347/validated-amendments.jsonl',
      prior: amendment.prior, sourceRef: amendment.review.sourceRef,
      sourcePages: amendment.review.sourcePages, status: amendment.review.status};
    const inputs = snapshot.filter(row => scope.targets.has(row.targetId)).map(row =>
      ({...row, english: english.get(row.targetId), englishHtml: englishHtml.get(row.targetId)}));
    const changed = {names: [], bodies: []};
    for (const row of output) {
      const before = snapshot.find(s => s.targetId === row.targetId).chinese;
      if (row.name.text !== before.name) changed.names.push(row.targetId);
      if (row.body.text !== before.descriptionText || row.body.html !== before.descriptionHtml) changed.bodies.push(row.targetId);
    }
    assert.deepEqual([output.length, changed.names.length, changed.bodies.length], [1001, 53, 996], 'derived final field counts differ');
    return {output, inputs, rebound, candidateChanges, changed, rulesRehearsal: report,
      bindingChanges: [{targetId: 4837, fields: ['rulebookId', 'editionId'], reason: 'accepted-349-identity',
        revision: IDENTITY, path: BOOK + 'issue-349/identity-4837.sql'},
      ...['name', 'descriptionText'].map(field => ({targetId: 4521, field,
        inputFields: ['english.description', 'englishHtml', 'english.mechanics.castingTime',
          'english.mechanics.duration', 'english.mechanics.savingThrow', 'english.mechanics.spellResistance',
          ...(field === 'descriptionText' ? ['fullBodyAudit.englishEvidence', 'rulePairs.english'] : [])],
        reason: 'accepted-259-315-Fly-Mass-format-and-inherited-fields', revision: CURRENT,
        path: 'rules-patches/pending/spells/sc-issue-259-joint-corrections.jsonl'})),
      ...['name', 'descriptionText'].map(field => ({targetId: 4617, field,
        inputField: 'english.mechanics.descriptors', before: [], after: ['Sonic'],
        reason: 'accepted-343-Sonic', revision: MISSING, path: BOOK + 'issue-343/rules-patch.jsonl'}))],
      native, independent, amendments: currentAmendments, replacement, additions, reviews: old.reviews};
  } finally {db.close();}
}

module.exports = {readExact, refreshMissing, derive, rehearseRules, rawRows};
if (require.main === module) {
  const [code, runtime, data, originalRules, rules, content] = process.argv.slice(2);
  assert([code, runtime, data, originalRules, rules, content].every(Boolean), 'require explicit code/data/runtime/DB roots');
  process.stdout.write(JSON.stringify(derive({code, runtime, data, originalRules, rules, content})));
}
