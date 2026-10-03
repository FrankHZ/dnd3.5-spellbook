'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {readExact, refreshMissing, rawRows, derive} = require('./sc-final-inputs.cjs');
const {verifyComposition, packets} = require('./sc-final-summaries.cjs');

// Full-size synthetic inventories exercise complete-row/provenance comparison,
// all six concrete acceptance authorities, order and byte-preserved baseline.
const previous = Array.from({length: 6572}, (_, i) => ({stableKey: `${i + 1}:en:imarvin`, synthetic: true}));
const previousRaw = previous.map(row => JSON.stringify(row) + '\n').join('');
let sequence = 0;
const sources = packets.map(([issue, pr, revision, comment, count]) => {
  const candidates = Array.from({length: count}, (_, i) => {
    const n = sequence++, lang = n < 213 ? 'en' : 'zh', variant = lang === 'en' ? 'imarvin' : 'chm';
    return {stableKey: `${7000 + n}:${lang}:${variant}`, spellId: 7000 + n, lang, variant, rulebookId: 86,
      rulebookAbbr: 'SC', reviewStatus: 'proposed', summaryText: `Synthetic ${n}`, provenance: {
        consumerOwnerOnly: variant, spanRefs: [`synthetic:${i}`],
        reviewRef: `data/dice-qa/books/86/issue-${issue}/reviews.jsonl:${i + 1}`}};
  });
  return {candidates, reviews: candidates.map(row => ({targetId: row.spellId, proposedFields: {[row.stableKey]: row.summaryText}})),
    inputs: {summaryRevision: '0b6fd8b88c1609cfdae50d8943d77eda13750ea8', finalRevision: '0688739d92a2aa9fb3eceeb444daa7260e711058', gaps: candidates},
    snapshot: {number: pr, mergedAt: 'synthetic', headRefOid: '7'.repeat(40), comments: [{
      url: `https://github.com/FrankHZ/dnd3.5-spellbook/pull/${pr}#issuecomment-${comment}`,
      authorAssociation: 'OWNER', author: {login: 'FrankHZ'}, body: `Accepted ${revision} ${'7'.repeat(40)} ${count}`}]} };
});
const additions = sources.flatMap(source => source.candidates.map(row => ({...row, reviewStatus: 'accepted'})));
const candidateRaw = previousRaw + additions.map(row => JSON.stringify(row) + '\n').join('');
const index = sources.flatMap((source, n) => source.candidates.map((row, i) => ({stableKey: row.stableKey,
  privateRevision: packets[n][2], candidateRef: `dice-qa/books/86/issue-${packets[n][0]}/candidates.jsonl:${i + 1}`,
  originalReviewStatus: 'proposed', reviewRef: row.provenance.reviewRef, owner: row.variant,
  acceptanceComment: source.snapshot.comments[0].url})));
verifyComposition(previousRaw, candidateRaw, index, sources);
for (const change of ['missing', 'extra', 'duplicate', 'value', 'provenance', 'owner', 'status', 'reorder', 'baseline']) {
  const wrong = structuredClone([...previous, ...additions]);
  if (change === 'missing') wrong.pop();
  else if (change === 'extra') wrong.push(wrong.at(-1));
  else if (change === 'duplicate') wrong[wrong.length - 1] = wrong[wrong.length - 2];
  else if (change === 'reorder') [wrong[6572], wrong[6573]] = [wrong[6573], wrong[6572]];
  else if (change === 'baseline') wrong[0].synthetic = false;
  else if (change === 'value') wrong.at(-1).summaryText += ' forged';
  else if (change === 'provenance') wrong.at(-1).provenance.spanRefs = [];
  else if (change === 'owner') wrong.at(-1).variant = 'caller';
  else wrong.at(-1).reviewStatus = 'proposed';
  assert.throws(() => verifyComposition(previousRaw, wrong.map(row => JSON.stringify(row) + '\n').join(''), index, sources), change);
}
for (const change of ['missing-comment', 'wrong-owner', 'wrong-revision', 'stale-baseline', 'wrong-review']) {
  const wrong = structuredClone(sources);
  if (change === 'missing-comment') wrong[0].snapshot.comments = [];
  else if (change === 'wrong-owner') wrong[0].snapshot.comments[0].author.login = 'caller';
  else if (change === 'wrong-revision') wrong[0].snapshot.comments[0].body = 'accepted unrelated';
  else if (change === 'stale-baseline') wrong[0].inputs.summaryRevision = 'f'.repeat(40);
  else wrong[0].reviews[0].proposedFields = {};
  assert.throws(() => verifyComposition(previousRaw, candidateRaw, index, wrong), change);
}
const wrongIndex = structuredClone(index); wrongIndex[0].privateRevision = 'f'.repeat(40);
assert.throws(() => verifyComposition(previousRaw, candidateRaw, wrongIndex, sources), /source index/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-final-inputs-'));
const git = (...args) => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'}).trim();
try {
  assert.throws(() => derive({code: root}), /code root must match/);
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
