import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeRulesContent, type LegacyRulesContentInput} from '../rules-content/normalize';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {importSummaryRows} from '../short-desc/import';
import {summaryImportStep} from '../short-desc/import-step';
import type {SummaryRow} from '../short-desc/summary-row-schema';
import {clarificationCandidate, clarificationAcceptance, clarificationPath} from './source-clarifications';
import {punctuationCandidate, punctuationAcceptance} from './source-fidelity';
import {applyFinalOverlay, planFinalOverlay, finalSummaryUpgrade, verifyFullNormalized,
  finalScNoteRevision, finalScSummaryRevision, domainScSummaryRevision, domainScSummaryCandidate,
  domainScSummaryPath, type FinalField} from './final-writer';

const root=path.resolve(__dirname,'../../..'), temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-domain-summary-'));
const addedIds=[3840,3841,3844,3878,3904,3949,4021,4027,4028,4213,4215,4216,4239,4263,4276,
  4328,4472,4477,4478,4483,4548,4551,4575,4578,4579,4581,4618,4721,4767];
const ids=[...addedIds,4088,4111,4123,4229,3901,4465,4564];
const source:LegacyRulesContentInput={rulebooks:[{id:86,dndEditionId:5,name:'Synthetic',abbr:'SC',slug:'synthetic',
  publicationCategory:'supplement',publicationFamily:'synthetic',publicationSourceKind:'synthetic',publicationDisplayOrder:1,
  publicationYear:null,publicationDate:null,publicationUrl:null,publicationImage:null,publicationReviewStatus:'accepted'},{id:9,dndEditionId:3,name:'Other',abbr:'OTHER',slug:'other',
  publicationCategory:'supplement',publicationFamily:'other',publicationSourceKind:'synthetic',publicationDisplayOrder:2,
  publicationYear:null,publicationDate:null,publicationUrl:null,publicationImage:null,publicationReviewStatus:'accepted'}],
  spells:[...ids,4837].map(id=>({id,added:'2000-01-01T00:00:00Z',rulebookId:id===4837?9:86,name:`Synthetic ${id}`,slug:`synthetic-${id}`,
    page:1,description:'Protected source body',descriptionHtml:'<p>Protected source body</p>',schoolId:1,schoolName:'Evocation',schoolSlug:'evocation',
    verbalComponent:true,somaticComponent:true,materialComponent:false,arcaneFocusComponent:false,divineFocusComponent:false,
    xpComponent:false,metaBreathComponent:false,trueNameComponent:false,corruptComponent:false,verified:false})),
  descriptors:[],listEntries:[]};
const fingerprint={path:'synthetic',sha256:'a'.repeat(64)};
const provenance:RulesContentArtifactProvenance={schemaVersion:1,parentRepo:{commit:'1'.repeat(40),dirty:false},dataRepo:{commit:'2'.repeat(40),dirty:false},
  rulesDb:fingerprint,canonicalInputs:{rulesManifest:fingerprint,rulebookPublicationMetadata:fingerprint,chmRulebookPublications:fingerprint},contentMigrations:fingerprint};
const normalized=normalizeRulesContent(source,'2026-10-04T01:00:00Z');
normalized.artifact=createRulesContentArtifactMetadata({scope:'full',sourceTotals:{rulebooks:2,spells:ids.length+1,descriptors:0,classListEntries:0,domainListEntries:0},provenance});
const input=path.join(temp,'normalized.json');fs.writeFileSync(input,JSON.stringify(normalized));
const fields:FinalField[]=ids.flatMap(targetId=>[
  {targetId,rulebookId:86,field:'name',text:'受保护名称',origin:{kind:'chm',sourceKey:'synthetic'},review:{disposition:'source-reviewed-retention'}},
  {targetId,rulebookId:86,field:'body',text:'受保护正文及读者备注',html:'<p>受保护正文及读者备注</p>',
    origin:{kind:'native',sourceKey:'synthetic'},review:{disposition:'source-correct'}}] as FinalField[]);
for(const field of fields.filter(f=>f.field==='body'&&[3901,4465,4564].includes(f.targetId))){
  const text='合'.repeat(400)+'\n\n受保护备注';field.text=text;field.html=`<pre>${text}</pre>`;
  field.sourceCorrection={revision:clarificationCandidate,acceptanceRevision:clarificationAcceptance,
    path:clarificationPath,targetId:field.targetId,prior:structuredClone(field)};
  for(const key of ['text','html'] as const){
    const chars=Array.from(field[key]!),offset=key==='html'?5:0;
    if(field.targetId===4465)chars.splice(257+offset,0,...'新'.repeat(8));
    else if(field.targetId===4564)chars.splice(314+offset,0,...'新'.repeat(7));
    else {chars.splice(260+offset,7,'新','新');chars.splice(221+offset,0,...'新'.repeat(8));}
    field[key]=chars.join('');
  }
}
const report={sourceRevisions:{sourcePunctuationCandidate:punctuationCandidate,sourcePunctuationAcceptance:punctuationAcceptance,
  sourceClarificationCandidate:clarificationCandidate,sourceClarificationAcceptance:clarificationAcceptance},
  changedNames:0,changedBodies:ids.length,retained:{names:ids,bodies:[]},sourceQuestionIds:[],
  readerNoteAddendum:{revision:finalScNoteRevision,targets:[4088,4111,4229]}};
const row=(spellId:number,summaryText:string):SummaryRow=>({id:`spell-summary:${spellId}:zh:chm`,spellId,rulebookId:86,
  lang:'zh',variant:'chm',summaryText,sourceKey:'synthetic',sourceName:'Synthetic',sourceKind:'synthetic',reviewStatus:'accepted'});
const correction={...row(4123,'合成原摘要'),sourceKey:'synthetic-original',sourceName:'Synthetic original',sourceKind:'class-list'};
const previous=[correction,row(4088,'受保护摘要'),{...row(4837,'其他书摘要'),rulebookId:9}];
const next=[{...correction,summaryText:'合成修订摘要',sourceKey:'summary-review:500:4123:zh',
  sourceName:'Spell Compendium original domain-list review (#500)',sourceKind:'reviewed-summary-correction'},
  ...previous.slice(1),...addedIds.map(id=>row(id,'合成新增摘要'))];
const db=new Database(':memory:');
const snapshot=()=>({schema:db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(),
  tables:(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name:string}[])
    .map(({name})=>({name,rows:db.prepare(`SELECT * FROM "${name}"`).all()}))});
try {
  const composition=require(path.join(root,'data-tools/audits/sc-domain-summaries.cjs'));
  const record=(r:SummaryRow)=>({schemaVersion:1,stableKey:`${r.spellId}:${r.lang}:${r.variant}`,
    ...r,provenance:{synthetic:true}});
  const oldRecords=[record(correction),...Array.from({length:6836},(_,i)=>record(row(10000+i,'合成受保护摘要')))];
  const correctedRecord={...record(next[0]!),provenance:{derivedFrom:{path:'data/short-desc-normalized/summaries.generated.jsonl',
    revision:finalScSummaryRevision,...oldRecords[0]}}};
  const nextRecords=[correctedRecord,...oldRecords.slice(1),...addedIds.map(id=>record(row(id,'合成新增摘要')))];
  const receipt={issue:500,decision:'accept-sc-domain-source-inventory-and-summary-handoff',
    privateEvidenceRevision:composition.candidateRevision,acceptedSummaryPath:composition.candidatePath,
    summaryDecisions:[{stableKey:correctedRecord.stableKey,summaryText:correctedRecord.summaryText,decision:'accepted-source-correction'},
      ...nextRecords.slice(6837).map(r=>({stableKey:r.stableKey,summaryText:r.summaryText,decision:'accepted-domain-summary-addition'}))],
    summaryCounts:{additions:29,corrections:1,preserved:6836,candidateRows:6866,domainTargets:111}};
  assert.deepEqual(composition.verifyDomainComposition(oldRecords,nextRecords,receipt),{additions:29,corrections:1,preserved:6836});
  for(const change of [(rows:any[])=>rows[1].summaryText='forged',
    (rows:any[])=>rows[0].provenance.derivedFrom.summaryText='forged',
    (rows:any[])=>rows.at(-1).summaryText='unaccepted',
    (rows:any[])=>rows.at(-1).stableKey=rows[1].stableKey]) {
    const wrong=structuredClone(nextRecords);change(wrong);assert.throws(()=>composition.verifyDomainComposition(oldRecords,wrong,receipt));
  }
  assert.throws(()=>composition.verifyDomainComposition(oldRecords,nextRecords,{...receipt,privateEvidenceRevision:'f'.repeat(40)}));
  const entry=require(path.join(root,'data-tools/audits/sc-final-overlay.cjs'));
  assert.throws(()=>entry.main(['--accepted-domain-summaries']),/require accepted summaries/);
  assert.throws(()=>entry.main(['--upgrade-domain-summaries']),/requires accepted domain summaries/);
  assert.throws(()=>entry.main(['--accepted-summaries','--accepted-domain-summaries','--upgrade-summaries']),/choose one summary transition/);
  assert.throws(()=>entry.main(['--accepted-summaries','--accepted-domain-summaries','--accepted-english-title','--upgrade-english-title']),/complete source transition/);
  const combined=['--accepted-summaries','--accepted-domain-summaries','--accepted-english-title',
    '--accepted-source-pairs','--accepted-source-fidelity','--accepted-source-punctuation','--accepted-source-clarifications'];
  for(const mode of [[],['--apply'],['--validate']])assert.throws(
    ()=>entry.main([...combined,'--upgrade-domain-summaries',...mode]),/missing --code-root/,
    'dedicated domain upgrade accepts every completed source state');
  assert.throws(()=>entry.main([...combined,'--apply']),/writes require a dedicated upgrade/);
  assert.throws(()=>entry.main([...combined,'--upgrade-domain-summaries','--upgrade-source-clarifications']),/complete source transition/);
  assert.throws(()=>entry.main([...combined,'--upgrade-domain-summaries','--previous-normalized','synthetic']),/previous normalized belongs/);
  for(const file of fs.readdirSync(path.join(root,'server/db/content/migrations')).sort()) if(file!=='migration_lock.toml')
    db.exec(fs.readFileSync(path.join(root,'server/db/content/migrations',file,'migration.sql'),'utf8'));
  importGenerated(db,normalized,false,input,{currentProvenance:provenance,importedAt:'synthetic'});
  importSummaryRows(db,previous,false);
  db.prepare("UPDATE I18nSpellSummaryText SET createdAt='2020-01-01 00:00:00',updatedAt='2021-01-01 00:00:00'").run();
  const full=()=>verifyFullNormalized(db,normalized,input,provenance);
  const plan=planFinalOverlay(db,fields,report,full(),'c'.repeat(40),previous);
  applyFinalOverlay(db,plan);
  let drift=false;
  const upgrade=(mode:'check'|'apply'='check',fault=()=>{},prior=previous,following=next)=>
    finalSummaryUpgrade(db,fields,report,full,prior,following,()=>assert(!drift,'input drift'),mode,fault,
      {before:correction,after:next[0]!});
  const before=snapshot();
  const writeSummaries=(name:string,rows:SummaryRow[])=>{const file=path.join(temp,name);
    fs.writeFileSync(file,rows.map(r=>JSON.stringify({...r,schemaVersion:1,stableKey:`${r.spellId}:${r.lang}:${r.variant}`})).join('\n')+'\n');return file;};
  assert.throws(()=>summaryImportStep(db,writeSummaries('next.jsonl',next),writeSummaries('previous.jsonl',previous)),/Annotated predecessor/);
  assert.deepEqual(upgrade(),{mode:'check',state:'before',changed:false,wouldChange:true,inserted:0,updated:0,deleted:0});
  assert.deepEqual(snapshot(),before);
  for(const fault of [()=>{throw Error('bounded fault');},()=>{drift=true;},
    ()=>db.prepare("UPDATE I18nSpellText SET descriptionText='forged'").run(),
    ()=>db.prepare("UPDATE I18nSpellSummaryText SET updatedAt='2022-01-01 00:00:00' WHERE spellId=4088").run()]) {
    assert.throws(()=>upgrade('apply',fault));drift=false;assert.deepEqual(snapshot(),before,'fault did not roll back rows and metadata');
  }
  const mutateMeta=(change:(meta:any)=>void)=>{const meta=JSON.parse(plan.buildMetaJson);change(meta.overlays.scFinalNameBody);
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(meta));const bad=snapshot();
    assert.throws(()=>upgrade());assert.throws(()=>upgrade('apply'));assert.deepEqual(snapshot(),bad);
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(plan.buildMetaJson);};
  mutateMeta(m=>m.summaryQa.acceptedRevision='f'.repeat(40));
  mutateMeta(m=>{m.summaryQa.acceptedRevision=domainScSummaryRevision;m.summaryQa.candidateRevision=domainScSummaryCandidate;m.summaryQa.path=domainScSummaryPath;});
  mutateMeta(m=>delete m.readerNoteAddendum);
  mutateMeta(m=>{delete m.summaryQa;m.semanticQa.summaries='pending';});
  const wrong=structuredClone(next);wrong[0]!.summaryText='未接受的修正';assert.throws(()=>upgrade('apply',()=>{},previous,wrong));
  const unlisted=structuredClone(next);unlisted[1]!.summaryText='未授权改动';assert.throws(()=>upgrade('apply',()=>{},previous,unlisted));
  assert.throws(()=>upgrade('apply',()=>{},previous,[...next,next[0]!]));
  assert.throws(()=>upgrade('apply',()=>{},previous,next.slice(1)));
  const partial=next.at(-1)!;importSummaryRows(db,[partial],false);const mixed=snapshot();assert.throws(()=>upgrade('apply'));assert.deepEqual(snapshot(),mixed);
  db.prepare('DELETE FROM I18nSpellSummaryText WHERE id=?').run(partial.id);
  const applied=upgrade('apply');assert.equal(applied.inserted,29);assert.equal(applied.updated,1);assert.equal(applied.deleted,0);
  const after=snapshot();assert.equal(upgrade().state,'after');assert.equal(upgrade('apply').changed,false);assert.deepEqual(snapshot(),after,'repeat wrote timestamps');
  const afterMeta=JSON.parse(String(db.prepare('SELECT buildMetaJson FROM RulesContentBuild').pluck().get()));
  const unannotated=structuredClone(afterMeta);delete unannotated.overlays.scFinalNameBody.summaryQa;
  unannotated.overlays.scFinalNameBody.semanticQa.summaries='pending';
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(unannotated));
  const unknownAfter=snapshot();assert.throws(()=>upgrade(),/Missing accepted annotated summary predecessor/);
  assert.deepEqual(snapshot(),unknownAfter,'generic after preflight cannot manufacture acceptance');
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(afterMeta));
  const metadata=JSON.parse(String(db.prepare('SELECT buildMetaJson FROM RulesContentBuild').pluck().get()));
  const expected=JSON.parse(plan.buildMetaJson);
  Object.assign(expected.overlays.scFinalNameBody.summaryQa,{acceptedRevision:domainScSummaryRevision,candidateRevision:domainScSummaryCandidate,
    path:domainScSummaryPath,canonicalRows:next.length,scRows:next.filter(r=>r.rulebookId===86).length});
  assert.deepEqual(metadata,expected,'other source overlays/build provenance changed');
  for(const protectedRow of previous.slice(1)) assert.deepEqual(db.prepare('SELECT * FROM I18nSpellSummaryText WHERE id=?').get(protectedRow.id),
    before.tables.find(t=>t.name==='I18nSpellSummaryText')!.rows.find((r:any)=>r.id===protectedRow.id));
  const corrected=db.prepare('SELECT * FROM I18nSpellSummaryText WHERE id=?').get(correction.id) as any;
  assert.equal(corrected.createdAt,'2020-01-01 00:00:00');assert.notEqual(corrected.updatedAt,'2021-01-01 00:00:00');
  const ordinary=planFinalOverlay(db,fields,report,full(),'c'.repeat(40),next,domainScSummaryRevision,domainScSummaryCandidate);
  assert.equal(ordinary.markBuild,false);assert.equal(ordinary.updates+ordinary.inserts,0);
  // The generic importer still refuses changed annotated predecessors.
  assert.equal(metadata.overlays.scFinalNameBody.summaryQa.acceptedRevision,domainScSummaryRevision);
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(plan.buildMetaJson);
  assert.throws(()=>upgrade('apply')); // Old annotation paired with new rows.
  db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(metadata));
  assert.deepEqual(snapshot(),after);
  console.log('Domain summary upgrade: before/apply/repeat/fault, exact correction, protected timestamps and source overlays OK');
} finally {db.close(); const resolved=path.resolve(temp);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(resolved,{recursive:true,force:true});}
