import assert from "node:assert/strict";
import {join} from "node:path";
import type Database from "better-sqlite3";
const {ACTION_CORRECTION_REVISION:revision, ACTION_CORRECTION_TARGETS:targets,
  ACTION_CORRECTION_ACCEPTANCE:acceptance, ACTION_CORRECTION_NOTE:note, DICE_CLOSEOUT_REVISION}
  = require("@dnd/contracts") as typeof import("@dnd/contracts", {with: {"resolution-mode":"import"}});
import {bindCommittedInputs} from "../dice-intake/db-english-handoff";
import {loadEnglishRecords} from "../dice-intake/qa";
import {requireKnownAnnotations} from "../rules-content/known-annotations";
import type {AcceptedOverlayInput} from "../dice-intake/accepted-overlay";
import type {OverlayRow} from "../dice-intake/effective-writer";

type Row = Record<string, any>;
export type ClauseProposal = Row & {proposalId: string; targetId: number; rulebookId: number;
  english: string; castingTime: string; fields: {field: string; before: string; after: string;
    exactReplacement?: {before: string; after: string; count: number}}[];
  exactReplacement: {before: string; after: string; count: number}};
export type ActionHandoff = {schema: "action-clause-handoff.v1"; acceptedRevision: string;
  priorBuildMeta: Row; targets: {id: number; book: number; canonical: Row; englishRules: Row;
    facets: Row[]; components: Row[]; selected: Row; effective: Row | null;
    descriptionText: string; descriptionHtml: string}[]};
const files = ["term-qa/issue-626/correction-proposals.json", "term-qa/issue-626/terminology-proposals.json"];
export const actionHandoffPath = "term-qa/issue-629/composed-handoff.json";
// Set to the committed preparation before this owner is released.
export const actionHandoffRevision = "626ad56d837dac8063b55d44b0db10052ada8737";

export function acceptedActionProposals(root: string): ClauseProposal[] {
  const bound = bindCommittedInputs(root, revision, files.map(file=>join(root,file)));
  const proposals = [...bound.values()].flatMap(buffer=>JSON.parse(buffer.toString("utf8"))) as ClauseProposal[];
  assert.deepEqual(proposals.map(p=>p.proposalId).sort(), targets.flatMap(t=>[...t.proposals]).sort(), "fixed accepted proposal set differs");
  return proposals;
}
/** All clauses are checked against one original body; complete after-bodies never overwrite one another. */
export function composeActionClauses(original: string, proposals: ClauseProposal[], field: string) {
  const spans: {at: number; before: string; after: string}[] = [];
  for (const p of proposals) {
    const f = p.fields.find(f=>f.field === field), edit = f?.exactReplacement ?? p.exactReplacement;
    assert(f && p.fields.length === 2 && new Set(p.fields.map(f=>f.field)).size === 2, "text/HTML proposal fields differ");
    assert.equal(f.before, original, "proposal does not share complete predecessor");
    assert.equal(edit.count, 1); assert(edit.before.length && edit.after.length && edit.before !== edit.after);
    const at = original.indexOf(edit.before);
    assert(at >= 0 && original.indexOf(edit.before, at+1) < 0, "clause must occur exactly once");
    assert.equal(f.after, original.replace(edit.before,edit.after), "proposal after is not its single accepted edit");
    spans.push({at,before:edit.before,after:edit.after});
  }
  spans.sort((a,b)=>a.at-b.at);
  for (let i=1;i<spans.length;i++) assert(spans[i]!.at >= spans[i-1]!.at+spans[i-1]!.before.length, "overlapping clause edits");
  let result = original;
  for (const span of spans.reverse()) result=result.slice(0,span.at)+span.after+result.slice(span.at+span.before.length);
  return result;
}
/** Internal preparation on readonly inputs; the maintained writer only consumes a fixed committed handoff. */
export function prepareActionHandoff(proposals: ClauseProposal[], rules: Database.Database, db: Database.Database): ActionHandoff {
  const english = loadEnglishRecords(rules);
  const build = db.prepare("SELECT buildMetaJson FROM RulesContentBuild").all() as Row[];
  assert.equal(build.length,1);
  return {schema:"action-clause-handoff.v1",acceptedRevision:revision,priorBuildMeta:JSON.parse(build[0]!.buildMetaJson),
    targets: targets.map(t=>{
      const ps=proposals.filter(p=>p.targetId===t.id);
      assert.deepEqual(ps.map(p=>p.proposalId).sort(), [...t.proposals].sort());
      assert(ps.every(p=>p.rulebookId===t.book));
      const canonical=db.prepare("SELECT * FROM SpellContent WHERE legacySpellId=?").get(t.id) as Row;
      assert(canonical && canonical.sourceRulebookId===t.book);
      const all=db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant").all(t.id) as Row[];
      const effective=all.filter(r=>r.variant==='effective');assert(effective.length<=1);
      const selected=effective[0] ?? all.find(r=>r.variant==='chm');assert(selected);
      const predecessor=ps[0]!.expectedPredecessor ?? ps[0]!.expectedSelectedPredecessor;
      assert.deepEqual(selected,predecessor,"accepted full selected predecessor differs");
      assert.equal(Boolean(effective.length), t.operation==='update', "effective presence differs");
      for(const p of ps) {
        assert.deepEqual(p.expectedPredecessor ?? p.expectedSelectedPredecessor,selected);
        assert.equal(p.english,canonical.descriptionText);assert.equal(p.castingTime,canonical.castingTimeRaw);
        if(p.canonicalMechanics) assert.deepEqual(canonical,p.canonicalMechanics,"accepted canonical mechanics differ");
      }
      const en=english.get(t.id);assert(en && en.rulebookId===t.book);
      assert.equal(en.name,canonical.canonicalName);assert.equal(en.description,canonical.descriptionText,"rules/canonical English differs");
      return {id:t.id,book:t.book,canonical,englishRules:en,
        facets:db.prepare("SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id").all(canonical.id) as Row[],
        components:db.prepare("SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id").all(canonical.id) as Row[],
        selected,effective:effective[0]??null,descriptionText:composeActionClauses(selected.descriptionText,ps,'descriptionText'),
        descriptionHtml:composeActionClauses(selected.descriptionHtml,ps,'descriptionHtml')};
    })};
}
export function actionCorrectionInput(handoff: ActionHandoff, proposals: ClauseProposal[], rules: Database.Database): AcceptedOverlayInput {
  assert.equal(handoff.schema,'action-clause-handoff.v1');assert.equal(handoff.acceptedRevision,revision);
  assert.deepEqual(handoff.targets.map(t=>[t.id,t.book]),targets.map(t=>[t.id,t.book]),"fixed correction targets differ");
  assert.deepEqual(proposals.map(p=>p.proposalId).sort(), targets.flatMap(t=>[...t.proposals]).sort());
  const en=loadEnglishRecords(rules);
  const rows: OverlayRow[]=handoff.targets.map((t,index)=>{
    const accepted=targets[index]!, ps=proposals.filter(p=>p.targetId===t.id), original=t.selected;
    assert.equal(Boolean(t.effective),accepted.operation==='update');
    assert.deepEqual(original,ps[0]!.expectedPredecessor??ps[0]!.expectedSelectedPredecessor);
    for(const p of ps) {
      assert.equal(p.rulebookId,t.book);assert.equal(p.english,t.canonical.descriptionText);assert.equal(p.castingTime,t.canonical.castingTimeRaw);
      if(p.canonicalMechanics) assert.deepEqual(t.canonical,p.canonicalMechanics,"accepted canonical mechanics differ");
      assert.deepEqual(p.expectedPredecessor??p.expectedSelectedPredecessor,original);
    }
    if(t.effective) assert.deepEqual(t.effective,original); else assert.equal(original.variant,'chm');
    assert.deepEqual(en.get(t.id),t.englishRules,"complete rules English/mechanics drift");
    assert.equal(t.descriptionText,composeActionClauses(original.descriptionText,ps,'descriptionText'));
    assert.equal(t.descriptionHtml,composeActionClauses(original.descriptionHtml,ps,'descriptionHtml'));
    const prior=original.bodyProvenanceJson ? JSON.parse(original.bodyProvenanceJson) : null;
    assert.equal(original.spellId,t.id);assert.equal(original.rulebookId,t.book);assert.equal(original.lang,'zh');
    assert(original.name && original.descriptionText && original.descriptionHtml);
    if(t.effective) {
      assert.equal(original.variant,'effective');
      assert(prior && prior.schemaVersion===1 && prior.acceptedRevision===DICE_CLOSEOUT_REVISION && prior.targetId===t.id && prior.field==='body' && prior.language==='zh',"unsupported prior provenance chain");
      assert.deepEqual(prior.closeout,{issue:586,revision:DICE_CLOSEOUT_REVISION},"unsupported prior owner");
      const owner=t.id===84?'chm':t.id===523?'native':'independent';
      assert.equal(prior.origin?.kind,owner,"prior original owner differs");
      if(owner==='chm') assert(!prior.review && prior.origin.sourceKey,"retained CHM cannot acquire whole-body review");
      else {
        assert.equal(prior.review?.kind,'DB-English');assert.equal(prior.review?.disposition,'DB-English-reviewed');
        assert.equal(prior.review?.acceptedRevision,DICE_CLOSEOUT_REVISION);
        assert.equal(prior.review?.authority,t.id===523?'recovered-db-english':'independent-db-english');
      }
    }
    else assert(prior===null && original.sourceKey,"unsupported CHM reference chain");
    const origin=prior?.origin ?? {kind:'chm',sourceKey:original.sourceKey};
    const bodyProvenanceJson=JSON.stringify({schemaVersion:1,acceptedRevision:revision,targetId:t.id,field:'body',language:'zh',origin,
      input:{revision,path:t.id===84?files[0]:files[1],targetId:t.id,field:'body'},
      evidence:{...acceptance,proposalIds:[...accepted.proposals]},
      actionClauseCorrection:{scope:'clauses',wholeBodyReviewed:false},
      prior:{variant:original.variant,provenance:prior,sourceKey:original.sourceKey}});
    const nameProvenanceJson=t.effective?original.nameProvenanceJson:JSON.stringify({schemaVersion:1,acceptedRevision:revision,
      targetId:t.id,field:'name',language:'zh',origin:{kind:'chm',sourceKey:original.sourceKey},
      input:{revision,path:files[1],targetId:t.id,field:'retained-name'},
      evidence:{...acceptance,proposalIds:[...accepted.proposals]},actionClauseNameRetention:{reviewed:false,priorVariant:'chm'}});
    return {spellId:t.id,rulebookId:t.book,name:original.name,descriptionText:t.descriptionText,descriptionHtml:t.descriptionHtml,
      sourceKey:original.sourceKey,nameProvenanceJson,bodyProvenanceJson,action:accepted.operation};
  });
  return {rows,noteKey:'actionClauseCorrections',note:note as unknown as Row,
    verifyTargets(db) {
      for(const t of handoff.targets) {
        assert.deepEqual(db.prepare("SELECT * FROM SpellContent WHERE legacySpellId=?").get(t.id),t.canonical,"complete canonical identity/English/mechanics drift");
        assert.deepEqual(db.prepare("SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id").all(t.canonical.id),t.facets,"mechanic facet drift");
        assert.deepEqual(db.prepare("SELECT * FROM SpellComponent WHERE spellId=? ORDER BY id").all(t.canonical.id),t.components,"component drift");
        if(t.selected.variant==='chm') assert.deepEqual(db.prepare("SELECT * FROM I18nSpellText WHERE id=?").get(t.selected.id),t.selected,"CHM predecessor drift");
      }
    },
    correction:{before:handoff.targets.map(t=>t.effective),verifyPriorAnnotations(db,meta) {
      assert.deepEqual(meta,handoff.priorBuildMeta,"prior normalized build/annotations drift");
      const base=structuredClone(meta) as Row;
      const prior=base.overlays?.diceDbEnglishCloseout;
      assert(prior && prior.schema==='dice-db-english-closeout.v1' && prior.acceptedRevision===DICE_CLOSEOUT_REVISION,"unsupported baseline source chain");
      assert.deepEqual(prior.protectedRulebookIds,[86]);
      delete base.overlays.diceDbEnglishCloseout;
      requireKnownAnnotations(db,base);
    }} };
}
export function authenticateActionCorrections(root: string,rules: Database.Database): AcceptedOverlayInput {
  const proposals=acceptedActionProposals(root);
  const path=join(root,actionHandoffPath), bound=bindCommittedInputs(root,actionHandoffRevision,[path]);
  return actionCorrectionInput(JSON.parse(bound.get(path)!.toString('utf8')),proposals,rules);
}
