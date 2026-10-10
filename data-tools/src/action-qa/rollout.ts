import assert from "node:assert/strict";
import {join} from "node:path";
import type Database from "better-sqlite3";
const {ACTION_ROLLOUT_INPUTS:sources,ACTION_ROLLOUT_TARGETS:targets,ACTION_ROLLOUT_NOTE:note,
  ACTION_ROLLOUT_REVISION:revision,ACTION_CORRECTION_NOTE:prerequisiteNote,DICE_CLOSEOUT_REVISION}
  = require("@dnd/contracts") as typeof import("@dnd/contracts",{with:{"resolution-mode":"import"}});
import {bindCommittedInputs} from "../dice-intake/db-english-handoff";
import {loadEnglishRecords} from "../dice-intake/qa";
import {contentSearchStep} from "../db/content-search-step";
import {requireAcceptedOverlayAfterRows,type AcceptedOverlayInput} from "../dice-intake/accepted-overlay";
import type {OverlayRow} from "../dice-intake/effective-writer";
import {composeActionClauses,authenticateActionCorrections,type ClauseProposal,type ActionHandoff} from "./corrections";

type Row=Record<string,any>;
export type RolloutHandoff=Omit<ActionHandoff,'schema'|'acceptedRevision'> & {
  schema:'action-clause-rollout-handoff.v1';acceptedRevision:string;
};
export const rolloutHandoffPath='term-qa/issue-637/composed-handoff.json';
export const rolloutHandoffRevision='028c0654bc50c5e6f0a570fbc254a72d6c09734c';

export function acceptedRolloutProposals(root:string):ClauseProposal[] {
  return sources.flatMap(source=>{
    const path=join(root,source.path), bound=bindCommittedInputs(root,source.revision,[path]);
    const ps=JSON.parse(bound.get(path)!.toString('utf8')) as ClauseProposal[];
    assert.deepEqual(ps.map(p=>p.proposalId).sort(),targets.filter(t=>t.issue===source.issue).flatMap(t=>[...t.proposals]).sort(),"fixed accepted proposal set differs");
    assert(ps.every(p=>p.accepted===false && p.activation===false),"acceptance is the fixed coordinator record, not editable proposal flags");
    return ps;
  });
}
/** Preparation uses readonly actual predecessors; the expected build is derived
 * from the authenticated629 input without applying it to an operator database. */
export function prepareRolloutHandoff(proposals:ClauseProposal[],rules:Database.Database,db:Database.Database,
  prerequisiteHandoff:ActionHandoff):RolloutHandoff {
  const english=loadEnglishRecords(rules);
  return {schema:'action-clause-rollout-handoff.v1',acceptedRevision:revision,
    priorBuildMeta:{...prerequisiteHandoff.priorBuildMeta,overlays:{...prerequisiteHandoff.priorBuildMeta.overlays,actionClauseCorrections:prerequisiteNote}},
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

export function rolloutInput(handoff:RolloutHandoff,proposals:ClauseProposal[],rules:Database.Database,
  prerequisite:AcceptedOverlayInput):AcceptedOverlayInput {
  assert.equal(handoff.schema,'action-clause-rollout-handoff.v1');assert.equal(handoff.acceptedRevision,revision);
  assert.equal(prerequisite.noteKey,'actionClauseCorrections');assert.deepEqual(prerequisite.note,prerequisiteNote);
  assert.deepEqual(handoff.targets.map(t=>[t.id,t.book]),targets.map(t=>[t.id,t.book]),'fixed rollout targets differ');
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
      actionClauseRollout:{scope:'clauses',wholeBodyReviewed:false},prior:{variant:original.variant,provenance:prior,sourceKey:original.sourceKey}});
    const nameProvenanceJson=t.effective?original.nameProvenanceJson:JSON.stringify({schemaVersion:1,acceptedRevision:source.revision,targetId:t.id,
      field:'name',language:'zh',origin:{kind:'chm',sourceKey:original.sourceKey},
      input:{revision:source.revision,path:source.path,targetId:t.id,field:'retained-name'},evidence,
      actionRolloutNameRetention:{reviewed:false,priorVariant:'chm'}});
    return {spellId:t.id,rulebookId:t.book,name:original.name,sourceKey:original.sourceKey,
      descriptionText:t.descriptionText,descriptionHtml:t.descriptionHtml,nameProvenanceJson,bodyProvenanceJson,action:fixed.operation};
  });
  return {rows,noteKey:'actionClauseRollout',note:note as unknown as Row,
    verifyTargets(db) {
      prerequisite.verifyTargets(db);
      try {requireAcceptedOverlayAfterRows(db,prerequisite);}
      catch(error) {throw new Error(`629 exact completed body prerequisite incomplete: ${String(error)}`,{cause:error});}
      const meta=JSON.parse((db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as Row).buildMetaJson);
      // After our atomic body commit, stale FTS is a recoverable state. Before
      // it,629 must have completed its entire search stage, not only its bodies.
      if(!Object.hasOwn(meta.overlays??{},'actionClauseRollout'))
        assert.equal(contentSearchStep(db).state,'current','629 search prerequisite incomplete');
      for(const t of handoff.targets) {
        assert.deepEqual(db.prepare('SELECT * FROM SpellContent WHERE legacySpellId=?').get(t.id),t.canonical,'complete canonical identity/English/mechanics drift');
        assert.deepEqual(db.prepare('SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id').all(t.canonical.id),t.facets,'facet drift');
        assert.deepEqual(db.prepare('SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id').all(t.canonical.id),t.components,'component drift');
        if(t.selected.variant==='chm') assert.deepEqual(db.prepare('SELECT * FROM I18nSpellText WHERE id=?').get(t.selected.id),t.selected,'CHM predecessor drift');
      }
    },correction:{before:handoff.targets.map(t=>t.effective),verifyPriorAnnotations(db,meta) {
      assert.deepEqual(meta,handoff.priorBuildMeta,'629 completed build prerequisite/annotations drift');
      const old=structuredClone(meta) as Row;assert.deepEqual(old.overlays.actionClauseCorrections,prerequisiteNote);
      delete old.overlays.actionClauseCorrections;
      prerequisite.correction!.verifyPriorAnnotations(db,old);
    }}};
}
export function authenticateActionRollout(root:string,rules:Database.Database) {
  const path=join(root,rolloutHandoffPath),bound=bindCommittedInputs(root,rolloutHandoffRevision,[path]);
  return rolloutInput(JSON.parse(bound.get(path)!.toString('utf8')),acceptedRolloutProposals(root),rules,authenticateActionCorrections(root,rules));
}
