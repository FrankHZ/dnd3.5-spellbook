'use strict';
// Maintained entry: authenticated derivation is internal, never a projection-file argument.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {createRequire, Module} = require('node:module');

function main(argv) {
  const value = name => {const at = argv.indexOf('--' + name); assert(at >= 0 && argv[at + 1], 'missing --' + name); return argv[at + 1];};
  const allowed = new Set(['code-root', 'runtime-root', 'data-root', 'rules-db', 'content-db', 'normalized', 'rules-manifest',
    'helper-revision', 'accepted-baseline', 'accepted-summaries', 'upgrade-summaries', 'accepted-english-title',
    'upgrade-english-title', 'previous-normalized', 'apply', 'validate']);
  for (let i = 0; i < argv.length; i++) {
    assert(argv[i].startsWith('--') && allowed.has(argv[i].slice(2)), 'unknown argument: ' + argv[i]);
    if (!['--apply', '--validate', '--accepted-summaries', '--upgrade-summaries', '--accepted-english-title', '--upgrade-english-title'].includes(argv[i])) i++;
  }
  assert(!(argv.includes('--apply') && argv.includes('--validate')), 'choose apply or validate');
  assert(!argv.includes('--upgrade-summaries') || argv.includes('--accepted-summaries'), 'upgrade requires accepted summaries');
  assert(!argv.includes('--upgrade-english-title') || argv.includes('--accepted-english-title') && argv.includes('--accepted-summaries'),
    'English upgrade requires accepted pair and current summaries');
  assert(!argv.includes('--accepted-english-title') || argv.includes('--accepted-summaries'), 'English pair requires accepted summaries');
  assert(!(argv.includes('--upgrade-summaries') && argv.includes('--accepted-english-title')), 'choose one accepted transition');
  assert(argv.includes('--upgrade-english-title') === argv.includes('--previous-normalized'), 'previous normalized belongs to English upgrade');
  const code = fs.realpathSync(value('code-root')), runtime = fs.realpathSync(value('runtime-root'));
  assert.equal(code, fs.realpathSync(path.join(__dirname, '../..')), 'code root must match invoking checkout');
  const absolute = name => {const p = value(name); assert(path.isAbsolute(p), '--' + name + ' must be absolute'); return fs.realpathSync(p);};
  const data = absolute('data-root'), rules = absolute('rules-db'), contentPath = absolute('content-db');
  const inputPath = absolute('normalized'), manifest = absolute('rules-manifest');
  process.env.NODE_PATH = path.join(runtime, 'node_modules'); Module._initPaths();
  process.env.DATA_REPO_PATH = data;
  const req = createRequire(path.join(runtime, 'package.json')), ts = req('tsx/cjs/api');
  const load = file => ts.require(path.join(code, 'data-tools/src', file), __filename);
  const writer = load('dice-intake/final-writer.ts'), artifact = load('rules-content/artifact.ts');
  assert.equal(value('accepted-baseline'), writer.finalScRevision, 'unsupported exact accepted SC baseline');
  const options = ['code-root', 'runtime-root', 'data-root', 'rules-db', 'content-db', 'helper-revision', 'accepted-baseline']
    .flatMap(name => ['--' + name, value(name)]);
  if (argv.includes('--accepted-english-title')) options.push('--accepted-english-title');
  const sourceInputs = argv.includes('--upgrade-english-title')
    ? require('./sc-final-auth-inputs.cjs').captureFinalAuthInputs(code, data) : undefined;
  const authenticate = () => JSON.parse(execFileSync(path.join(runtime, 'data-tools/pdf-extract/.venv/Scripts/python.exe'),
    ['-B', '-X', 'utf8', path.join(code, 'data-tools/audits/sc_final_auth.py'), ...options],
    {cwd: code, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024}));
  const auth = authenticate();
  sourceInputs?.();
  // These ignored extraction files remain comparison aids, never authority.
  // Bind the actual read set from complete authenticated QA, not caller paths.
  const comparisonInputs = sourceInputs ? require('./sc-final-auth-inputs.cjs').captureSourceFiles(data,
    auth.report.pdfVerification.frozenOriginalCoverage.ignoredExtractionCaches) : undefined;
  const generated = load('rules-content/cli.ts').readGenerated(inputPath);
  let summaries, summaryInputs;
  if (argv.includes('--accepted-summaries')) {
    summaryInputs = require('./sc-final-summaries.cjs').authenticateSummaries(data,
      load('short-desc/summary-row-schema.ts').readSummaryJsonlText);
    summaries = summaryInputs.next;
  }
  const collectCurrent = () => artifact.collectRulesContentArtifactProvenance({parentRepoRoot: code, dataRepoRoot: data,
    rulesDbPath: rules, rulesManifestPath: manifest,
    rulebookPublicationMetadataPath: path.join(data, 'rulebook-publications/publications.jsonl'),
    chmRulebookPublicationsPath: path.join(data, 'rulebook-labels/chm-publications.jsonl'),
    contentMigrationsPath: path.join(code, 'server/db/content/migrations')},
    {requireDataRepo: true, requireRulesManifest: true, requirePublicationMetadata: true});
  const current = collectCurrent(), normalizedBytes = fs.readFileSync(inputPath);
  const DB = req('better-sqlite3'), apply = argv.includes('--apply'), validate = argv.includes('--validate');
  const db = new DB(contentPath, {readonly: !apply, fileMustExist: true});
  try {
    if (!apply) db.pragma('query_only=ON');
    if (argv.includes('--upgrade-english-title')) {
      const amendment = require('./sc-prismatic-ray.cjs');
      const previousPath = absolute('previous-normalized'), previous = load('rules-content/cli.ts').readGenerated(previousPath);
      assert.deepEqual(previous, require('./sc-final-inputs.cjs').readExact(data, amendment.previousRevision, amendment.previousPath),
        'English upgrade requires the actual accepted operator normalized predecessor');
      const patch = require('./sc-final-inputs.cjs').readExact(data, amendment.candidateRevision, amendment.directory + 'rules-patch.jsonl')[0];
      const requireInputs = () => {
        sourceInputs();
        comparisonInputs();
        summaryInputs.requireInputs();
        assert.deepEqual(collectCurrent(), current, 'English upgrade generation inputs changed');
        assert.equal(execFileSync('git', ['-C', code, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), value('helper-revision'));
      };
      // RESERVED allows the independent complete source replay to read CHM.
      // After writes/cache spill the same rollback-journal DB may be EXCLUSIVE;
      // only same-connection content validation and fixed input checks run then.
      const authenticateBeforeWrite = () =>
        assert.deepEqual(authenticate(), auth, 'authenticated English upgrade inputs changed');
      const upgrade = load('dice-intake/prismatic-ray-upgrade.ts').prismaticRayUpgrade(db, previous, generated,
        previousPath, inputPath, patch, auth.fields, auth.report, summaries, value('helper-revision'),
        {currentProvenance: current, importedAt: new Date().toISOString()}, requireInputs, apply ? 'apply' : 'check',
        undefined, authenticateBeforeWrite);
      if (validate) assert.equal(upgrade.state, 'after', 'English title upgrade has not been applied');
      console.log(JSON.stringify({mode: apply ? 'apply' : validate ? 'validate' : 'dry-run', ...upgrade,
        helperRevision: value('helper-revision'), acceptedEnglishRevision: amendment.candidateRevision,
        wholeBookQaComplete: false, activation: false, ftsRefreshed: false}));
      return;
    }
    if (argv.includes('--upgrade-summaries')) {
      const verifyFull = () => {
        assert(fs.readFileSync(inputPath).equals(normalizedBytes), 'full normalized input changed during upgrade');
        return writer.verifyFullNormalized(db, generated, inputPath, collectCurrent());
      };
      const requireInputs = () => {
        summaryInputs.requireInputs();
        assert.equal(execFileSync('git', ['-C', code, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), value('helper-revision'));
        assert.equal(execFileSync('git', ['-C', code, 'status', '--porcelain', '--', 'data-tools/audits',
          'data-tools/src/dice-intake', 'data-tools/src/short-desc', 'data-tools/src/rules-content',
          'server/db/content/migrations'], {encoding: 'utf8'}).trim(), '', 'dirty final upgrade helpers');
      };
      const upgrade = writer.finalSummaryUpgrade(db, auth.fields, auth.report, verifyFull,
        summaryInputs.previous, summaryInputs.next, requireInputs, apply ? 'apply' : 'check');
      if (validate) assert.equal(upgrade.state, 'after', 'summary upgrade has not been applied');
      console.log(JSON.stringify({mode: apply ? 'apply' : validate ? 'validate' : 'dry-run', ...upgrade,
        helperRevision: value('helper-revision'), acceptedSummaryRevision: writer.finalScSummaryRevision,
        wholeBookQaComplete: false, activation: false, ftsRefreshed: false}));
      return;
    }
    const full = writer.verifyFullNormalized(db, generated, inputPath, current);
    const plan = writer.planFinalOverlay(db, auth.fields, auth.report, full, value('helper-revision'), summaries);
    if (apply) writer.applyFinalOverlay(db, plan, () => writer.verifyFullNormalized(db, generated, inputPath, current));
    if (validate) writer.validateFinalOverlay(db, plan);
    const {rows: _rows, buildMetaJson: _meta, acceptedSummaries: _summaries, ...report} = plan;
    console.log(JSON.stringify({mode: apply ? 'apply' : validate ? 'validate' : 'dry-run',
      acceptedRevision: writer.finalScRevision, helperRevision: value('helper-revision'), ...report,
      readerNoteRevision: writer.finalScNoteRevision,
      acceptedSummaryRevision: summaries ? writer.finalScSummaryRevision : null,
      wholeBookQaComplete: false, activation: false, ftsRefreshed: false}));
  } finally {db.close();}
}

module.exports = {main};
if (require.main === module) main(process.argv.slice(2));
