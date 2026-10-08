import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {prepareActionFixture} from "./corrections-test-fixtures";
import {actionCorrectionInput,composeActionClauses} from "./corrections";
import {acceptedOverlay,AcceptedOverlayError} from "../dice-intake/accepted-overlay";
import {runAcceptedOverlay} from "../dice-intake/accepted-overlay-cli";
import {sequenceSnapshot} from "../db/content-sequence-test-fixtures";
import {repoRoot} from "../shared/env";

const started=performance.now(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'action-corrections-'));
let db:Database.Database|undefined,rules:Database.Database|undefined;
try {
  const f=prepareActionFixture(temp);db=new Database(f.contentPath);rules=new Database(f.rulesPath);
  const authenticate=()=>f.authenticate(rules!);
  const run=(mode:'check'|'apply'='check',fault?:Parameters<typeof acceptedOverlay>[3])=>acceptedOverlay(db!,authenticate,mode,fault);
  const snapshot=()=>sequenceSnapshot(db!);
  const before=snapshot(),original=db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all() as Record<string,any>[];
  assert.equal(run().state,'before');assert.deepEqual(snapshot(),before);
  assert.deepEqual(run().scope,{targets:4,rulebookIds:[6,52,55,79],acceptedNames:0,acceptedBodies:0,acceptedClauses:7});
  const composed=f.handoff.targets[0]!.descriptionText;
  for(const token of ['newcreationtoken','newforcetoken','newactiontoken','newboundtoken'])assert(composed.includes(token));
  assert(composed.includes('untouchedbodytoken'));
  const edit=f.proposals[0]!;
  assert.throws(()=>composeActionClauses(edit.fields[0]!.before,[edit,edit],'descriptionText'),/overlapping/);
  for(const mutate of [
    (h:typeof f.handoff)=>h.targets.pop(),
    (h:typeof f.handoff)=>{h.targets[0]!.descriptionText='caller body';},
    (h:typeof f.handoff)=>{h.targets[0]!.effective!.name='foreign name';},
    (h:typeof f.handoff)=>{h.priorBuildMeta.overlays.unknown={schema:'invented'};},
    (h:typeof f.handoff)=>{h.targets[0]!.canonical.castingTimeRaw='source drift';},
    (h:typeof f.handoff)=>{h.targets[3]!.effective=h.targets[3]!.selected;},
  ]) {
    assert.throws(()=>acceptedOverlay(db!,()=>{const h=structuredClone(f.handoff);mutate(h);return actionCorrectionInput(h,f.proposals,rules!);},'apply'));
    assert.deepEqual(snapshot(),before);
  }
  const evidenceBefore=fs.readFileSync(f.proposalFile);fs.appendFileSync(f.proposalFile,'\n{}');
  assert.throws(()=>run('apply'),/changed committed input/);assert.deepEqual(snapshot(),before);fs.writeFileSync(f.proposalFile,evidenceBefore);
  for(const [table,column,where] of [['SpellContent','castingTimeRaw','legacySpellId=84'],['I18nSpellText','descriptionText',"spellId=84 AND variant='effective'"]] as const) {
    const old=db.prepare(`SELECT ${column} AS v FROM ${table} WHERE ${where}`).get() as {v:string};
    db.prepare(`UPDATE ${table} SET ${column}='drift' WHERE ${where}`).run();const drift=snapshot();
    assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),drift);
    db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}`).run(old.v);
  }
  const rulesBefore=rules.prepare('SELECT casting_time FROM dnd_spell WHERE id=84').get() as {casting_time:string};
  rules.exec("UPDATE dnd_spell SET casting_time='drift' WHERE id=84");assert.throws(()=>run('apply'),/rules English\/mechanics drift/);assert.deepEqual(snapshot(),before);
  rules.prepare('UPDATE dnd_spell SET casting_time=? WHERE id=84').run(rulesBefore.casting_time);
  const missing=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=523 AND variant='effective'").get() as Record<string,any>;
  db.prepare('DELETE FROM I18nSpellText WHERE id=?').run(missing.id);const missingState=snapshot();
  assert.throws(()=>run('apply'),/predecessor/);assert.deepEqual(snapshot(),missingState);
  const names=Object.keys(missing);db.prepare(`INSERT INTO I18nSpellText (${names.join(',')}) VALUES (${names.map(n=>`@${n}`).join(',')})`).run(missing);
  db.prepare("INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt) VALUES('dice-effective:6:2474',2474,6,'fr','foreign','foreign','foreign','2026-01-01 00:00:00')").run();
  const foreignState=snapshot();assert.throws(()=>run('apply'),/predecessor/);assert.deepEqual(snapshot(),foreignState);
  db.prepare("DELETE FROM I18nSpellText WHERE id='dice-effective:6:2474'").run();
  db.exec("UPDATE SpellContent SET sourceRulebookId=86 WHERE legacySpellId=84");const scState=snapshot();
  assert.throws(()=>run('apply'),/SC/);assert.deepEqual(snapshot(),scState);db.exec("UPDATE SpellContent SET sourceRulebookId=52 WHERE legacySpellId=84");
  const build=db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as {buildMetaJson:string};
  const forgedMeta=JSON.parse(build.buildMetaJson);forgedMeta.overlays.unknown={schema:'invented'};
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(forgedMeta));const annotationState=snapshot();
  assert.throws(()=>run('apply'),/annotations drift/);assert.deepEqual(snapshot(),annotationState);
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(build.buildMetaJson);assert.deepEqual(snapshot(),before);
  // Drift after initial preflight must be rechecked inside the immediate transaction.
  const targetBefore=db.prepare("SELECT descriptionText FROM I18nSpellText WHERE spellId=84 AND variant='effective'").get() as {descriptionText:string};
  assert.throws(()=>run('apply',point=>{if(point==='before-overlay')db!.exec("UPDATE I18nSpellText SET descriptionText='late drift' WHERE spellId=84 AND variant='effective'");}),/predecessor/);
  db.prepare("UPDATE I18nSpellText SET descriptionText=? WHERE spellId=84 AND variant='effective'").run(targetBefore.descriptionText);
  assert.deepEqual(snapshot(),before);
  db.exec("CREATE TRIGGER corrupt_name AFTER UPDATE ON I18nSpellText WHEN NEW.spellId=84 BEGIN UPDATE I18nSpellText SET name='bad' WHERE spellId=84 AND variant='effective'; END");
  const triggerBefore=snapshot();assert.throws(()=>run('apply'));assert.deepEqual(snapshot(),triggerBefore);db.exec('DROP TRIGGER corrupt_name');
  db.exec("CREATE TRIGGER corrupt_sc AFTER UPDATE ON I18nSpellText WHEN NEW.spellId=84 BEGIN UPDATE I18nSpellText SET name='bad' WHERE spellId=4001; END");
  const scTriggerBefore=snapshot();assert.throws(()=>run('apply'),/protected rows/);assert.deepEqual(snapshot(),scTriggerBefore);db.exec('DROP TRIGGER corrupt_sc');
  assert.throws(()=>run('apply',point=>{if(point==='inside-overlay')throw Error('atomic rollback');}),/atomic rollback/);assert.deepEqual(snapshot(),before);
  try {run('apply',point=>{if(point==='after-overlay')throw Error('search interrupted');});assert.fail();}
  catch(error){assert(error instanceof AcceptedOverlayError);assert.equal(error.stage,'search');assert.equal(error.result.overlay,'committed');}
  assert.equal(run().state,'after');assert.equal(run().searchCheck?.state,'stale');
  const bodies=db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all();
  db.exec("CREATE TRIGGER broken_search BEFORE INSERT ON SpellSearchIndexState BEGIN SELECT RAISE(ABORT,'FTS failure'); END");
  const failedSearch=snapshot();assert.throws(()=>run('apply'),/FTS failure/);assert.deepEqual(snapshot(),failedSearch);db.exec('DROP TRIGGER broken_search');
  const recovered=run('apply');assert(recovered.complete);assert.equal(recovered.overlay,'no-op');assert.equal(recovered.search,'committed');
  assert.deepEqual(db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all(),bodies);
  const after=snapshot(),repeat=run('apply');assert(repeat.complete);assert.equal(repeat.overlay,'no-op');assert.equal(repeat.search,'no-op');assert.deepEqual(snapshot(),after);
  for(const old of original) {
    const actual=db.prepare('SELECT * FROM I18nSpellText WHERE id=?').get(old.id) as Record<string,any>;
    if(old.variant==='effective'&&[84,523,2165].includes(old.spellId)) {
      for(const key of Object.keys(old))if(!['descriptionText','descriptionHtml','bodyProvenanceJson','updatedAt'].includes(key))assert.deepEqual(actual[key],old[key]);
    } else assert.deepEqual(actual,old);
  }
  for(const token of ['newcreationtoken','newforcetoken','newactiontoken','newboundtoken','new523token','new2165token','new2474token']) {
    assert((db.prepare('SELECT count(*) n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH ?').get(token) as {n:number}).n>0);
  }
  // Old owner cannot silently downgrade this new annotated state.
  assert.throws(()=>acceptedOverlay(db!,()=>{const {correction,...old}=authenticate();return {...old,noteKey:'diceDbEnglishCloseout',rows:old.rows.map(r=>({...r,action:'insert'}))};},'apply'));
  assert.deepEqual(snapshot(),after);
  const owner={directory:'issue-629' as const,acceptedRevision:f.handoff.acceptedRevision,schema:'synthetic-action.v1',authenticate:(_root:string,r:Database.Database)=>f.authenticate(r)};
  const args=['--data-root',f.root,'--rules-db',f.rulesPath,'--content-db',f.contentPath];
  const cwd=process.cwd();try {
    process.chdir(path.join(repoRoot(),'data-tools'));
    const report=runAcceptedOverlay([...args,'--report-dir',path.join(f.root,'dice-handoffs/issue-629/check')],owner);assert(report.complete);
    assert.deepEqual(snapshot(),after);
    assert.throws(()=>runAcceptedOverlay([...args,'--report-dir',path.join(f.root,'dice-handoffs/issue-629/check')],owner),/fresh/);
    assert.throws(()=>runAcceptedOverlay([...args,'--proposal',f.proposalFile],owner),/option/);
    process.chdir(repoRoot());
    assert(runAcceptedOverlay([...args,'--report-dir',path.join(f.root,'dice-handoffs/issue-629/check-root')],owner).complete);
  }finally{process.chdir(cwd);}
  console.log(JSON.stringify({suite:'fixed action clause corrections',targets:4,updates:3,inserts:1,clauses:7,rollback:true,sourceDrift:true,immediateRecheck:true,searchRecovery:true,noOp:true,
    elapsedMs:Math.round(performance.now()-started),peakRssMiB:process.resourceUsage().maxRSS/1024}));
}finally{db?.close();rules?.close();fs.rmSync(temp,{recursive:true,force:true});}
