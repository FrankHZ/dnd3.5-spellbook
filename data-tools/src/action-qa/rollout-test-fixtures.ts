import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {prepareActionFixture,priorEnvelope} from './corrections-test-fixtures';
import {prepareActionHandoff,actionCorrectionInput,type ClauseProposal} from './corrections';
import {prepareRolloutHandoff,rolloutInput} from './rollout';
import {bindCommittedInputs} from '../dice-intake/db-english-handoff';
import {loadEnglishRecords} from '../dice-intake/qa';
import {contentSearchStep} from '../db/content-search-step';
import {acceptedOverlay} from '../dice-intake/accepted-overlay';
const {ACTION_ROLLOUT_TARGETS:targets}=require('@dnd/contracts') as typeof import('@dnd/contracts',{with:{'resolution-mode':'import'}});
type Row=Record<string,any>;
const insert=(db:Database.Database,table:string,row:Row)=>{
  const keys=Object.keys(row);db.prepare(`INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(',')}) VALUES (${keys.map(k=>`@${k}`).join(',')})`).run(row);
};
/** Bounded synthetic fixture for the real fixed37 target/owner classes plus629.
 * Content is invented; no operator DB, accepted text or source excerpts copied. */
export function prepareRolloutFixture(temp:string,contentFile?:string) {
  const f=prepareActionFixture(temp,contentFile),db=new Database(f.contentPath),rules=new Database(f.rulesPath);
  const proposals:ClauseProposal[]=[];
  let oldHandoff:ReturnType<typeof prepareActionHandoff>,handoff:ReturnType<typeof prepareRolloutHandoff>;
  try {
    const full=JSON.parse(fs.readFileSync(f.fullPath,'utf8'));
    const template=full.spells.find((s:Row)=>s.legacySpellId===355),book=full.rulebooks.find((b:Row)=>b.legacyRulebookId===53);
    const list=full.listEntries.find((r:Row)=>r.spellId==='spell:355');
    const rb=rules.prepare('SELECT * FROM dnd_rulebook WHERE id=53').get() as Row;
    const rs=rules.prepare('SELECT * FROM dnd_spell WHERE id=355').get() as Row;
    for(const t of targets) {
      if(!full.rulebooks.some((b:Row)=>b.legacyRulebookId===t.book)) full.rulebooks.push({...book,id:`rulebook:${t.book}`,legacyRulebookId:t.book,name:`Synthetic book ${t.book}`,slug:`synthetic-book-${t.book}`});
      if(!rules.prepare('SELECT id FROM dnd_rulebook WHERE id=?').get(t.book)) insert(rules,'dnd_rulebook',{...rb,id:t.book,name:`Synthetic book ${t.book}`});
      const english=`Synthetic English ${t.id}: free action and standard action, distinct roles.`;
      insert(rules,'dnd_spell',{...rs,id:t.id,name:`Synthetic ${t.id}`,rulebook_id:t.book,description:english,casting_time:'1 standard action'});
      full.spells.push({...template,id:`spell:${t.id}`,legacySpellId:t.id,sourceRulebookId:t.book,canonicalName:`Synthetic ${t.id}`,slug:`synthetic-${t.id}`,descriptionText:english,descriptionHtml:`<p>${english}</p>`,castingTimeRaw:'1 standard action'});
      full.listEntries.push({...list,id:`list:${t.id}`,spellId:`spell:${t.id}`,rulebookId:t.book,sourceRowId:t.id});
    }
    const {collectImportContext,importGenerated}=require('../rules-content/cli') as typeof import('../rules-content/cli');
    const {sha256File}=require('../rules-content/artifact') as typeof import('../rules-content/artifact');
    fs.writeFileSync(path.join(f.root,'rules-db-manifest.json'),JSON.stringify({database:{sha256:sha256File(f.rulesPath)}}));
    full.counts.spells=full.spells.length;full.counts.rulebooks=full.rulebooks.length;full.counts.listEntries=full.listEntries.length;
    full.artifact.sourceTotals.spells=full.spells.length;full.artifact.sourceTotals.rulebooks=full.rulebooks.length;
    const context=collectImportContext();full.artifact.provenance=context.currentProvenance;
    const build=db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as Row,oldMeta=JSON.parse(build.buildMetaJson);
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify({...oldMeta,overlays:undefined}));
    fs.writeFileSync(f.fullPath,JSON.stringify(full));importGenerated(db,full,false,f.fullPath,context);
    const fresh=JSON.parse((db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as Row).buildMetaJson);
    db.prepare('UPDATE RulesContentBuild SET buildMetaJson=?').run(JSON.stringify({...fresh,overlays:oldMeta.overlays}));
    const english=loadEnglishRecords(rules);
    for(const t of targets) {
      const chunks=t.proposals.map((_,i)=>`旧 old${t.id}x${i}token`),text=chunks.join('；')+'。\n保留正文 untouchedrollouttoken。';
      const html=t.id===443?`<p><b>旧</b> old443x0token。保留正文 untouchedrollouttoken。</p>`:`<pre>${text}</pre>`;
      const chm={id:`chm:${t.id}`,spellId:t.id,rulebookId:t.book,lang:'zh',variant:'chm',name:`合成名称 ${t.id}`,descriptionText:text,descriptionHtml:html,
        sourceKey:t.id===3594?'nested/reference.htm#synthetic':`synthetic:${t.id}`,nameProvenanceJson:null,bodyProvenanceJson:null,createdAt:'2026-01-01 00:00:00',updatedAt:'2026-01-02 00:00:00'};
      insert(db,'I18nSpellText',chm);
      if(t.operation==='update') insert(db,'I18nSpellText',{...chm,id:`dice-effective:${t.book}:${t.id}`,variant:'effective',sourceKey:null,
        nameProvenanceJson:priorEnvelope(t.id,'name',t.id===498?'chm':t.origin),bodyProvenanceJson:priorEnvelope(t.id,'body',t.origin)});
      const selected=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND variant=?").get(t.id,t.operation==='update'?'effective':'chm') as Row;
      const canonical=db.prepare('SELECT * FROM SpellContent WHERE legacySpellId=?').get(t.id) as Row;
      for(const [i,proposalId] of t.proposals.entries()) {
        const edit={before:chunks[i]!,after:`新 new${t.id}x${i}token`,count:1};
        proposals.push({proposalId,targetId:t.id,rulebookId:t.book,english:canonical.descriptionText,castingTime:canonical.castingTimeRaw,
          accepted:false,activation:false,operation:t.operation==='update'?'guarded-effective-update':'absence-guarded-effective-insert',
          expectedSelectedPredecessor:selected,expectedEffective:t.operation==='update'?selected:null,canonicalMechanics:canonical,
          englishRules:english.get(t.id),facets:db.prepare('SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id').all(canonical.id),
          components:db.prepare('SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id').all(canonical.id),exactReplacement:edit,
          fields:['descriptionText','descriptionHtml'].map(field=>{
            const exact=field==='descriptionHtml'&&t.id===443?{before:'<b>旧</b> old443x0token',after:'<b>新</b> new443x0token',count:1}:edit;
            return {field,before:selected[field],after:selected[field].replace(exact.before,exact.after),exactReplacement:exact};
          })});
      }
    }
    contentSearchStep(db,'apply');
    oldHandoff=prepareActionHandoff(f.proposals,rules,db);
    handoff=prepareRolloutHandoff(proposals,rules,db,oldHandoff);
  } finally {db.close();rules.close();}
  const rolloutFile=path.join(f.root,'synthetic-rollout-handoff.json'),proposalFile=path.join(f.root,'synthetic-rollout-proposals.json');
  fs.writeFileSync(f.evidenceFile,JSON.stringify(oldHandoff));fs.writeFileSync(rolloutFile,JSON.stringify(handoff));fs.writeFileSync(proposalFile,JSON.stringify(proposals));
  f.git('add','synthetic-action-handoff.json','synthetic-rollout-handoff.json','synthetic-rollout-proposals.json','rules-db-manifest.json');
  f.git('-c','user.name=Portable','-c','user.email=portable@example.invalid','commit','-qm','synthetic fixed successor inputs');
  const committed=f.git('rev-parse','HEAD');
  const authenticateOld=(r:Database.Database)=>{
    bindCommittedInputs(f.root,committed,[f.evidenceFile,f.proposalFile]);
    return actionCorrectionInput(JSON.parse(fs.readFileSync(f.evidenceFile,'utf8')),JSON.parse(fs.readFileSync(f.proposalFile,'utf8')),r);
  };
  const authenticate=(r:Database.Database)=>{
    bindCommittedInputs(f.root,committed,[rolloutFile,proposalFile]);
    return rolloutInput(JSON.parse(fs.readFileSync(rolloutFile,'utf8')),JSON.parse(fs.readFileSync(proposalFile,'utf8')),r,authenticateOld(r));
  };
  return {...f,rolloutFile,rolloutProposalFile:proposalFile,handoff,proposals,oldHandoff,authenticate,authenticateOld};
}
if(require.main===module) {
  const [temp,file,action='prepare']=process.argv.slice(2);assert(temp&&file);
  if(action==='prepare') {prepareRolloutFixture(temp,file);console.log(JSON.stringify({prepared:true,targets:37}));}
  else {
    const root=path.join(temp,'data'),rules=new Database(path.join(temp,'rules.sqlite'),{readonly:true}),db=new Database(file,{readonly:action==='check'});
    try {
      const revision=require('node:child_process').execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
      const read=(name:string)=>{const file=path.join(root,name);bindCommittedInputs(root,revision,[file]);return JSON.parse(fs.readFileSync(file,'utf8'));};
      const old=()=>actionCorrectionInput(read('synthetic-action-handoff.json'),read('synthetic-action-proposals.json'),rules);
      const current=()=>rolloutInput(read('synthetic-rollout-handoff.json'),read('synthetic-rollout-proposals.json'),rules,old());
      assert(['check','apply','apply629'].includes(action));
      console.log(JSON.stringify(acceptedOverlay(db,action==='apply629'?old:current,action==='check'?'check':'apply')));
    } finally {rules.close();db.close();}
  }
}
