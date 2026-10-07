import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, lstatSync } from "node:fs";
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
const rel = base + "/ownership/issue-583", owned = root + "/" + rel;
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) => readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { maxBuffer: 40 * 1024 * 1024 });
const norm = (s: string) => s.replace(/\r\n/g, "\n");
const bound = (p: string, rev: string) => {
  const s = readFileSync(root + "/" + p, "utf8");
  assert.equal(norm(s), norm(git("show", rev + ":" + p).toString("utf8")), "committed drift: " + p);
  return s;
};
const m = json(owned + "/input-manifest.json");
assert.equal(m.publicBase, "75b607e0a3a8ecef63e323f4a97b1b4dcd55bb1b");
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
const selected = Object.entries(m.selection.cohorts as Record<string,number[]>).flatMap(([file,ordinals])=>candidates.filter(t=>t.file===file&&ordinals.includes(t.ordinal)));
assert.equal(Object.keys(m.selection.cohorts).length,1);assert.equal(selected.length,36);
assert(same(Object.values(m.selection.cohorts),[Array.from({length:36},(_,i)=>i+1)]));
assert.equal(Object.keys(m.selection.cohorts)[0],'魔兽争霸RPG.txt');
assert(same(selected,rows(owned+'/occurrences.jsonl'))&&same(selected.map(t=>t.sourceKey),m.selection.sourceKeys));
assert(selected.every(t=>t.targetId===null&&candidateRulebook(t)===null));
assert.equal(selected.reduce((n,t)=>n+t.rawHeader.length+t.rawBody.length,0),12312);
const gp=m.globalPartition, earlier=gp.priorEvidence.map((p:any)=>bound(p.path,p.revision).trim().split(/\r?\n/).map(JSON.parse));
assert(same(earlier.map((t:any[])=>t.length),[33,43,58,40,38,52,42]));
const covered=new Set([...earlier.flat(),...selected].map(t=>t.sourceKey)), inside=candidates.filter(t=>gp.bookScope.includes(candidateRulebook(t)));
assert.equal(covered.size,342);assert.equal(inside.length,3293);assert(!inside.some(t=>covered.has(t.sourceKey)));
assert.equal(candidates.filter(t=>!gp.bookScope.includes(candidateRulebook(t))&&!covered.has(t.sourceKey)).length,1971);
assert.equal(candidates.length,5606);assert.equal(english.size,5097);assert.equal(new Set(candidates.map(t=>t.sourceKey)).size,5606);
const otherBooks=JSON.parse(bound(gp.priorEvidence[0].manifestPath,gp.priorEvidence[0].revision)).byBook.map((b:any)=>b.rulebook.id);
assert.equal(targets.filter(t=>!gp.bookScope.includes(t.rulebookId)&&!otherBooks.includes(t.rulebookId)).length,995);
const boundaries=json(owned+'/source-boundaries.json');assert.equal(boundaries.length,1);
for(const boundary of boundaries){const f=files.find(f=>f.parsed.file===boundary.file)!;
 assert.equal(boundary.bytes,f.bytes);assert.equal(boundary.lineCount,f.parsed.lineCount);
 assert.equal(boundary.preamble,f.parsed.preamble);assert(same(boundary.unparsedSpans,f.parsed.unparsedSpans));
 assert(same(boundary.selected,selected.filter(t=>t.file===boundary.file).map(t=>({sourceKey:t.sourceKey,ordinal:t.ordinal,startLine:t.startLine,endLine:t.endLine,suspectedBoundaryLines:t.suspectedBoundaryLines}))));
}
const inputs=rows(owned+'/related-db-inputs.jsonl'),lookups=rows(owned+'/identity-lookups.jsonl'),canon=(s:string)=>s?.toLowerCase().replace(/[^a-z]/g,'')??'';
assert.equal(inputs.length,40);assert.equal(inputs.reduce((n,t)=>n+t.english.description.length,0),33553);
assert.equal(new Set(inputs.map(d=>d.book.id)).size,11);
assert(same(m.publications.books,books.filter(b=>inputs.some(t=>t.book.id===b.id))));
assert(same(m.publications.editions,(rules.prepare('SELECT * FROM dnd_dndedition').all() as any[]).filter(e=>inputs.some(t=>t.book.editionId===e.id))));
for(const d of inputs){assert(same(d.english,english.get(d.targetId))&&same(d.book,books.find(b=>b.id===d.book.id))&&same(d.chinese,zh.filter(t=>t.spellId===d.targetId)));const h:any=rules.prepare('SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?').get(d.targetId);assert.equal(d.englishHtml,h.html?.toString('utf8')??null);}
// These IDs encode only the manually inspected concrete lexical/body leads.
const extraIds:Record<number,number[]>={1:[2305,2809],3:[2624],4:[1741],5:[4087],7:[2873,2755],8:[2748],9:[2750],10:[2745],12:[2807,2854],13:[2831],14:[2831],15:[1311,2405],16:[2612],19:[2610],22:[1205],23:[2624],24:[665,667],26:[720,1444],27:[2475],34:[572],35:[660],36:[2823]};
const aliasMap=JSON.parse(bound('chm-mapping/enName-aliases-global.json',m.sourceRevision));
for(const [i,l] of lookups.entries()){
 const s=selected[i],aliasNames=Object.entries(aliasMap).filter(([from])=>canon(from)&&canon(from)===canon(s.enName)).map(([,to])=>to),leadNames=(extraIds[i+1]??[]).map(id=>english.get(id)!.name),names=[...new Set([s.enName,...aliasNames,...leadNames].filter(n=>canon(n)))];
 assert.equal(l.row,i+1);assert.equal(l.sourceKey,s.sourceKey);assert(same(l.searchNames,names)&&same(l.concreteLeadNames,leadNames)&&same(l.globalAliasNames,aliasNames));
 const chineseIds=[...new Set(zh.filter(t=>s.zhName&&t.name===s.zhName).map(t=>t.spellId))];assert(same(l.exactChineseTargetIds,chineseIds));
 const ids=[...new Set([...s.nameHintTargetIds,...s.aliasHintTargetIds,...chineseIds,...[...english].filter(([,e])=>names.some(n=>canon(n)&&canon(n)===canon(e.name))).map(([id])=>id)])];
 assert(same(l.relatedTargetIds,ids));assert(same(l.peerSourceKeys,candidates.filter(t=>t.sourceKey!==s.sourceKey&&names.some(n=>canon(n)&&canon(n)===canon(t.enName))).map(t=>t.sourceKey)));
}
const signatures=rows(owned+'/body-signature-lookups.jsonl');assert(same(signatures.map(t=>t.row),[5,6,7,12,17,18,20,21,25,28,29,31,32,33,36]));
for(const q of signatures){assert(q.terms.length>=2&&q.terms.every((t:string)=>t.length>0));const hits=[...english].filter(([,e])=>q.terms.every((t:string)=>new RegExp('\\b'+t+'\\b','i').test(e.description))).map(([targetId,e])=>({targetId,name:e.name}));assert(same(q.hits,hits));assert(q.hits.every((t:any)=>lookups[q.row-1].relatedTargetIds.includes(t.targetId)));}

assert(same([...new Set(lookups.flatMap(l=>l.relatedTargetIds))],inputs.map(t=>t.targetId)));
const selectedKeys=new Set(selected.map(t=>t.sourceKey)),peers=rows(owned+'/duplicate-peers.jsonl'),comparisons=rows(owned+'/duplicate-comparison.jsonl');
assert.equal(peers.length,47);assert.equal(peers.reduce((n,t)=>n+t.rawHeader.length+t.rawBody.length,0),17839);
assert(same(peers,candidates.filter(t=>!selectedKeys.has(t.sourceKey)&&lookups.some(l=>l.peerSourceKeys.includes(t.sourceKey)))));
assert(same(comparisons.map(t=>[t.row,t.peerSourceKey]),lookups.flatMap(l=>l.peerSourceKeys.map((k:string)=>[l.row,k]))));
assert.equal(comparisons.filter(d=>d.withinSelection).length,1);
for(const d of comparisons){const a=selected[d.row-1],b=[...peers,...selected].find(t=>t.sourceKey===d.peerSourceKey)!;assert(b&&a.sourceKey===d.sourceKey&&d.rawBodyEqual===(a.rawBody===b.rawBody)&&d.bodyTextEqual===(a.bodyText===b.bodyText));assert.equal(d.withinSelection,selectedKeys.has(b.sourceKey));const prior=[...selected,...peers.slice(0,peers.indexOf(b))].find(t=>t.rawBody===b.rawBody);assert.equal(d.exactPeerBodyReuseSourceKey,prior?.sourceKey??null);assert(d.completeRawHeaderRead&&d.fullDifferingBodyRead&&d.peerDispositionUnchanged&&d.comparison.trim().length>0);}

const sc=rows(owned+'/accepted-sc-references.jsonl');assert.equal(sc.length,9);
assert(same(sc.map(t=>t.targetId),inputs.filter(t=>t.book.id===86).map(t=>t.targetId)));
const si=JSON.parse(bound(sc[0].inputPath,sc[0].revision)).inputs,sf=bound(sc[0].fieldPath,sc[0].revision).trim().split(/\r?\n/).map(JSON.parse);
for(const ref of sc){assert.equal(ref.revision,'0688739d92a2aa9fb3eceeb444daa7260e711058');const d=inputs.find(t=>t.targetId===ref.targetId),z=d.chinese.find((t:any)=>t.variant==='effective'),old=si.find((t:any)=>t.targetId===ref.targetId);assert(same(old.english,d.english)&&old.englishHtml===d.englishHtml&&same(ref.englishInput,old.english));assert(same(ref.fields,sf.filter((t:any)=>t.targetId===ref.targetId)));assert.equal(ref.fields.find((t:any)=>t.field==='name').text,z.name);assert.equal(ref.fields.find((t:any)=>t.field==='body').text,z.descriptionText);assert.equal(ref.fields.find((t:any)=>t.field==='body').html,z.descriptionHtml);assert(Object.values(ref.matches).every(Boolean)&&!ref.successor);}
const inherited=rows(owned+'/inherited-input-bindings.jsonl'),cache=new Map<string,any[]>();assert.equal(inherited.length,5);assert(same(inherited.map(t=>t.issue).sort(),[573,573,573,579,579]));
for(const ref of inherited){if(!cache.has(ref.path))cache.set(ref.path,bound(ref.path,ref.revision).trim().split(/\r?\n/).map(JSON.parse));const a=cache.get(ref.path)!.find(t=>t.targetId===ref.targetId),b=inputs.find(t=>t.targetId===ref.targetId);assert(same(a.english,b.english)&&a.englishHtml===b.englishHtml);const ordered=(v:any[])=>[...v].sort((a,b)=>a.variant.localeCompare(b.variant));assert(same(ordered(a.chinese),ordered(b.chinese))&&ref.englishAndHtmlMatch&&ref.chineseBaselineMatches&&!ref.newOccurrenceAcceptanceInherited&&!ref.semanticProposalAccepted);}
const ds=rows(owned+'/dispositions.jsonl'),homonyms=[2,3,11,30];
assert.equal(ds.length,36);assert(ds.every(d=>d.intendedVersion===null));
assert.equal(ds.filter(d=>d.reasonCode==='homonym-no-counterpart').length,4);
assert.equal(ds.filter(d=>d.reasonCode==='distinct-mechanics-no-counterpart').length,21);
assert.equal(ds.filter(d=>d.reasonCode==='no-current-identity-lead').length,11);
for(const [i,d] of ds.entries()){
 const s=selected[i],l=lookups[i];assert.equal(d.row,i+1);for(const k of ['sourceKey','file','ordinal','startLine','endLine'])assert.equal(d[k],s[k]);
 assert.equal(d.status,'bounded-current-inventory-missing');assert.equal(d.reasonCode,homonyms.includes(i+1)?'homonym-no-counterpart':l.relatedTargetIds.length?'distinct-mechanics-no-counterpart':'no-current-identity-lead');
 assert(same(d.existingTargetVersions.map((t:any)=>t.targetId),l.relatedTargetIds));for(const v of d.existingTargetVersions){const t=inputs.find(t=>t.targetId===v.targetId);assert(v.rulebookId===t.book.id&&v.editionId===t.book.editionId&&v.inputRef==='related-db-inputs.jsonl:'+(inputs.indexOf(t)+1)&&v.fullEnglishAndMechanicsCompared&&v.fullEnglishHtmlCompared&&!v.sameWholeEnvelope);}
 assert(d.completeRawAndRelatedInputsRead&&d.reason.length>250&&d.locators.length>=2&&!d.semanticQaPass&&!d.nativeAttached&&!d.activation&&!d.applied&&d.newAcceptedFields===0);
 assert(same(d.sourcePublication.labels,s.sourceBookLabels)&&same(d.sourcePublication.mappedClaims,s.publicationRulebookIds)&&d.sourcePublication.nativeRulebook===null&&!d.sourcePublication.exactPublicationAuthenticated);
 assert(d.lookupCoverage.existingTargets===5097&&d.lookupCoverage.frozenCandidates===5606&&d.lookupCoverage.limitations.length>180&&same(d.lookupCoverage.searchNames,l.searchNames));
 assert(same(d.parentSourceKeys,[9,10].includes(i+1)?[selected[7].sourceKey]:i+1===14?[selected[12].sourceKey]:[]));
 for(const a of d.locators){assert(a.file===s.file&&a.line>s.startLine&&a.line<=s.endLine&&a.text===s.rawBody.split('\n')[a.line-s.startLine-1]&&a.text.includes(a.needle));}
}
const refs=json(owned+'/unactivated-references.json');assert(!refs.activation&&!refs.applied&&!refs.semanticAcceptance&&[refs.mapChanges,refs.aliasChanges,refs.newEntities,refs.references,refs.deferredKeys].every(a=>a.length===0)&&same(refs.boundedMissingKeys,selected.map(t=>t.sourceKey)));
const gaps=rows(owned+'/input-gaps.jsonl');assert(same(gaps.map(t=>t.row??t.targetId),[23,7,31,33,1311]));assert.equal(selected[22].sourceBookLabels.length,0);
const out=repoRoot()+'/data-tools/out/issue-583',audit:any={};
const records=(b:Buffer)=>{assert.equal(b[b.length-1],0);const a:Buffer[]=[];let last=0;for(let i=0;i<b.length;i++)if(b[i]===0){a.push(b.subarray(last,i+1));last=i+1;}return a;};
for(const [label,args] of [['index',['ls-files','--stage','-z']],['status',['status','--porcelain=v1','-z','--untracked-files=all']],['untracked',['ls-files','--others','--exclude-standard','-z']]] as const){const filter=(b:Buffer)=>records(b).filter(v=>{const s=v.toString('utf8');assert(label!=='status'||(!s.startsWith('R')&&!s.startsWith('C')));const p=label==='index'?s.slice(s.indexOf('\t')+1,-1):label==='status'?s.slice(3,-1):s.slice(0,-1);return !p.startsWith(rel+'/');});const before=readFileSync(out+'/'+label+'-before.nul'),after=git(...args);const retainedAfter=readFileSync(out+'/'+label+'-after.nul');assert(Buffer.concat(filter(before)).equals(Buffer.concat(filter(retainedAfter))),'retained nonowned raw NUL drift '+label);assert(Buffer.concat(filter(before)).equals(Buffer.concat(filter(after))),'nonowned raw NUL drift '+label);audit[label]=filter(before).length;if(label==='status')assert.equal(records(before).filter(t=>t.toString('utf8').startsWith('D ')).length,39);}
assert.equal(audit.untracked,1441);
const protection=json(owned+'/private-state-protection.json');assert(protection.priorAuditBytesEqual&&protection.priorAuditFiles.length===21);for(const f of protection.priorAuditFiles){assert.equal(statSync(repoRoot()+'/'+f.path).size,f.size);assert.equal(statSync(repoRoot()+'/'+f.path,{bigint:true}).mtimeNs.toString(),f.mtimeNs);assert.equal(statSync(repoRoot()+'/'+f.path).mtimeMs,f.mtimeMs);}
assert(readFileSync(repoRoot()+'/.env').equals(readFileSync(repoRoot()+'/data-tools/out/issue-577/env-before.bin')));
const runtime=lstatSync(repoRoot()+'/node_modules');assert(same({size:runtime.size,mtimeMs:runtime.mtimeMs,isLink:runtime.isSymbolicLink()},json(repoRoot()+'/data-tools/out/issue-577/runtime-before.json')));
rules.close();content.close();assert(same(stats(),m.readonly.databases));
const publicRoot=repoRoot()+'/data-tools/reports/dice-qa/ownership/issue-583',summary=json(owned+'/review-summary.json'),publicSummary=json(publicRoot+'/summary.json');assert(same(summary,publicSummary.results));if(process.argv[2])assert.equal(publicSummary.privateEvidenceRevision,process.argv[2]);
assert(same(readFileSync(publicRoot+'/dispositions.csv','utf8').trim().split(/\r?\n/).slice(1),ds.map(d=>[d.row,d.ordinal,d.startLine,d.endLine,d.status,d.reasonCode,d.intendedVersion?.targetId??'',d.intendedVersion?.rulebookId??'',false,0,false].join(','))));
const inspection=rows(owned+'/html-inspection.jsonl');for(const h of inspection){const d=inputs.find(t=>t.targetId===h.targetId),$=cheerio.load(d.englishHtml??'');assert.equal(h.tableCount,$('table').length);assert.equal(h.imageCount,$('img').length);assert.equal(h.imageCount,0);assert.equal(h.tableCount,0);assert.equal(h.tableRows,$('tr').length);assert.equal(h.text,$('body').text());}assert.equal(inspection.length,40);
const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+'/'+f.name):statSync(p+'/'+f.name).size),0);
assert(bytes(owned)<3*1024*1024&&bytes(out)<3*1024*1024&&process.resourceUsage().maxRSS<512*1024&&performance.now()-started<60000);
console.log(JSON.stringify({status:'PASS',selected:36,boundedMissing:36,dbHomonyms:4,supported:0,reviewedDeferrals:0,relatedTargets:40,outsidePeers:47,scAcceptedEnvelopes:9,parentUnseenCurrent:2007,parentUnseenAfterAcceptance:1971,nativeAttached:0,newAcceptedFields:0,queryOnly:[1,1],privateStatePreserved:true,audit,privateBytes:bytes(owned),temporaryBytes:bytes(out),seconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS}));
