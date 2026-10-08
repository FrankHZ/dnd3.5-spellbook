import {isDeepStrictEqual as equal} from "node:util";
import {ACTION_CORRECTION_REVISION as revision,ACTION_CORRECTION_TARGETS as targets,
  ACTION_CORRECTION_ACCEPTANCE as acceptance,DICE_CLOSEOUT_REVISION,type SpellFieldProvenance} from "@dnd/contracts";

const record=(v:unknown):v is Record<string,any>=>typeof v==='object' && v!==null && !Array.isArray(v);
const keys=(v:Record<string,unknown>,expected:string[])=>equal(Object.keys(v).sort(),expected.sort());
const sourceKey=(v:unknown)=>typeof v==='string' && v.length>0 && !/[\\/\r\n]/u.test(v);
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
