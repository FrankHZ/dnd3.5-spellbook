/** Literal candidate seeds, not a normalization dictionary or type acceptance. */
export const families=['natural armor','enhancement','morale','luck','resistance','insight','competence','sacred','profane','deflection','dodge','circumstance','alchemical','racial','size','shield','armor','inherent'] as const;
const typed=new RegExp(`\\b(${families.join('|')})\\s+bonus(?:es)?\\b`,'giu');
const chinese=/(?:增强|增強|提升|士气|士氣|幸运|幸運|抗力|抵抗|洞察|表现|表現|能力|神圣|神聖|亵渎|褻瀆|偏斜|闪避|閃避|环境|環境|炼金|煉金|种族|種族|体型|體型|盾牌|盔甲|装甲|護甲|护甲|天生防御|天生防禦|天然防御|内在|固有|天赋|天賦)\s*(?:加值|加成)/gu;
export function bonusSeeds(text:string) {
  return [...text.matchAll(typed)].map(m=>({family:m[1]!.toLowerCase(),offset:m.index,status:'context-unverified' as const}));
}
export function bonusControls(text:string) {
  const all=[...text.matchAll(/\bbonus(?:es)?\b/giu)].length;
  return {untypedOrOtherBonus:all>bonusSeeds(text).length,penalty:/\bpenalt(?:y|ies)\b/iu.test(text),
    abilityChange:/(?:increase|decrease|gain|lose|raise|reduce)[^.]{0,60}\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/iu.test(text),
    ordinaryPhrase:/\bbonus (?:spells|damage|hit points)\b/iu.test(text)};
}
type Count={phrase:string;occurrences:number;documentFrequency:number;examples:{spellId:number;context:string}[]};
/** Linear phrase counts; no cross-paragraph alignment or Cartesian pairing. */
export function bonusFrequency(rows:Iterable<{spellId:number;english:string;chinese:string|null}>) {
  const en=new Map<string,Count>(),zh=new Map<string,Count>(),suffix=new Map<string,Count>();let entries=0,textBytes=0;
  const add=(map:Map<string,Count>,phrase:string,id:number,context:string,seen:Set<string>)=>{
    const c=map.get(phrase)??{phrase,occurrences:0,documentFrequency:0,examples:[]};c.occurrences++;
    if(!seen.has(phrase)){seen.add(phrase);c.documentFrequency++;if(c.examples.length<2)c.examples.push({spellId:id,context:context.slice(0,300)});}map.set(phrase,c);
  };
  for(const r of rows){entries++;textBytes+=Buffer.byteLength(r.english)+Buffer.byteLength(r.chinese??'');
    const es=new Set<string>(),zs=new Set<string>(),ss=new Set<string>();
    for(const m of bonusSeeds(r.english))add(en,m.family,r.spellId,r.english.slice(Math.max(0,m.offset-100),m.offset+180),es);
    const text=r.chinese??'';
    for(const m of text.matchAll(chinese))add(zh,m[0].replace(/\s/gu,''),r.spellId,text.slice(Math.max(0,m.index-100),m.index+180),zs);
    for(const m of text.matchAll(/([\u4e00-\u9fff]{2,8}?)(加值|加成)/gu))for(const n of [2,3,4])if(m[1]!.length>=n)
      add(suffix,m[1]!.slice(-n)+m[2]!,r.spellId,text.slice(Math.max(0,m.index-80),m.index+180),ss);
  }
  const sort=(map:Map<string,Count>)=>[...map.values()].sort((a,b)=>b.documentFrequency-a.documentFrequency||a.phrase.localeCompare(b.phrase));
  return {entries,textBytes,english:sort(en),chineseLabels:sort(zh).slice(0,40),chineseSuffixCandidates:sort(suffix).filter(c=>c.documentFrequency>=2).slice(0,20),
    limits:{chineseTopK:40,suffixTopK:20,examplesPerPhrase:2,contextCharacters:300},
    interpretation:'Literal phrases/DF and bounded earliest-ID concordance only. No local recipient/statistic/condition alignment, semantic pass, inferred stacking, or corpus precision/recall.'};
}
