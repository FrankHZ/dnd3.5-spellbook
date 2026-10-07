import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import { localDataDir, repoRoot } from "../../../../src/shared/env";
import { candidateRulebook, loadEnglishRecords, validateSourceCoverage } from "../../../../src/dice-intake/qa";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { reconcile } from "../../../../src/dice-intake/reconcile";

// Bounded read-only continuation of #571; never invokes an output CLI or writer.
const started = performance.now(), root = localDataDir(), base = "dice-baselines/issue-520";
const rel = base + "/ownership/issue-573", owned = root + "/" + rel;
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) => readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { maxBuffer: 40 * 1024 * 1024 });
const norm = (s: string) => s.replace(/\r\n/g, "\n");
const bound = (p: string, rev: string) => {
  const s = readFileSync(root + "/" + p, "utf8");
  assert.equal(norm(s), norm(git("show", rev + ":" + p).toString("utf8")), "committed drift: " + p);
  return s;
};
const m = json(owned + "/input-manifest.json"), priorRel = base + "/ownership/issue-571";
assert.equal(m.publicBase, "e618272ffc59380b7c509e81d8f16b2b867437b1");
assert.equal(m.sourceRevision, "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5");
assert.equal(m.preparedRevision, "6d28f9391273979a35a6bcc86971f0aac5b9f2c8");
for (const b of m.bindings) bound(b.path, b.revision);
if (process.argv[2]) {
  assert(/^[a-f0-9]{40}$/.test(process.argv[2]));
  const files = git("ls-tree", "-r", "--name-only", process.argv[2], "--", rel).toString("utf8").trim().split("\n");
  assert(same(files.map(p => p.slice(rel.length + 1)).sort(), readdirSync(owned).sort()));
  for (const p of files) bound(p, process.argv[2]);
}
const stats = () => m.readonly.databases.map((d: any) => ({path: d.path, size: statSync(d.path).size, mtimeMs: statSync(d.path).mtimeMs}));
assert(same(stats(), m.readonly.databases));
const rules = new Database(m.readonly.databases[0].path, {readonly: true, fileMustExist: true});
const content = new Database(m.readonly.databases[1].path, {readonly: true, fileMustExist: true});
for (const d of [rules, content]) { d.pragma("query_only=ON"); assert.equal(d.pragma("query_only", {simple: true}), 1); }
const english = loadEnglishRecords(rules), books: any[] = rules.prepare("SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook").all();
const zh: any[] = content.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh'").all();
const chm = new Map(zh.filter(t => t.variant === "chm").map(t => [t.spellId, t]));
const targets = [...english].map(([id,e]) => ({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null}));
const files = readdirSync(root + "/spells-dice-db-by-mo").filter(n => n.endsWith(".txt")).sort().map(n => {
  const p = "spells-dice-db-by-mo/" + n; bound(p, m.sourceRevision);
  const b = readFileSync(root + "/" + p); return {bytes:b.length,parsed:parseDiceFile(n,b)};
});
const candidates = rows(root + "/" + base + "/intake/candidates.jsonl");
validateSourceCoverage(files, rows(root + "/" + base + "/intake/source-inventory.jsonl"), candidates);
const replay = reconcile(files.flatMap(f=>f.parsed.records),json(root+"/dice-intake/publication-map.json"),books,targets,m.sourceRevision,json(root+"/chm-mapping/enName-aliases-global.json"));
assert(same(replay.candidates,candidates) && same(replay.targetDispositions,rows(root+"/"+base+"/intake/target-inventory.jsonl")));
assert.equal(files.length,105);assert.equal(files.reduce((n,f)=>n+f.bytes,0),5544957);
const ordinals = [81,82,83,84,85,86,88,89,92,94,95,99,101,102,103,104,105,106,107,108,112,113,114,115,118,124,126,130,131,132,135,136,137,138,141,143,144,145];
const all = candidates.filter(t=>t.file===m.selection.file && candidateRulebook(t)===null);
const selected = all.filter(t=>ordinals.includes(t.ordinal)), keys = selected.map(t=>t.sourceKey);
const prior = rows(root+"/"+priorRel+"/occurrences.jsonl");
assert.equal(all.length,78);assert.equal(prior.length,40);assert.equal(selected.length,38);
assert(same(selected,rows(owned+"/occurrences.jsonl")) && same(selected.map(t=>t.ordinal),ordinals) && same(keys,m.selection.sourceKeys));
assert(same(all.filter(t=>!ordinals.includes(t.ordinal)),prior));
assert(selected.every(t=>t.targetId===null) && new Set([...keys,...prior.map(t=>t.sourceKey)]).size===78);
assert.equal(selected.reduce((n,t)=>n+t.rawHeader.length+t.rawBody.length,0),15089);
const gp=m.globalPartition, earlier=gp.priorEvidence.map((p:any)=>bound(p.path,p.revision).trim().split(/\r?\n/).map(JSON.parse));
assert(same(earlier.map((t:any[])=>t.length),[33,43,58,40]));
const covered=new Set([...earlier.flat(),...selected].map(t=>t.sourceKey)), inside=candidates.filter(t=>gp.bookScope.includes(candidateRulebook(t)));
assert.equal(covered.size,212);assert.equal(inside.length,3293);assert(!inside.some(t=>covered.has(t.sourceKey)));
assert.equal(candidates.filter(t=>!gp.bookScope.includes(candidateRulebook(t))&&!covered.has(t.sourceKey)).length,2101);
assert.equal(candidates.length,5606);assert.equal(english.size,5097);assert.equal(new Set(candidates.map(t=>t.sourceKey)).size,5606);
const otherBooks=JSON.parse(bound(gp.priorEvidence[0].manifestPath,gp.priorEvidence[0].revision)).byBook.map((b:any)=>b.rulebook.id);
assert.equal(targets.filter(t=>!gp.bookScope.includes(t.rulebookId)&&!otherBooks.includes(t.rulebookId)).length,995);
const boundary=json(owned+"/source-boundaries.json"),file=files.find(f=>f.parsed.file===m.selection.file)!;
assert.equal(boundary.bytes,file.bytes);assert.equal(boundary.lineCount,file.parsed.lineCount);
assert(same(boundary.unparsedSpans,file.parsed.unparsedSpans)&&boundary.unparsedSpans.length===0);
assert(same(boundary.selected,selected.map(t=>({sourceKey:t.sourceKey,ordinal:t.ordinal,startLine:t.startLine,endLine:t.endLine,suspectedBoundaryLines:t.suspectedBoundaryLines}))));

const inputs=rows(owned+"/related-db-inputs.jsonl"),lookups=rows(owned+"/identity-lookups.jsonl"),canon=(s:string)=>s?.toLowerCase().replace(/[^a-z]/g,"")??"";
assert.equal(inputs.length,107);assert.equal(new Set(inputs.map(t=>t.book.id)).size,9);
assert.equal(inputs.reduce((n,t)=>n+t.english.description.length,0),76839);
assert(same(m.publications.books,books.filter(b=>inputs.some(t=>t.book.id===b.id))));
assert(same(m.publications.editions,(rules.prepare("SELECT * FROM dnd_dndedition").all() as any[]).filter(e=>inputs.some(t=>t.book.editionId===e.id))));
for (const d of inputs) {
  assert(same(d.english,english.get(d.targetId))&&same(d.book,books.find(b=>b.id===d.book.id))&&same(d.chinese,zh.filter(t=>t.spellId===d.targetId)));
  const h:any=rules.prepare("SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?").get(d.targetId);
  assert.equal(d.englishHtml,h.html?.toString("utf8")??null);
}
for (const [i,l] of lookups.entries()) {
  const s=selected[i], ids=[...new Set([...s.nameHintTargetIds,...s.aliasHintTargetIds,...[...english].filter(([id,e])=>canon(e.name)===canon(s.enName)).map(([id])=>id)])];
  assert(l.row===i+1&&l.sourceKey===s.sourceKey&&same(ids,l.relatedTargetIds));
  assert(same(l.peerSourceKeys,candidates.filter(t=>t.sourceKey!==s.sourceKey&&canon(t.enName)===canon(s.enName)).map(t=>t.sourceKey)));
}
assert(same([...new Set(lookups.flatMap(l=>l.relatedTargetIds))],inputs.map(t=>t.targetId)));
const peers=rows(owned+"/duplicate-peers.jsonl"),comparisons=rows(owned+"/duplicate-comparison.jsonl");
assert.equal(peers.length,63);assert.equal(comparisons.length,63);
assert(same(peers,candidates.filter(t=>lookups.some(l=>l.peerSourceKeys.includes(t.sourceKey)))));
assert(same(comparisons.map(d=>[d.row,d.peerSourceKey]),lookups.flatMap(l=>l.peerSourceKeys.map((k:string)=>[l.row,k]))));
for(const d of comparisons){const a=selected[d.row-1],b=peers.find(t=>t.sourceKey===d.peerSourceKey);assert(b&&a.sourceKey===d.sourceKey&&d.rawBodyEqual===(a.rawBody===b.rawBody)&&d.bodyTextEqual===(a.bodyText===b.bodyText)&&d.peerDispositionUnchanged);}
const html=rows(owned+"/html-inspection.jsonl");assert.equal(html.length,107);
const hn=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,"").toLowerCase();
for(const h of html){const d=inputs.find(t=>t.targetId===h.targetId),$=cheerio.load(d.englishHtml??"");assert(h.tableCount===$("table").length&&h.imageCount===$("img").length&&h.imageCount===0);assert.equal(h.tableCount,[508,3958].includes(h.targetId)?1:0);assert.equal(h.htmlTextComparable,hn($("body").text())===hn(d.english.description.replace(/"([^"\n]+)":\S+/g,"$1")));if(!h.htmlTextComparable){assert.equal(h.targetId,508);assert.equal(h.htmlText,$("body").text());assert.equal($("tr").length,7);}if(h.targetId===3958)assert.equal($("tr").length,9);}

const sc=rows(owned+"/accepted-sc-references.jsonl"),b55=rows(owned+"/prior-book55-references.jsonl");
assert.equal(sc.length,38);assert.equal(sc.filter(t=>t.successor).length,1);assert.equal(b55.length,38);
const si=JSON.parse(bound(sc[0].inputPath,sc[0].revision)).inputs,sf=bound(sc[0].fieldPath,sc[0].revision).trim().split(/\r?\n/).map(JSON.parse);
for(const ref of sc){const d=inputs.find(t=>t.targetId===ref.targetId),z=d.chinese.find((t:any)=>t.variant==="effective"),old=si.find((t:any)=>t.targetId===ref.targetId);assert(same(ref.englishInput,old.english)&&same(ref.fields,sf.filter((t:any)=>t.targetId===ref.targetId)));assert.equal(ref.fields.find((t:any)=>t.field==="name").text,z.name);assert.equal(ref.fields.find((t:any)=>t.field==="body").text,z.descriptionText);assert.equal(ref.fields.find((t:any)=>t.field==="body").html,z.descriptionHtml);if(ref.successor){const u=ref.successor,j=JSON.parse(bound(u.path,u.revision)),a=JSON.parse(bound(u.acceptancePath,u.acceptanceRevision));assert.equal(ref.targetId,3958);assert(same(j,u.record)&&same(a.comments.find((t:any)=>t.url===u.acceptanceComment.url),u.acceptanceComment));assert.equal(u.revision,"790f9ebbd024916d16577d69c01d868155a9ccfd");assert.equal(u.acceptanceRevision,"7f8ea2df1104fe4345141f0712dbb43739e98b7e");assert.equal(u.acceptanceComment.authorAssociation,"OWNER");assert(u.acceptanceComment.body.includes(u.revision));assert.equal(j.patch.expected.spell.description,old.english.description);assert.equal(j.patch.expected.spell.descriptionHtml,old.englishHtml);assert.equal(j.patch.spell.description,d.english.description);assert.equal(j.patch.spell.descriptionHtml,d.englishHtml);assert(same({...d.english,description:old.english.description},old.english));}else assert(same(old.english,d.english)&&old.englishHtml===d.englishHtml);assert(Object.values(ref.currentMatches).every(Boolean));}
const dec=rows(root+"/dice-qa/books/55/decisions.jsonl"),acc=rows(root+"/dice-qa/books/55/out/accepted.jsonl"),fall=rows(root+"/dice-qa/books/55/out/fallback.jsonl");
for(const ref of b55){const d=inputs.find(t=>t.targetId===ref.targetId),z=d.chinese.find((t:any)=>t.variant==="chm");assert(!dec.some(t=>t.targetId===ref.targetId)&&!acc.some(t=>t.targetId===ref.targetId)&&ref.decision===null&&ref.accepted===null);assert(same(ref.fallback,fall.filter(t=>t.targetId===ref.targetId))&&ref.fallback.length===2&&ref.laterSemanticQaRequired);assert(ref.currentName===(z?.name??null)&&ref.currentBody===(z?.descriptionText??null)&&ref.currentHtml===(z?.descriptionHtml??null));}
const historicalAvailable = spawnSync("git", ["-C",root,"cat-file","-t",m.priorBook55.historicalRevision], {stdio:"pipe"}).status===0;
assert.equal(historicalAvailable,m.priorBook55.historicalObjectAvailable);
for(const d of m.inheritedReferences){const p=rows(root+"/"+d.path).find(t=>t.targetId===d.targetId);assert(p&&same(p.english,english.get(d.targetId)));const h:any=rules.prepare("SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?").get(d.targetId);assert.equal(p.englishHtml,h.html?.toString("utf8")??null);}
const ds=rows(owned+"/dispositions.jsonl");assert.equal(ds.length,38);
assert.equal(ds.filter(d=>d.intendedVersion).length,13);assert.equal(ds.filter(d=>d.reasonCode==="mixed-version").length,21);assert.equal(ds.filter(d=>d.reasonCode==="indistinguishable-reprint").length,4);
for(const [i,d] of ds.entries()){const s=selected[i],l=lookups[i];assert(d.row===i+1&&d.sourceKey===s.sourceKey&&d.ordinal===s.ordinal&&d.startLine===s.startLine&&d.endLine===s.endLine);assert(same(d.existingTargetVersions.map((t:any)=>t.targetId),l.relatedTargetIds));assert(d.completeRawAndRelatedInputsRead&&d.reason.length>180&&d.locators.length>0);for(const a of d.existingTargetVersions){const t=inputs.find(t=>t.targetId===a.targetId);assert(a.rulebookId===t.book.id&&a.editionId===t.book.editionId&&a.inputRef==="related-db-inputs.jsonl:"+(inputs.indexOf(t)+1)&&a.fullEnglishAndMechanicsCompared);}for(const a of d.locators)assert(a.file===s.file&&a.line>s.startLine&&a.line<=s.endLine&&s.rawBody.split("\n")[a.line-s.startLine-1]===a.text&&a.text.includes(a.needle));if(d.intendedVersion){const t=inputs.find(t=>t.targetId===d.intendedVersion.targetId);assert(t&&l.relatedTargetIds.includes(t.targetId)&&t.book.id===55&&d.intendedVersion.rulebookId===t.book.id&&d.intendedVersion.editionId===t.book.editionId);}assert(d.sourcePublication.nativeRulebook===null&&same(d.sourcePublication.labels,s.sourceBookLabels)&&same(d.sourcePublication.mappedClaims,s.publicationRulebookIds));assert(!d.semanticQaPass&&!d.nativeAttached&&!d.activation&&!d.applied&&d.newAcceptedFields===0);const expected=l.relatedTargetIds.flatMap((id:number)=>{const a=sc.find(t=>t.targetId===id),b=b55.find(t=>t.targetId===id);return a?[{targetId:id,kind:"source-bound-SC",ref:"accepted-sc-references.jsonl:"+(sc.indexOf(a)+1),revision:a.revision,successor:a.successor?.revision??null,currentInputsAndFieldsMatch:true}]:b?[{targetId:id,kind:"historical-book55-fallback-only",ref:"prior-book55-references.jsonl:"+(b55.indexOf(b)+1),revision:b.revision,acceptedFields:0,laterSemanticQaRequired:true}]:[];});assert(same(d.priorFields,expected));}
const refs=json(owned+"/unactivated-references.json");assert(!refs.activation&&!refs.applied&&!refs.semanticAcceptance&&[refs.mapChanges,refs.aliasChanges,refs.newEntities].every(a=>a.length===0));
assert(same(refs.deferredKeys,ds.filter(d=>!d.intendedVersion).map(d=>d.sourceKey))&&same(refs.references,ds.filter(d=>d.intendedVersion).map(d=>({sourceKey:d.sourceKey,...d.intendedVersion,priorFields:d.priorFields,acceptedChineseFieldReuse:0}))));
const out=repoRoot()+"/data-tools/out/issue-573", audit:any={};
const records=(b:Buffer)=>{assert.equal(b[b.length-1],0);const a:Buffer[]=[];let last=0;for(let i=0;i<b.length;i++)if(b[i]===0){a.push(b.subarray(last,i+1));last=i+1;}return a;};
for(const [label,args] of [["index",["ls-files","--stage","-z"]],["status",["status","--porcelain=v1","-z","--untracked-files=all"]],["untracked",["ls-files","--others","--exclude-standard","-z"]]] as const){const filter=(b:Buffer,exclude:string[])=>records(b).filter(v=>{const s=v.toString("utf8");assert(label!=="status"||(!s.startsWith("R")&&!s.startsWith("C")));const path=label==="index"?s.slice(s.indexOf("\t")+1,-1):label==="status"?s.slice(3,-1):s.slice(0,-1);return !exclude.some(p=>path.startsWith(p+"/"));});const before=readFileSync(out+"/"+label+"-before.nul"),after=git(...args);assert(Buffer.concat(filter(before,[rel])).equals(Buffer.concat(filter(after,[rel]))),"nonowned NUL drift "+label);const original=readFileSync(repoRoot()+"/data-tools/out/issue-571/"+label+"-before.nul");assert(Buffer.concat(filter(original,[priorRel,rel])).equals(Buffer.concat(filter(after,[priorRel,rel]))),"original #571 NUL drift "+label);audit[label]=filter(before,[rel]).length;if(label==="status")assert.equal(records(before).filter(t=>t.toString("utf8").startsWith("D ")).length,39);}
assert.equal(audit.untracked,1441);rules.close();content.close();assert(same(stats(),m.readonly.databases));
const publicRoot=repoRoot()+"/data-tools/reports/dice-qa/ownership/issue-573",summary=json(owned+"/review-summary.json"),publicSummary=json(publicRoot+"/summary.json");assert(same(summary,publicSummary.results));if(process.argv[2])assert.equal(publicSummary.privateEvidenceRevision,process.argv[2]);
assert(same(readFileSync(publicRoot+"/dispositions.csv","utf8").trim().split(/\r?\n/).slice(1),ds.map(d=>[d.row,d.ordinal,d.startLine,d.endLine,d.status,d.reasonCode,d.intendedVersion?.targetId??"",d.intendedVersion?.rulebookId??"",false,0,false].join(","))));
const supported=new Set(ds.filter(d=>d.intendedVersion).map(d=>d.intendedVersion.targetId));
assert(same(readFileSync(publicRoot+"/book55-targets.csv","utf8").trim().split(/\r?\n/).slice(1),b55.map(d=>[d.targetId,55,supported.has(d.targetId),0,2,true,120,supported.has(d.targetId)?"":197].join(","))));
const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+"/"+f.name):statSync(p+"/"+f.name).size),0);
assert(bytes(owned)<3*1024*1024&&bytes(out)<3*1024*1024&&process.resourceUsage().maxRSS<512*1024&&performance.now()-started<60000);
console.log(JSON.stringify({status:"PASS",selected:38,supported:13,deferred:25,mixed:21,reprints:4,relatedTargets:107,peerOccurrences:63,scEnvelopes:38,scSuccessors:1,book55Fallbacks:38,parentUnseenCurrent:2139,parentUnseenAfterAcceptance:2101,nativeAttached:0,newAcceptedFields:0,queryOnly:[1,1],privateStatePreserved:true,audit,privateBytes:bytes(owned),temporaryBytes:bytes(out),seconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS}));
