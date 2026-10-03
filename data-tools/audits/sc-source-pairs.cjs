'use strict';
// Fixed #461 source corrections reuse the historical final source replay.
const assert = require('node:assert/strict');
const candidateRevision = 'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f';
const directory = 'dice-qa/books/86/issue-461/';
const previousRevision = '9ee687c380d22308d6f4aac3a3ad3eaa6196c614';
const previousPath = 'dice-qa/books/86/issue-434/operator.normalized.generated.json';

function validateCandidate(candidate, priorProposal, previous, fields, patch) {
  assert.equal(candidate.issue, 461);
  assert.equal(candidate.status, 'unaccepted-proposal-only');
  assert.equal(candidate.priorProposalRevision, '552e07a09950c2e7675eab0b494a370fcc5cce70');
  assert.equal(candidate.priorProposalPath, 'dice-qa/books/86/issue-459/review-3934/content-candidates.json');
  assert.equal(candidate.previousNormalizedRevision, previousRevision);
  assert.equal(candidate.completedStateRevision, '8afc1a3db3b3b506a6c833d0e10336fd09bc5422');
  assert.deepEqual(candidate.candidates.map(r => r.targetId), [3930, 3934]);
  for (const row of candidate.candidates) {
    assert.equal(row.rulebookId, 86); assert.equal(row.status, 'unaccepted-proposal-only');
    for (const value of [row.before, row.after]) assert.deepEqual(Object.keys(value).sort(),
      ['chineseHtml', 'chineseText', 'englishHtml', 'englishText']);
    const proposal = priorProposal.find(r => r.targetId === row.targetId);
    assert.deepEqual(row.before, proposal.acceptedInput, 'stale four-field source predecessor');
    assert.deepEqual(row.after, proposal.pairedCandidate, 'unlisted source correction');
    const english = previous.spells.filter(r => r.legacySpellId === row.targetId);
    assert.equal(english.length, 1); assert.equal(english[0].sourceRulebookId, 86);
    const body = fields.filter(r => r.targetId === row.targetId && r.field === 'body');
    assert.equal(body.length, 1); assert.deepEqual(row.priorBody, body[0]);
    assert.deepEqual(row.before, {englishText: english[0].descriptionText, englishHtml: english[0].descriptionHtml,
      chineseText: body[0].text, chineseHtml: body[0].html});
  }
  const en = candidate.candidates[1];
  assert.deepEqual(Object.keys(patch).sort(), ['expected', 'id', 'op', 'source', 'spell']);
  assert.equal(patch.op, 'updateSpell'); assert.equal(patch.id, 3934);
  assert.deepEqual(patch.expected, {spell: {description: en.before.englishText, descriptionHtml: en.before.englishHtml}});
  assert.deepEqual(patch.spell, {description: en.after.englishText, descriptionHtml: en.after.englishHtml});
  return patch;
}
// The frozen source proposal predates the maintained patch source schema.
// Translate only its descriptive source metadata; value/expected pairs stay exact.
function maintainedPatch(patch) {
  assert.equal(patch.id, 3934); assert.equal(patch.op, 'updateSpell');
  assert.deepEqual(Object.keys(patch.source).sort(), ['authority', 'issue']);
  assert.equal(patch.source.issue, 461);
  return {...patch, source: {provenance: `Issue461 source candidate ${candidateRevision}; independent source acceptance 5f05fad7df5256a9c3c998d3be77aac238445107`}};
}
function restorePrior(db, DB, patch) {
  const actual = db.prepare('SELECT rulebook_id,description,description_html FROM dnd_spell WHERE id=3934').get();
  assert.deepEqual(actual, {rulebook_id: 86, description: patch.spell.description,
    description_html: patch.spell.descriptionHtml}, 'stale paired source correction rules input');
  const memory = new DB(db.serialize());
  memory.prepare('UPDATE dnd_spell SET description=?,description_html=? WHERE id=3934')
    .run(patch.expected.spell.description, patch.expected.spell.descriptionHtml);
  return memory;
}
module.exports = {candidateRevision, directory, previousRevision, previousPath, validateCandidate, maintainedPatch, restorePrior};
