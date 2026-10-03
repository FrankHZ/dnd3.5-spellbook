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

function fileJournalRegression() {
  const directory = fs.mkdtempSync(path.join(temp, 'journal-'));
  const file = path.join(directory, 'content.sqlite');
  const beforePath = path.join(directory, 'before.json'), afterPath = path.join(directory, 'after.json');
  const input = structuredClone(source);
  input.rulebooks.push({...input.rulebooks[0]!, id: 9, name: 'Synthetic protected book', abbr: 'SYN', slug: 'protected'});
  const padding = 'Synthetic padding '.repeat(2048);
  for (let i = 0; i < 32; i++) input.spells.push({...input.spells[0]!, id: 10000 + i,
    rulebookId: 9, name: `Synthetic ${i}`, slug: `synthetic-${i}`, description: padding, descriptionHtml: `<pre>${padding}</pre>`});
  const generateFile = (after: boolean) => {
    const source = structuredClone(input); if (after) Object.assign(source.spells[0]!, patch.spell);
    const generated = normalizeRulesContent(source, after ? next.generatedAt : previous.generatedAt);
    generated.artifact = createRulesContentArtifactMetadata({scope: 'full', sourceTotals: {rulebooks: 2,
      spells: source.spells.length, descriptors: 0, classListEntries: 0, domainListEntries: 0}, provenance});
    return generated;
  };
  const old = generateFile(false), updated = generateFile(true);
  fs.writeFileSync(beforePath, JSON.stringify(old)); fs.writeFileSync(afterPath, JSON.stringify(updated));
  // Real disposable repositories exercise the same fixed-input guard as the CLI.
  const code = path.join(directory, 'code'), data = path.join(directory, 'data');
  const guardHelper = require(path.join(root, 'data-tools/audits/sc-final-auth-inputs.cjs'));
  const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], {stdio: 'pipe'});
  for (const repo of [code, data]) {
    fs.mkdirSync(repo); git(repo, 'init'); git(repo, 'config', 'user.name', 'Synthetic');
    git(repo, 'config', 'user.email', 'synthetic@example.invalid');
  }
  const helperPath = path.join(code, 'data-tools/audits/synthetic.cjs');
  const tracked = path.join(data, 'dice-qa/books/86/synthetic.json');
  for (const [file, bytes] of [[helperPath, 'fixed helper'], [tracked, '{"fixed":true}'],
    ...guardHelper.originals.map((name: string) => [path.join(data, name), 'synthetic original']),
    [path.join(data, 'spells-dice-db-by-mo/synthetic.txt'), 'synthetic source']]) {
    fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes);
  }
  for (const repo of [code, data]) {git(repo, 'add', '.'); git(repo, 'commit', '-m', 'Synthetic inputs');}
  const comparisonPath = 'artifacts/pdf-extract/synthetic-comparison.jsonl';
  const comparisonFile = path.join(data, comparisonPath);
  fs.mkdirSync(path.dirname(comparisonFile), {recursive: true}); fs.writeFileSync(comparisonFile, 'synthetic comparison');
  const requireSources = guardHelper.captureFinalAuthInputs(code, data);
  const requireComparisons = guardHelper.captureSourceFiles(data, [comparisonPath]);
  const requireFiles = () => {requireSources(); requireComparisons();};
  const db = new Database(file);
  const externalRead = () => JSON.parse(execFileSync(process.execPath, ['-e', `
    const DB=require(process.argv[1]), db=new DB(process.argv[2],{readonly:true,fileMustExist:true,timeout:0});
    try { db.pragma('query_only=ON'); console.log(JSON.stringify(db.prepare(
      "SELECT spellId,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' AND variant='chm'"
    ).all())); } finally {db.close();}`,
    require.resolve('better-sqlite3'), file], {encoding: 'utf8', stdio: 'pipe'}));
  const locked = (error: unknown) => String((error as {stderr?: Buffer}).stderr).includes('SQLITE_BUSY');
  try {
    db.pragma('journal_mode=DELETE'); db.pragma('cache_size=8'); db.pragma('cache_spill=ON');
    assert.equal(db.pragma('journal_mode', {simple: true}), 'delete');
    assert.equal(db.pragma('cache_size', {simple: true}), 8);
    const migrations = path.join(root, 'server/db/content/migrations');
    for (const name of fs.readdirSync(migrations).sort()) if (name !== 'migration_lock.toml')
      db.exec(fs.readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8'));
    importGenerated(db, old, false, beforePath, context);
    db.exec(`INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,descriptionHtml,sourceKey,updatedAt)
      VALUES('protected-chm',3958,86,'zh','chm','原名','原文','<pre>原文</pre>','synthetic-chm','2000-01-01');`);
    const insert = db.prepare(`INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,updatedAt)
      VALUES(?,3958,86,'en',?,?,'2000-01-01')`);
    db.transaction(() => {for (let i = 0; i < 6837; i++) insert.run(`summary-${i}`, `synthetic-${i}`, `Protected ${i}`);})();
    const summaries = db.prepare('SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText').all() as SummaryRow[];
    applyFinalOverlay(db, planFinalOverlay(db, fields, report, verifyFullNormalized(db, old, beforePath, provenance), helper, summaries));
    const before = snapshot(db), chm = externalRead();
    assert(fs.statSync(file).size > 1024 * 1024, 'fixture must exceed the small page cache');
    const run = (requireInputs = requireFiles, fault = () => {}, authenticate = () => {}, mode: 'check' | 'apply' = 'apply') =>
      prismaticRayUpgrade(db, old, updated, beforePath, afterPath, patch, fields, amendedReport, summaries,
        '5'.repeat(40), context, requireInputs, mode, fault, authenticate);
    let postWrite = false;
    // Reproduce the old production callback at the actual post-write checkInputs.
    assert.throws(() => run(() => {requireFiles(); externalRead();}, () => {postWrite = true;}), locked);
    assert(postWrite, 'old callback must fail after SQL writes, not during preflight');
    assert.deepEqual(snapshot(db), before, 'SQLITE_BUSY did not roll back the complete predecessor');
    assert.deepEqual(externalRead(), chm, 'rollback did not release the content lock');
    assert.throws(() => run(requireFiles, () => {throw new Error('must not reach write');},
      () => {assert.deepEqual(externalRead(), chm); throw new Error('fresh authentication differs');}), /fresh authentication differs/);
    assert.deepEqual(snapshot(db), before, 'fresh source authentication failure changed the predecessor');
    // The real source guard must catch file drift even after cache spill.
    for (const changedFile of [helperPath, tracked, path.join(data, guardHelper.originals[0]),
      path.join(data, 'spells-dice-db-by-mo/synthetic.txt'), comparisonFile]) {
      const bytes = fs.readFileSync(changedFile);
      assert.throws(() => run(requireFiles, () => fs.appendFileSync(changedFile, 'changed')), /source|original/);
      assert.deepEqual(snapshot(db), before, 'source-file drift did not roll back');
      fs.writeFileSync(changedFile, bytes); requireFiles();
    }
    const addition = path.join(data, 'spells-dice-db-by-mo/added.txt');
    assert.throws(() => run(requireFiles, () => fs.writeFileSync(addition, 'unaccepted')), /corpus membership/);
    assert.deepEqual(snapshot(db), before); fs.unlinkSync(addition); requireFiles();
    for (const sql of ["UPDATE I18nSpellText SET sourceKey='forged' WHERE variant='chm'",
      "UPDATE I18nSpellText SET bodyProvenanceJson='{}' WHERE variant='effective'",
      "UPDATE I18nSpellSummaryText SET summaryText='forged' WHERE id='summary-6836'",
      'CREATE TABLE forbidden_change(id INTEGER)']) {
      assert.throws(() => run(requireFiles, () => db.exec(sql)), /protected|envelope|field|summary|schema|provenance/i);
      assert.deepEqual(snapshot(db), before, 'protected content fault did not roll back');
    }
    assert.throws(() => run(requireFiles, () => {throw new Error('file transaction fault');}), /file transaction fault/);
    assert.deepEqual(snapshot(db), before);
    let authentications = 0, spill = false;
    assert.equal(run(requireFiles, () => {
      // An independent reader is still locked here, proving the regression's
      // write volume exercises the production journal/cache-spill boundary.
      assert.throws(externalRead, locked); spill = true;
    }, () => {assert(db.inTransaction); assert.deepEqual(externalRead(), chm); authentications++;}).changed, true);
    assert.equal(authentications, 1); assert(spill);
    const after = snapshot(db);
    assert.equal(run(requireFiles, () => {}, () => {throw new Error('repeat must not authenticate/write');}).changed, false);
    assert.equal(run(requireFiles, () => {}, () => {}, 'check').state, 'after');
    assert.deepEqual(snapshot(db), after, 'file repeat changed rows/timestamps');
    assert.deepEqual(externalRead(), chm); assert.equal(db.pragma('integrity_check', {simple: true}), 'ok');
    assert.equal(db.pragma('journal_mode', {simple: true}), 'delete', 'upgrade changed journal mode');
    for (const [name, rows] of before.rows) if (!['SpellContent', 'RulesContentBuild'].includes(String(name)))
      assert.deepEqual(after.rows.find(row => row[0] === name)?.[1], rows, 'file protected ' + name);
    console.log('Real rollback-journal/cache-spill regression: old post-write SQLITE_BUSY rollback; new pre-write source read, 6837 summaries, source drift, protected faults, apply/repeat/integrity OK');
  } finally {db.close();}
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
    assert.throws(() => run('apply', () => {if (++checks > 3) throw new Error('source drift');}), /source drift/);
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
  fileJournalRegression();
  console.log('Prismatic Ray paired source upgrade, full artifacts, protections, rollback, repeat and four-field guards OK');
} finally {fs.rmSync(temp, {recursive: true, force: true});}
