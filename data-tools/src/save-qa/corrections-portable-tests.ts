import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {prepareSaveFixture} from './corrections-test-fixtures';
import {saveCorrectionInput,normalizeSaveProposals} from './corrections';
import {acceptedOverlay,AcceptedOverlayError} from '../dice-intake/accepted-overlay';
import {sequenceSnapshot} from '../db/content-sequence-test-fixtures';
import {contentSearchStep} from '../db/content-search-step';
import {runAcceptedOverlay} from '../dice-intake/accepted-overlay-cli';
import {repoRoot} from '../shared/env';

const started=performance.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'save-corrections-'));
let db:Database.Database|undefined,rules:Database.Database|undefined;
try {
  const f=prepareSaveFixture(temp);db=new Database(f.contentPath);rules=new Database(f.rulesPath);
  // Source-free inputs exercise the exact JSONL normalization, including the
  // independent HTML span and immutable 3606 discrepancy/clarity classification.
  const raw=f.handoff.targets.map(t=>{
    const ps=f.proposals.filter(p=>p.targetId===t.id),issue=Number(ps[0]!.proposalId.split('-')[0]);
    return {schema:'save-qa-local-proposal.v1',issue,spellId:t.id,book:t.book,accepted:false,activated:false,
      operation:t.effective?'guarded-effective-update':'guarded-effective-insert',expectedEffectiveAbsent:!t.effective,
      context:{selected:t.selected,effective:t.effective,canonical:t.canonical,englishRules:t.englishRules,facets:t.facets,components:t.components},
      selectedPredecessor:t.selected,effectivePredecessor:t.effective,
      before:{descriptionText:t.selected.descriptionText,descriptionHtml:t.selected.descriptionHtml},
      after:{descriptionText:t.descriptionText,descriptionHtml:t.descriptionHtml},
      clauses:ps.map((p,i)=>({clause:i+1,classification:t.id===3606 && i<2?'confirmed-local-save-discrepancy':'clarity-only',
        fields:Object.fromEntries(p.fields.map(f=>{const e=f.exactReplacement!;return [f.field,{before:e.before,after:e.after,
          offset:[...f.before.slice(0,f.before.indexOf(e.before))].length}];}))}))};
  });
  for(const issue of [641,643]) {
    const batch=raw.filter(p=>p.issue===issue),normalized=normalizeSaveProposals(batch,issue);
    assert.deepEqual(normalized,f.proposals.filter(p=>p.proposalId.startsWith(String(issue))));
    for(const mutate of [
      (p:typeof batch)=>{p[0]!.accepted=true;},
      (p:typeof batch)=>{p[0]!.book=86;},
      (p:typeof batch)=>{p[0]!.clauses[0]!.fields.descriptionHtml!.offset=-1;},
      (p:typeof batch)=>{p[0]!.after.descriptionText+='foreign';},
      (p:typeof batch)=>{p.pop();},
    ]){const changed=structuredClone(batch);mutate(changed);assert.throws(()=>normalizeSaveProposals(changed,issue));}
  }
  const unicode=structuredClone(raw.filter(p=>p.issue===641)),unicodeTarget=unicode[0]!;
  for(const field of ['descriptionText','descriptionHtml'] as const) {
    unicodeTarget.before[field]='😀'+unicodeTarget.before[field];unicodeTarget.after[field]='😀'+unicodeTarget.after[field];
    for(const predecessor of new Set([unicodeTarget.selectedPredecessor,unicodeTarget.effectivePredecessor,
      unicodeTarget.context.selected,unicodeTarget.context.effective])) if(predecessor) predecessor[field]='😀'+predecessor[field];
    for(const clause of unicodeTarget.clauses) clause.fields[field]!.offset+=1;
  }
  assert.equal(normalizeSaveProposals(unicode,641).length,3,'Unicode source offsets must remain code points');
  const changedClass=structuredClone(raw.filter(p=>p.issue===643));changedClass.find(p=>p.spellId===3606)!.clauses[2]!.classification='confirmed-local-save-discrepancy';
  assert.throws(()=>normalizeSaveProposals(changedClass,643),/classification/);
  const appStatePath=path.join(temp,'app-state-sentinel.sqlite'),appState=new Database(appStatePath);
  appState.exec("CREATE TABLE UserSentinel(value TEXT); INSERT INTO UserSentinel VALUES('operator-owned synthetic sentinel')");appState.close();
  const appStateBefore=fs.readFileSync(appStatePath);process.env.APP_STATE_DATABASE_URL=`file:${appStatePath}`;
  const authenticate=()=>f.authenticate(rules!),old=()=>f.authenticateOld(rules!),rollout=()=>f.authenticateRollout(rules!);
  const run=(mode:'check'|'apply'='check',fault?:Parameters<typeof acceptedOverlay>[3])=>acceptedOverlay(db!,authenticate,mode,fault);
  const snapshot=()=>sequenceSnapshot(db!);
  const original=snapshot();assert.throws(()=>run('apply'),/overlay drift|partial\/extra/);assert.deepEqual(snapshot(),original);
  //629 body commit alone is insufficient: its FTS completion gates the successor.
  assert.throws(()=>acceptedOverlay(db!,old,'apply',point=>{if(point==='after-overlay')throw Error('629 interrupted');}),/629 interrupted/);
  const pending629=snapshot();assert.throws(()=>run('apply'),/search prerequisite incomplete/);assert.deepEqual(snapshot(),pending629);
  assert(acceptedOverlay(db,old,'apply').complete);
  const before637=snapshot();assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),before637);
  assert.throws(()=>acceptedOverlay(db!,rollout,'apply',point=>{if(point==='after-overlay')throw Error('637 interrupted');}),/637 interrupted/);
  const pending637=snapshot();assert.throws(()=>run('apply'),/search prerequisite incomplete/);assert.deepEqual(snapshot(),pending637);
  assert(acceptedOverlay(db,rollout,'apply').complete);
  const prior637=db.prepare("SELECT * FROM I18nSpellText WHERE spellId NOT IN (2717,2985,3250,3289,3465,3484,3492,3606,4915) ORDER BY id").all();
  const before=snapshot(),prior629=db.prepare("SELECT * FROM I18nSpellText WHERE spellId IN (84,523,2165,2474) ORDER BY id").all();
  assert.equal(run().state,'before');assert.deepEqual(snapshot(),before);
  assert.equal(run().scope?.targets,9);assert.equal(run().scope?.acceptedClauses,15);assert.equal(run().scope?.acceptedNames,0);assert.equal(run().scope?.acceptedBodies,0);
  const header=f.proposals.find(p=>p.targetId===2717)!;
  assert(!header.fields[1]!.before.includes(header.exactReplacement.before),'HTML fixture must require its own edit');
  const checkBroken=(mutate:(h:typeof f.handoff,ps:typeof f.proposals)=>void)=>{
    const h=structuredClone(f.handoff),ps=structuredClone(f.proposals);mutate(h,ps);
    assert.throws(()=>acceptedOverlay(db!,()=>saveCorrectionInput(h,ps,rules!,rollout()),'apply'));assert.deepEqual(snapshot(),before);
  };
  for(const mutate of [
    (h:typeof f.handoff)=>{h.targets.pop();},
    (h:typeof f.handoff)=>{h.targets[0]!.descriptionHtml='foreign';},
    (h:typeof f.handoff)=>{h.targets[0]!.selected.name='foreign name';},
    (h:typeof f.handoff)=>{h.priorBuildMeta.overlays.unknown={};},
    (_h:typeof f.handoff,ps:typeof f.proposals)=>{ps[0]!.accepted=true;},
    (_h:typeof f.handoff,ps:typeof f.proposals)=>{ps.pop();},
    (_h:typeof f.handoff,ps:typeof f.proposals)=>{ps[0]!.rulebookId=86;},
    (_h:typeof f.handoff,ps:typeof f.proposals)=>{ps[0]!.fields[1]!.exactReplacement={before:'absent',after:'foreign',count:1};},
    (h:typeof f.handoff)=>{h.targets[1]!.canonical.castingTimeRaw='stale';},
    (h:typeof f.handoff)=>{h.targets[1]!.englishRules.description='stale';},
    (h:typeof f.handoff)=>{h.targets[1]!.facets.push({id:'foreign'});},
  ])checkBroken(mutate);
  for(const [table,column,where] of [['SpellContent','castingTimeRaw','legacySpellId=2985'],['I18nSpellText','descriptionText',"spellId=2985 AND variant='effective'"]] as const) {
    const original=db.prepare(`SELECT ${column} v FROM ${table} WHERE ${where}`).get() as {v:string};
    db.prepare(`UPDATE ${table} SET ${column}='stale' WHERE ${where}`).run();const changed=snapshot();
    assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),changed);db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}`).run(original.v);
  }
  const partial=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=2985 AND variant='effective'").get() as Record<string,any>;
  db.prepare('DELETE FROM I18nSpellText WHERE id=?').run(partial.id);const partialState=snapshot();assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),partialState);
  const fields=Object.keys(partial);db.prepare(`INSERT INTO I18nSpellText (${fields.join(',')}) VALUES (${fields.map(f=>`@${f}`).join(',')})`).run(partial);
  const inserted=f.handoff.targets[0]!.selected,insertFields=Object.keys(inserted);
  db.prepare(`INSERT INTO I18nSpellText (${insertFields.join(',')}) VALUES (${insertFields.map(f=>`@${f}`).join(',')})`).run({...inserted,id:'foreign:2717',variant:'effective'});
  const presentInsert=snapshot();assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),presentInsert);db.exec("DELETE FROM I18nSpellText WHERE id='foreign:2717'");
  for(const id of [2985,2717]) for(const column of ['name','nameProvenanceJson','bodyProvenanceJson','sourceKey']) {
    const row=f.handoff.targets.find(t=>t.id===id)!.selected;
    db.prepare(`UPDATE I18nSpellText SET ${column}='foreign' WHERE id=?`).run(row.id);const changed=snapshot();
    assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),changed);db.prepare(`UPDATE I18nSpellText SET ${column}=? WHERE id=?`).run(row[column],row.id);
  }
  const proposalBytes=fs.readFileSync(f.saveProposalFile);fs.appendFileSync(f.saveProposalFile,'\n{}');
  assert.throws(()=>run('apply'),/changed committed input/);assert.deepEqual(snapshot(),before);fs.writeFileSync(f.saveProposalFile,proposalBytes);
  // Current629 is authenticated even on successor retry, never annotation-only.
  const old629=db.prepare("SELECT descriptionText FROM I18nSpellText WHERE spellId=84 AND variant='effective'").get() as {descriptionText:string};
  db.exec("UPDATE I18nSpellText SET descriptionText='foreign629' WHERE spellId=84 AND variant='effective'");
  const drift629=snapshot();assert.throws(()=>run('apply'),/overlay drift/);assert.deepEqual(snapshot(),drift629);
  db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=84 AND variant='effective'").run(old629.descriptionText);
  assert.throws(()=>run('apply',point=>{if(point==='before-overlay')db!.exec("UPDATE I18nSpellText SET descriptionText='late drift' WHERE spellId=2985 AND variant='effective'");}),/predecessor|search prerequisite/);
  db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=2985 AND variant='effective'").run(f.handoff.targets.find(t=>t.id===2985)!.selected.descriptionText);
  assert.deepEqual(snapshot(),before);
  db.exec("CREATE TRIGGER corrupt_sc AFTER UPDATE ON I18nSpellText WHEN NEW.spellId=2985 BEGIN UPDATE I18nSpellText SET name='bad' WHERE spellId=4001; END");
  const triggerState=snapshot();assert.throws(()=>run('apply'),/protected rows/);assert.deepEqual(snapshot(),triggerState);db.exec('DROP TRIGGER corrupt_sc');
  assert.throws(()=>run('apply',point=>{if(point==='inside-overlay')throw Error('atomic rollback');}),/atomic rollback/);assert.deepEqual(snapshot(),before);
  db.exec("CREATE TRIGGER broken_search BEFORE INSERT ON SpellSearchIndexState BEGIN SELECT RAISE(ABORT,'FTS failure'); END");
  try {run('apply');assert.fail();}catch(error){assert(error instanceof AcceptedOverlayError);assert.equal(error.stage,'search');assert.equal(error.result.overlay,'committed');assert.equal(error.result.search,'failed');}
  const bodies=db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all(),failedState=snapshot();
  assert.equal(run().state,'after');assert.equal(run().searchCheck?.state,'stale');assert.throws(()=>run('apply'),/FTS failure/);assert.deepEqual(snapshot(),failedState);
  db.exec('DROP TRIGGER broken_search');
  const recovered=run('apply');assert(recovered.complete);assert.equal(recovered.overlay,'no-op');assert.equal(recovered.search,'committed');assert.deepEqual(db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all(),bodies);
  const after=snapshot();const repeat=run('apply');assert.equal(repeat.overlay,'no-op');assert.equal(repeat.search,'no-op');assert(repeat.complete);assert.deepEqual(snapshot(),after);
  assert.deepEqual(db.prepare("SELECT * FROM I18nSpellText WHERE spellId IN (84,523,2165,2474) ORDER BY id").all(),prior629);
  assert.deepEqual(db.prepare("SELECT * FROM I18nSpellText WHERE spellId NOT IN (2717,2985,3250,3289,3465,3484,3492,3606,4915) ORDER BY id").all(),prior637);
  assert.throws(()=>acceptedOverlay(db!,rollout,'apply'),/annotations drift/);assert.deepEqual(snapshot(),after);
  assert.throws(()=>acceptedOverlay(db!,old,'apply'),/annotations drift/);assert.deepEqual(snapshot(),after);
  // Older closeout/absent-predecessor owner cannot overwrite the later note.
  assert.throws(()=>acceptedOverlay(db!,()=>{const {correction,...input}=old();return {...input,noteKey:'diceDbEnglishCloseout',rows:input.rows.map(r=>({...r,action:'insert'}))};},'apply'));assert.deepEqual(snapshot(),after);
  for(const t of f.handoff.targets) for(const [i] of f.proposals.filter(p=>p.targetId===t.id).entries()) {
    assert((db.prepare('SELECT count(*) n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH ?').get(`new${t.id}x${i}token`) as {n:number}).n>0);
  }
  // Exact-after recovery continues to authenticate predecessors, retained
  // fields and the single new annotation, even when FTS is otherwise current.
  for(const [table,column,where,value] of [
    ['I18nSpellText','descriptionText',"spellId=2985 AND variant='effective'",'foreign body'],
    ['I18nSpellText','name',"spellId=2985 AND variant='effective'",'foreign name'],
    ['I18nSpellText','descriptionHtml',"spellId=443 AND variant='effective'",'foreign637'],
    ['SpellContent','savingThrowRaw','legacySpellId=3606','foreign mechanics'],
    ['RulesContentBuild','buildMetaJson','1=1','{}'],
  ]) {
    const row=db.prepare(`SELECT ${column} value FROM ${table} WHERE ${where}`).get() as {value:any};
    db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}`).run(value);const changed=snapshot();
    assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),changed);db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}`).run(row.value);
  }
  assert.deepEqual(snapshot(),after);
  const owner={directory:'issue-645' as const,acceptedRevision:f.handoff.acceptedRevision,schema:'synthetic-save.v1',authenticate:(_root:string,r:Database.Database)=>f.authenticate(r)};
  const args=['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',f.contentPath];const cwd=process.cwd();
  try {
    for(const [where,suffix] of [[repoRoot(),'root'],[path.join(repoRoot(),'data-tools'),'package']]) {
      process.chdir(where!);assert(runAcceptedOverlay([...args,'--report-dir',path.join(f.root,`dice-handoffs/issue-645/${suffix}`)],owner).complete);
      assert.deepEqual(snapshot(),after);
    }
    assert.throws(()=>runAcceptedOverlay([...args,'--proposal','foreign'],owner),/option/);
    assert.throws(()=>runAcceptedOverlay([...args,'--accepted-revision','foreign'],owner),/revision/);
    assert.throws(()=>runAcceptedOverlay(['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',f.rulesPath,'--report-dir',path.join(f.root,'dice-handoffs/issue-645/alias')],owner),/alias|collid|output/);
    assert.throws(()=>runAcceptedOverlay([...args,'--report-dir',path.join(f.root,'dice-handoffs/issue-645/root')],owner),/fresh/);
    assert.throws(()=>runAcceptedOverlay(['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',appStatePath,
      '--report-dir',path.join(f.root,'dice-handoffs/issue-645/app-state')],owner),/APP_STATE_DATABASE_URL/);
  }finally{process.chdir(cwd);}
  assert.deepEqual(fs.readFileSync(appStatePath),appStateBefore);
  assert.equal(contentSearchStep(db).state,'current');
  console.log(JSON.stringify({suite:'fixed saving corrections',targets:9,clauses:15,updates:7,inserts:2,ordered629637:true,atomicRollback:true,protectedRows:true,ftsFailureRecovery:true,noOp:true,oldOwnerRefuses:true,
    elapsedMs:Math.round(performance.now()-started),peakRssMiB:process.resourceUsage().maxRSS/1024}));
}finally{db?.close();rules?.close();fs.rmSync(temp,{recursive:true,force:true});}
