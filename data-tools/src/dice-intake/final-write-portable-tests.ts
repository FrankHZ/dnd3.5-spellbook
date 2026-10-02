import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {repoRoot} from '../shared/env';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {RULES_CONTENT_GENERATOR_VERSION, type NormalizedRulesContent} from '../rules-content/normalize';
import {fieldProvenanceMigration} from './effective-writer';
import {applyFinalOverlay, planFinalOverlay, validateFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';

const root = repoRoot(), temp = mkdtempSync(join(tmpdir(), 'sc-final-writer-'));
const inputPath = join(temp, 'normalized.json');
const fingerprint = {path: 'synthetic', sha256: 'a'.repeat(64)};
const current: RulesContentArtifactProvenance = {schemaVersion: 1,
  parentRepo: {commit: '1'.repeat(40), dirty: false}, dataRepo: {commit: '2'.repeat(40), dirty: false},
  rulesDb: fingerprint, canonicalInputs: {rulesManifest: fingerprint, rulebookPublicationMetadata: fingerprint,
    chmRulebookPublications: fingerprint}, contentMigrations: fingerprint};
const fixture = readFileSync(join(root, 'server/db/content/fixtures/portable/normalized-rules-spells.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as {table: string; data: Record<string, unknown>});
const tableKeys = {RulebookContent: 'rulebooks', SpellContent: 'spells', SpellAppearance: 'appearances',
  SpellTaxonomyFacet: 'taxonomyFacets', SpellListEntry: 'listEntries', SpellComponent: 'components',
  SpellMechanicFacet: 'mechanicFacets', RulesContentIssue: 'issues'} as const;
const arrays = Object.fromEntries(Object.entries(tableKeys).map(([table, key]) => [key,
  fixture.filter(r => r.table === table).map(r => ({...r.data}))])) as Record<string, Array<Record<string, unknown>>>;
arrays.spells!.forEach((r, i) => {r.sourceRulebookId = i < 2 ? 86 : 9;});
for (const [key, rows] of Object.entries(arrays)) {
  const columns = [...new Set(rows.flatMap(r => Object.keys(r)))];
  rows.forEach(r => {
    if (key === 'spells') r.verified ??= false;
    for (const column of columns) if (!(column in r)) r[column] = null;
  });
}
const content = {schemaVersion: 2, generatorVersion: RULES_CONTENT_GENERATOR_VERSION,
  generatedAt: '2026-10-02T00:00:00.000Z', counts: Object.fromEntries(Object.entries(arrays).map(([k, v]) => [k, v.length])),
  ...arrays} as unknown as NormalizedRulesContent;
content.artifact = createRulesContentArtifactMetadata({scope: 'full', sourceTotals: {rulebooks: content.counts.rulebooks!,
  spells: content.counts.spells!, descriptors: 0, classListEntries: 0, domainListEntries: 0}, provenance: current});
writeFileSync(inputPath, JSON.stringify(content), 'utf8');
const ids = content.spells.filter(r => r.sourceRulebookId === 86).map(r => r.legacySpellId);
assert.equal(ids.length, 2);
const prior = {owner: 'native', revision: '3'.repeat(40), path: 'synthetic/original.jsonl',
  currentAmendment: {revision: '4'.repeat(40), path: 'synthetic/current.jsonl', acceptedRow: {protected: true}}};
const fields: FinalField[] = ids.flatMap((targetId, i) => [{targetId, rulebookId: 86, field: 'name', text: '原名',
  origin: {kind: 'chm', sourceKey: 'chm:' + targetId}, review: {disposition: 'source-reviewed-retention',
    originalEntry: {revision: '5'.repeat(40), rowRef: 'synthetic/original:' + targetId}}},
  {targetId, rulebookId: 86, field: 'body', text: '来源正文', html: '<p>来源正文</p>',
    origin: {kind: 'native', sourceKey: 'native:' + targetId, ...(i === 0 ? {activeAmendment: {
      revision: '6'.repeat(40), path: 'synthetic/replacement.jsonl', prior,
      sourceRef: 'synthetic-pdf', sourcePages: [], status: 'source-correct'}} : {})},
    review: {disposition: 'source-correct', sourceQuestionIds: ['synthetic-question']}}] as FinalField[]);
const sourceReport = {sourceRevisions: {original: '5'.repeat(40)}, changedNames: 0, changedBodies: 2,
  retained: {names: ids, bodies: []}, sourceQuestionIds: [{targetId: ids[0], ids: ['synthetic-question']}]};
const helper = '7'.repeat(40);
function seed(legacy: boolean) {
  const db = new Database(':memory:');
  const migrations = join(root, 'server/db/content/migrations');
  for (const name of readdirSync(migrations).sort()) if (name !== 'migration_lock.toml' && !(legacy && name === fieldProvenanceMigration))
    db.exec(readFileSync(join(migrations, name, 'migration.sql'), 'utf8'));
  importGenerated(db, content, false, inputPath, {currentProvenance: current, importedAt: 'synthetic'});
  db.exec(`INSERT INTO I18nSpellText (id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
    VALUES ('protected-chm',${ids[0]},86,'zh','chm','原名','原文',CURRENT_TIMESTAMP),
      ('protected-variant',${ids[0]},86,'zh','other','其他名','其他文',CURRENT_TIMESTAMP),
      ('protected-en',${ids[0]},86,'en','effective','Protected English','Protected body',CURRENT_TIMESTAMP),
      ('protected-book',4837,9,'zh','effective','外书名','外书文',CURRENT_TIMESTAMP);
    INSERT INTO I18nSpellSummaryText (id,spellId,rulebookId,lang,summaryText,updatedAt)
      VALUES ('protected-summary',${ids[0]},86,'zh','保留摘要',CURRENT_TIMESTAMP);`);
  return db;
}
const snapshot = (db: Database.Database) => db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  .map(r => ({table: (r as {name: string}).name, rows: db.prepare(`SELECT * FROM "${(r as {name: string}).name}"`).all()}));
try {
  for (const legacy of [false, true]) {
    const db = seed(legacy);
    try {
      const before = snapshot(db), full = verifyFullNormalized(db, content, inputPath, current);
      const plan = planFinalOverlay(db, fields, sourceReport, full, helper);
      assert.deepEqual(snapshot(db), before, 'dry-run wrote');
      assert.equal(plan.migrate, legacy);
      assert.throws(() => applyFinalOverlay(db, plan, () => {throw new Error('bounded fault');}), /bounded fault/);
      assert.deepEqual(snapshot(db), before, 'transaction/migration fault failed rollback');
      applyFinalOverlay(db, plan);
      validateFinalOverlay(db, plan);
      verifyFullNormalized(db, content, inputPath, current);
      const after = snapshot(db);
      for (const table of before) {
        const actual = after.find(t => t.table === table.table)!;
        if (table.table === 'RulesContentBuild') continue;
        if (table.table === 'I18nSpellText') assert.deepEqual(actual.rows.filter(r => !(r as {id: string}).id.startsWith('dice-effective:')),
          table.rows.map(r => legacy ? {...r as object, nameProvenanceJson: null, bodyProvenanceJson: null} : r));
        else assert.deepEqual(actual.rows, table.rows, 'protected table: ' + table.table);
      }
      const persisted = db.prepare('SELECT bodyProvenanceJson FROM I18nSpellText WHERE spellId=? AND lang=\'zh\' AND variant=\'effective\'').get(ids[0]) as {bodyProvenanceJson: string};
      assert.deepEqual(JSON.parse(persisted.bodyProvenanceJson).origin.activeAmendment.prior, prior);
      const repeat = planFinalOverlay(db, fields, sourceReport, verifyFullNormalized(db, content, inputPath, current), helper);
      assert.equal(repeat.inserts + repeat.updates, 0); assert.equal(repeat.markBuild, false);
      applyFinalOverlay(db, repeat); assert.deepEqual(snapshot(db), after, 'repeat changed rows/timestamps');
      db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson='{}' WHERE id=?").run(`dice-effective:86:${ids[0]}`);
      assert.throws(() => validateFinalOverlay(db, repeat), /persisted final fields/);
      applyFinalOverlay(db, {...repeat, rows: repeat.rows.map(r => ({...r, action: 'update'}))});
      db.prepare("UPDATE SpellContent SET descriptionText='Forged English' WHERE legacySpellId=?").run(ids[0]);
      assert.throws(() => verifyFullNormalized(db, content, inputPath, current), /full normalized values/);
    } finally {db.close();}
  }
  const db = seed(false);
  try {
    const full = verifyFullNormalized(db, content, inputPath, current);
    assert.throws(() => planFinalOverlay(db, fields.slice(1), sourceReport, full, helper), /duplicate\/missing/);
    const wrong = structuredClone(fields); wrong[0]!.rulebookId = 9;
    assert.throws(() => planFinalOverlay(db, wrong, sourceReport, full, helper), /incomplete final/);
    db.prepare("UPDATE RulesContentBuild SET sourceKind='dice-effective-experiment'").run();
    assert.throws(() => verifyFullNormalized(db, content, inputPath, current), /stale full build/);
  } finally {db.close();}
  console.log('Final SC synthetic full-build, SQL migration, rollback, repeat, protected-data and provenance checks OK');
} finally {rmSync(temp, {recursive: true, force: true});}
