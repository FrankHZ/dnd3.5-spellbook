import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {prepareOverlayFixture} from "../dice-intake/db-english-overlay-test-fixtures";
import {bindCommittedInputs} from "../dice-intake/db-english-handoff";
import {contentSearchStep} from "../db/content-search-step";
import {prepareActionHandoff,actionCorrectionInput,type ClauseProposal,type ActionHandoff} from "./corrections";
const {ACTION_CORRECTION_TARGETS:targets,DICE_CLOSEOUT_REVISION:revision}=require('@dnd/contracts') as typeof import('@dnd/contracts',{with:{'resolution-mode':'import'}});

export function priorEnvelope(id:number,field:'name'|'body',kind:'chm'|'native'|'independent') {
  const sourceKey=kind==='independent'?null:`synthetic:${id}`;
  const common={schemaVersion:1,acceptedRevision:revision,targetId:id,field,language:'zh',origin:{kind,sourceKey},closeout:{issue:586,revision}};
  if(kind==='chm') return JSON.stringify({...common,input:{targetId:id,field:`chinese.${field==='name'?'name':'descriptionText'}`},
    evidence:{table:'I18nSpellText',id:`chm:${id}`,spellId:id,lang:'zh',variant:'chm',sourceKey}});
  const recovered=kind==='native';
  return JSON.stringify({...common,input:{revision:'b'.repeat(40),path:'synthetic/accepted.jsonl',row:1,targetId:id,field:field==='name'?'name':'descriptionHtml',sourceKey},
    evidence:{issue:1,pr:2,publicHead:'a'.repeat(40),historicalRevision:recovered?'c'.repeat(40):null,historicalContinuityAuthenticated:!recovered,residuals:[]},
    review:{kind:'DB-English',disposition:'DB-English-reviewed',acceptedRevision:revision,authority:recovered?'recovered-db-english':'independent-db-english',...(field==='body'?{composition:'Chinese'}:{})}});
}
const insert=(db:Database.Database,table:string,row:Record<string,any>)=> {
  const columns=Object.keys(row);db.prepare(`INSERT INTO "${table}" (${columns.map(c=>`"${c}"`).join(',')}) VALUES (${columns.map(c=>`@${c}`).join(',')})`).run(row);
};
/** Tiny synthetic full build, actual maintained SQL/search and committed fixture inputs. */
export function prepareActionFixture(temp:string,contentFile?:string) {
  const f=prepareOverlayFixture(temp,contentFile);
  const db=new Database(f.contentPath),rules=new Database(f.rulesPath);
  const edits:Record<number,{before:string;after:string}[]>={
    84:[{before:'甲旧 oldcreationtoken',after:'甲新 newcreationtoken'},{before:'乙旧 oldforcetoken',after:'乙新 newforcetoken'},
      {before:'丙旧 oldactiontoken',after:'丙新 newactiontoken'},{before:'丁旧 oldboundtoken',after:'丁新 newboundtoken'}],
    523:[{before:'单动作 old523token',after:'标准动作 new523token'}],
    2165:[{before:'即时动作 old2165token',after:'自由动作 new2165token'}],
    2474:[{before:'即时动作 old2474token',after:'自由动作 new2474token'}],
  };
  let handoff:ActionHandoff,proposals:ClauseProposal[]=[];
  try {
    const full=JSON.parse(fs.readFileSync(f.fullPath,'utf8'));
    const template=full.spells.find((r:any)=>r.legacySpellId===355),book=full.rulebooks.find((r:any)=>r.legacyRulebookId===53);
    const list=full.listEntries.find((r:any)=>r.spellId==='spell:355');assert(list);
    const rulesBook=rules.prepare('SELECT * FROM dnd_rulebook WHERE id=53').get() as Record<string,any>;
    const rulesSpell=rules.prepare('SELECT * FROM dnd_spell WHERE id=355').get() as Record<string,any>;
    for(const t of targets) {
      if(!full.rulebooks.some((b:any)=>b.legacyRulebookId===t.book)) {
        full.rulebooks.push({...book,id:`rulebook:${t.book}`,legacyRulebookId:t.book,name:`Synthetic book ${t.book}`,slug:`synthetic-book-${t.book}`});
      }
      if(!rules.prepare('SELECT id FROM dnd_rulebook WHERE id=?').get(t.book)) insert(rules,'dnd_rulebook',{...rulesBook,id:t.book,name:`Synthetic book ${t.book}`});
      const english=`Synthetic English ${t.id}: free action; standard action; synthetic roles and limits.`;
      insert(rules,'dnd_spell',{...rulesSpell,id:t.id,name:`Synthetic ${t.id}`,rulebook_id:t.book,description:english,casting_time:'1 standard action'});
      full.spells.push({...template,id:`spell:${t.id}`,legacySpellId:t.id,sourceRulebookId:t.book,canonicalName:`Synthetic ${t.id}`,slug:`synthetic-${t.id}`,descriptionText:english,descriptionHtml:`<p>${english}</p>`,castingTimeRaw:'1 standard action'});
      full.listEntries.push({...list,id:`list:${t.id}`,spellId:`spell:${t.id}`,rulebookId:t.book,sourceRowId:t.id});
    }
    const {collectImportContext,importGenerated}=require('../rules-content/cli') as typeof import('../rules-content/cli');
    const {sha256File}=require('../rules-content/artifact') as typeof import('../rules-content/artifact');
    fs.writeFileSync(path.join(f.root,'rules-db-manifest.json'),JSON.stringify({database:{sha256:sha256File(f.rulesPath)}}));
    full.counts.spells=full.spells.length;full.counts.rulebooks=full.rulebooks.length;full.counts.listEntries=full.listEntries.length;
    full.artifact.sourceTotals.spells=full.spells.length;full.artifact.sourceTotals.rulebooks=full.rulebooks.length;
    const context=collectImportContext();full.artifact.provenance=context.currentProvenance;
    const previousBuild=db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as {buildMetaJson:string};
    const overlays=JSON.parse(previousBuild.buildMetaJson).overlays;
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify({...JSON.parse(previousBuild.buildMetaJson),overlays:undefined}));
    fs.writeFileSync(f.fullPath,JSON.stringify(full));importGenerated(db,full,false,f.fullPath,context);
    for(const t of targets) {
      const text=`合成正文 ${edits[t.id]!.map(e=>e.before).join('；')}。\n保留正文自由动作 untouchedbodytoken。`;
      const original={id:`chm:${t.id}`,spellId:t.id,rulebookId:t.book,lang:'zh',variant:'chm',name:`合成名称 ${t.id}`,descriptionText:text,
        descriptionHtml:`<pre>${text}</pre>`,sourceKey:`synthetic:${t.id}`,createdAt:'2026-01-01 00:00:00',updatedAt:'2026-01-02 00:00:00',nameProvenanceJson:null,bodyProvenanceJson:null};
      insert(db,'I18nSpellText',original);
      if(t.operation==='update') insert(db,'I18nSpellText',{...original,id:`dice-effective:${t.book}:${t.id}`,variant:'effective',
        sourceKey:null,nameProvenanceJson:priorEnvelope(t.id,'name','chm'),bodyProvenanceJson:priorEnvelope(t.id,'body',t.id===84?'chm':t.id===523?'native':'independent')});
      const selected=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND variant=?").get(t.id,t.operation==='update'?'effective':'chm') as Record<string,any>;
      for(const [i,proposalId] of t.proposals.entries()) {
        const e=edits[t.id]![i]!;
        proposals.push({proposalId,targetId:t.id,rulebookId:t.book,english:full.spells.find((r:any)=>r.legacySpellId===t.id).descriptionText,castingTime:'1 standard action',
          expectedPredecessor:selected,fields:['descriptionText','descriptionHtml'].map(field=>({field,before:selected[field],after:selected[field].replace(e.before,e.after)})),exactReplacement:{...e,count:1}});
      }
    }
    const b=db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as {buildMetaJson:string};
    const meta=JSON.parse(b.buildMetaJson);meta.overlays={...overlays,diceDbEnglishCloseout:{schema:'dice-db-english-closeout.v1',acceptedRevision:revision,
      issue:586,targets:[355,356,357,358,359,360,361,362],names:0,bodies:0,authority:'DB-English',protectedRulebookIds:[86],search:'rebuild-after-overlay',activation:false}};
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify(meta));
    contentSearchStep(db,'apply');
    handoff=prepareActionHandoff(proposals,rules,db);
  } finally {rules.close();db.close();}
  const evidenceFile=path.join(f.root,'synthetic-action-handoff.json'),proposalFile=path.join(f.root,'synthetic-action-proposals.json');
  fs.writeFileSync(evidenceFile,JSON.stringify(handoff));fs.writeFileSync(proposalFile,JSON.stringify(proposals));
  f.git('add','synthetic-action-handoff.json','synthetic-action-proposals.json','rules-db-manifest.json');
  f.git('-c','user.name=Portable','-c','user.email=portable@example.invalid','commit','-qm','synthetic fixed action inputs');
  const committed=f.git('rev-parse','HEAD');
  const authenticate=(rules:Database.Database)=> {
    bindCommittedInputs(f.root,committed,[evidenceFile,proposalFile]);
    return actionCorrectionInput(JSON.parse(fs.readFileSync(evidenceFile,'utf8')),JSON.parse(fs.readFileSync(proposalFile,'utf8')),rules);
  };
  return {...f,evidenceFile,proposalFile,handoff,proposals,authenticate};
}

if(require.main===module) {
  const [temp,file,action='prepare']=process.argv.slice(2);assert(temp&&file);
  if(action==='prepare') {prepareActionFixture(temp,file);console.log(JSON.stringify({prepared:true,targets:4}));}
  else {
    const root=path.join(temp,'data'),rules=new Database(path.join(temp,'rules.sqlite'),{readonly:true});
    const db=new Database(file,{readonly:action==='check'});
    try {
      const revision=require('node:child_process').execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      const h=path.join(root,'synthetic-action-handoff.json'),p=path.join(root,'synthetic-action-proposals.json');
      const authenticate=()=> {bindCommittedInputs(root,revision,[h,p]);return actionCorrectionInput(JSON.parse(fs.readFileSync(h,'utf8')),JSON.parse(fs.readFileSync(p,'utf8')),rules);};
      const {acceptedOverlay}=require('../dice-intake/accepted-overlay') as typeof import('../dice-intake/accepted-overlay');
      assert(action==='check'||action==='apply');console.log(JSON.stringify(acceptedOverlay(db,authenticate,action)));
    } finally {rules.close();db.close();}
  }
}
