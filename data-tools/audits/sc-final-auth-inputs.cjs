'use strict';
// Keep the already authenticated source inputs exact across the English upgrade.
// No content DB is opened here; full source QA still runs before SQL writes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');

const helperPaths = ['data-tools/audits', 'data-tools/src/dice-intake', 'data-tools/src/rules',
  'data-tools/src/rules-content', 'data-tools/src/short-desc', 'data-tools/src/shared', 'data-tools/pdf-extract/src',
  'server/db/content/migrations', 'server/src/services/spells/spells.provenance.ts'];
const sourcePaths = ['dice-qa/books/86', 'dice-intake', 'chm-mapping', 'rulebook-publications',
  'rulebook-labels', 'rules-patches', 'spells-dice-db-by-mo'];
const originals = ['artifacts/pdf/spell-compendium/Spell Compendium.pdf',
  'artifacts/pdf/spell-compendium/SpellComp_Errata.pdf',
  'artifacts/pdf/phb3.5/Player Handbook v3.5.pdf', 'artifacts/pdf/phb3.5/PHBErrata02172006.pdf',
  'dice-qa/books/86/issue-349/3729-sample.pdf'];

function captureSourceFiles(data, names) {
  const raw = new Map(names.map(name => [name, fs.readFileSync(path.join(data, name))]));
  return () => {
    for (const [name, bytes] of raw)
      assert(fs.readFileSync(path.join(data, name)).equals(bytes), 'authenticated original/source bytes changed: ' + name);
  };
}

function captureFinalAuthInputs(code, data) {
  const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], {maxBuffer: 128 * 1024 * 1024});
  const state = (root, paths) => [git(root, 'rev-parse', 'HEAD'),
    git(root, 'status', '--porcelain', '--untracked-files=no', '--', ...paths),
    git(root, 'diff', '--no-ext-diff', '--no-textconv', '--binary', 'HEAD', '--', ...paths)];
  const codeState = state(code, helperPaths), dataState = state(data, sourcePaths);
  // Code authentication also rejects newly introduced helper files.
  const codeStatus = git(code, 'status', '--porcelain', '--', ...helperPaths);
  const corpus = path.join(data, 'spells-dice-db-by-mo');
  const names = () => fs.readdirSync(corpus).filter(name => name.endsWith('.txt')).sort();
  const corpusNames = names();
  const requireRaw = captureSourceFiles(data, [...originals, ...corpusNames.map(name => 'spells-dice-db-by-mo/' + name)]);
  return () => {
    for (const [root, paths, before] of [[code, helperPaths, codeState], [data, sourcePaths, dataState]]) {
      const after = state(root, paths);
      assert(after.every((bytes, i) => bytes.equals(before[i])), 'authenticated source Git inputs changed');
    }
    assert(git(code, 'status', '--porcelain', '--', ...helperPaths).equals(codeStatus), 'source helpers changed');
    assert.deepEqual(names(), corpusNames, 'authenticated source corpus membership changed');
    requireRaw();
  };
}
module.exports = {captureFinalAuthInputs, captureSourceFiles, originals};
