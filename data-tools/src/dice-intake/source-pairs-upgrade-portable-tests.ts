import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {normalizeRulesContent, type LegacyRulesContentInput} from '../rules-content/normalize';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {normalizedImportStep} from '../rules-content/import-step';
import {applyFinalOverlay, planFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';
import {comparePrismaticArtifacts, prismaticRayUpgrade} from './prismatic-ray-upgrade';
import {selectPdfTypography, type PdfTypographyPresentation} from '../zh-parser/pdf-typography';
import type {SummaryRow} from '../short-desc/summary-row-schema';

const root = path.resolve(__dirname, '../../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-source-pairs-'));
const oldPath = path.join(temp, 'before.json'), newPath = path.join(temp, 'after.json');
const pair = {description: '_With a synthetic opening._\n\nProtected English',
  descriptionHtml: '\t<p><em>With a synthetic opening.</em></p><p>Protected English</p>'};
const patch = {id: 3934, expected: {spell: pair}, spell: {description: pair.description.slice(0, 6) + pair.description.slice(8),
  descriptionHtml: pair.descriptionHtml.slice(0, 13) + pair.descriptionHtml.slice(15)}};
const fingerprint = {path: 'synthetic', sha256: 'a'.repeat(64)};
const provenance: RulesContentArtifactProvenance = {schemaVersion: 1,
  parentRepo: {commit: '1'.repeat(40), dirty: false}, dataRepo: {commit: '2'.repeat(40), dirty: false},
  rulesDb: fingerprint, canonicalInputs: {rulesManifest: fingerprint, rulebookPublicationMetadata: fingerprint,
    chmRulebookPublications: fingerprint}, contentMigrations: fingerprint};
const source: LegacyRulesContentInput = {rulebooks: [{id: 86, dndEditionId: 5, name: 'Synthetic', abbr: 'SC', slug: 'synthetic',
  publicationCategory: 'supplement', publicationFamily: 'synthetic', publicationSourceKind: 'synthetic', publicationDisplayOrder: 1,
  publicationYear: null, publicationDate: null, publicationUrl: null, publicationImage: null, publicationReviewStatus: 'accepted'}],
  spells: [{id: 3934, added: '2000-01-01T00:00:00Z', rulebookId: 86, page: 162, name: 'Synthetic Ray', slug: 'synthetic-ray',
    schoolId: 1, schoolName: 'Evocation', schoolSlug: 'evocation', verbalComponent: true, somaticComponent: true,
    materialComponent: false, arcaneFocusComponent: false, divineFocusComponent: false, xpComponent: false,
    metaBreathComponent: false, trueNameComponent: false, corruptComponent: false, verified: false, ...pair}],
  descriptors: [], listEntries: []};
function generate(after: boolean) {
  const input = structuredClone(source); if (after) Object.assign(input.spells[0]!, patch.spell);
  const content = normalizeRulesContent(input, after ? '2026-10-03T01:00:00Z' : '2026-10-02T01:00:00Z');
  content.artifact = createRulesContentArtifactMetadata({scope: 'full', sourceTotals: {rulebooks: 1, spells: 2,
    descriptors: 0, classListEntries: 0, domainListEntries: 0}, provenance});
  return content;
}
source.spells.push({...source.spells[0]!, id: 3930, name: 'Synthetic second', slug: 'synthetic-second', description: 'Unchanged English', descriptionHtml: '<p>Unchanged English</p>'});
const previous = generate(false), next = generate(true);
fs.writeFileSync(oldPath, JSON.stringify(previous)); fs.writeFileSync(newPath, JSON.stringify(next));
const removed = '合'.repeat(29);
const fields: FinalField[] = [3930, 3934].flatMap(targetId => [{targetId, rulebookId: 86, field: 'name' as const,
  text: `合成名${targetId}`, origin: {kind: 'chm' as const, sourceKey: 'synthetic'}, review: {disposition: 'source-reviewed-retention'}},
  {targetId, rulebookId: 86, field: 'body' as const, text: targetId === 3930 ? `目标保留\n\n${removed}\n\n材料保留` : '正文\n项目备注',
    html: targetId === 3930 ? `<pre>目标保留\n\n${removed}\n\n材料保留</pre>` : '<pre>正文\n项目备注</pre>',
    origin: {kind: 'native' as const, sourceKey: 'synthetic'}, review: {disposition: 'source-correct', sourceQuestionIds: ['synthetic']}}]);
const corrected = structuredClone(fields);
const body = corrected.find(f => f.targetId === 3930 && f.field === 'body')!;
body.sourceCorrection = {revision: 'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f', acceptanceRevision: '5f05fad7df5256a9c3c998d3be77aac238445107', path: 'dice-qa/books/86/issue-461/candidate.json',
  targetId: 3930, prior: structuredClone(body)};
body.text = body.text.replace(removed, ''); body.html = body.html!.replace(removed, '');
const report = {sourceRevisions: {original: '3'.repeat(40), englishTitleCandidate: '790f9ebbd024916d16577d69c01d868155a9ccfd',
  englishTitleAcceptance: '7f8ea2df1104fe4345141f0712dbb43739e98b7e'}, changedNames: 0, changedBodies: 2,
  retained: {names: [3930, 3934], bodies: []}, sourceQuestionIds: [{targetId: 3934, ids: ['synthetic']}]};
const amendedReport = {...report, sourceRevisions: {...report.sourceRevisions,
  sourcePairCandidate: 'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f', sourcePairAcceptance: '5f05fad7df5256a9c3c998d3be77aac238445107'}};
const helper = '4'.repeat(40), context = {currentProvenance: provenance, importedAt: '2026-10-03T01:01:00Z'};
function snapshot(db: Database.Database) {
  return {schema: db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(),
    rows: (db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, db.prepare(`SELECT * FROM "${name}"`).all()])};
}


const db = new Database(':memory:');
try {
  comparePrismaticArtifacts(previous, next, patch, true);
  for (const key of ['descriptionText', 'descriptionHtml', 'descriptionHash', 'rawJson', 'canonicalName', 'rangeRaw'] as const) {
    const wrong = structuredClone(next); (wrong.spells[0] as Record<string, unknown>)[key] = 'forged';
    assert.throws(() => comparePrismaticArtifacts(previous, wrong, patch, true), key);
  }
  for (const file of fs.readdirSync(path.join(root, 'server/db/content/migrations')).sort()) if (file !== 'migration_lock.toml')
    db.exec(fs.readFileSync(path.join(root, 'server/db/content/migrations', file, 'migration.sql'), 'utf8'));
  importGenerated(db, previous, false, oldPath, context);
  db.exec(`CREATE TABLE protected_bytes(id INTEGER, body TEXT); INSERT INTO protected_bytes VALUES(1,CAST(x'ff' AS TEXT));
    INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
    VALUES('protected-chm',3930,86,'zh','chm','原名','原文','2000-01-01');`);
  const insert = db.prepare(`INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,sourceKey,updatedAt)
    VALUES(?,3934,86,'en',?,?,?,'2000-01-01')`);
  db.transaction(() => {for (let i = 0; i < 6837; i++) insert.run(`summary-${i}`, `synthetic-${i}`, `Protected ${i}`, `proof-${i}`);})();
  const summaries = db.prepare('SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText').all() as SummaryRow[];
  applyFinalOverlay(db, planFinalOverlay(db, fields, report, verifyFullNormalized(db, previous, oldPath, provenance), helper, summaries));
  const before = snapshot(db);
  const run = (mode: 'check' | 'apply' = 'check', requireInputs = () => {}, fault = () => {}, authenticate = () => {},
    actualFields = corrected, actualReport = amendedReport) =>
    prismaticRayUpgrade(db, previous, next, oldPath, newPath, patch, actualFields, actualReport, summaries,
      '5'.repeat(40), context, requireInputs, mode, fault, authenticate, true);
  assert.equal(run().state, 'before'); assert.deepEqual(snapshot(db), before);
  assert.throws(() => normalizedImportStep(db, newPath, oldPath, 'apply', context), /Annotated predecessor/);
  for (const key of ['sourcePairCandidate', 'sourcePairAcceptance'] as const) {
    const wrong = structuredClone(amendedReport); delete (wrong.sourceRevisions as Record<string, string>)[key];
    assert.throws(() => run('apply', () => {}, () => {}, () => {}, corrected, wrong), /missing authenticated/);
    (wrong.sourceRevisions as Record<string, string>)[key] = 'f'.repeat(40);
    assert.throws(() => run('apply', () => {}, () => {}, () => {}, corrected, wrong));
  }
  for (const key of ['text', 'html', 'prior', 'notes', 'origin'] as const) {
    const wrong = structuredClone(corrected), body = wrong.find(f => f.targetId === 3930 && f.field === 'body')!;
    if (key === 'text') body.text += 'forged';
    else if (key === 'html') body.html += '<p>forged</p>';
    else if (key === 'prior') body.sourceCorrection!.prior.text += 'stale';
    else if (key === 'notes') wrong.find(f => f.targetId === 3934 && f.field === 'body')!.text += 'forged';
    else body.origin.sourceKey = 'forged';
    assert.throws(() => run('apply', () => {}, () => {}, () => {}, wrong));
    assert.deepEqual(snapshot(db), before, key + ' rejection changed predecessor');
  }
  let checks = 0;
  assert.throws(() => run('apply', () => {if (++checks > 3) throw new Error('source drift');}), /source drift/);
  assert.deepEqual(snapshot(db), before);
  assert.throws(() => run('apply', () => {}, () => {}, () => {throw new Error('missing source');}), /missing source/);
  assert.deepEqual(snapshot(db), before);
  for (const sql of ["UPDATE I18nSpellText SET name='forged' WHERE variant='chm'",
    "UPDATE I18nSpellText SET sourceKey='forged' WHERE spellId=3930 AND variant='effective'",
    "UPDATE I18nSpellText SET descriptionText='forged' WHERE spellId=3934 AND variant='effective'",
    "UPDATE I18nSpellSummaryText SET summaryText='forged' WHERE id='summary-6836'", 'CREATE TABLE forbidden(id INTEGER)']) {
    assert.throws(() => run('apply', () => {}, () => db.exec(sql)), /protected|field|summary|schema|envelope|provenance/i);
    assert.deepEqual(snapshot(db), before, 'protected failure rollback');
  }
  assert.throws(() => run('apply', () => {}, () => {throw new Error('transaction fault');}), /transaction fault/);
  assert.deepEqual(snapshot(db), before);
  assert.throws(() => run('apply', () => {}, () => fs.appendFileSync(newPath, '\n')), /normalized inputs changed/);
  assert.deepEqual(snapshot(db), before); fs.writeFileSync(newPath, JSON.stringify(next));
  assert.equal(run('apply').changed, true);
  const after = snapshot(db); assert.equal(run().state, 'after'); assert.equal(run('apply').changed, false);
  assert.deepEqual(snapshot(db), after, 'repeat changed values/timestamps');
  const row = db.prepare("SELECT * FROM I18nSpellText WHERE spellId=3930 AND variant='effective'").get() as Record<string, unknown>;
  assert.equal(row.descriptionText, body.text); assert.equal(row.descriptionHtml, body.html);
  const envelope = JSON.parse(String(row.bodyProvenanceJson));
  assert.deepEqual(envelope.sourceCorrection.prior, fields.find(f => f.targetId === 3930 && f.field === 'body'));
  const current = {englishText: patch.spell.description, englishHtml: patch.spell.descriptionHtml,
    chineseText: corrected[3]!.text, chineseHtml: corrected[3]!.html!};
  const presentation: PdfTypographyPresentation = {targetId: 3934, rulebookId: 86, input: current,
    output: {englishHtml: current.englishHtml, chineseHtml: current.chineseHtml}};
  selectPdfTypography(3934, 86, current, presentation);
  for (const key of ['englishText', 'englishHtml', 'chineseText', 'chineseHtml'] as const)
    assert.throws(() => selectPdfTypography(3934, 86, {...current, [key]: current[key] + 'stale'}, presentation), /stale/);
  console.log('SC source pairs: memory before/after/repeat, 6837 protected summaries, full pairs, notes/provenance, stale/missing authority and transactional rollback OK');
} finally {db.close(); fs.rmSync(temp, {recursive: true, force: true});}
