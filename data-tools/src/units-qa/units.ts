import {isMechanismLine} from '../zh-parser/header';
export type Scope='duration-field'|'range-field'|'geometry-field'|'duration-header'|'range-header'|'geometry-header'|'other-header'|'body';
const en=/\b(?:seconds?|rounds?|minutes?|hours?|days?|weeks?|months?|years?|feet|foot|ft|inches?|inch|miles?|yards?|meters?|metres?|instantaneous|permanent|concentration)\b/giu;
const zh=/英尺|英寸|分钟|分鐘|小时|小時|星期|回合|瞬间|瞬間|立即|永久|集中注意力|專注|专注|呎|尺|吋|哩|里|米|码|碼|轮|輪|秒|天|日|周|月|年/gu;
/** Occurrences are literal retrieval only. Qualifiers/roles remain unverified. */
export function unitSeeds(text:string,scope:Scope,language:'en'|'zh'='en') {
 return [...text.matchAll(language==='en'?en:zh)].map(m=>{
  const near=text.slice(Math.max(0,m.index-100),m.index+120);
  const qualifiers={perLevel:/(?:\/|per\s+)(?:caster\s*)?level|每[^。；;]{0,8}(?:级|級|等级|等級)/iu.test(near),
   interval:/\b(?:each|every|per round)\b|每(?:轮|輪|回合|天|日|分钟|小時|小时)/iu.test(near),
   maximum:/\b(?:maximum|up to|at most|no more than)\b|最多|最高|上限/iu.test(near),conditional:/\b(?:until|if|unless|after)\b|直到|除非|如果|之后|之後/iu.test(near)};
  return {token:m[0].toLowerCase(),offset:m.index,scope,status:'context-unverified' as const,qualifiers};
 });
}
const headers=/(持续时间|持續時間|持续|持續|时效|時效|距离|距離|射程|作用距离|作用距離|目标|目標|影响区域|影響區域|区域|區域|范围|範圍|效果|施法时间|施法時間|法术抗力|法術抗力|豁免检定|豁免檢定|等级|等級|法术成分|法術成分)\s*[：:]/gu;
export function unitParts(text:string) {
 return text.split(/\r?\n/u).filter(line=>line.trim()).flatMap(line=>{
  const matches=isMechanismLine(line)?[...line.matchAll(headers)]:[];
  if(!matches.length)return [{scope:isMechanismLine(line)?'other-header' as Scope:'body' as Scope,text:line}];
  return matches.map((m,i)=>({scope:(/持续|持續|时效|時效/u.test(m[1]!)?'duration-header':/距离|距離|射程/u.test(m[1]!)?'range-header':/目标|目標|区域|區域|范围|範圍|效果/u.test(m[1]!)?'geometry-header':'other-header') as Scope,
   text:line.slice(m.index,matches[i+1]?.index)}));
 });
}
type Count={phrase:string;occurrences:number;documentFrequency:number;examples:{spellId:number;context:string}[]};
export function unitFrequency(rows:Iterable<{spellId:number;english:string;chinese:string|null;duration:string|null;range:string|null;geometry:string}>) {
 const counts=new Map<string,Count>();let entries=0,textBytes=0;
 for(const r of rows){entries++;textBytes+=Buffer.byteLength(r.english)+Buffer.byteLength(r.chinese??'')+Buffer.byteLength(r.duration??'')+Buffer.byteLength(r.range??'')+Buffer.byteLength(r.geometry);
  const seen=new Set<string>();const parts=[{language:'en' as const,scope:'body' as Scope,text:r.english},{language:'en' as const,scope:'duration-field' as Scope,text:r.duration??''},
   {language:'en' as const,scope:'range-field' as Scope,text:r.range??''},{language:'en' as const,scope:'geometry-field' as Scope,text:r.geometry},...unitParts(r.chinese??'').map(p=>({...p,language:'zh' as const}))];
  for(const p of parts)for(const m of unitSeeds(p.text,p.scope,p.language)){
   const phrase=`${p.language}:${p.scope}:${m.token}`,c=counts.get(phrase)??{phrase,occurrences:0,documentFrequency:0,examples:[]};c.occurrences++;
   if(!seen.has(phrase)){seen.add(phrase);c.documentFrequency++;if(c.examples.length<2)c.examples.push({spellId:r.spellId,context:p.text.slice(Math.max(0,m.offset-100),m.offset+180)});}counts.set(phrase,c);
  }
 }
 return {entries,textBytes,phrases:[...counts.values()].sort((a,b)=>b.documentFrequency-a.documentFrequency||a.phrase.localeCompare(b.phrase)),limits:{examplesPerPhrase:2,contextCharacters:280},
  interpretation:'Literal field/header/body counts; early-ID concordance; no semantic alignment, conversion, rounding, inferred units, action-to-round conversion or corpus precision/recall.'};
}
