import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {prepareRolloutFixture} from './rollout-test-fixtures';
import {rolloutInput} from './rollout';
import {acceptedOverlay,AcceptedOverlayError} from '../dice-intake/accepted-overlay';
import {sequenceSnapshot} from '../db/content-sequence-test-fixtures';
import {contentSearchStep} from '../db/content-search-step';
import {runAcceptedOverlay} from '../dice-intake/accepted-overlay-cli';
import {repoRoot} from '../shared/env';

const started=performance.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'action-rollout-'));
let db:Database.Database|undefined,rules:Database.Database|undefined;
try {
  const f=prepareRolloutFixture(temp);db=new Database(f.contentPath);rules=new Database(f.rulesPath);
  const appStatePath=path.join(temp,'app-state-sentinel.sqlite'),appState=new Database(appStatePath);
  appState.exec("CREATE TABLE UserSentinel(value TEXT); INSERT INTO UserSentinel VALUES('operator-owned synthetic sentinel')");appState.close();
  const appStateBefore=fs.readFileSync(appStatePath);process.env.APP_STATE_DATABASE_URL=`file:${appStatePath}`;
  const authenticate=()=>f.authenticate(rules!),old=()=>f.authenticateOld(rules!);
  const run=(mode:'check'|'apply'='check',fault?:Parameters<typeof acceptedOverlay>[3])=>acceptedOverlay(db!,authenticate,mode,fault);
  const snapshot=()=>sequenceSnapshot(db!);
  const original=snapshot();assert.throws(()=>run('apply'),/overlay drift|partial\/extra/);assert.deepEqual(snapshot(),original);
  //629 body commit alone is insufficient: its FTS completion gates the successor.
  assert.throws(()=>acceptedOverlay(db!,old,'apply',point=>{if(point==='after-overlay')throw Error('629 interrupted');}),/629 interrupted/);
  const pending629=snapshot();assert.throws(()=>run('apply'),/search prerequisite incomplete/);assert.deepEqual(snapshot(),pending629);
  assert(acceptedOverlay(db,old,'apply').complete);
  const before=snapshot(),prior629=db.prepare("SELECT * FROM I18nSpellText WHERE spellId IN (84,523,2165,2474) ORDER BY id").all();
  assert.equal(run().state,'before');assert.deepEqual(snapshot(),before);
  assert.equal(run().scope?.targets,37);assert.equal(run().scope?.acceptedClauses,40);assert.equal(run().scope?.acceptedNames,0);assert.equal(run().scope?.acceptedBodies,0);
  const header=f.proposals.find(p=>p.targetId===443)!;
  assert(!header.fields[1]!.before.includes(header.exactReplacement.before),'HTML fixture must require its own edit');
  const checkBroken=(mutate:(h:typeof f.handoff,ps:typeof f.proposals)=>void)=>{
    const h=structuredClone(f.handoff),ps=structuredClone(f.proposals);mutate(h,ps);
    assert.throws(()=>acceptedOverlay(db!,()=>rolloutInput(h,ps,rules!,old()),'apply'));assert.deepEqual(snapshot(),before);
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
  for(const [table,column,where] of [['SpellContent','castingTimeRaw','legacySpellId=498'],['I18nSpellText','descriptionText',"spellId=498 AND variant='effective'"]] as const) {
    const original=db.prepare(`SELECT ${column} v FROM ${table} WHERE ${where}`).get() as {v:string};
    db.prepare(`UPDATE ${table} SET ${column}='stale' WHERE ${where}`).run();const changed=snapshot();
    assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),changed);db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}`).run(original.v);
  }
  const partial=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=498 AND variant='effective'").get() as Record<string,any>;
  db.prepare('DELETE FROM I18nSpellText WHERE id=?').run(partial.id);const partialState=snapshot();assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),partialState);
  const fields=Object.keys(partial);db.prepare(`INSERT INTO I18nSpellText (${fields.join(',')}) VALUES (${fields.map(f=>`@${f}`).join(',')})`).run(partial);
  const proposalBytes=fs.readFileSync(f.rolloutProposalFile);fs.appendFileSync(f.rolloutProposalFile,'\n{}');
  assert.throws(()=>run('apply'),/changed committed input/);assert.deepEqual(snapshot(),before);fs.writeFileSync(f.rolloutProposalFile,proposalBytes);
  // Current629 is authenticated even on successor retry, never annotation-only.
  const old629=db.prepare("SELECT descriptionText FROM I18nSpellText WHERE spellId=84 AND variant='effective'").get() as {descriptionText:string};
  db.exec("UPDATE I18nSpellText SET descriptionText='foreign629' WHERE spellId=84 AND variant='effective'");
  const drift629=snapshot();assert.throws(()=>run('apply'),/overlay drift/);assert.deepEqual(snapshot(),drift629);
  db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=84 AND variant='effective'").run(old629.descriptionText);
  assert.throws(()=>run('apply',point=>{if(point==='before-overlay')db!.exec("UPDATE I18nSpellText SET descriptionText='late drift' WHERE spellId=498 AND variant='effective'");}),/predecessor|search prerequisite/);
  db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=498 AND variant='effective'").run(f.handoff.targets.find(t=>t.id===498)!.selected.descriptionText);
  assert.deepEqual(snapshot(),before);
  db.exec("CREATE TRIGGER corrupt_sc AFTER UPDATE ON I18nSpellText WHEN NEW.spellId=498 BEGIN UPDATE I18nSpellText SET name='bad' WHERE spellId=4001; END");
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
  assert.throws(()=>acceptedOverlay(db!,old,'apply'),/annotations drift/);assert.deepEqual(snapshot(),after);
  // Older closeout/absent-predecessor owner cannot overwrite the later note.
  assert.throws(()=>acceptedOverlay(db!,()=>{const {correction,...input}=old();return {...input,noteKey:'diceDbEnglishCloseout',rows:input.rows.map(r=>({...r,action:'insert'}))};},'apply'));assert.deepEqual(snapshot(),after);
  for(const t of f.handoff.targets) for(const [i] of f.proposals.filter(p=>p.targetId===t.id).entries()) {
    assert((db.prepare('SELECT count(*) n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH ?').get(`new${t.id}x${i}token`) as {n:number}).n>0);
  }
  const owner={directory:'issue-637' as const,acceptedRevision:f.handoff.acceptedRevision,schema:'synthetic-rollout.v1',authenticate:(_root:string,r:Database.Database)=>f.authenticate(r)};
  const args=['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',f.contentPath];const cwd=process.cwd();
  try {
    for(const [where,suffix] of [[repoRoot(),'root'],[path.join(repoRoot(),'data-tools'),'package']]) {
      process.chdir(where!);assert(runAcceptedOverlay([...args,'--report-dir',path.join(f.root,`dice-handoffs/issue-637/${suffix}`)],owner).complete);
      assert.deepEqual(snapshot(),after);
    }
    assert.throws(()=>runAcceptedOverlay([...args,'--proposal','foreign'],owner),/option/);
    assert.throws(()=>runAcceptedOverlay([...args,'--report-dir',path.join(f.root,'dice-handoffs/issue-637/root')],owner),/fresh/);
    assert.throws(()=>runAcceptedOverlay(['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',appStatePath,
      '--report-dir',path.join(f.root,'dice-handoffs/issue-637/app-state')],owner),/APP_STATE_DATABASE_URL/);
  }finally{process.chdir(cwd);}
  assert.deepEqual(fs.readFileSync(appStatePath),appStateBefore);
  assert.equal(contentSearchStep(db).state,'current');
  console.log(JSON.stringify({suite:'fixed action rollout',targets:37,clauses:40,updates:20,inserts:17,ordered629:true,atomicRollback:true,protectedRows:true,ftsFailureRecovery:true,noOp:true,oldOwnerRefuses:true,
    elapsedMs:Math.round(performance.now()-started),peakRssMiB:process.resourceUsage().maxRSS/1024}));
}finally{db?.close();rules?.close();fs.rmSync(temp,{recursive:true,force:true});}
