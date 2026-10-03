import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeRulesContent, type LegacyRulesContentInput} from '../rules-content/normalize';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {normalizedImportStep} from '../rules-content/import-step';
import {applyFinalOverlay, planFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';
import {comparePrismaticArtifacts, prismaticRayUpgrade} from './prismatic-ray-upgrade';
import {selectPdfTypography, type PdfTypographyPresentation} from '../zh-parser/pdf-typography';
import type {SummaryRow} from '../short-desc/summary-row-schema';

const root = path.resolve(__dirname, '../../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-prismatic-'));
const oldPath = path.join(temp, 'before.json'), newPath = path.join(temp, 'after.json');
const heading = '<h4><span class="caps">PRISMATIC</span> <span class="caps">RAY</span></h4>';
const pair = {description: 'Synthetic source body\n\nh4. PRISMATIC RAY\n\n|_. Roll |_. Result |\n| 1 | Synthetic |\n',
  descriptionHtml: '<p>Synthetic source body</p>' + heading + '<table><tr><th>Roll</th><th>Result</th></tr><tr><td>1</td><td><a href="/synthetic">Synthetic</a></td></tr></table>'};
const patch = {id: 3958, expected: {spell: pair}, spell: {description: pair.description.replace('h4. PRISMATIC RAY\n\n', ''),
  descriptionHtml: pair.descriptionHtml.replace(heading, '')}};
const fingerprint = {path: 'synthetic', sha256: 'a'.repeat(64)};
const provenance: RulesContentArtifactProvenance = {schemaVersion: 1,
  parentRepo: {commit: '1'.repeat(40), dirty: false}, dataRepo: {commit: '2'.repeat(40), dirty: false},
  rulesDb: fingerprint, canonicalInputs: {rulesManifest: fingerprint, rulebookPublicationMetadata: fingerprint,
    chmRulebookPublications: fingerprint}, contentMigrations: fingerprint};
const source: LegacyRulesContentInput = {rulebooks: [{id: 86, dndEditionId: 5, name: 'Synthetic', abbr: 'SC', slug: 'synthetic',
  publicationCategory: 'supplement', publicationFamily: 'synthetic', publicationSourceKind: 'synthetic', publicationDisplayOrder: 1,
  publicationYear: null, publicationDate: null, publicationUrl: null, publicationImage: null, publicationReviewStatus: 'accepted'}],
  spells: [{id: 3958, added: '2000-01-01T00:00:00Z', rulebookId: 86, page: 162, name: 'Synthetic Ray', slug: 'synthetic-ray',
    schoolId: 1, schoolName: 'Evocation', schoolSlug: 'evocation', verbalComponent: true, somaticComponent: true,
    materialComponent: false, arcaneFocusComponent: false, divineFocusComponent: false, xpComponent: false,
    metaBreathComponent: false, trueNameComponent: false, corruptComponent: false, verified: false, ...pair}],
  descriptors: [], listEntries: []};
function generate(after: boolean) {
  const input = structuredClone(source); if (after) Object.assign(input.spells[0]!, patch.spell);
  const content = normalizeRulesContent(input, after ? '2026-10-03T01:00:00Z' : '2026-10-02T01:00:00Z');
  content.artifact = createRulesContentArtifactMetadata({scope: 'full', sourceTotals: {rulebooks: 1, spells: 1,
    descriptors: 0, classListEntries: 0, domainListEntries: 0}, provenance});
  return content;
}
const previous = generate(false), next = generate(true);
fs.writeFileSync(oldPath, JSON.stringify(previous)); fs.writeFileSync(newPath, JSON.stringify(next));
const fields: FinalField[] = [{targetId: 3958, rulebookId: 86, field: 'name', text: '合成名',
  origin: {kind: 'chm', sourceKey: 'synthetic'}, review: {disposition: 'source-reviewed-retention'}},
  {targetId: 3958, rulebookId: 86, field: 'body', text: '合成正文\n项目备注', html: '<pre>合成正文\n项目备注</pre>',
    origin: {kind: 'native', sourceKey: 'synthetic'}, review: {disposition: 'source-correct', sourceQuestionIds: ['synthetic']}}];
const report = {sourceRevisions: {original: '3'.repeat(40)}, changedNames: 0, changedBodies: 1,
  retained: {names: [3958], bodies: []}, sourceQuestionIds: [{targetId: 3958, ids: ['synthetic']} ]};
const amendedReport = {...report, sourceRevisions: {...report.sourceRevisions,
  englishTitleCandidate: '790f9ebbd024916d16577d69c01d868155a9ccfd', englishTitleAcceptance: '7f8ea2df1104fe4345141f0712dbb43739e98b7e'}};
const helper = '4'.repeat(40), context = {currentProvenance: provenance, importedAt: '2026-10-03T01:01:00Z'};
function snapshot(db: Database.Database) {
  return {schema: db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(),
    rows: (db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, db.prepare(`SELECT * FROM "${name}"`).all()])};
}
try {
  comparePrismaticArtifacts(previous, next, patch);
  for (const change of ['body', 'html', 'hash', 'raw', 'name', 'mechanic', 'count', 'page', 'relation', 'extra']) {
    const wrong = structuredClone(next);
    if (change === 'body') wrong.spells[0]!.descriptionText += ' forged';
    else if (change === 'html') wrong.spells[0]!.descriptionHtml += '<p>forged</p>';
    else if (change === 'hash') wrong.spells[0]!.descriptionHash = 'wrong';
    else if (change === 'raw') wrong.spells[0]!.rawJson = '{}';
    else if (change === 'name') wrong.spells[0]!.canonicalName += 'forged';
    else if (change === 'mechanic') wrong.spells[0]!.rangeRaw = 'forged';
    else if (change === 'count') wrong.counts.spells = 2;
    else if (change === 'page') wrong.spells[0]!.sourcePage = 1;
    else if (change === 'relation') wrong.appearances[0]!.sourceNote = 'forged';
    else wrong.spells.push({...wrong.spells[0]!, id: 'extra'});
    assert.throws(() => comparePrismaticArtifacts(previous, wrong, patch), change);
  }
  const db = new Database(':memory:');
  try {
    const migrations = path.join(root, 'server/db/content/migrations');
    for (const name of fs.readdirSync(migrations).sort()) if (name !== 'migration_lock.toml')
      db.exec(fs.readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8'));
    importGenerated(db, previous, false, oldPath, context);
    db.exec(`CREATE TABLE protected_bytes(id INTEGER, body TEXT); INSERT INTO protected_bytes VALUES(1,CAST(x'ff' AS TEXT));
      INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,updatedAt)
      VALUES('synthetic-summary',3958,86,'en','imarvin','Protected summary','2000-01-01');
      INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
      VALUES('protected-chm',3958,86,'zh','chm','原名','原文','2000-01-01');`);
    const summaries = db.prepare('SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText').all() as SummaryRow[];
    applyFinalOverlay(db, planFinalOverlay(db, fields, report, verifyFullNormalized(db, previous, oldPath, provenance), helper, summaries));
    const before = snapshot(db);
    const run = (mode: 'check' | 'apply' = 'check', requireInputs = () => {}, fault = () => {}) =>
      prismaticRayUpgrade(db, previous, next, oldPath, newPath, patch, fields, amendedReport, summaries,
        '5'.repeat(40), context, requireInputs, mode, fault);
    assert.deepEqual(run(), {mode: 'check', state: 'before', changed: false, wouldChange: true});
    assert.deepEqual(snapshot(db), before, 'dry-run wrote');
    assert.throws(() => normalizedImportStep(db, newPath, oldPath, 'apply', context), /Annotated predecessor/);
    assert.deepEqual(snapshot(db), before, 'generic rejection wrote');
    assert.throws(() => run('apply', () => {}, () => {throw new Error('transaction fault');}), /transaction fault/);
    assert.deepEqual(snapshot(db), before, 'failure did not roll back');
    let checks = 0;
    assert.throws(() => run('apply', () => {if (++checks > 2) throw new Error('source drift');}), /source drift/);
    assert.deepEqual(snapshot(db), before, 'source drift did not roll back');
    assert.throws(() => run('apply', () => {}, () => fs.appendFileSync(newPath, '\n')), /normalized inputs changed/);
    assert.deepEqual(snapshot(db), before, 'normalized byte drift did not roll back');
    fs.writeFileSync(newPath, JSON.stringify(next));
    const meta = String(db.prepare('SELECT buildMetaJson FROM RulesContentBuild').pluck().get());
    for (const change of ['summary', 'body', 'origin', 'notes', 'marker']) {
      const original = String(db.prepare("SELECT bodyProvenanceJson FROM I18nSpellText WHERE variant='effective'").pluck().get());
      if (change === 'summary') db.prepare('UPDATE I18nSpellSummaryText SET summaryText=?').run('forged');
      else if (change === 'body') db.prepare("UPDATE I18nSpellText SET descriptionText='forged' WHERE variant='effective'").run();
      else if (change === 'marker') {
        const m = JSON.parse(meta); m.overlays.scFinalNameBody.sourceRevisions.englishTitleCandidate = amendedReport.sourceRevisions.englishTitleCandidate;
        db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(m));
      } else {
        const envelope = JSON.parse(original); envelope[change] = {forged: true};
        db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE variant='effective'").run(JSON.stringify(envelope));
      }
      const corrupted = snapshot(db); assert.throws(() => run('apply'), change);
      assert.deepEqual(snapshot(db), corrupted, 'corrupted input was written');
      db.prepare('UPDATE I18nSpellSummaryText SET summaryText=?').run(summaries[0]!.summaryText);
      db.prepare("UPDATE I18nSpellText SET descriptionText=?,bodyProvenanceJson=? WHERE variant='effective'").run(fields[1]!.text, original);
      db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(meta);
    }
    assert.equal(run('apply').changed, true);
    const after = snapshot(db); assert.equal(run().state, 'after'); assert.equal(run('apply').changed, false);
    assert.deepEqual(snapshot(db), after, 'repeat changed rows/timestamps');
    for (const [name, rows] of before.rows) if (!['SpellContent', 'RulesContentBuild'].includes(String(name)))
      assert.deepEqual(after.rows.find(r => r[0] === name)?.[1], rows, 'protected ' + name);
    assert.throws(() => verifyFullNormalized(db, previous, oldPath, provenance), /full normalized values/);
    const current = {englishText: patch.spell.description, englishHtml: patch.spell.descriptionHtml,
      chineseText: fields[1]!.text, chineseHtml: fields[1]!.html!};
    const presentation: PdfTypographyPresentation = {targetId: 3958, rulebookId: 86, input: current,
      output: {englishHtml: current.englishHtml.replace('<p>Synthetic source body</p>', '<p><em>Synthetic source body</em></p>'),
        chineseHtml: '<p>合成正文\n</p><div>项目备注</div>'}};
    assert.equal(selectPdfTypography(3958, 86, current, presentation).englishHtml, presentation.output.englishHtml);
    for (const field of ['englishText', 'englishHtml', 'chineseText', 'chineseHtml'] as const)
      assert.throws(() => selectPdfTypography(3958, 86, {...current, [field]: current[field] + 'stale'}, presentation), /stale/);
    assert.throws(() => selectPdfTypography(3958, 86, {...current, englishText: pair.description, englishHtml: pair.descriptionHtml}, presentation), /stale/);
  } finally {db.close();}
  console.log('Prismatic Ray paired source upgrade, full artifacts, protections, rollback, repeat and four-field guards OK');
} finally {fs.rmSync(temp, {recursive: true, force: true});}
