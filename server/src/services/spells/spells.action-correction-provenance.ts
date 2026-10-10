import {isDeepStrictEqual as equal} from "node:util";
import {ACTION_CORRECTION_REVISION as revision,ACTION_CORRECTION_TARGETS as targets,
  ACTION_CORRECTION_ACCEPTANCE as acceptance,DICE_CLOSEOUT_REVISION,
  ACTION_ROLLOUT_TARGETS,ACTION_ROLLOUT_INPUTS,SAVE_CORRECTION_TARGETS,SAVE_CORRECTION_INPUTS,type SpellFieldProvenance} from "@dnd/contracts";

const record=(v:unknown):v is Record<string,any>=>typeof v==='object' && v!==null && !Array.isArray(v);
const keys=(v:Record<string,unknown>,expected:string[])=>equal(Object.keys(v).sort(),expected.sort());
const sourceKey=(v:unknown)=>typeof v==='string' && v.length>0 && !/[\\/\r\n]/u.test(v);
// CHM keys can contain logical subdirectories. Keep them internal; the fixed
// successor exposes a stable reference identity instead of any stored locator.
const chmKey=(v:unknown):v is string=>typeof v==='string' && v.length>0
  && !/[\\\r\n]/u.test(v) && !v.startsWith('/') && !/^[A-Za-z]:\//u.test(v)
  && v.split('/').every(part=>part.length>0 && part!=='.' && part!=='..');
/** The successor binds both fixed accepted batches, retaining only safe prior
 * review metadata. New CHM names have reference ownership, never name review. */
export function mapActionRolloutProvenance(v:Record<string,any>,field:'name'|'body',
  target:{id:number;rulebookId:number},fail:()=>never,mapPrior:(raw:string)=>SpellFieldProvenance):SpellFieldProvenance {
  const t=ACTION_ROLLOUT_TARGETS.find(t=>t.id===target.id && t.book===target.rulebookId);
  const s=t && ACTION_ROLLOUT_INPUTS.find(s=>s.issue===t.issue);
  if(!t || !s || v.acceptedRevision!==s.revision || v.language!=='zh'
    || !equal(v.evidence,{issue:s.issue,comment:s.comment,proposalIds:[...t.proposals]})) return fail();
  const common=['schemaVersion','acceptedRevision','targetId','field','language','origin','input','evidence'];
  const retainedOrigin={kind:'chm' as const,sourceKey:`chm-reference:${t.id}`};
  if(field==='name') {
    if(t.operation!=='insert' || !keys(v,[...common,'actionRolloutNameRetention'])
      || !keys(v.origin,['kind','sourceKey']) || v.origin.kind!=='chm' || !chmKey(v.origin.sourceKey)
      || !equal(v.input,{revision:s.revision,path:s.path,targetId:t.id,field:'retained-name'})
      || !equal(v.actionRolloutNameRetention,{reviewed:false,priorVariant:'chm'})) return fail();
    return {schemaVersion:1,acceptedRevision:s.revision,language:'zh',origin:retainedOrigin,retainedReference:{kind:'CHM',reviewed:false}};
  }
  if(!keys(v,[...common,'actionClauseRollout','prior'])
    || !equal(v.input,{revision:s.revision,path:s.path,targetId:t.id,field:'body'})
    || !equal(v.actionClauseRollout,{scope:'clauses',wholeBodyReviewed:false})
    || !record(v.prior) || !keys(v.prior,['variant','provenance','sourceKey'])
    || !(v.prior.sourceKey===null || (t.operation==='insert'?chmKey(v.prior.sourceKey):sourceKey(v.prior.sourceKey)))) return fail();
  let prior:NonNullable<SpellFieldProvenance['clauseReview']>['prior'];
  if(t.operation==='update') {
    const old=v.prior.provenance;
    if(v.prior.variant!=='effective' || !record(old) || old.acceptedRevision!==DICE_CLOSEOUT_REVISION
      || old.origin?.kind!==t.origin || !equal(old.origin,v.origin) || old.review?.authority!==t.authority) return fail();
    const safe=mapPrior(JSON.stringify(old));
    prior={acceptedRevision:safe.acceptedRevision,...(safe.review?{review:safe.review}:{})};
  } else if(v.prior.variant!=='chm' || v.prior.provenance!==null || !chmKey(v.prior.sourceKey)
    || !equal(v.origin,{kind:'chm',sourceKey:v.prior.sourceKey})) return fail();
  return {schemaVersion:1,acceptedRevision:s.revision,language:'zh',origin:t.operation==='insert'?retainedOrigin:v.origin,
    clauseReview:{kind:'DB-English',scope:'clauses',acceptedRevision:s.revision,
      proposalIds:[...t.proposals],wholeBodyReviewed:false,...(prior?{prior}:{})}};
}
export function mapSaveCorrectionProvenance(v:Record<string,any>,field:'name'|'body',
  target:{id:number;rulebookId:number},fail:()=>never,mapPrior:(raw:string)=>SpellFieldProvenance):SpellFieldProvenance {
  const t=SAVE_CORRECTION_TARGETS.find(t=>t.id===target.id && t.book===target.rulebookId);
  const s=t && SAVE_CORRECTION_INPUTS.find(s=>s.issue===t.issue);
  if(!t || !s || v.acceptedRevision!==s.revision || v.language!=='zh'
    || !equal(v.evidence,{issue:s.issue,comment:s.comment,proposalIds:[...t.proposals]})) return fail();
  const common=['schemaVersion','acceptedRevision','targetId','field','language','origin','input','evidence'];
  const retainedOrigin={kind:'chm' as const,sourceKey:`chm-reference:${t.id}`};
  if(field==='name') {
    if(t.operation!=='insert' || !keys(v,[...common,'saveCorrectionNameRetention'])
      || !keys(v.origin,['kind','sourceKey']) || v.origin.kind!=='chm' || !chmKey(v.origin.sourceKey)
      || !equal(v.input,{revision:s.revision,path:s.path,targetId:t.id,field:'retained-name'})
      || !equal(v.saveCorrectionNameRetention,{reviewed:false,priorVariant:'chm'})) return fail();
    return {schemaVersion:1,acceptedRevision:s.revision,language:'zh',origin:retainedOrigin,retainedReference:{kind:'CHM',reviewed:false}};
  }
  if(!keys(v,[...common,'saveClauseCorrection','prior'])
    || !equal(v.input,{revision:s.revision,path:s.path,targetId:t.id,field:'body'})
    || !equal(v.saveClauseCorrection,{scope:'clauses',wholeBodyReviewed:false})
    || !record(v.prior) || !keys(v.prior,['variant','provenance','sourceKey'])
    || !(v.prior.sourceKey===null || (t.operation==='insert'?chmKey(v.prior.sourceKey):sourceKey(v.prior.sourceKey)))) return fail();
  let prior:NonNullable<SpellFieldProvenance['clauseReview']>['prior'];
  if(t.operation==='update') {
    const old=v.prior.provenance;
    if(v.prior.variant!=='effective' || !record(old) || old.acceptedRevision!==DICE_CLOSEOUT_REVISION
      || old.origin?.kind!==t.origin || !equal(old.origin,v.origin) || old.review?.authority!==t.authority) return fail();
    const safe=mapPrior(JSON.stringify(old));
    prior={acceptedRevision:safe.acceptedRevision,...(safe.review?{review:safe.review}:{})};
  } else if(v.prior.variant!=='chm' || v.prior.provenance!==null || !chmKey(v.prior.sourceKey)
    || !equal(v.origin,{kind:'chm',sourceKey:v.prior.sourceKey})) return fail();
  return {schemaVersion:1,acceptedRevision:s.revision,language:'zh',origin:t.operation==='insert'?retainedOrigin:v.origin,
    clauseReview:{kind:'DB-English',scope:'clauses',acceptedRevision:s.revision,
      proposalIds:[...t.proposals],wholeBodyReviewed:false,...(prior?{prior}:{})}};
}
/** Only the one absent-overlay target retains a CHM name without semantic name review. */
export function mapActionNameRetention(v:Record<string,any>,field:'name'|'body',target:{id:number;rulebookId:number},fail:()=>never):SpellFieldProvenance {
  if(field!=='name' || target.id!==2474 || target.rulebookId!==6 || v.acceptedRevision!==revision || v.language!=='zh'
    || !keys(v,['schemaVersion','acceptedRevision','targetId','field','language','origin','input','evidence','actionClauseNameRetention'])
    || !keys(v.origin,['kind','sourceKey']) || v.origin.kind!=='chm' || !sourceKey(v.origin.sourceKey)
    || !equal(v.input,{revision,path:'term-qa/issue-626/terminology-proposals.json',targetId:2474,field:'retained-name'})
    || !equal(v.evidence,{...acceptance,proposalIds:['2474-terminology']})
    || !equal(v.actionClauseNameRetention,{reviewed:false,priorVariant:'chm'})) return fail();
  return {schemaVersion:1,acceptedRevision:revision,language:'zh',origin:v.origin,retainedReference:{kind:'CHM',reviewed:false}};
}
/** Fixed clause owner only. Original review remains prior metadata, not a new whole-body claim. */
export function mapActionCorrectionProvenance(v:Record<string,any>,field:'name'|'body',
  target:{id:number;rulebookId:number},fail:()=>never,
  mapPrior:(raw:string)=>SpellFieldProvenance):SpellFieldProvenance {
  const t=targets.find(t=>t.id===target.id && t.book===target.rulebookId);
  if (!t || field!=='body' || !keys(v,['schemaVersion','acceptedRevision','targetId','field','language','origin','input','evidence','actionClauseCorrection','prior'])
    || v.acceptedRevision!==revision || v.language!=='zh'
    || !equal(v.input,{revision,path:t.id===84?'term-qa/issue-626/correction-proposals.json':'term-qa/issue-626/terminology-proposals.json',targetId:t.id,field:'body'})
    || !equal(v.evidence,{...acceptance,proposalIds:[...t.proposals]})
    || !equal(v.actionClauseCorrection,{scope:'clauses',wholeBodyReviewed:false})
    || !record(v.prior) || !keys(v.prior,['variant','provenance','sourceKey'])
    || !(v.prior.sourceKey===null || sourceKey(v.prior.sourceKey))) return fail();
  let prior:NonNullable<SpellFieldProvenance['clauseReview']>['prior'];
  if(t.operation==='update') {
    const old=v.prior.provenance;
    if(v.prior.variant!=='effective' || !record(old) || old.acceptedRevision!==DICE_CLOSEOUT_REVISION
      || !('closeout' in old) || 'actionClauseCorrection' in old || !equal(v.origin,old.origin)) return fail();
    const owner=t.id===84?'chm':t.id===523?'native':'independent';
    if(old.origin?.kind!==owner || old.language!=='zh'
      || (owner==='chm' ? 'review' in old : old.review?.authority!==(t.id===523?'recovered-db-english':'independent-db-english'))) return fail();
    const safe=mapPrior(JSON.stringify(old));
    prior={acceptedRevision:safe.acceptedRevision,...(safe.review?{review:safe.review}:{})};
  } else if(v.prior.variant!=='chm' || v.prior.provenance!==null
    || !sourceKey(v.prior.sourceKey) || !equal(v.origin,{kind:'chm',sourceKey:v.prior.sourceKey})) return fail();
  return {schemaVersion:1,acceptedRevision:revision,language:'zh',origin:v.origin,
    clauseReview:{kind:'DB-English',scope:'clauses',acceptedRevision:revision,
      proposalIds:[...t.proposals],wholeBodyReviewed:false,...(prior?{prior}:{})}};
}
