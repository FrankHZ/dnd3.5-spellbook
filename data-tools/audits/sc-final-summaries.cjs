'use strict';
// One fixed accepted composition. No caller-selected revision or projection.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const {readExact} = require('./sc-final-inputs.cjs');
const canonicalRevision = '1e86cf7865f42f15abb7d6629d2d9de54607a13c';
const candidateRevision = '04dd98490e4ad643eafc8f262bb5af57d3bffcd9';
const previousRevision = '0b6fd8b88c1609cfdae50d8943d77eda13750ea8';
const previousCandidate = 'c4fe0c0a7b14aafed04bc9e733387afb51ae45eb';
const canonicalPath = 'short-desc-normalized/summaries.generated.jsonl';
const directory = 'dice-qa/books/86/issue-451/';
const packets = [
  [436, 437, 'ee6d2a0e9c2399a8d97af83dcac2bee21b192b42', 5965072668, 49],
  [438, 439, '4a2d4bd8d78b9b5b0c722ac6d54364d9773b4e25', 5965265027, 48],
  [440, 441, '78f822129b8f885caa769a7ade2d2bb71617dc21', 5965454017, 49],
  [444, 445, '20da4a8ef3d8d54bc7711a642bcb4c548c3cf70c', 5966884155, 47],
  [447, 448, '9a880ccf2a221e09a20646e7f1772be2eb175d1d', 5970870680, 47],
  [449, 450, '3d6ce98eb72b1bda28dc84ecd8c059fac25b21e1', 5971088654, 25],
];
const records = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);

function verifyComposition(previousRaw, candidateRaw, index, sources) {
  const previous = records(previousRaw), next = records(candidateRaw);
  assert.equal(previous.length, 6572);
  assert(candidateRaw.startsWith(previousRaw), 'accepted baseline bytes changed');
  const additions = [], expectedIndex = [];
  for (const [n, [issue, pr, revision, comment, count]] of packets.entries()) {
    const {snapshot, candidates, reviews, inputs} = sources[n];
    const url = `https://github.com/FrankHZ/dnd3.5-spellbook/pull/${pr}#issuecomment-${comment}`;
    assert.equal(snapshot.number, pr); assert(snapshot.mergedAt, 'unmerged acceptance');
    const accepted = snapshot.comments.filter(row => row.url === url);
    assert.equal(accepted.length, 1, 'missing acceptance comment');
    const acceptance = accepted[0];
    assert.equal(acceptance.authorAssociation, 'OWNER'); assert.equal(acceptance.author.login, 'FrankHZ');
    for (const binding of [revision, snapshot.headRefOid, String(count)]) assert(acceptance.body.includes(binding), 'stale acceptance ref');
    assert(/accept/i.test(acceptance.body), 'unaccepted packet');
    assert.equal(inputs.summaryRevision, previousRevision);
    assert.equal(inputs.finalRevision, '0688739d92a2aa9fb3eceeb444daa7260e711058');
    assert.equal(candidates.length, count);
    assert.deepEqual(candidates.map(row => row.stableKey).sort(), inputs.gaps.map(row => `${row.spellId}:${row.lang}:${row.variant}`).sort());
    for (const [i, row] of candidates.entries()) {
      const owner = row.lang === 'en' ? 'imarvin' : 'chm';
      assert(['en', 'zh'].includes(row.lang)); assert.equal(row.variant, owner);
      assert.equal(row.rulebookId, 86); assert.equal(row.rulebookAbbr, 'SC'); assert.equal(row.reviewStatus, 'proposed');
      assert.equal(row.stableKey, `${row.spellId}:${row.lang}:${owner}`);
      assert.equal(row.provenance.consumerOwnerOnly, owner);
      const [reviewPath, line] = row.provenance.reviewRef.replace(/^data\//, '').split(':');
      assert.equal(reviewPath, `dice-qa/books/86/issue-${issue}/reviews.jsonl`);
      const review = reviews[Number(line) - 1]; assert.equal(review.targetId, row.spellId);
      assert.equal(review.proposedFields[row.stableKey], row.summaryText);
      additions.push({...row, reviewStatus: 'accepted'});
      expectedIndex.push({stableKey: row.stableKey, privateRevision: revision,
        candidateRef: `dice-qa/books/86/issue-${issue}/candidates.jsonl:${i + 1}`,
        originalReviewStatus: row.reviewStatus, reviewRef: row.provenance.reviewRef,
        owner, acceptanceComment: url});
    }
  }
  assert.deepEqual(index, expectedIndex, 'composition source index differs');
  assert.deepEqual(next, [...previous, ...additions], 'candidate values/provenance/order differ');
  assert.equal(next.length, 6837); assert.equal(new Set(next.map(row => row.stableKey)).size, 6837);
  assert.equal(additions.filter(row => row.lang === 'en').length, 213);
  assert.equal(additions.filter(row => row.lang === 'zh').length, 52);
  return {previous, next};
}

function authenticateSummaries(data, parse) {
  const initial = new Map();
  const show = (revision, name) => execFileSync('git', ['-C', data, 'show', `${revision}:${name}`],
    {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).replaceAll('\r\n', '\n');
  const read = (revision, name) => {
    readExact(data, revision, name);
    const frozen = show(revision, name), bytes = fs.readFileSync(path.join(data, name));
    assert.equal(bytes.toString('utf8').replaceAll('\r\n', '\n'), frozen, 'input changed while authenticating');
    initial.set(name, bytes); return frozen;
  };
  const canonicalRaw = read(canonicalRevision, canonicalPath);
  const candidateRaw = read(candidateRevision, directory + 'summaries.candidate.jsonl');
  assert.equal(canonicalRaw, candidateRaw, 'promoted canonical differs from complete candidate');
  const previousRaw = show(previousRevision, canonicalPath);
  assert.equal(previousRaw, read(previousCandidate, 'dice-qa/books/86/issue-411/summaries.proposed.jsonl'), 'stale predecessor candidate');
  const sources = packets.map(([issue, pr, revision]) => ({
    snapshot: JSON.parse(read(candidateRevision, directory + `acceptance-${pr}.json`)),
    inputs: JSON.parse(read(revision, `dice-qa/books/86/issue-${issue}/inputs.json`)),
    candidates: records(read(revision, `dice-qa/books/86/issue-${issue}/candidates.jsonl`)),
    reviews: records(read(revision, `dice-qa/books/86/issue-${issue}/reviews.jsonl`)),
  }));
  verifyComposition(previousRaw, candidateRaw, records(read(candidateRevision, directory + 'composition-index.jsonl')), sources);
  const previous = parse(previousRaw), next = parse(canonicalRaw);
  assert.deepEqual(previous.errors, []); assert.deepEqual(next.errors, []);
  // Recheck every authenticated input inside the write transaction as well.
  const requireInputs = () => initial.forEach((bytes, name) => {
    assert(fs.readFileSync(path.join(data, name)).equals(bytes), 'accepted summary input changed during final write');
    assert.equal(execFileSync('git', ['-C', data, 'status', '--porcelain', '--', name], {encoding: 'utf8'}).trim(), '', 'dirty accepted summary input');
  });
  return {previous: previous.rows, next: next.rows, requireInputs};
}
module.exports = {authenticateSummaries, verifyComposition, packets};
