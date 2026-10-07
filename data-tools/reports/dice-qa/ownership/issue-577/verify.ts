import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, lstatSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import { localDataDir, repoRoot } from "../../../../src/shared/env";
import { loadEnglishRecords, validateSourceCoverage } from "../../../../src/dice-intake/qa";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { reconcile } from "../../../../src/dice-intake/reconcile";

// Issue-owned unactivated proposal replay, reusing the bounded #575 pattern.
// Version-specific translation does not authenticate or allocate composite raw rows.
const started = performance.now(), root = localDataDir();
const base = "dice-baselines/issue-520", rel = base + "/ownership/issue-577", owned = root + "/" + rel;
const out = repoRoot() + "/data-tools/out/issue-577";
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) => readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { maxBuffer: 40 * 1024 * 1024 });
const norm = (b: Buffer | string) => b.toString().replace(/\r\n/g, "\n");
const bound = (p: string, revision: string) => {
  const bytes = readFileSync(root + "/" + p);
  assert.equal(norm(bytes), norm(git("show", revision + ":" + p)), "input drift: " + p);
  return bytes;
};
const m = json(owned + "/input-manifest.json");
const ids = [534,436,519,520,453,491,537,522,540,486,496,577,578,544,545,502,548,457,549,524,552,463,465,467,469,471,515,508,444,446,558,559,560,561,562,509,475,516,448,449,569,511,487,518,575,531,576];
assert(same(m.expectedTargetIds, ids));
assert.equal(m.publicBase, "6124d3e375facc9f8857de319b6a7ca984d52f26");
assert.equal(m.sourceRevision, "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5");
assert.equal(m.preparedRevision, "6d28f9391273979a35a6bcc86971f0aac5b9f2c8");
assert(same(m.dependencies, [
  {issue:571,revision:"8dca5f2eeec8d794adcea65a0a961623156dc000"},
  {issue:573,revision:"fa533db19ded560b2cfbb9096a4f317836531e99"},
]));
for (const b of m.bindings) bound(b.path, b.revision);
const privateRevision = process.argv[2];
if (privateRevision) {
  assert(/^[a-f0-9]{40}$/.test(privateRevision), "exact private revision required");
  const files = git("ls-tree", "-r", "--name-only", privateRevision, "--", rel).toString("utf8").trim().split("\n");
  assert(same(files.map(p => p.slice(rel.length + 1)).sort(), readdirSync(owned).sort()), "owned membership drift");
  for (const p of files) bound(p, privateRevision);
}
const dependencies = m.dependencies.map((d: any) => {
  const p = root + "/" + base + "/ownership/issue-" + d.issue;
  return {...d,dispositions:rows(p+"/dispositions.jsonl"),occurrences:rows(p+"/occurrences.jsonl"),inputs:rows(p+"/related-db-inputs.jsonl"),fallbacks:rows(p+"/prior-book55-references.jsonl")};
});
const refs = dependencies.flatMap((d: any) => d.dispositions.filter((r: any) => r.status === "deferred").map((r: any) => {
  const leads = r.existingTargetVersions.filter((t: any) => t.rulebookId === 55);
  assert.equal(leads.length,1);
  return {sourceKey:r.sourceKey,identityDisposition:r,lead:leads[0],dependency:{issue:d.issue,revision:d.revision}};
}));
assert(same(refs,json(owned+"/identity-dependencies.json")));
assert(same(refs.map((r: any) => r.lead.targetId),ids));
assert.equal(refs.filter((r: any) => r.dependency.issue===571).length,22);
assert.equal(refs.filter((r: any) => r.dependency.issue===573).length,25);
assert.equal(refs.filter((r: any) => r.identityDisposition.reasonCode==="mixed-version").length,35);
assert.equal(refs.filter((r: any) => r.identityDisposition.reasonCode==="indistinguishable-reprint").length,12);
const cs=rows(owned+"/selected-occurrences.jsonl"),inputs=rows(owned+"/current-target-inputs.jsonl");
assert(same(cs,refs.map((r: any) => dependencies.flatMap((d: any) => d.occurrences).find((c: any) => c.sourceKey===r.sourceKey))));
assert(cs.length===47 && new Set(cs.map(c=>c.sourceKey)).size===47);
assert(same(cs.map(c=>c.sourceKey),m.selectedKeys) && same(inputs.map(t=>t.targetId),ids));
assert.equal(cs.reduce((n,c)=>n+c.rawHeader.length+c.rawBody.length,0),19940);
assert.equal(inputs.reduce((n,t)=>n+t.english.description.length,0),34076);
assert(m.rawCharacters===19940 && m.englishBodyCharacters===34076);
const stats=()=>m.operatorStats.map((d: any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));
assert(same(stats(),m.operatorStats));
const rules=new Database(m.operatorStats[0].path,{readonly:true,fileMustExist:true});
const content=new Database(m.operatorStats[1].path,{readonly:true,fileMustExist:true});
for(const db of [rules,content]) {db.pragma("query_only=ON");assert.equal(db.pragma("query_only",{simple:true}),1);}
const english=loadEnglishRecords(rules),parents=rows(owned+"/inherited-inputs.jsonl");
assert(same(parents.map(t=>t.targetId),[535,501,462,435,2315,2468,2561,2774,2799,2816]));
assert.equal(parents.reduce((n,t)=>n+t.english.description.length,0),m.parentEnglishBodyCharacters);
const all=[...inputs,...parents];
const textNorm=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,"").toLowerCase();
for(const t of all) {
  assert(same(t.english,english.get(t.targetId)),"current English/mechanics drift");
  const h:any=rules.prepare("SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?").get(t.targetId);
  assert.equal(t.englishHtml,h.html?.toString("utf8")??null);
  const $=cheerio.load(t.englishHtml??"");
  assert.equal($("img").length,0);
  if(t.targetId!==508) {
    assert.equal($("table").length,0);
    const plain=t.english.description.replace(/:spells\/[^\s]+/g,"");
    assert.equal(textNorm($("body").text()),textNorm(plain),"unreviewed HTML content");
  } else {
    assert.equal($("table").length,1);assert.equal($("table tr").length,7);
    const cells=$("table tr").toArray().map(tr=>$(tr).find("th,td").toArray().map(cell=>$(cell).text().trim()));
    assert.equal(cells[0][0],"1d6");assert(same(cells.slice(1).map(r=>r[0]),["1","2","3","4","5","6"]));
    const plain=textNorm(t.english.description.replace(/:spells\/[^\s]+/g,""));
    for(const cell of cells.flat()) assert(plain.includes(textNorm(cell)),"plain/HTML table content diverged");
    assert.equal(textNorm($("body>p").first().text()),textNorm(t.english.description.split(/\n\s*\n/)[0]));
  }
  if(t.chinese) {
    assert(t.english.rulebookId===55 && t.english.editionId===5);
    assert(same(t.chinese,content.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' AND spellId=? ORDER BY variant").all(t.targetId)));
    const prior=dependencies.flatMap((d:any)=>d.inputs).find((p:any)=>p.targetId===t.targetId);
    assert(same(prior.english,t.english)&&prior.englishHtml===t.englishHtml);
  }
  if(t.reusedAcceptedInput) {
    assert([535,501,462].includes(t.targetId));
    assert.equal(t.reusedAcceptedInput.revision,"b0b6a6e7102c41609c89692ccb1ab6d9c16e4ceb");
    const p=rows(root+"/"+t.reusedAcceptedInput.path).find(t1=>t1.targetId===t.targetId);
    assert(same(p.english,t.english)&&p.englishHtml===t.englishHtml);
  }
}
const books:any[]=rules.prepare("SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook").all();
const zh=new Map((content.prepare("SELECT spellId,name,descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'").all() as any[]).map(t=>[t.spellId,t]));
const targets=[...english].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:zh.get(id)?.name??null,zhBody:zh.get(id)?.descriptionText??null}));
const files=readdirSync(root+"/spells-dice-db-by-mo").filter(f=>f.endsWith(".txt")).sort().map(f=>{
  const bytes=bound("spells-dice-db-by-mo/"+f,m.sourceRevision);return {bytes:bytes.length,parsed:parseDiceFile(f,bytes)};
});
const candidates=rows(root+"/"+base+"/intake/candidates.jsonl");
validateSourceCoverage(files,rows(root+"/"+base+"/intake/source-inventory.jsonl"),candidates);
const replay=reconcile(files.flatMap(f=>f.parsed.records),json(root+"/dice-intake/publication-map.json"),books,targets,m.sourceRevision,json(root+"/chm-mapping/enName-aliases-global.json"));
assert(same(replay.candidates,candidates));
assert(same(replay.targetDispositions,rows(root+"/"+base+"/intake/target-inventory.jsonl")));
assert(candidates.length===5606 && english.size===5097);
for(const c of cs) {assert(same(c,candidates.find(t=>t.sourceKey===c.sourceKey)));assert.equal(c.targetId,null);}

const proposals=rows(owned+"/proposals.jsonl"),ds=rows(owned+"/dispositions.jsonl"),residuals=rows(owned+"/residuals.jsonl"),fallbacks=rows(owned+"/prior-fallback.jsonl");
assert(same(proposals.map(p=>p.targetId),ids)&&same(ds.map(d=>d.targetId),ids));
assert(same(fallbacks,ids.map(id=>dependencies.flatMap((d:any)=>d.fallbacks).find((f:any)=>f.targetId===id))));
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
const parentMap:Record<number,number>={534:535,436:435,540:2799,544:2774,502:501,548:2816,465:463,467:463,469:463,471:462,444:2315,558:559,560:559,561:559,562:559,475:2468,449:448};
const longBodyLines=new Map<string,number[]>();
for(const [i,p] of proposals.entries()) {
  const t=inputs[i],c=cs[i],b=p.fields.body,n=p.fields.name,d=ds[i];
  assert(p.rulebookId===55&&p.editionId===5&&p.sourceKey===c.sourceKey);
  assert(same(p.rawSpan,{file:c.file,ordinal:c.ordinal,startLine:c.startLine,endLine:c.endLine}));
  assert(same(p.identityDependency,refs[i].dependency)&&same(p.identityDispositionUnchanged,refs[i].identityDisposition));
  assert(same(p.input,{english:t.english,englishHtml:t.englishHtml,chinese:t.chinese}));
  assert(same(p.priorFallback,fallbacks[i])&&p.priorFallback.accepted===null&&p.priorFallback.fallback.length===2);
  assert(same(p.mechanicsReview.native,t.english.mechanics)&&p.mechanicsReview.nativeFieldsUnchanged);
  assert.equal(n.proposedText,c.zhName);assert.equal(n.englishNameCompared,t.english.name);assert.equal(n.sourceHeader,c.rawHeader);
  const current=t.chinese.find((z:any)=>z.variant==="chm");
  assert.equal(n.outcome,!current?"translate-missing":current.name!==n.proposedText?"correct":"retain");
  assert.equal(b.outcome,!current?"translate-missing":refs[i].identityDisposition.reasonCode==="mixed-version"?"separate-versions-and-correct":"compare-and-clarify");
  assert.equal(b.englishDescriptionCompared,t.english.description);assert.equal(b.englishHtmlCompared,t.englishHtml);
  assert(b.fullRawAndCurrentEnglishRead&&b.fullMechanicsRead&&b.reason.length>100&&n.reason.length>40);
  const paras=[...b.headerParagraphs,...b.bodyParagraphs];
  assert(paras.every(s=>typeof s==="string"&&s.length>0));
  let text=paras.join("\n\n"),hx=paras.map(s=>"<p>"+esc(s)+"</p>").join("");
  if(p.targetId===508) {
    assert.equal(b.tableRows.length,6);assert(same(b.tableRows.map((r:string[])=>r[0]),["1","2","3","4","5","6"]));
    assert(same(b.tableRows.slice(0,3).map((r:string[])=>Number(r[2].match(/\d+/)![0])),[20,40,80]));
    text+="\n\n"+n.proposedText+"\n1d6\t"+b.tableRowsHeader.join("\t")+"\n"+b.tableRows.map((r:string[])=>r.join("\t")).join("\n");
    hx+="<h4>"+n.proposedText+"</h4><table><thead><tr>"+["1d6",...b.tableRowsHeader].map(s=>"<th>"+s+"</th>").join("")+"</tr></thead><tbody>"+b.tableRows.map((r:string[])=>"<tr>"+r.map(s=>"<td>"+esc(s)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
  } else assert.equal(b.tableRows.length,0);
  assert.equal(b.proposedDescriptionText,text);assert.equal(b.proposedDescriptionHtml,hx);
  assert(!/TODO|TBD|\ufffd|\x00|空白占位|待翻译|SC-BLOCK|SC-TABLE-ROWS/.test(text));
  assert(/[\p{Script=Han}]/u.test(n.proposedText));
  const $=cheerio.load(hx);assert.equal($("table").length,p.targetId===508?1:0);assert.equal($("script,img,iframe").length,0);
  let excludedEnd=0;
  for(const s of b.excludedSegments) {
    assert(Number.isInteger(s.startOffset)&&Number.isInteger(s.endOffset));
    assert(s.startOffset>=excludedEnd&&s.startOffset<s.endOffset&&s.endOffset<=c.rawBody.length,"unsorted, overlapping or out-of-range exclusion: "+p.targetId);
    excludedEnd=s.endOffset;
  }
  const lineProjection=b.sourceLineProjection;assert.equal(lineProjection.map((l:any)=>l.originalText).join(""),c.rawBody);
  let offset=0;
  for(const [j,l] of lineProjection.entries()) {
    assert.equal(l.line,c.startLine+1+j);assert.equal(l.startOffset,offset);assert.equal(l.endOffset,offset+l.originalText.length);
    assert.equal(c.rawBody.slice(l.startOffset,l.endOffset),l.originalText);offset=l.endOffset;
    let retained=l.originalText;const cuts=b.excludedSegments.filter((s:any)=>s.startOffset<l.endOffset&&s.endOffset>l.startOffset).map((s:any)=>[Math.max(s.startOffset,l.startOffset),Math.min(s.endOffset,l.endOffset)]);
    for(const [a,z] of cuts.sort((a:number[],z:number[])=>z[0]-a[0])) retained=retained.slice(0,a-l.startOffset)+retained.slice(z-l.startOffset);
    assert.equal(l.projectedCandidateText,retained);assert.equal(l.reason,b.reason);
    assert.equal(l.action,!l.originalText.trim()?"format-only":cuts.length&&!retained.trim()?"exclude-other-version":cuts.length?"split-versions-and-review":"compare-and-retain-or-correct");
  }
  for(const s of b.excludedSegments) {assert.equal(s.originalText,c.rawBody.slice(s.startOffset,s.endOffset));assert.equal(s.action,"exclude-other-version");}
  if(p.targetId===446) {
    const label=c.sourceBookLabels[1]+"：",inlineStart=c.rawBody.indexOf("（"+label),inlineEnd=c.rawBody.indexOf("\n",inlineStart);
    const blockStart=c.rawBody.indexOf("\n"+label)+1;
    assert(inlineStart>=0&&inlineEnd>inlineStart&&blockStart>inlineEnd);
    assert(same(b.excludedSegments.map((s:any)=>[s.startOffset,s.endOffset]),[[inlineStart,inlineEnd],[blockStart,c.rawBody.length]]));
    const retained=lineProjection.map((l:any)=>l.projectedCandidateText).join("");
    assert.equal(retained,c.rawBody.slice(0,inlineStart)+c.rawBody.slice(inlineEnd,blockStart));
    assert(retained.includes(c.rawBody.slice(inlineEnd,blockStart)),"same-book headers/body/material excluded");
    for(const l of lineProjection.filter((l:any)=>l.startOffset>=blockStart)) assert.equal(l.action,"exclude-other-version");
    assert(!retained.includes(c.rawBody.slice(blockStart)),"foreign standalone block retained");
  }
  assert(same(b.residualCodes,residuals.filter(r=>r.targetId===p.targetId).map(r=>r.code)));
  assert.equal(b.status,b.residualCodes.length?"reference-draft-with-material-residual":"reviewed-usable-proposal");
  assert(same(d,{row:i+1,targetId:p.targetId,sourceKey:p.sourceKey,identityStatus:"deferred",identityReasonCode:refs[i].identityDisposition.reasonCode,nameOutcome:n.outcome,nameStatus:"reviewed-usable-proposal",bodyOutcome:b.outcome,bodyStatus:b.status,reasonCode:b.reasonCode,parentTargetIds:b.parentTargetIds,residualCodes:b.residualCodes,completeRawAndDbEnglishRead:true,semanticQaPass:b.residualCodes.length===0,nativeAccepted:false,activation:false,applied:false}));
  const parentId=parentMap[p.targetId];assert(same(b.parentTargetIds,p.targetId===508?[2561]:parentId?[parentId]:[]));
  assert(same(b.parentContextCompared,b.parentTargetIds.map((id:number)=>{const t=all.find(t=>t.targetId===id);assert(t);return {targetId:id,english:t.english,englishHtml:t.englishHtml};})));
  const expected={...p.mechanicsReview.native},inherited:Record<string,number>={};
  if(parentId) {
    const pm=all.find(t=>t.targetId===parentId).english.mechanics;
    for(const k of ["castingTime","range","target","effect","area","duration","savingThrow","spellResistance"]) {
      if(["target","effect","area"].includes(k)&&["target","effect","area"].some(j=>p.mechanicsReview.native[j]))continue;
      if(!expected[k]&&pm[k]) {expected[k]=pm[k];inherited[k]=parentId;}
    }
    if(!["verbal","somatic","material","arcaneFocus","divineFocus","xp"].some(k=>expected.components[k])) {expected.components=pm.components;inherited.components=parentId;}
  }
  if(p.targetId===502) {expected.range="10 ft.";delete inherited.range;}
  if(p.targetId===449) {expected.target=expected.target.replace("or portal","portal, or open space");delete inherited.target;}
  assert(same(expected,p.mechanicsReview.interpretedHeader)&&same(inherited,p.mechanicsReview.inheritedFields));
  assert(!p.activation&&!p.applied&&!p.nativeAttached&&!p.nativeAccepted&&!p.originalBookAuthenticated);
  for(const s of b.bodyParagraphs.filter((s:string)=>s.length>60))longBodyLines.set(s,[...(longBodyLines.get(s)??[]),p.targetId]);
}
assert([...longBodyLines.values()].every(ids=>ids.length===1),"unexpected long-body template reuse");
const probes=rows(owned+"/after-rule-probes.jsonl");assert(same(probes.map(p=>p.targetId),ids));
for(const p of probes) {
  assert(p.bodyTokens.length>=2);const body=proposals.find(t=>t.targetId===p.targetId).fields.body.proposedDescriptionText;
  for(const token of p.bodyTokens)assert(body.includes(token),"after-rule token missing");
  for(const token of p.forbiddenTokens??[])assert(!body.includes(token),"foreign-version rule leaked");
}
assert(same(residuals.map(r=>[r.targetId,r.code]),[[578,"cover-label-ac-conflict"],[457,"header-body-save-conflict"],[457,"balance-check-save-ambiguous"],[508,"above-six-hd-effect-scope-ambiguous"]]));
assert(residuals.every(r=>r.owner===577&&r.field==="body"&&r.fallbackRetained&&!r.nativeAccepted&&!r.activation&&r.detail.length>100));
rules.close();content.close();assert(same(stats(),m.operatorStats));

// NUL records preserve unrelated index/status/untracked names byte-for-byte.
const records=(b:Buffer)=>{assert.equal(b[b.length-1],0);const a:Buffer[]=[];let last=0;for(let i=0;i<b.length;i++)if(b[i]===0){a.push(b.subarray(last,i+1));last=i+1;}return a;};
const audit:Record<string,number>={};
for(const [label,args] of [["index",["ls-files","--stage","-z"]],["status",["status","--porcelain=v1","-z","--untracked-files=all"]],["untracked",["ls-files","--others","--exclude-standard","-z"]]] as const) {
  const filter=(b:Buffer,exclude:string[])=>records(b).filter(v=>{
    const s=v.toString("utf8");assert(label!=="status"||(!s.startsWith("R")&&!s.startsWith("C")));
    const path=label==="index"?s.slice(s.indexOf("\t")+1,-1):label==="status"?s.slice(3,-1):s.slice(0,-1);
    return !exclude.some(p=>path.startsWith(p+"/"));
  });
  const before=readFileSync(out+"/"+label+"-before.nul"),after=git(...args);
  assert(Buffer.concat(filter(before,[rel])).equals(Buffer.concat(filter(after,[rel]))),"nonowned NUL drift: "+label);
  for(const prior of [571,573,575]) {
    const original=readFileSync(repoRoot()+"/data-tools/out/issue-"+prior+"/"+label+"-before.nul");
    const exclude=[rel,...[571,573,575].filter(n=>n>=prior).map(n=>base+"/ownership/issue-"+n)];
    assert(Buffer.concat(filter(original,exclude)).equals(Buffer.concat(filter(after,exclude))),"original audit drift: "+prior+" "+label);
  }
  audit[label]=filter(before,[rel]).length;
  if(label==="status")assert.equal(records(before).filter(t=>t.toString("utf8").startsWith("D ")).length,39);
}
assert.equal(audit.untracked,1441);
const env=readFileSync(repoRoot()+"/.env");
for(const prior of [575,577]) assert(env.equals(readFileSync(repoRoot()+"/data-tools/out/issue-"+prior+"/env-before.bin")),"local configuration drift");
const runtime=lstatSync(repoRoot()+"/node_modules");
for(const prior of [575,577]) assert(same({size:runtime.size,mtimeMs:runtime.mtimeMs,isLink:runtime.isSymbolicLink()},json(repoRoot()+"/data-tools/out/issue-"+prior+"/runtime-before.json")),"reused runtime drift");
assert(!m.activation&&m.nativeAcceptedFields===0&&m.newUnseenOccurrencesReviewed===0&&m.parentUnseenRemaining===2101);
assert(m.model.verified.model==="gpt-6.1-sol"&&m.model.verified.effort==="high"&&m.model.verified.source==="local rollout turn_context");
const result={selectedTargets:47,mixedVersion:35,indistinguishableReprint:12,nameRetain:ds.filter(d=>d.nameOutcome==="retain").length,nameCorrect:ds.filter(d=>d.nameOutcome==="correct").length,nameTranslateMissing:ds.filter(d=>d.nameOutcome==="translate-missing").length,fullBodyProposals:47,bodyTranslateMissing:ds.filter(d=>d.bodyOutcome==="translate-missing").length,bodyWithoutMaterialResidual:ds.filter(d=>!d.residualCodes.length).length,bodyWithMaterialResidual:ds.filter(d=>d.residualCodes.length).length,residualRecords:residuals.length,additionalParentsRead:10,selectedParentsReused:3,accepted575ParentInputsReused:3,rawCharacters:19940,englishBodyCharacters:34076,additionalParentEnglishCharacters:m.parentEnglishBodyCharacters,nativeAttached:0,nativeAcceptedFields:0,activated:0,unperformedPending:0,newUnseenOccurrencesReviewed:0,parentUnseenRemaining:2101,originalIdentityDispositionsUnchanged:47};
assert(same(json(owned+"/review-summary.json"),result));
const publicRoot=fileURLToPath(new URL(".",import.meta.url)),publicSummary=json(publicRoot+"/summary.json");
assert(same(publicSummary.results,result),"public/private summary drift");
if(privateRevision)assert.equal(publicSummary.privateEvidenceRevision,privateRevision);
const ledger=ds.map(d=>[d.row,d.targetId,d.identityStatus,d.identityReasonCode,d.nameOutcome,d.nameStatus,d.bodyOutcome,d.bodyStatus,d.parentTargetIds.join(";"),d.residualCodes.join(";"),0,0].join(","));
assert(same(readFileSync(publicRoot+"/dispositions.csv","utf8").trim().split(/\r?\n/).slice(1),ledger),"public/private field disposition drift");
const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+"/"+f.name):statSync(p+"/"+f.name).size),0);
assert(bytes(owned)<3*1024*1024&&bytes(out)<3*1024*1024&&process.resourceUsage().maxRSS<512*1024&&performance.now()-started<60000);
console.log(JSON.stringify({status:"PASS",...result,queryOnly:[1,1],dbMetadataUnchanged:true,privateStatePreserved:true,audit,longBodyTemplateCollisions:0,privateBytes:bytes(owned),temporaryBytes:bytes(out),seconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS}));
