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

// Issue-owned unactivated replay, following #567/#569. No writer or accepted-QA CLI.
const started = performance.now(), root = localDataDir();
const base = "dice-baselines/issue-520", rel = base + "/ownership/issue-575", owned = root + "/" + rel;
const out = repoRoot() + "/data-tools/out/issue-575";
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
const ids = [535,450,483,451,521,456,437,542,439,499,500,501,546,458,462,464,466,468,472,488,447,476,529,567,530,572,490,573];
assert(same(m.expectedTargetIds, ids));
assert.equal(m.publicBase, "cf42f8f7c0629b497cea989a358008fc1a6fcff6");
assert.equal(m.sourceRevision, "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5");
assert.equal(m.preparedRevision, "6d28f9391273979a35a6bcc86971f0aac5b9f2c8");
assert(same(m.dependencies, [
  { issue:571, revision:"8dca5f2eeec8d794adcea65a0a961623156dc000" },
  { issue:573, revision:"fa533db19ded560b2cfbb9096a4f317836531e99" },
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
  return { ...d, references:json(p + "/unactivated-references.json").references,
    occurrences:rows(p + "/occurrences.jsonl"), inputs:rows(p + "/related-db-inputs.jsonl"), fallbacks:rows(p + "/prior-book55-references.jsonl") };
});
const expectedReferences = dependencies.flatMap((d: any) => d.references.filter((r: any) => r.rulebookId === 55)
  .map((r: any) => ({ ...r, dependency:{issue:d.issue,revision:d.revision} })));
assert(same(expectedReferences, json(owned + "/identity-dependencies.json")));
assert(same(expectedReferences.map((r: any) => r.targetId), ids));
const cs = rows(owned + "/selected-occurrences.jsonl"), inputs = rows(owned + "/current-target-inputs.jsonl");
assert(same(cs, expectedReferences.map((r: any) => dependencies.flatMap((d: any) => d.occurrences).find((c: any) => c.sourceKey === r.sourceKey))));
assert(cs.length === 28 && new Set(cs.map(c => c.sourceKey)).size === 28);
assert(same(cs.map(c => c.sourceKey), m.selectedKeys));
assert.equal(cs.reduce((n,c) => n+c.rawHeader.length+c.rawBody.length, 0), 9672);
assert.equal(inputs.reduce((n,t) => n+t.english.description.length, 0), 20056);
assert(m.rawCharacters === 9672 && m.englishBodyCharacters === 20056);
assert(same(inputs.map(t => t.targetId), ids));
const stats = () => m.operatorStats.map((d: any) => ({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));
assert(same(stats(), m.operatorStats));
const rules = new Database(m.operatorStats[0].path, {readonly:true,fileMustExist:true});
const content = new Database(m.operatorStats[1].path, {readonly:true,fileMustExist:true});
for (const db of [rules,content]) { db.pragma("query_only=ON"); assert.equal(db.pragma("query_only", {simple:true}), 1); }
const english = loadEnglishRecords(rules);
const parents = rows(owned + "/inherited-inputs.jsonl");
assert(same(parents.map(t => t.targetId), [463,511,2357,2610]));
assert.equal(parents.reduce((n,t) => n+t.english.description.length, 0), m.parentEnglishBodyCharacters);
for (const t of [...inputs,...parents]) {
  assert(same(t.english, english.get(t.targetId)), "current English/mechanics drift");
  const h: any = rules.prepare("SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?").get(t.targetId);
  assert.equal(t.englishHtml, h.html?.toString("utf8") ?? null);
  const $ = cheerio.load(t.englishHtml ?? "");
  const textNorm = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  assert($("table").length === 0 && $("img").length === 0);
  assert.equal(textNorm($("body").text()), textNorm(t.english.description), "HTML contains unreviewed content");
  if (t.chinese) {
    assert(t.english.rulebookId === 55 && t.english.editionId === 5);
    assert(same(t.chinese, content.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' AND spellId=? ORDER BY variant").all(t.targetId)));
    const prior = dependencies.flatMap((d: any) => d.inputs).find((p: any) => p.targetId === t.targetId);
    assert(same(t.english, prior.english) && t.englishHtml === prior.englishHtml);
  } else assert(t.english.rulebookId === ([2357,2610].includes(t.targetId) ? 6 : 55));
}
const books: any[] = rules.prepare("SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook").all();
const zh = new Map((content.prepare("SELECT spellId,name,descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'").all() as any[]).map(t => [t.spellId,t]));
const targets = [...english].map(([id,e]) => ({id,rulebookId:e.rulebookId,enName:e.name,zhName:zh.get(id)?.name??null,zhBody:zh.get(id)?.descriptionText??null}));
const files = readdirSync(root + "/spells-dice-db-by-mo").filter(f => f.endsWith(".txt")).sort().map(f => {
  const bytes = bound("spells-dice-db-by-mo/" + f, m.sourceRevision);
  return {bytes:bytes.length,parsed:parseDiceFile(f,bytes)};
});
const candidates = rows(root + "/" + base + "/intake/candidates.jsonl");
validateSourceCoverage(files,rows(root + "/" + base + "/intake/source-inventory.jsonl"),candidates);
const replay = reconcile(files.flatMap(f => f.parsed.records),json(root + "/dice-intake/publication-map.json"),books,targets,m.sourceRevision,json(root + "/chm-mapping/enName-aliases-global.json"));
assert(same(replay.candidates,candidates));
assert(same(replay.targetDispositions,rows(root + "/" + base + "/intake/target-inventory.jsonl")));
assert(candidates.length === 5606 && english.size === 5097);
for (const c of cs) { assert(same(c,candidates.find(t => t.sourceKey === c.sourceKey))); assert.equal(c.targetId,null); }

const proposals = rows(owned + "/proposals.jsonl"), ds = rows(owned + "/dispositions.jsonl"), residuals = rows(owned + "/residuals.jsonl"), fallbacks = rows(owned + "/prior-fallback.jsonl");
assert(same(proposals.map(p => p.targetId),ids) && same(ds.map(d => d.targetId),ids));
assert(same(fallbacks,ids.map(id => dependencies.flatMap((d: any) => d.fallbacks).find((f: any) => f.targetId === id))));
const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
for (const [i,p] of proposals.entries()) {
  const t = inputs[i], c = cs[i], b = p.fields.body, n = p.fields.name, d = ds[i];
  assert(p.rulebookId === 55 && p.editionId === 5 && p.sourceKey === c.sourceKey);
  assert(same(p.rawSpan,{file:c.file,ordinal:c.ordinal,startLine:c.startLine,endLine:c.endLine}));
  assert(same(p.identityDependency,expectedReferences[i].dependency));
  assert(same(p.input,{english:t.english,englishHtml:t.englishHtml,chinese:t.chinese}));
  assert(same(p.priorFallback,fallbacks[i]) && p.priorFallback.accepted === null && p.priorFallback.fallback.length === 2);
  assert(same(p.mechanicsReview.native,t.english.mechanics) && p.mechanicsReview.nativeFieldsUnchanged);
  assert.equal(n.proposedText,c.zhName);
  const current = t.chinese.find((z: any) => z.variant === "chm");
  assert.equal(n.outcome,!current ? "translate-missing" : current.name !== n.proposedText ? "correct" : "retain");
  assert.equal(b.outcome,current ? "correct-or-clarify" : "translate-missing");
  assert.equal(b.englishDescriptionCompared,t.english.description);
  assert.equal(b.englishHtmlCompared,t.englishHtml);
  assert(b.fullRawAndCurrentEnglishRead && b.fullMechanicsRead && b.reason.length > 60 && n.reason.length > 20);
  const paras = [...b.headerParagraphs,...b.bodyParagraphs];
  assert(paras.every(s => typeof s === "string" && s.length > 0));
  assert.equal(b.proposedDescriptionText,paras.join("\n\n"));
  assert.equal(b.proposedDescriptionHtml,paras.map(s => "<p>"+esc(s)+"</p>").join(""));
  assert(same(b.residualCodes,residuals.filter(r => r.targetId === p.targetId).map(r => r.code)));
  assert.equal(b.status,b.residualCodes.length ? "reviewed-proposal-with-residual" : "reviewed-proposal");
  assert(same(d,{row:i+1,targetId:p.targetId,sourceKey:p.sourceKey,nameOutcome:n.outcome,bodyOutcome:b.outcome,bodyStatus:b.status,reasonCode:b.reasonCode,parentTargetIds:b.parentTargetIds,residualCodes:b.residualCodes,completeRawAndDbEnglishRead:true,semanticQaPass:b.residualCodes.length===0,nativeAccepted:false,activation:false,applied:false}));
  for (const parent of b.parentTargetIds) assert([...inputs,...parents].some(t => t.targetId === parent));
  assert(!p.activation && !p.applied && !p.nativeAttached && !p.nativeAccepted && !p.originalBookAuthenticated);
}
const parentMap: Record<number,number> = {499:2610,464:462,466:462,468:462,472:463,447:2357,567:542,530:511};
for (const p of proposals) {
  const parentId = parentMap[p.targetId];
  assert(same(p.fields.body.parentTargetIds,parentId ? [parentId] : []));
  const expected = {...p.mechanicsReview.native}, inherited: Record<string,number> = {};
  if (parentId) {
    const pm = [...inputs,...parents].find(t => t.targetId === parentId).english.mechanics;
    for (const k of ["castingTime","range","duration","savingThrow","spellResistance"]) if (!expected[k]) {expected[k]=pm[k];inherited[k]=parentId;}
    if ([472,567].includes(p.targetId)) {expected.components=pm.components;inherited.components=parentId;}
  }
  assert(same(expected,p.mechanicsReview.interpretedHeader) && same(inherited,p.mechanicsReview.inheritedFields));
}
for (const p of rows(owned + "/after-rule-probes.jsonl")) {
  assert(ids.includes(p.targetId) && p.bodyTokens.length >= 2);
  const body = proposals.find(t => t.targetId === p.targetId).fields.body.proposedDescriptionText;
  for (const token of p.bodyTokens) assert(body.includes(token), "after-rule token missing");
}
assert.equal(rows(owned + "/after-rule-probes.jsonl").length,28);
assert(same(residuals.map(r => [r.targetId,r.code]),[[529,"missing-range"],[529,"header-body-save-conflict"],[530,"inherited-damage-and-save-penalty-ambiguous"]]));
assert(residuals.every(r => r.owner === 575 && r.field === "body" && r.fallbackRetained && !r.nativeAccepted && !r.activation && r.detail.length > 50));
assert.equal(english.get(529)!.mechanics.range,null);
assert.equal(english.get(529)!.mechanics.savingThrow,"None");
assert.equal(english.get(490)!.mechanics.castingTime,"1 round");
assert.equal(english.get(572)!.mechanics.duration,"1 round/level");
rules.close();content.close();assert(same(stats(),m.operatorStats));

// Preserve the index and all nonowned status/untracked entries as raw NUL records.
const records = (b: Buffer) => { assert.equal(b[b.length-1],0); const a:Buffer[]=[]; let last=0; for(let i=0;i<b.length;i++) if(b[i]===0) {a.push(b.subarray(last,i+1));last=i+1;} return a; };
const audit: Record<string,number> = {};
for (const [label,args] of [["index",["ls-files","--stage","-z"]],["status",["status","--porcelain=v1","-z","--untracked-files=all"]],["untracked",["ls-files","--others","--exclude-standard","-z"]]] as const) {
  const filter = (b: Buffer,exclude: string[]) => records(b).filter(v => {
    const s=v.toString("utf8"); assert(label!=="status" || (!s.startsWith("R")&&!s.startsWith("C")));
    const path=label==="index"?s.slice(s.indexOf("\t")+1,-1):label==="status"?s.slice(3,-1):s.slice(0,-1);
    return !exclude.some(p=>path.startsWith(p+"/"));
  });
  const before=readFileSync(out+"/"+label+"-before.nul"), after=git(...args);
  assert(Buffer.concat(filter(before,[rel])).equals(Buffer.concat(filter(after,[rel]))),"nonowned NUL drift: "+label);
  for (const prior of [571,573]) {
    const original=readFileSync(repoRoot()+"/data-tools/out/issue-"+prior+"/"+label+"-before.nul");
    const exclude=[rel,...[571,573].filter(n=>n>=prior).map(n=>base+"/ownership/issue-"+n)];
    assert(Buffer.concat(filter(original,exclude)).equals(Buffer.concat(filter(after,exclude))),"original audit drift: "+prior+" "+label);
  }
  audit[label]=filter(before,[rel]).length;
  if(label==="status") assert.equal(records(before).filter(t=>t.toString("utf8").startsWith("D ")).length,39);
}
assert.equal(audit.untracked,1441);
assert(readFileSync(repoRoot()+"/.env").equals(readFileSync(out+"/env-before.bin")), "local configuration changed");
const runtime=lstatSync(repoRoot()+"/node_modules");
assert(same({size:runtime.size,mtimeMs:runtime.mtimeMs,isLink:runtime.isSymbolicLink()},json(out+"/runtime-before.json")), "reused runtime changed");
assert(!m.activation && m.nativeAcceptedFields===0 && m.newUnseenOccurrencesReviewed===0 && m.parentUnseenRemaining===2101);
assert(m.model.verified.model==="gpt-6.1-sol" && m.model.verified.effort==="high" && m.model.verified.source==="local rollout turn_context");
const result = {selectedTargets:28,nameRetain:ds.filter(d=>d.nameOutcome==="retain").length,nameCorrect:ds.filter(d=>d.nameOutcome==="correct").length,nameTranslateMissing:ds.filter(d=>d.nameOutcome==="translate-missing").length,fullBodyProposals:28,bodyTranslateMissing:ds.filter(d=>d.bodyOutcome==="translate-missing").length,bodyWithoutMaterialResidual:ds.filter(d=>!d.residualCodes.length).length,bodyWithMaterialResidual:ds.filter(d=>d.residualCodes.length).length,residualRecords:residuals.length,additionalParentsRead:4,selectedParentsReused:2,rawCharacters:9672,englishBodyCharacters:20056,additionalParentEnglishCharacters:m.parentEnglishBodyCharacters,nativeAttached:0,nativeAcceptedFields:0,activated:0,newUnseenOccurrencesReviewed:0,parentUnseenRemaining:2101};
assert(same(json(owned+"/review-summary.json"),result));
const publicRoot=fileURLToPath(new URL(".",import.meta.url)), publicSummary=json(publicRoot+"/summary.json");
assert(same(publicSummary.results,result),"public/private summary drift");
if(privateRevision) assert.equal(publicSummary.privateEvidenceRevision,privateRevision);
assert(same(readFileSync(publicRoot+"/dispositions.csv","utf8").trim().split(/\r?\n/).slice(1),ds.map(d=>[d.row,d.targetId,d.nameOutcome,d.bodyOutcome,d.bodyStatus,d.reasonCode,d.parentTargetIds.join(";"),d.residualCodes.join(";"),0,0].join(","))),"public/private field disposition drift");
const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+"/"+f.name):statSync(p+"/"+f.name).size),0);
assert(bytes(owned)<2*1024*1024 && bytes(out)<3*1024*1024 && process.resourceUsage().maxRSS<512*1024 && performance.now()-started<60000);
console.log(JSON.stringify({status:"PASS",...result,queryOnly:[1,1],dbMetadataUnchanged:true,privateStatePreserved:true,audit,privateBytes:bytes(owned),temporaryBytes:bytes(out),seconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS}));
