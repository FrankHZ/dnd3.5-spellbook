'use strict';
// The single accepted #500 delta; no arbitrary projection or revision argument.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const {readExact} = require('./sc-final-inputs.cjs');
const previousRevision = '1e86cf7865f42f15abb7d6629d2d9de54607a13c';
const candidateRevision = 'cd67b6039331313cf858c646593f1fe9ddde0adb';
const acceptanceRevision = 'c7d21ef8a573217e54229809219c8fa323f66bab';
const candidatePath = 'dice-qa/books/86/issue-500/summaries-final/summaries.proposed.jsonl';
const acceptancePath = 'dice-qa/books/86/issue-500/main-gate/source-summary-acceptance.json';
const canonicalPath = 'short-desc-normalized/summaries.generated.jsonl';
const records = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);

function verifyDomainComposition(previous, next, receipt) {
  assert.equal(receipt.issue, 500);
  assert.equal(receipt.decision, 'accept-sc-domain-source-inventory-and-summary-handoff');
  assert.equal(receipt.privateEvidenceRevision, candidateRevision);
  assert.equal(receipt.acceptedSummaryPath, candidatePath);
  assert.equal(previous.length, 6837); assert.equal(next.length, 6866);
  const old = new Map(previous.map(r => [r.stableKey, r]));
  const following = new Map(next.map(r => [r.stableKey, r]));
  assert.equal(old.size, previous.length); assert.equal(following.size, next.length);
  const decisions = new Map(receipt.summaryDecisions.map(r => [r.stableKey, r]));
  assert.equal(decisions.size, 30);
  let additions = 0, corrections = 0;
  for (const row of previous) {
    assert(following.has(row.stableKey), 'deleted predecessor summary');
    if (row.stableKey === '4123:zh:chm') {
      const after = following.get(row.stableKey), {provenance: _provenance, ...actual} = after;
      const {provenance: _oldProvenance, ...prior} = row;
      assert.deepEqual(actual, {...prior, summaryText: decisions.get(row.stableKey)?.summaryText,
        sourceKey: 'summary-review:500:4123:zh', sourceName: 'Spell Compendium original domain-list review (#500)',
        sourceKind: 'reviewed-summary-correction'}, 'unlisted correction envelope');
      // The old source envelope is retained in the reviewed correction.
      assert.deepEqual(after.provenance.derivedFrom, {path: 'data/' + canonicalPath, revision: previousRevision, ...row});
      assert.equal(decisions.get(row.stableKey)?.decision, 'accepted-source-correction'); corrections++;
    } else assert.deepEqual(following.get(row.stableKey), row, 'unlisted predecessor change');
  }
  for (const row of next) {
    if (!old.has(row.stableKey)) {
      assert.equal(row.rulebookId, 86); assert.equal(row.lang, 'zh'); assert.equal(row.variant, 'chm');
      assert.equal(row.reviewStatus, 'accepted');
      assert.equal(decisions.get(row.stableKey)?.decision, 'accepted-domain-summary-addition'); additions++;
    }
    if (decisions.has(row.stableKey)) assert.equal(row.summaryText, decisions.get(row.stableKey).summaryText);
  }
  assert.equal(additions, 29); assert.equal(corrections, 1);
  assert.deepEqual(receipt.summaryCounts, {additions:29, corrections:1, preserved:6836, candidateRows:6866, domainTargets:111});
  return {additions, corrections, preserved:6836};
}

function authenticateDomainSummaries(data, parse) {
  const initial = new Map();
  const read = (revision, name) => {
    const value = readExact(data, revision, name);
    initial.set(name, fs.readFileSync(path.join(data, name))); return value;
  };
  const previousRaw = execFileSync('git', ['-C', data, 'show', `${previousRevision}:${canonicalPath}`],
    {encoding:'utf8',maxBuffer:64*1024*1024});
  const next = read(candidateRevision, candidatePath), receipt = read(acceptanceRevision, acceptancePath);
  verifyDomainComposition(records(previousRaw), next, receipt);
  const nextRaw = fs.readFileSync(path.join(data, candidatePath), 'utf8');
  const canonicalBytes = fs.readFileSync(path.join(data, canonicalPath));
  const canonical = canonicalBytes.toString('utf8').replaceAll('\r\n','\n');
  assert(canonical === previousRaw.replaceAll('\r\n','\n') || canonical === nextRaw.replaceAll('\r\n','\n'),
    'unrecognized canonical domain summary state');
  assert.equal(execFileSync('git',['-C',data,'status','--porcelain','--',canonicalPath],{encoding:'utf8'}).trim(), '', 'dirty canonical summaries');
  initial.set(canonicalPath, canonicalBytes);
  const before = parse(previousRaw), after = parse(nextRaw);
  assert.deepEqual(before.errors, []); assert.deepEqual(after.errors, []);
  const requireInputs = () => initial.forEach((bytes, name) => {
    assert(fs.readFileSync(path.join(data, name)).equals(bytes), 'accepted domain summary input changed');
    assert.equal(execFileSync('git',['-C',data,'status','--porcelain','--',name],{encoding:'utf8'}).trim(), '', 'dirty domain summary input');
  });
  // Promotion is main-gate-owned. A before check can use the fixed candidate;
  // apply/validate require the real, committed canonical to match it completely.
  const requireCanonical = () => {
    requireInputs();
    const canonical = fs.readFileSync(path.join(data,canonicalPath),'utf8').replaceAll('\r\n','\n');
    assert.equal(canonical, nextRaw.replaceAll('\r\n','\n'), 'domain summaries require canonical promotion');
    assert.equal(execFileSync('git',['-C',data,'status','--porcelain','--',canonicalPath],{encoding:'utf8'}).trim(), '', 'dirty canonical summaries');
    const committed = execFileSync('git',['-C',data,'show',`HEAD:${canonicalPath}`],{encoding:'utf8',maxBuffer:64*1024*1024});
    assert.equal(canonical, committed.replaceAll('\r\n','\n'), 'uncommitted canonical promotion');
  };
  const correction = {before:before.rows.find(row=>row.spellId===4123&&row.lang==='zh'&&row.variant==='chm'),
    after:after.rows.find(row=>row.spellId===4123&&row.lang==='zh'&&row.variant==='chm')};
  assert(correction.before && correction.after, 'missing bound correction');
  return {previous:before.rows,next:after.rows,correction,requireInputs,requireCanonical};
}
module.exports = {authenticateDomainSummaries,verifyDomainComposition,candidateRevision,acceptanceRevision,candidatePath};
