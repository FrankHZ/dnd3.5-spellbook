import {isMechanismLine} from '../zh-parser/header';
export const saveKinds=['fortitude','reflex','will'] as const;
export type SaveKind=typeof saveKinds[number];
const english:Record<SaveKind,RegExp>={fortitude:/\bFortitude\b/gi,reflex:/\bReflex\b/gi,will:/\bWill\b/gi};
const chinese:Record<SaveKind,RegExp>={fortitude:/(?:强韧|強韌|坚韧|堅韌)/gu,reflex:/(?:反射|反应|反應)/gu,will:/(?:意志)/gu};
const header=/^(?:豁免检定|豁免檢定|豁免投掷|豁免投擲|豁免)\s*[：:]/u;
const inlineHeader=/(?:豁免检定|豁免檢定|豁免投掷|豁免投擲|豁免)\s*[：:]/u;
export function savingParts(text:string) {
  const lines=text.split(/\r?\n/u).map(line=>line.trim()).filter(Boolean);
  return {header:lines.flatMap(line=>{
    if(header.test(line))return [line];
    const match=isMechanismLine(line)&&inlineHeader.exec(line);
    return match?[line.slice(match.index)]:[];
  }),body:lines.filter(line=>!header.test(line)&&!isMechanismLine(line))};
}
export function fieldKinds(raw:string|null) {
  return saveKinds.filter(kind=>[...((raw??'').matchAll(english[kind]))].length>0);
}
/** Bounded sentence/line contexts, not English×Chinese paragraph pairing. Bare
 * "will" prose and ordinary reflex/fortitude nouns are excluded from body seeds. */
export function savingOccurrences(text:string,field:'saving-throw'|'body') {
  return text.split(/\r?\n/u).flatMap((line,lineNumber)=>{
    const contexts=field==='body'?line.split(/(?<=[.!?])\s+/u):[line];
    let start=0;
    return contexts.flatMap(context=>{
      const base=line.indexOf(context,start);start=base+context.length;
      const qualified=field==='saving-throw'||/\b(?:saves?|saving\s+throws?)\b/i.test(context);
      if(!qualified)return [];
      const role=field==='saving-throw'?'canonical-field':/\b(?:each|every|again|subsequent|additional|another|new)\b/i.test(context)?'repeated-save':/\b(?:if|unless|when|only)\b/i.test(context)?'conditional-save':'body-save';
      const qualifiers=[...context.matchAll(/\b(?:harmless|object|negates|half|partial|none)\b/gi)].map(m=>m[0].toLowerCase());
      const named=saveKinds.flatMap(kind=>[...context.matchAll(english[kind])].filter(m=>field==='saving-throw'||kind!=='will'||m[0]==='Will').map(m=>({kind:kind as SaveKind|'unspecified',field,line:lineNumber,offset:base+m.index!,context,
        role,qualifiers})));
      if(named.length||field==='saving-throw')return named;
      // Do not inherit a family from the canonical field: an unnamed later save
      // can refer to another effect/spell or a conditional retry.
      const generic=/\bsaving\s+throws?\b|\b(?:another|new|its|their|a|the|successful|failed)\s+saves?\b/gi;
      return [...context.matchAll(generic)].map(m=>({kind:'unspecified' as const,field,line:lineNumber,offset:base+m.index!,context,role,qualifiers}));
    });
  });
}
export function inspectSavingThrows(englishBody:string,savingThrow:string|null,zh:string|null) {
  const parts=savingParts(zh??'');
  // Independent lexical scope indexes: no English×Chinese paragraph alignment.
  const supportByScope={
    'saving-throw':Object.fromEntries(saveKinds.map(kind=>[kind,parts.header.filter(line=>[...line.matchAll(chinese[kind])].length>0)])),
    body:Object.fromEntries(saveKinds.map(kind=>[kind,parts.body.filter(line=>[...line.matchAll(chinese[kind])].length>0)])),
  };
  return [...savingOccurrences(savingThrow??'','saving-throw'),...savingOccurrences(englishBody,'body')].map(o=>{
    const support=o.kind==='unspecified'?[]:supportByScope[o.field][o.kind]!;
    const languageMissing=!zh?.trim(),fallback=zh?.trim()===englishBody.trim();
    const unavailable=o.field==='saving-throw'&&!parts.header.length;
    return {...o,status:languageMissing||fallback||unavailable||o.kind==='unspecified'?'unknown':support.length?'unverified':'candidate',
      reason:languageMissing?'missing-selected-Chinese':fallback?'selected-English-fallback':unavailable?'Chinese-save-header-unavailable-structured-field-retained':o.kind==='unspecified'?'English-save-kind-unspecified':support.length?'lexical-support-context-unverified':'save-kind-not-found-in-scope',
      chineseEvidence:support,structuredSavingThrow:savingThrow,
      note:'A rendered canonical field can cover a missing translated header. Complete role/condition review is required; no automatic correction or acceptance.'};
  });
}
