'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {readExact, refreshMissing, rawRows} = require('./sc-final-inputs.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-final-inputs-'));
const git = (...args) => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'}).trim();
try {
  git('init', '--quiet'); git('config', 'user.name', 'Synthetic'); git('config', 'user.email', 'synthetic@example.invalid');
  fs.writeFileSync(path.join(root, 'input.json'), '{"targetId":4837,"rulebookId":9}\n');
  git('add', '--', 'input.json'); git('commit', '--quiet', '-m', 'Synthetic exact input');
  const revision = git('rev-parse', 'HEAD');
  assert.deepEqual(readExact(root, revision, 'input.json'), {targetId: 4837, rulebookId: 9});
  assert.throws(() => readExact(root, 'HEAD', 'input.json'), /exact input revision/);
  fs.writeFileSync(path.join(root, 'input.json'), '{"targetId":4837,"rulebookId":86}\n');
  assert.throws(() => readExact(root, revision, 'input.json'), /dirty exact input/);
  git('add', '--', 'input.json');
  fs.writeFileSync(path.join(root, 'input.json'), '{"targetId":4837,"rulebookId":9}\n');
  assert.throws(() => readExact(root, revision, 'input.json'), /dirty exact input/);
  git('commit', '--quiet', '-m', 'Synthetic changed identity');
  git('restore', '--', 'input.json');
  assert.throws(() => readExact(root, revision, 'input.json'), /changed exact input/);
  fs.rmSync(path.join(root, 'input.json'));
  assert.throws(() => readExact(root, revision, 'input.json'), /dirty exact input/);

  const before = {name: 'Synthetic', description: 'Protected English', rulebookId: 86,
    editionId: 5, mechanics: {descriptors: []}};
  const row = {targetId: 4617, field: 'descriptionText', after: '已接受译文', proposedHtml: '<pre>已接受译文</pre>',
    input: {english: before, englishHtml: '<p>Protected English</p>'}};
  const english = new Map([[4617, {...before, mechanics: {descriptors: ['Sonic']}}]]);
  const rebound = refreshMissing([row], english, new Map(), []);
  assert.deepEqual(rebound[0].input.english, english.get(4617));
  assert.equal(rebound[0].after, row.after); assert.equal(rebound[0].proposedHtml, row.proposedHtml);
  assert.deepEqual(row.input.english.mechanics.descriptors, []);
  assert.throws(() => refreshMissing([row], new Map([[4617, before]]), new Map(), []), /wrong accepted Sonic/);
  assert.throws(() => refreshMissing([row], new Map([[4617, {...english.get(4617), name: 'Tampered'}]]), new Map(), []),
    /unrelated translation input/);
  assert.throws(() => refreshMissing([row], new Map(), new Map(), []), /missing translation target/);

  const DB = require('better-sqlite3'), db = new DB(':memory:');
  try {
    db.exec("CREATE TABLE legacy(id INTEGER PRIMARY KEY, body VARCHAR(30)); INSERT INTO legacy VALUES(1,CAST(x'ff' AS TEXT))");
    const original = rawRows(db, 'legacy');
    db.exec("UPDATE legacy SET body=CAST(x'fe' AS TEXT)");
    assert.notDeepEqual(rawRows(db, 'legacy'), original, 'invalid legacy bytes must not collapse through UTF-8 decoding');
  } finally {db.close();}
} finally {
  // Only the exact newly created synthetic directory.
  fs.rmSync(root, {recursive: true, force: true});
}
console.log('SC final input authentication and refresh rejection checks passed');
