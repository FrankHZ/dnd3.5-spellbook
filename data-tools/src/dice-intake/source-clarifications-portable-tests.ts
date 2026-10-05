import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeRulesContent, type LegacyRulesContentInput} from '../rules-content/normalize';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {applyFinalOverlay, planFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';
import {finalChineseClarificationUpgrade, clarificationCandidate, clarificationAcceptance, clarificationPath, validateClarificationChinese} from './source-clarifications';
import {punctuationCandidate, punctuationAcceptance} from './source-fidelity';
import type {SummaryRow} from '../short-desc/summary-row-schema';

const root = path.resolve(__dirname, '../../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-clarification-'));
const ids = [3901, 4465, 4564, 3795, 4534, 4837];
const source: LegacyRulesContentInput = {rulebooks: [86, 9].map(id => ({id, dndEditionId: 5, name: `Synthetic ${id}`, abbr: 'SYN', slug: `synthetic-${id}`,
  publicationCategory: 'supplement', publicationFamily: 'synthetic', publicationSourceKind: 'synthetic', publicationDisplayOrder: id,
  publicationYear: null, publicationDate: null, publicationUrl: null, publicationImage: null, publicationReviewStatus: 'accepted'})),
  spells: ids.map(id => ({id, added: '2000-01-01T00:00:00Z', rulebookId: id === 4837 ? 9 : 86, page: 1, name: `Synthetic ${id}`, slug: `synthetic-${id}`,
    schoolId: 1, schoolName: 'Evocation', schoolSlug: 'evocation', verbalComponent: true, somaticComponent: true, materialComponent: false,
    arcaneFocusComponent: false, divineFocusComponent: false, xpComponent: false, metaBreathComponent: false, trueNameComponent: false, corruptComponent: false, verified: false,
    description: 'Protected English', descriptionHtml: '<p>Protected English</p>'})), descriptors: [], listEntries: []};
const fingerprint = {path: 'synthetic', sha256: 'a'.repeat(64)};
const provenance: RulesContentArtifactProvenance = {schemaVersion: 1, parentRepo: {commit: '1'.repeat(40), dirty: false}, dataRepo: {commit: '2'.repeat(40), dirty: false},
  rulesDb: fingerprint, canonicalInputs: {rulesManifest: fingerprint, rulebookPublicationMetadata: fingerprint, chmRulebookPublications: fingerprint}, contentMigrations: fingerprint};
const content = normalizeRulesContent(source);
content.artifact = createRulesContentArtifactMetadata({scope: 'full', sourceTotals: {rulebooks: 2, spells: ids.length, descriptors: 0, classListEntries: 0, domainListEntries: 0}, provenance});
const input = path.join(temp, 'normalized.json'); fs.writeFileSync(input, JSON.stringify(content));
const beforeFields: FinalField[] = ids.filter(id => id !== 4837).flatMap(targetId => {
  const text = '合'.repeat(400) + '\n\n受保护备注';
  return [{targetId, rulebookId: 86, field: 'name' as const, text: `合成${targetId}`, origin: {kind: 'chm' as const, sourceKey: 'synthetic'}, review: {disposition: 'source-reviewed-retention'}},
    {targetId, rulebookId: 86, field: 'body' as const, text, html: `<pre>${text}</pre>`, origin: {kind: 'native' as const, sourceKey: 'synthetic'}, review: {disposition: 'source-correct'}}];
});
const fields = structuredClone(beforeFields);
for (const field of fields.filter(f => f.field === 'body' && [3901,4465,4564].includes(f.targetId))) {
  field.sourceCorrection = {revision: clarificationCandidate, acceptanceRevision: clarificationAcceptance, path: clarificationPath, targetId: field.targetId, prior: structuredClone(field)};
  for (const key of ['text', 'html'] as const) {
    const chars = Array.from(field[key]!), offset = key === 'html' ? 5 : 0;
    if (field.targetId === 4465) chars.splice(257 + offset, 0, ...'新'.repeat(8));
    else if (field.targetId === 4564) chars.splice(314 + offset, 0, ...'新'.repeat(7));
    else {chars.splice(260 + offset, 7, '新', '新'); chars.splice(221 + offset, 0, ...'新'.repeat(8));}
    field[key] = chars.join('');
  }
}
const report = {sourceRevisions: {sourcePunctuationCandidate: punctuationCandidate, sourcePunctuationAcceptance: punctuationAcceptance},
  changedNames: 0, changedBodies: 5, retained: {names: ids.filter(id => id !== 4837), bodies: []}, sourceQuestionIds: []};
const nextReport = {...report, sourceRevisions: {...report.sourceRevisions, sourceClarificationCandidate: clarificationCandidate, sourceClarificationAcceptance: clarificationAcceptance}};
const db = new Database(':memory:');
const snapshot = () => ({schema: db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(), rows: db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r => {
  const name = (r as {name: string}).name; return [name, db.prepare(`SELECT * FROM "${name}"`).all()];
})});
try {
  const entry = require(path.join(root, 'data-tools/audits/sc-final-overlay.cjs'));
  assert.throws(() => entry.main(['--accepted-source-clarifications']), /require #473/);
  assert.throws(() => entry.main(['--upgrade-source-clarifications']), /requires accepted package/);
  const acceptedFlags = ['--accepted-source-clarifications', '--accepted-source-punctuation',
    '--accepted-source-fidelity', '--accepted-source-pairs', '--accepted-english-title', '--accepted-summaries'];
  assert.throws(() => entry.main([...acceptedFlags, '--apply']), /writes require a dedicated upgrade/);
  assert.throws(() => entry.main([...acceptedFlags, '--validate']), /missing --code-root/,
    'read-only validation remains allowed through argument preflight');
  assert.throws(() => entry.main([...acceptedFlags, '--upgrade-source-clarifications', '--apply']), /missing --code-root/,
    'dedicated upgrade remains allowed through argument preflight');
  for (const name of fs.readdirSync(path.join(root, 'server/db/content/migrations')).sort()) if (name !== 'migration_lock.toml') db.exec(fs.readFileSync(path.join(root, 'server/db/content/migrations', name, 'migration.sql'), 'utf8'));
  importGenerated(db, content, false, input, {currentProvenance: provenance, importedAt: 'synthetic'});
  db.exec("CREATE TABLE protected_bytes(id INTEGER,body TEXT); INSERT INTO protected_bytes VALUES(1,CAST(x'ff' AS TEXT));");
  db.exec("INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt) VALUES('protected-chm',3901,86,'zh','chm','旧名','旧文','old'),('protected-note',3795,86,'zh','notes','注','独立读者备注','old'),('protected-book',4837,9,'zh','effective','外书','外书正文','old');");
  const insert = db.prepare("INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,sourceKey,updatedAt) VALUES(?,3901,86,'en',?,?,?,'2000-01-01')");
  db.transaction(() => {for (let i = 0; i < 6837; i++) insert.run(`summary-${i}`, `synthetic-${i}`, `Protected ${i}`, `proof-${i}`);})();
  const summaries = db.prepare('SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText').all() as SummaryRow[];
  const verifyFull = () => verifyFullNormalized(db, content, input, provenance);
  applyFinalOverlay(db, planFinalOverlay(db, beforeFields, report, verifyFull(), '4'.repeat(40), summaries));
  const before = snapshot();
  const run = (mode: 'check' | 'apply' = 'check', fault = () => {}, auth = () => {}, actual = fields, actualReport = nextReport, inputs = () => {}) =>
    finalChineseClarificationUpgrade(db, actual, actualReport, verifyFull, summaries, inputs, mode, fault, auth);
  assert.equal(run().state, 'before'); assert.deepEqual(snapshot(), before);
  for (const key of ['sourcePunctuationCandidate', 'sourcePunctuationAcceptance', 'sourceClarificationCandidate', 'sourceClarificationAcceptance'] as const) {
    const wrong = structuredClone(nextReport); wrong.sourceRevisions[key] = 'f'.repeat(40);
    assert.throws(() => run('apply', undefined, undefined, fields, wrong)); assert.deepEqual(snapshot(), before);
  }
  for (const id of [3901,4465,4564]) for (const key of ['text', 'html', 'origin', 'prior', 'acceptance'] as const) {
    const wrong = structuredClone(fields), field = wrong.find(f => f.targetId === id && f.field === 'body')!;
    if (key === 'origin') field.origin.sourceKey = 'forged';
    else if (key === 'prior') field.sourceCorrection!.prior.text += 'stale';
    else if (key === 'acceptance') field.sourceCorrection!.acceptanceRevision = 'f'.repeat(40);
    else field[key] += 'forged';
    assert.throws(() => run('apply', undefined, undefined, wrong)); assert.deepEqual(snapshot(), before);
  }
  const old = db.prepare("SELECT descriptionText FROM I18nSpellText WHERE spellId=4465 AND variant='effective'").pluck().get();
  db.prepare("UPDATE I18nSpellText SET descriptionText='partial' WHERE spellId=4465 AND variant='effective'").run();
  assert.throws(() => run('apply')); db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=4465 AND variant='effective'").run(old);
  for (const sql of ["UPDATE SpellContent SET descriptionText='forged' WHERE legacySpellId=3901", "UPDATE I18nSpellText SET name='forged' WHERE spellId=3901", "UPDATE I18nSpellText SET updatedAt='forged' WHERE id='protected-chm'", "UPDATE I18nSpellSummaryText SET summaryText='forged' WHERE id='summary-6836'", "UPDATE protected_bytes SET body='forged'", "CREATE TABLE forbidden(id INTEGER)"]) {
    assert.throws(() => run('apply', () => {db.exec(sql);})); assert.deepEqual(snapshot(), before);
  }
  for (const where of ['fault', 'auth', 'inputs']) {
    const fail = () => {throw Error('bounded failure');};
    assert.throws(() => run('apply', where === 'fault' ? fail : undefined, where === 'auth' ? fail : undefined, fields, nextReport, where === 'inputs' ? fail : undefined));
    assert.deepEqual(snapshot(), before);
  }
  assert.equal(run('apply').changed, true); const after = snapshot();
  assert.equal(run().state, 'after'); assert.equal(run('apply').changed, false); assert.deepEqual(snapshot(), after);
  for (const f of fields.filter(f => f.sourceCorrection)) for (const key of ['text','html'] as const)
    validateClarificationChinese(f.targetId, key, f.sourceCorrection!.prior[key]!, f[key]!);
  console.log('SC clarifications: three Chinese pairs; complete normalized, summaries, notes, bytes and metadata protected; stale/partial rejection, rollback and repeat OK');
} finally {db.close(); fs.rmSync(temp, {recursive: true, force: true});}
