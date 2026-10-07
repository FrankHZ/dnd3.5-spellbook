import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import { localDataDir, repoRoot } from "../../../../src/shared/env";
import { candidateRulebook, loadEnglishRecords, validateSourceCoverage } from "../../../../src/dice-intake/qa";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { reconcile } from "../../../../src/dice-intake/reconcile";

// Issue-owned read-only identity audit; no shared-output CLI or writer.
const started = performance.now(), root = localDataDir(), base = "dice-baselines/issue-520";
const rel = base + "/ownership/issue-579", owned = root + "/" + rel;
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
assert.equal(m.publicBase, "9195f12ac703d0089612808a05b94db68311a976");
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
const selected = candidates.filter(t => t.file === m.selection.file && candidateRulebook(t) === null);
assert.equal(selected.length, 52);
assert(same(selected.map(t => t.ordinal), Array.from({length:52}, (_,i) => i+1)));
assert(same(selected, rows(owned + '/occurrences.jsonl')) && same(selected.map(t=>t.sourceKey), m.selection.sourceKeys));
assert(selected.every(t=>t.targetId === null));
assert.equal(selected.reduce((n,t)=>n+t.rawHeader.length+t.rawBody.length,0),13005);
const gp=m.globalPartition, earlier=gp.priorEvidence.map((p:any)=>bound(p.path,p.revision).trim().split(/\r?\n/).map(JSON.parse));
assert(same(earlier.map((t:any[])=>t.length),[33,43,58,40,38]));
const covered=new Set([...earlier.flat(),...selected].map(t=>t.sourceKey)), inside=candidates.filter(t=>gp.bookScope.includes(candidateRulebook(t)));
assert.equal(covered.size,264);assert.equal(inside.length,3293);assert(!inside.some(t=>covered.has(t.sourceKey)));
assert.equal(candidates.filter(t=>!gp.bookScope.includes(candidateRulebook(t))&&!covered.has(t.sourceKey)).length,2049);
assert.equal(candidates.length,5606);assert.equal(english.size,5097);assert.equal(new Set(candidates.map(t=>t.sourceKey)).size,5606);
const otherBooks=JSON.parse(bound(gp.priorEvidence[0].manifestPath,gp.priorEvidence[0].revision)).byBook.map((b:any)=>b.rulebook.id);
assert.equal(targets.filter(t=>!gp.bookScope.includes(t.rulebookId)&&!otherBooks.includes(t.rulebookId)).length,995);
const boundary=json(owned+'/source-boundaries.json'),file=files.find(f=>f.parsed.file===m.selection.file)!;
assert.equal(boundary.bytes,file.bytes);assert.equal(boundary.lineCount,file.parsed.lineCount);
assert.equal(boundary.preamble,file.parsed.preamble);assert(same(boundary.unparsedSpans,file.parsed.unparsedSpans));
assert.equal(boundary.unparsedSpans.length,0); // Malformed title remains an intact parsed occurrence.
assert(same(boundary.selected,selected.map(t=>({sourceKey:t.sourceKey,ordinal:t.ordinal,startLine:t.startLine,endLine:t.endLine,suspectedBoundaryLines:t.suspectedBoundaryLines}))));
const inputs=rows(owned+'/related-db-inputs.jsonl'),lookups=rows(owned+'/identity-lookups.jsonl'),canon=(s:string)=>s?.toLowerCase().replace(/[^a-z]/g,'')??'';
assert.equal(inputs.length,21);assert.equal(inputs.reduce((n,t)=>n+t.english.description.length,0),28765);
assert(same(m.publications.books,books.filter(b=>inputs.some(t=>t.book.id===b.id))));
assert(same(m.publications.editions,(rules.prepare('SELECT * FROM dnd_dndedition').all() as any[]).filter(e=>inputs.some(t=>t.book.editionId===e.id))));
for(const d of inputs){assert(same(d.english,english.get(d.targetId))&&same(d.book,books.find(b=>b.id===d.book.id))&&same(d.chinese,zh.filter(t=>t.spellId===d.targetId)));const h:any=rules.prepare('SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?').get(d.targetId);assert.equal(d.englishHtml,h.html?.toString('utf8')??null);}
const alternativeRows=[8,10,24,38,42,43,48,49,50];
for(const [i,l] of lookups.entries()){
 const s=selected[i],names=[s.enName,...l.alternativeNames].filter(Boolean),exact=[...english].filter(([id,e])=>names.some(n=>canon(n)===canon(e.name))).map(([id])=>id),z=[...new Set(zh.filter(t=>t.name===s.zhName).map(t=>t.spellId))];
 assert.equal(l.row,i+1);assert.equal(l.sourceKey,s.sourceKey);assert(same(l.searchNames,names)&&(l.alternativeNames.length>0)===alternativeRows.includes(s.ordinal)&&same(l.exactNameTargetIds,exact)&&same(l.chineseNameTargetIds,z));
 assert(same(l.relatedTargetIds,[...new Set([...s.nameHintTargetIds,...s.aliasHintTargetIds,...exact,...z])]));
 if(s.ordinal===48){const recovered=[...s.rawHeader.matchAll(/[（(]([A-Za-z][A-Za-z ]+)[）)]/g)].map(t=>t[1]);assert(same(recovered,[l.recoveredEnglishName])&&l.alternativeNames.includes(l.recoveredEnglishName)&&s.problems.includes('malformed-header'));}else assert.equal(l.recoveredEnglishName,null);
 // Retain the original 17 measured contexts, explicitly rejecting null-name equality.
 assert(same(l.peerSourceKeys,candidates.filter(t=>t.sourceKey!==s.sourceKey&&canon(t.enName)===canon(s.enName)).map(t=>t.sourceKey)));
 assert(same(l.falseNullPeerSourceKeys,s.enName===null?l.peerSourceKeys:[]));
}
assert(same([...new Set(lookups.flatMap(l=>l.relatedTargetIds))],inputs.map(t=>t.targetId)));
const peers=rows(owned+'/duplicate-peers.jsonl'),comparisons=rows(owned+'/duplicate-comparison.jsonl');assert.equal(peers.length,17);assert.equal(comparisons.length,17);
assert(same(peers,candidates.filter(t=>lookups.some(l=>l.peerSourceKeys.includes(t.sourceKey)))));
assert(same(comparisons.map(t=>[t.row,t.peerSourceKey]),lookups.flatMap(l=>l.peerSourceKeys.map((k:string)=>[l.row,k]))));
assert.equal(comparisons.filter(t=>t.kind==='false-null-name-collision').length,5);assert(comparisons.every(t=>t.fullRawRead&&t.peerDispositionUnchanged&&!t.sameIdentity));
const sc=rows(owned+'/accepted-sc-references.jsonl');assert(same(sc.map(t=>t.targetId),[4438,3909]));
const si=JSON.parse(bound(sc[0].inputPath,sc[0].revision)).inputs,sf=bound(sc[0].fieldPath,sc[0].revision).trim().split(/\r?\n/).map(JSON.parse);
for(const ref of sc){const d=inputs.find(t=>t.targetId===ref.targetId),z=d.chinese.find((t:any)=>t.variant==='effective'),old=si.find((t:any)=>t.targetId===ref.targetId);assert(same(old.english,d.english)&&old.englishHtml===d.englishHtml&&same(ref.englishInput,old.english));assert(same(ref.fields,sf.filter((t:any)=>t.targetId===ref.targetId)));assert.equal(ref.fields.find((t:any)=>t.field==='name').text,z.name);assert.equal(ref.fields.find((t:any)=>t.field==='body').text,z.descriptionText);assert.equal(ref.fields.find((t:any)=>t.field==='body').html,z.descriptionHtml);assert(Object.values(ref.matches).every(Boolean));}
const ds=rows(owned+'/dispositions.jsonl'),missing=rows(owned+'/missing-entity-candidates.jsonl'),versions=[11,15,21,24,36,49,50],homonyms=[4,20,30,32];
assert.equal(ds.length,52);assert.equal(ds.filter(d=>d.status==='excluded').length,44);assert.equal(ds.filter(d=>d.status==='deferred').length,8);
for(const [i,d] of ds.entries()){
 const s=selected[i],l=lookups[i],code=versions.includes(s.ordinal)?'referenced-version-unproven':s.ordinal===48?'parser-title-and-entity-gap':homonyms.includes(s.ordinal)?'homonym-mechanic-mismatch':'no-supported-existing-entity';
 assert.equal(d.row,i+1);assert.equal(d.sourceKey,s.sourceKey);assert.equal(d.ordinal,s.ordinal);assert.equal(d.startLine,s.startLine);assert.equal(d.endLine,s.endLine);assert.equal(d.reasonCode,code);assert(same(d.relatedTargetIds,l.relatedTargetIds));
 assert.equal(d.status,versions.includes(s.ordinal)||s.ordinal===48?'deferred':'excluded');assert.equal(d.missingEntityCandidate,!versions.includes(s.ordinal));assert(d.completeRawAndRelatedInputsRead&&d.reason.length>100&&d.intendedVersion===null&&d.newAcceptedFields===0&&!d.semanticQaPass&&!d.nativeAttached&&!d.applied&&!d.activation);
 assert(same(d.sourcePublication.labels,s.sourceBookLabels)&&same(d.sourcePublication.mappedClaims,s.publicationRulebookIds)&&d.sourcePublication.nativeRulebook===null&&!d.sourcePublication.exactPublicationAuthenticated&&!d.sourcePublication.editionAuthenticated);
 for(const a of d.locators){const offset=a.line-s.startLine;assert(a.file===s.file&&a.line<=s.endLine&&a.text===(offset===0?s.rawHeader:s.rawBody.split('\n')[offset-1]));}
}
assert.equal(missing.length,45);assert(same(missing.map(t=>t.sourceKey),ds.filter(d=>d.missingEntityCandidate).map(d=>d.sourceKey)));
for(const n of missing){const d=ds[n.ordinal-1],l=lookups[n.ordinal-1];assert(n.confidence===d.absenceConfidence&&same(n.checkedSearchNames,l.searchNames)&&same(n.relatedTargetIdsRejected,l.relatedTargetIds)&&!n.newEntityCreated&&n.limits===d.absenceLimit);}
const refs=json(owned+'/unactivated-references.json');assert(!refs.activation&&!refs.applied&&!refs.semanticAcceptance&&[refs.references,refs.mapChanges,refs.aliasChanges,refs.newEntities].every(a=>a.length===0));assert(same(refs.deferredKeys,ds.filter(d=>d.status==='deferred').map(d=>d.sourceKey))&&same(refs.excludedKeys,ds.filter(d=>d.status==='excluded').map(d=>d.sourceKey)));
const out=repoRoot()+'/data-tools/out/issue-579',audit:any={};
const records=(b:Buffer)=>{assert.equal(b[b.length-1],0);const a:Buffer[]=[];let last=0;for(let i=0;i<b.length;i++)if(b[i]===0){a.push(b.subarray(last,i+1));last=i+1;}return a;};
for(const [label,args] of [['index',['ls-files','--stage','-z']],['status',['status','--porcelain=v1','-z','--untracked-files=all']],['untracked',['ls-files','--others','--exclude-standard','-z']]] as const){const filter=(b:Buffer)=>records(b).filter(v=>{const s=v.toString('utf8');assert(label!=='status'||(!s.startsWith('R')&&!s.startsWith('C')));const p=label==='index'?s.slice(s.indexOf('\t')+1,-1):label==='status'?s.slice(3,-1):s.slice(0,-1);return !p.startsWith(rel+'/');});const before=readFileSync(out+'/'+label+'-before.nul'),after=git(...args);assert(Buffer.concat(filter(before)).equals(Buffer.concat(filter(after))),'nonowned raw NUL drift '+label);audit[label]=filter(before).length;if(label==='status')assert.equal(records(before).filter(t=>t.toString('utf8').startsWith('D ')).length,39);}
assert.equal(audit.untracked,1441);
const protection=json(owned+'/private-state-protection.json');for(const f of protection.priorAuditFiles){assert.equal(statSync(repoRoot()+'/'+f.path).size,f.size);assert.equal(statSync(repoRoot()+'/'+f.path).mtimeMs,f.mtimeMs);}
rules.close();content.close();assert(same(stats(),m.readonly.databases));
const publicRoot=repoRoot()+'/data-tools/reports/dice-qa/ownership/issue-579',summary=json(owned+'/review-summary.json'),publicSummary=json(publicRoot+'/summary.json');assert(same(summary,publicSummary.results));if(process.argv[2])assert.equal(publicSummary.privateEvidenceRevision,process.argv[2]);
assert(same(readFileSync(publicRoot+'/dispositions.csv','utf8').trim().split(/\r?\n/).slice(1),ds.map(d=>[d.row,d.ordinal,d.startLine,d.endLine,d.status,d.reasonCode,d.relatedTargetIds.join('|'),d.missingEntityCandidate,false,0,false].join(','))));
const inspection=rows(owned+'/html-inspection.jsonl');for(const h of inspection){const d=inputs.find(t=>t.targetId===h.targetId),$=cheerio.load(d.englishHtml??'');assert.equal(h.tableCount,$('table').length);assert.equal(h.imageCount,$('img').length);assert.equal(h.tableRows,$('tr').length);assert.equal(h.text,$('body').text());}assert.equal(inspection.length,21);
const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+'/'+f.name):statSync(p+'/'+f.name).size),0);
assert(bytes(owned)<3*1024*1024&&bytes(out)<3*1024*1024&&process.resourceUsage().maxRSS<512*1024&&performance.now()-started<60000);
console.log(JSON.stringify({status:'PASS',selected:52,excluded:44,reviewedDeferrals:8,missingEntityCandidates:45,relatedTargets:21,peerContexts:17,falseNullPeers:5,scAcceptedEnvelopes:2,parentUnseenCurrent:2101,parentUnseenAfterAcceptance:2049,nativeAttached:0,newAcceptedFields:0,queryOnly:[1,1],privateStatePreserved:true,audit,privateBytes:bytes(owned),temporaryBytes:bytes(out),seconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS}));
