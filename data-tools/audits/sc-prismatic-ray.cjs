'use strict';
// One source-bound paired amendment. Historical accepted snapshots stay frozen.
const assert = require('node:assert/strict');
const candidateRevision = '790f9ebbd024916d16577d69c01d868155a9ccfd';
const directory = 'dice-qa/books/86/issue-434/';
const previousRevision = '307e8b1299e14c456957165b12c46d2c4afe3472';
const previousPath = 'dice-qa/books/86/issue-414/operator-main-gate-8ca3c48.normalized.generated.json';

function validatePair(candidate, patch, prior) {
  assert.equal(candidate.targetId, 3958);
  assert.equal(candidate.status, 'unaccepted-proposal-only');
  assert.equal(candidate.priorRevision, '296903c61e20ce359812148fc0faa234ca2508e7');
  assert.equal(prior.targetId, 3958); assert.equal(prior.english.rulebookId, 86);
  assert.deepEqual(candidate.prior, prior, 'stale complete English amendment prior');
  assert.deepEqual(candidate.patch, patch, 'paired patch differs from source candidate');
  assert.equal(patch.op, 'updateSpell'); assert.equal(patch.id, 3958);
  assert.deepEqual(Object.keys(patch).sort(), ['expected', 'id', 'op', 'source', 'spell']);
  assert.deepEqual(Object.keys(patch.expected), ['spell']);
  assert.deepEqual(Object.keys(patch.spell).sort(), ['description', 'descriptionHtml']);
  assert.deepEqual(patch.expected.spell, {description: prior.english.description, descriptionHtml: prior.englishHtml});
  const title = 'h4. PRISMATIC RAY\n\n';
  const heading = '<h4><span class="caps">PRISMATIC</span> <span class="caps">RAY</span></h4>';
  for (const [key, remove] of [['description', title], ['descriptionHtml', heading]]) {
    assert.equal(patch.expected.spell[key].split(remove).length, 2, 'missing/duplicate title');
    assert.equal(patch.spell[key], patch.expected.spell[key].replace(remove, ''), 'unlisted English amendment');
  }
  return patch;
}

function restorePrior(db, DB, patch) {
  const actual = db.prepare('SELECT rulebook_id,description,description_html FROM dnd_spell WHERE id=3958').get();
  assert.deepEqual(actual, {rulebook_id: 86, description: patch.spell.description,
    description_html: patch.spell.descriptionHtml}, 'stale paired English amendment rules input');
  // Existing source replay already uses in-memory rules reconstruction. Only the
  // authenticated pair is reversed here; full historical QA checks every field.
  const memory = new DB(db.serialize());
  memory.prepare('UPDATE dnd_spell SET description=?,description_html=? WHERE id=3958')
    .run(patch.expected.spell.description, patch.expected.spell.descriptionHtml);
  return memory;
}
module.exports = {candidateRevision, directory, previousRevision, previousPath, validatePair, restorePrior};
