'use strict';
const assert = require('node:assert/strict');
const candidateRevision = '996a41671f7cb61e9f7fa6cce48a912695694c7c';
const directory = 'dice-qa/books/86/issue-467/';
const previousRevision = '2336ddf280ff27477a7ec760d745ac42a11d5cf9';
const previousPath = 'dice-qa/books/86/issue-461/operator.normalized.generated.json';
const punctuation = {candidateRevision:'c78e1f09632570dcc059fc487df61d4259b96316',directory:'dice-qa/books/86/issue-473/',
  previousRevision:'3109813da4b49d0e9c47ceeba44857a5a230b1e7',previousPath:'dice-qa/books/86/issue-467/handoff-preparation/operator/operator.normalized.generated.json'};
function validateCandidate(candidate, previous, fields, patches, sourcePunctuation = false) {
  const transition = sourcePunctuation ? punctuation : {previousRevision,previousPath};
  assert.equal(candidate.issue,sourcePunctuation ? 473 : 467); assert.equal(candidate.previousNormalizedRevision,transition.previousRevision);
  assert.equal(candidate.previousNormalizedPath,transition.previousPath);
  assert.equal(candidate.completedStateRevision,sourcePunctuation ? '9cffdc0568d4dde97c69fc008f375a91a423dd64' : 'cffdedcddf2d28b58a68caa6d94d60253be5f59d');
  if(sourcePunctuation) assert.equal(candidate.status,'unaccepted-proposal-only','candidate status cannot grant acceptance');
  assert.deepEqual(candidate.candidates.map(r=>r.targetId),sourcePunctuation ? [4421,4425,4426] : [4033,4247,4345,4349,4354,4355]);
  assert.deepEqual(patches.map(p=>p.id),sourcePunctuation ? [4421,4425,4426] : [4247,4345,4354,4355]);
  for(const row of candidate.candidates) {
    const english=previous.spells.filter(r=>r.legacySpellId===row.targetId),body=fields.filter(f=>f.targetId===row.targetId&&f.field==='body');
    assert.equal(english.length,1);assert.equal(body.length,1);assert.equal(row.rulebookId,86);
    assert.deepEqual(row.priorBody,body[0]);
    assert.deepEqual(row.before,{englishText:english[0].descriptionText,englishHtml:english[0].descriptionHtml,chineseText:body[0].text,chineseHtml:body[0].html});
    assert.deepEqual(Object.keys(row.before).sort(),['chineseHtml','chineseText','englishHtml','englishText']);
    assert.deepEqual(Object.keys(row.after).sort(),Object.keys(row.before).sort());
    if(sourcePunctuation) {
      assert.equal(row.status,'unaccepted-proposal-only','row status cannot grant acceptance');
      assert.equal(row.after.chineseText,row.before.chineseText); assert.equal(row.after.chineseHtml,row.before.chineseHtml);
      assert.deepEqual(row.minimalEdits.map(e=>e.field),['englishText','englishHtml']);
    }
    for(const key of Object.keys(row.before)) {
      let value=Array.from(row.before[key]);
      for(const edit of row.minimalEdits.filter(e=>e.field===key)) {
        assert.equal(value.slice(edit.start,edit.end).join(''),edit.before);
        assert.equal(row.before[key].split(edit.before).length,2);
        value.splice(edit.start,edit.end-edit.start,...Array.from(edit.after));
      }
      assert.equal(value.join(''),row.after[key]);
    }
    const patch=patches.find(p=>p.id===row.targetId);
    if(patch){assert.equal(patch.op,'updateSpell');assert.deepEqual(patch.expected,{spell:{description:row.before.englishText,descriptionHtml:row.before.englishHtml}});
      assert.deepEqual(patch.spell,{description:row.after.englishText,descriptionHtml:row.after.englishHtml});}
  }
}
function restorePrior(db, DB, patches) {
  const memory=new DB(db.serialize());
  try {
    for(const patch of patches) {
      const row=memory.prepare('SELECT rulebook_id,description,description_html FROM dnd_spell WHERE id=?').get(patch.id);
      assert.deepEqual(row,{rulebook_id:86,description:patch.spell.description,description_html:patch.spell.descriptionHtml},'stale complete fidelity rules pair');
      memory.prepare('UPDATE dnd_spell SET description=?,description_html=? WHERE id=?').run(patch.expected.spell.description,patch.expected.spell.descriptionHtml,patch.id);
    }
    return memory;
  } catch(error){memory.close();throw error;}
}
module.exports={candidateRevision,directory,previousRevision,previousPath,validateCandidate,restorePrior,
  punctuation:{...punctuation,validateCandidate:(...args)=>validateCandidate(...args,true),restorePrior}};
