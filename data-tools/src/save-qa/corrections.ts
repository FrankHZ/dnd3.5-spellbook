import assert from "node:assert/strict";
import {join} from "node:path";
import type Database from "better-sqlite3";
const {SAVE_CORRECTION_INPUTS:sources,SAVE_CORRECTION_TARGETS:targets,SAVE_CORRECTION_NOTE:note,
  SAVE_CORRECTION_REVISION:revision,ACTION_ROLLOUT_NOTE:prerequisiteNote,DICE_CLOSEOUT_REVISION}
  = require("@dnd/contracts") as typeof import("@dnd/contracts",{with:{"resolution-mode":"import"}});
import {bindCommittedInputs} from "../dice-intake/db-english-handoff";
import {loadEnglishRecords} from "../dice-intake/qa";
import {contentSearchStep} from "../db/content-search-step";
import {requireAcceptedOverlayAfterRows,type AcceptedOverlayInput} from "../dice-intake/accepted-overlay";
import type {OverlayRow} from "../dice-intake/effective-writer";
import {composeActionClauses,type ClauseProposal,type ActionHandoff} from "../action-qa/corrections";

import {authenticateActionRollout,type RolloutHandoff} from "../action-qa/rollout";

type Row=Record<string,any>;
export type SaveHandoff=Omit<ActionHandoff,'schema'|'acceptedRevision'> & {
  schema:'save-clause-handoff.v1';acceptedRevision:string;
};
export const saveHandoffPath='term-qa/issue-645/composed-handoff.json';
export const saveHandoffRevision='edfeac515ed6df13cc5b1c573792af5df279bc11';

/** Convert only immutable accepted local spans into the existing clause composer. */
export function normalizeSaveProposals(raw:Row[],issue:number):ClauseProposal[] {
  assert.deepEqual(raw.map(p=>p.spellId).sort((a,b)=>a-b),targets.filter(t=>t.issue===issue).map(t=>t.id),'fixed accepted target set differs');
  return raw.flatMap(p=>{
    const fixed=targets.find(t=>t.id===p.spellId && t.issue===issue)!;
    assert.equal(p.schema,'save-qa-local-proposal.v1');assert.equal(p.issue,issue);assert.equal(p.book,fixed.book);
    assert.equal(p.accepted,false);assert.equal(p.activated,false);
    assert.equal(p.operation,fixed.operation==='update'?'guarded-effective-update':'guarded-effective-insert');
    assert.equal(p.effectivePredecessor===null,fixed.operation==='insert');
    if(Object.hasOwn(p,'expectedEffectiveAbsent')) assert.equal(p.expectedEffectiveAbsent,fixed.operation==='insert');
    assert.deepEqual(p.selectedPredecessor,p.context.selected);assert.deepEqual(p.effectivePredecessor,p.context.effective);
    assert.deepEqual(p.before,{descriptionText:p.selectedPredecessor.descriptionText,descriptionHtml:p.selectedPredecessor.descriptionHtml});
    assert.equal(p.clauses.length,fixed.proposals.length);
    const ps=p.clauses.map((c:Row,i:number)=>{
      assert.equal(c.clause,i+1);
      const expected=p.spellId===3606 && i<2?'confirmed-local-save-discrepancy':'clarity-only';
      assert.equal(c.classification,expected,'accepted clause classification differs');
      const fields=['descriptionText','descriptionHtml'].map(field=>{
        assert.deepEqual(Object.keys(c.fields).sort(),['descriptionHtml','descriptionText']);
        const edit=c.fields[field];assert(edit && typeof edit.before==='string' && typeof edit.after==='string');
        assert(Number.isInteger(edit.offset) && edit.offset>=0,'invalid accepted span offset');
        // Source offsets count Unicode code points, whereas JS replacement indices count UTF-16 units.
        assert.equal([...p.before[field]].slice(0,edit.offset).join(''),p.before[field].slice(0,p.before[field].indexOf(edit.before)),'accepted span offset differs');
        return {field,before:p.before[field],after:p.before[field].replace(edit.before,edit.after),exactReplacement:{before:edit.before,after:edit.after,count:1}};
      });
      return {proposalId:fixed.proposals[i]!,targetId:p.spellId,rulebookId:p.book,english:p.context.canonical.descriptionText,
        castingTime:p.context.canonical.castingTimeRaw,accepted:false,activation:false,
        operation:fixed.operation==='update'?'guarded-effective-update':'absence-guarded-effective-insert',
        canonicalMechanics:p.context.canonical,englishRules:p.context.englishRules,facets:p.context.facets,components:p.context.components,
        expectedSelectedPredecessor:p.selectedPredecessor,expectedEffective:p.effectivePredecessor,
        exactReplacement:fields[0]!.exactReplacement,fields} as ClauseProposal;
    });
    for(const field of ['descriptionText','descriptionHtml'] as const) assert.equal(composeActionClauses(p.before[field],ps,field),p.after[field],'accepted composed body differs');
    return ps;
  });
}
export function acceptedSaveProposals(root:string):ClauseProposal[] {
  return sources.flatMap(source=>{
    const path=join(root,source.path),bound=bindCommittedInputs(root,source.revision,[path]);
    return normalizeSaveProposals(bound.get(path)!.toString('utf8').trim().split(/\r?\n/u).map(line=>JSON.parse(line)),source.issue);
  });
}
/** Preparation uses readonly actual predecessors; the expected build is derived
 * from the authenticated637 input without applying it to an operator database. */
export function prepareSaveHandoff(proposals:ClauseProposal[],rules:Database.Database,db:Database.Database,
  prerequisiteHandoff:RolloutHandoff):SaveHandoff {
  const english=loadEnglishRecords(rules);
  return {schema:'save-clause-handoff.v1',acceptedRevision:revision,
    priorBuildMeta:{...prerequisiteHandoff.priorBuildMeta,overlays:{...prerequisiteHandoff.priorBuildMeta.overlays,actionClauseRollout:prerequisiteNote}},
    targets:targets.map(t=>{
      const canonical=db.prepare('SELECT * FROM SpellContent WHERE legacySpellId=?').get(t.id) as Row;
      const effective=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' AND variant='effective'").get(t.id) as Row|undefined;
      const selected=effective??db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' AND variant='chm'").get(t.id) as Row;
      const ps=proposals.filter(p=>p.targetId===t.id);assert(selected);
      return {id:t.id,book:t.book,canonical,englishRules:english.get(t.id)!,
        facets:db.prepare('SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id').all(canonical.id) as Row[],
        components:db.prepare('SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id').all(canonical.id) as Row[],
        selected,effective:effective??null,descriptionText:composeActionClauses(selected.descriptionText,ps,'descriptionText'),
        descriptionHtml:composeActionClauses(selected.descriptionHtml,ps,'descriptionHtml')};
    })};
}

export function saveCorrectionInput(handoff:SaveHandoff,proposals:ClauseProposal[],rules:Database.Database,
  prerequisite:AcceptedOverlayInput):AcceptedOverlayInput {
  assert.equal(handoff.schema,'save-clause-handoff.v1');assert.equal(handoff.acceptedRevision,revision);
  assert.equal(prerequisite.noteKey,'actionClauseRollout');assert.deepEqual(prerequisite.note,prerequisiteNote);
  assert.deepEqual(handoff.targets.map(t=>[t.id,t.book]),targets.map(t=>[t.id,t.book]),'fixed saving targets differ');
  assert.deepEqual(proposals.map(p=>p.proposalId).sort(),targets.flatMap(t=>[...t.proposals]).sort(),'fixed accepted proposal set differs');
  const english=loadEnglishRecords(rules);
  const rows:OverlayRow[]=handoff.targets.map((t,index)=>{
    const fixed=targets[index]!,source=sources.find(s=>s.issue===fixed.issue)!,original=t.selected;
    const ps=proposals.filter(p=>p.targetId===t.id);
    assert.deepEqual(ps.map(p=>p.proposalId).sort(),[...fixed.proposals].sort());
    assert.equal(Boolean(t.effective),fixed.operation==='update');
    for(const p of ps) {
      assert.equal(p.accepted,false);assert.equal(p.activation,false);
      assert.equal(p.rulebookId,t.book);assert.equal(p.english,t.canonical.descriptionText);assert.equal(p.castingTime,t.canonical.castingTimeRaw);
      assert.deepEqual(p.canonicalMechanics,t.canonical,'accepted full canonical mechanics differ');
      assert.deepEqual(p.englishRules,t.englishRules);assert.deepEqual(p.facets,t.facets);assert.deepEqual(p.components,t.components);
      assert.deepEqual(p.expectedSelectedPredecessor,original);assert.deepEqual(p.expectedEffective,t.effective);
      assert.equal(p.operation,fixed.operation==='update'?'guarded-effective-update':'absence-guarded-effective-insert');
    }
    assert.equal(t.canonical.sourceRulebookId,t.book);assert.deepEqual(english.get(t.id),t.englishRules,'complete rules English/mechanics drift');
    assert.equal(t.descriptionText,composeActionClauses(original.descriptionText,ps,'descriptionText'));
    assert.equal(t.descriptionHtml,composeActionClauses(original.descriptionHtml,ps,'descriptionHtml'));
    assert.equal(original.spellId,t.id);assert.equal(original.rulebookId,t.book);assert.equal(original.lang,'zh');
    assert(original.name && original.descriptionText && original.descriptionHtml);
    const prior=original.bodyProvenanceJson?JSON.parse(original.bodyProvenanceJson):null;
    if(t.effective) {
      assert.deepEqual(t.effective,original);assert.equal(original.variant,'effective');
      assert(prior && prior.schemaVersion===1 && prior.acceptedRevision===DICE_CLOSEOUT_REVISION && prior.targetId===t.id && prior.field==='body' && prior.language==='zh','unsupported prior provenance');
      assert.deepEqual(prior.closeout,{issue:586,revision:DICE_CLOSEOUT_REVISION});assert.equal(prior.origin?.kind,fixed.origin);
      assert.equal(prior.review?.kind,'DB-English');assert.equal(prior.review?.disposition,'DB-English-reviewed');
      assert.equal(prior.review?.acceptedRevision,DICE_CLOSEOUT_REVISION);assert.equal(prior.review?.authority,fixed.authority);
    } else assert(original.variant==='chm' && prior===null && original.nameProvenanceJson===null && original.sourceKey,'unsupported CHM reference');
    const origin=prior?.origin??{kind:'chm',sourceKey:original.sourceKey};
    const evidence={issue:source.issue,comment:source.comment,proposalIds:[...fixed.proposals]};
    const bodyProvenanceJson=JSON.stringify({schemaVersion:1,acceptedRevision:source.revision,targetId:t.id,field:'body',language:'zh',origin,
      input:{revision:source.revision,path:source.path,targetId:t.id,field:'body'},evidence,
      saveClauseCorrection:{scope:'clauses',wholeBodyReviewed:false},prior:{variant:original.variant,provenance:prior,sourceKey:original.sourceKey}});
    const nameProvenanceJson=t.effective?original.nameProvenanceJson:JSON.stringify({schemaVersion:1,acceptedRevision:source.revision,targetId:t.id,
      field:'name',language:'zh',origin:{kind:'chm',sourceKey:original.sourceKey},
      input:{revision:source.revision,path:source.path,targetId:t.id,field:'retained-name'},evidence,
      saveCorrectionNameRetention:{reviewed:false,priorVariant:'chm'}});
    return {spellId:t.id,rulebookId:t.book,name:original.name,sourceKey:original.sourceKey,
      descriptionText:t.descriptionText,descriptionHtml:t.descriptionHtml,nameProvenanceJson,bodyProvenanceJson,action:fixed.operation};
  });
  return {rows,noteKey:'saveClauseCorrections',note:note as unknown as Row,
    verifyTargets(db) {
      prerequisite.verifyTargets(db);
      try {requireAcceptedOverlayAfterRows(db,prerequisite);}
      catch(error) {throw new Error(`637 exact completed body prerequisite incomplete: ${String(error)}`,{cause:error});}
      const meta=JSON.parse((db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as Row).buildMetaJson);
      // After our atomic body commit, stale FTS is a recoverable state. Before
      // it,637 must have completed its entire search stage, not only its bodies.
      if(!Object.hasOwn(meta.overlays??{},'saveClauseCorrections'))
        assert.equal(contentSearchStep(db).state,'current','637 search prerequisite incomplete');
      for(const t of handoff.targets) {
        assert.deepEqual(db.prepare('SELECT * FROM SpellContent WHERE legacySpellId=?').get(t.id),t.canonical,'complete canonical identity/English/mechanics drift');
        assert.deepEqual(db.prepare('SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id').all(t.canonical.id),t.facets,'facet drift');
        assert.deepEqual(db.prepare('SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id').all(t.canonical.id),t.components,'component drift');
        if(t.selected.variant==='chm') assert.deepEqual(db.prepare('SELECT * FROM I18nSpellText WHERE id=?').get(t.selected.id),t.selected,'CHM predecessor drift');
      }
    },correction:{before:handoff.targets.map(t=>t.effective),verifyPriorAnnotations(db,meta) {
      assert.deepEqual(meta,handoff.priorBuildMeta,'637 completed build prerequisite/annotations drift');
      const old=structuredClone(meta) as Row;assert.deepEqual(old.overlays.actionClauseRollout,prerequisiteNote);
      delete old.overlays.actionClauseRollout;
      prerequisite.correction!.verifyPriorAnnotations(db,old);
    }}};
}
export function authenticateSaveCorrections(root:string,rules:Database.Database) {
  const path=join(root,saveHandoffPath),bound=bindCommittedInputs(root,saveHandoffRevision,[path]);
  return saveCorrectionInput(JSON.parse(bound.get(path)!.toString('utf8')),acceptedSaveProposals(root),rules,authenticateActionRollout(root,rules));
}
