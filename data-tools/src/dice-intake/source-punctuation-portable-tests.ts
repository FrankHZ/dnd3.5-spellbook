import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeRulesContent, type LegacyRulesContentInput} from '../rules-content/normalize';
import {createRulesContentArtifactMetadata, type RulesContentArtifactProvenance} from '../rules-content/artifact';
import {importGenerated} from '../rules-content/cli';
import {applyFinalOverlay, planFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';
import {comparePrismaticArtifacts, prismaticRayUpgrade} from './prismatic-ray-upgrade';
import {fidelityCandidate, fidelityAcceptance, fidelityDirectory, punctuationCandidate, punctuationAcceptance, validatePunctuationEnglish} from './source-fidelity';
import {selectPdfTypography} from '../zh-parser/pdf-typography';
import type {SummaryRow} from '../short-desc/summary-row-schema';

const root=path.resolve(__dirname,'../../..'), temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-punctuation-'));
const ids=[3930,4033,4349,4421,4425,4426,4837];
const english: Record<number,string>={3930:'Protected prior correction',4033:'Protected English',4349:'Protected citation English',
  4421:'x'.repeat(513)+'- Synthetic; numeric -3 retained.',
  4425:'x'.repeat(1536)+'- Synthetic; protected errata retained.',
  4426:'x'.repeat(742)+'movement retained.',4837:'Protected other book'};
const source: LegacyRulesContentInput={rulebooks:[{id:86,dndEditionId:5,name:'Synthetic',abbr:'SC',slug:'synthetic',
  publicationCategory:'supplement',publicationFamily:'synthetic',publicationSourceKind:'synthetic',publicationDisplayOrder:1,
  publicationYear:null,publicationDate:null,publicationUrl:null,publicationImage:null,publicationReviewStatus:'accepted'}],
  spells:ids.map(id=>({id,added:'2000-01-01T00:00:00Z',rulebookId:id===4837?9:86,page:1,name:`Synthetic ${id}`,slug:`synthetic-${id}`,
    schoolId:1,schoolName:'Evocation',schoolSlug:'evocation',verbalComponent:true,somaticComponent:true,materialComponent:false,
    arcaneFocusComponent:false,divineFocusComponent:false,xpComponent:false,metaBreathComponent:false,trueNameComponent:false,corruptComponent:false,verified:false,
    description:english[id]!,descriptionHtml:id===4421?'<p>'+'x'.repeat(529)+'&#8211; Synthetic</p>':id===4425?'<p>'+'x'.repeat(1599)+'&#8211; Synthetic</p>':id===4426?'<p>'+'x'.repeat(791)+'movement retained.</p>':`<p>${english[id]}</p>`})),descriptors:[],listEntries:[]};
source.rulebooks.push({...source.rulebooks[0]!,id:9,name:'Protected other book'});
const patches=source.spells.filter(s=>[4421,4425,4426].includes(s.id)).map(s=>{
  const before={description:s.description!,descriptionHtml:s.descriptionHtml!};
  const positions={4421:[513,537],4425:[1536,1607],4426:[742,794]} as const;
  const values=Object.fromEntries((['description','descriptionHtml'] as const).map((key,index)=>{
    const characters=Array.from(before[key]),at=positions[s.id as keyof typeof positions][index]!;
    if(s.id===4426)characters.splice(at,0,'a',' ');else characters[at]=key==='description'?'—':'2';
    return [key,characters.join('')];
  })) as typeof before;
  return {id:s.id,expected:{spell:before},spell:values};
});
const fingerprint={path:'synthetic',sha256:'a'.repeat(64)};
const provenance:RulesContentArtifactProvenance={schemaVersion:1,parentRepo:{commit:'1'.repeat(40),dirty:false},dataRepo:{commit:'2'.repeat(40),dirty:false},
  rulesDb:fingerprint,canonicalInputs:{rulesManifest:fingerprint,rulebookPublicationMetadata:fingerprint,chmRulebookPublications:fingerprint},contentMigrations:fingerprint};
function generate(after:boolean){const input=structuredClone(source);if(after)for(const p of patches)Object.assign(input.spells.find(s=>s.id===p.id)!,p.spell);
  const result=normalizeRulesContent(input,after?'2026-10-04T01:00:00Z':'2026-10-03T01:00:00Z');
  result.artifact=createRulesContentArtifactMetadata({scope:'full',sourceTotals:{rulebooks:2,spells:7,descriptors:0,classListEntries:0,domainListEntries:0},provenance});return result;}
const previous=generate(false),next=generate(true),oldPath=path.join(temp,'before.json'),newPath=path.join(temp,'after.json');
fs.writeFileSync(oldPath,JSON.stringify(previous));fs.writeFileSync(newPath,JSON.stringify(next));
const removed='合'.repeat(17),scIds=ids.filter(id=>id!==4837),fields:FinalField[]=scIds.flatMap(targetId=>{
  const text=targetId===3930?`正文${'合'.repeat(29)}保留`:targetId===4033?`正文${removed}保留`:targetId===4349?'与“合成”相同':'原文与独立备注保留';
  return [{targetId,rulebookId:86,field:'name' as const,text:`合成${targetId}`,origin:{kind:'chm' as const,sourceKey:'synthetic'},review:{disposition:'source-reviewed-retention'}},
    {targetId,rulebookId:86,field:'body' as const,text,html:`<pre>${text}</pre>`,origin:{kind:'native' as const,sourceKey:'synthetic'},review:{disposition:'source-correct'}}];});
for(const body of fields.filter(f=>f.field==='body'&&[3930,4033,4349].includes(f.targetId))){
  body.sourceCorrection={revision:body.targetId===3930?'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f':fidelityCandidate,
    acceptanceRevision:body.targetId===3930?'5f05fad7df5256a9c3c998d3be77aac238445107':fidelityAcceptance,
    path:body.targetId===3930?'dice-qa/books/86/issue-461/candidate.json':fidelityDirectory+'candidate.json',targetId:body.targetId,prior:structuredClone(body)};
  for(const key of ['text','html'] as const)body[key]=body.targetId===3930?body[key]!.replace('合'.repeat(29),''):body.targetId===4033?body[key]!.replace(removed,''):body[key]!.replace('”相同','”（PH 217）相同');
}
const report={sourceRevisions:{sourcePairCandidate:'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f',sourcePairAcceptance:'5f05fad7df5256a9c3c998d3be77aac238445107',
  sourceFidelityCandidate:fidelityCandidate,sourceFidelityAcceptance:fidelityAcceptance},changedNames:0,changedBodies:scIds.length,retained:{names:scIds,bodies:[]},sourceQuestionIds:[]};
const amended={...report,sourceRevisions:{...report.sourceRevisions,sourcePunctuationCandidate:punctuationCandidate,sourcePunctuationAcceptance:punctuationAcceptance}};
const db=new Database(':memory:'), context={currentProvenance:provenance,importedAt:'2026-10-04T01:01:00Z'};
const snapshot=()=>({schema:db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(),rows:db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>{const name=(r as {name:string}).name;return[name,db.prepare(`SELECT * FROM "${name}"`).all()];})});
try {
  const entry = require(path.join(root,'data-tools/audits/sc-final-overlay.cjs'));
  assert.throws(()=>entry.main(['--accepted-source-punctuation']),/requires #467 predecessor/);
  assert.throws(()=>entry.main(['--upgrade-source-punctuation']),/requires accepted package/);
  const acceptedFlags=['--accepted-source-punctuation','--accepted-source-fidelity','--accepted-source-pairs','--accepted-english-title','--accepted-summaries'];
  assert.throws(()=>entry.main([...acceptedFlags,'--upgrade-source-fidelity']),/choose one source transition/);
  assert.throws(()=>entry.main([...acceptedFlags,'--previous-normalized','never-open.json']),/previous normalized belongs/);
  comparePrismaticArtifacts(previous,next,patches,'punctuation');
  for(const id of ids)for(const key of ['descriptionText','descriptionHtml','canonicalName','rangeRaw','rawJson'] as const){const bad=structuredClone(next);(bad.spells.find(s=>s.legacySpellId===id)! as Record<string,unknown>)[key]='forged';assert.throws(()=>comparePrismaticArtifacts(previous,bad,patches,'punctuation'));}
  assert.throws(()=>comparePrismaticArtifacts(previous,next,patches.slice(1),'punctuation'));
  for(const p of patches){const bad=structuredClone(patches);bad.find(s=>s.id===p.id)!.spell.description+='unlisted';assert.throws(()=>comparePrismaticArtifacts(previous,next,bad,'punctuation'));}
  for(const name of fs.readdirSync(path.join(root,'server/db/content/migrations')).sort())if(name!=='migration_lock.toml')db.exec(fs.readFileSync(path.join(root,'server/db/content/migrations',name,'migration.sql'),'utf8'));
  importGenerated(db,previous,false,oldPath,context);
  db.exec("CREATE TABLE protected_bytes(id INTEGER,body TEXT); INSERT INTO protected_bytes VALUES(1,CAST(x'ff' AS TEXT));");
  const insert=db.prepare("INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,sourceKey,updatedAt) VALUES(?,4033,86,'en',?,?,?,'2000-01-01')");
  db.transaction(()=>{for(let i=0;i<6837;i++)insert.run(`summary-${i}`,`synthetic-${i}`,`Protected ${i}`,`proof-${i}`);})();
  const summaries=db.prepare('SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText').all() as SummaryRow[];
  applyFinalOverlay(db,planFinalOverlay(db,fields,report,verifyFullNormalized(db,previous,oldPath,provenance),'4'.repeat(40),summaries));
  const before=snapshot();
  const run=(mode:'check'|'apply'='check',fault=()=>{},auth=()=>{},actual=fields,actualReport=amended,requireInputs=()=>{})=>prismaticRayUpgrade(db,previous,next,oldPath,newPath,patches,actual,actualReport,summaries,'5'.repeat(40),context,requireInputs,mode,fault,auth,'punctuation');
  assert.equal(run().state,'before');assert.deepEqual(snapshot(),before);
  const protectedBody=db.prepare("SELECT descriptionHtml FROM I18nSpellText WHERE spellId=4033 AND variant='effective'").pluck().get();
  db.prepare("UPDATE I18nSpellText SET descriptionHtml='partial' WHERE spellId=4033 AND variant='effective'").run();
  assert.throws(()=>run('apply'));db.prepare("UPDATE I18nSpellText SET descriptionHtml=? WHERE spellId=4033 AND variant='effective'").run(protectedBody);
  const oldEnglish=db.prepare('SELECT descriptionHtml FROM SpellContent WHERE legacySpellId=4425').pluck().get();
  db.prepare('UPDATE SpellContent SET descriptionHtml=? WHERE legacySpellId=4425').run(patches.find(p=>p.id===4425)!.spell.descriptionHtml);
  assert.throws(()=>run('apply'));db.prepare('UPDATE SpellContent SET descriptionHtml=? WHERE legacySpellId=4425').run(oldEnglish);
  assert.deepEqual(snapshot(),before,'partial-state rejection preserves all other state');
  for(const key of ['sourcePunctuationCandidate','sourcePunctuationAcceptance'] as const){const wrong=structuredClone(amended);wrong.sourceRevisions[key]='f'.repeat(40);assert.throws(()=>run('apply',undefined,undefined,fields,wrong));assert.deepEqual(snapshot(),before);}
  for(const id of [4033,4349])for(const key of ['text','html','prior','origin'] as const){const wrong=structuredClone(fields),body=wrong.find(f=>f.targetId===id&&f.field==='body')!;
    if(key==='prior')body.sourceCorrection!.prior.text+='stale';else if(key==='origin')body.origin.sourceKey='forged';else body[key]+='forged';
    assert.throws(()=>run('apply',undefined,undefined,wrong));assert.deepEqual(snapshot(),before);}
  for(const sql of ["UPDATE I18nSpellText SET name='forged' WHERE spellId=4033","UPDATE I18nSpellSummaryText SET summaryText='forged' WHERE id='summary-6836'","CREATE TABLE forbidden(id INTEGER)"]){assert.throws(()=>run('apply',()=>{db.exec(sql);}));assert.deepEqual(snapshot(),before);}
  assert.throws(()=>run('apply',()=>{throw Error('transaction fault');}),/transaction fault/);assert.deepEqual(snapshot(),before);
  assert.throws(()=>run('apply',undefined,()=>{throw Error('missing source');}),/missing source/);assert.deepEqual(snapshot(),before);
  assert.throws(()=>run('apply',()=>fs.appendFileSync(newPath,'\n')),/normalized inputs changed/);assert.deepEqual(snapshot(),before);fs.writeFileSync(newPath,JSON.stringify(next));
  assert.equal(run('apply').changed,true);const after=snapshot();assert.equal(run().state,'after');assert.equal(run('apply').changed,false);assert.deepEqual(snapshot(),after);
  for(const id of scIds){const en=next.spells.find(s=>s.legacySpellId===id)!,body=fields.find(f=>f.targetId===id&&f.field==='body')!;
    const input={englishText:en.descriptionText!,englishHtml:en.descriptionHtml!,chineseText:body.text,chineseHtml:body.html!};
    const p={targetId:id,rulebookId:86 as const,input,output:{englishHtml:input.englishHtml,chineseHtml:input.chineseHtml}};
    selectPdfTypography(id,86,input,p);for(const key of Object.keys(input) as Array<keyof typeof input>)assert.throws(()=>selectPdfTypography(id,86,{...input,[key]:input[key]+'stale'},p),/stale/);
  }
  for(const p of patches)validatePunctuationEnglish(p.id,p.expected.spell,p.spell);
  assert.equal(next.spells.find(s=>s.legacySpellId===4421)!.descriptionText!.includes('numeric -3 retained'),true);
  console.log('SC punctuation: three English pairs, prior Chinese corrections, all protected tables, stale/partial states, rollback, repeat and typography bindings OK');
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
