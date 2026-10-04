import assert from 'node:assert/strict';

// #467 is one fixed six-entry transition after the accepted #461 state.
export const fidelityCandidate = '996a41671f7cb61e9f7fa6cce48a912695694c7c';
export const fidelityAcceptance = '775005e96a5caa9a83bbf523f716946b2fe890a0';
export const fidelityDirectory = 'dice-qa/books/86/issue-467/';
export const fidelityEnglishIds = [4247, 4345, 4354, 4355];
export const fidelityChineseIds = [4033, 4349];
export function validateFidelityEnglish(id: number, before: {description: string; descriptionHtml: string},
  after: {description: string; descriptionHtml: string}) {
  assert(fidelityEnglishIds.includes(id), 'unlisted source-fidelity English target');
  const terms = id === 4247 ? ['rank in Craft', 'rank of Craft'] : id === 4345 ? ['ground bones</p>', 'ground bones.</p>']
    : id === 4354 ? ['30 ft. per round', '30 feet per round'] : ['Oozes, plants and creatures', 'Oozes, plants, and creatures'];
  for (const key of ['description', 'descriptionHtml'] as const) {
    if (id === 4345 && key === 'description') {assert.equal(after[key], before[key]); continue;}
    assert.equal(before[key].split(terms[0]!).length, 2, 'ambiguous source-fidelity edit');
    assert.equal(after[key], before[key].replace(terms[0]!, terms[1]!), 'unlisted source-fidelity character change');
  }
}
export function validateFidelityChinese(id: number, before: string, after: string) {
  assert(fidelityChineseIds.includes(id), 'unlisted source-fidelity Chinese target');
  if (id === 4349) {
    assert.equal(before.split('”相同').length, 2);
    assert.equal(after, before.replace('”相同', '”（PH 217）相同'));
  } else {
    let start = 0; while (start < after.length && before[start] === after[start]) start++;
    const removed = before.slice(start, start + 17);
    assert.equal([...removed].length, 17); assert(!/\s/.test(removed));
    assert.equal(after, before.slice(0, start) + before.slice(start + 17));
  }
}
