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
    'helper-revision', 'accepted-baseline', 'apply', 'validate']);
  for (let i = 0; i < argv.length; i++) {
    assert(argv[i].startsWith('--') && allowed.has(argv[i].slice(2)), 'unknown argument: ' + argv[i]);
    if (!['--apply', '--validate'].includes(argv[i])) i++;
  }
  assert(!(argv.includes('--apply') && argv.includes('--validate')), 'choose apply or validate');
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
  const auth = JSON.parse(execFileSync(path.join(runtime, 'data-tools/pdf-extract/.venv/Scripts/python.exe'),
    ['-B', '-X', 'utf8', path.join(code, 'data-tools/audits/sc_final_auth.py'), ...options],
    {cwd: code, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024}));
  const generated = load('rules-content/cli.ts').readGenerated(inputPath);
  const current = artifact.collectRulesContentArtifactProvenance({parentRepoRoot: code, dataRepoRoot: data,
    rulesDbPath: rules, rulesManifestPath: manifest,
    rulebookPublicationMetadataPath: path.join(data, 'rulebook-publications/publications.jsonl'),
    chmRulebookPublicationsPath: path.join(data, 'rulebook-labels/chm-publications.jsonl'),
    contentMigrationsPath: path.join(code, 'server/db/content/migrations')},
    {requireDataRepo: true, requireRulesManifest: true, requirePublicationMetadata: true});
  const DB = req('better-sqlite3'), apply = argv.includes('--apply'), validate = argv.includes('--validate');
  const db = new DB(contentPath, {readonly: !apply, fileMustExist: true});
  try {
    if (!apply) db.pragma('query_only=ON');
    const full = writer.verifyFullNormalized(db, generated, inputPath, current);
    const plan = writer.planFinalOverlay(db, auth.fields, auth.report, full, value('helper-revision'));
    if (apply) writer.applyFinalOverlay(db, plan, () => writer.verifyFullNormalized(db, generated, inputPath, current));
    if (validate) writer.validateFinalOverlay(db, plan);
    const {rows: _rows, buildMetaJson: _meta, ...report} = plan;
    console.log(JSON.stringify({mode: apply ? 'apply' : validate ? 'validate' : 'dry-run',
      acceptedRevision: writer.finalScRevision, helperRevision: value('helper-revision'), ...report,
      readerNoteRevision: writer.finalScNoteRevision,
      wholeBookQaComplete: false, activation: false, ftsRefreshed: false}));
  } finally {db.close();}
}

module.exports = {main};
if (require.main === module) main(process.argv.slice(2));
