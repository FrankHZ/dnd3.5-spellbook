# Complete Divine remaining batch A DB-English review

[Issue #557](https://github.com/FrankHZ/dnd3.5-spellbook/issues/557) owns the exact
40 existing book56/edition5 targets in target-dispositions.csv and summary.json.
Private evidence is local revision `cf341faed424092642f5e767b53e3237cc8029f3`, exclusively under
`dice-baselines/issue-520/qa/books/56/slices/issue-557/` in the configured
private data repo. Full inputs, Chinese proposed after, per-clause review,
numeric conversions and reference-name evidence remain private.

All40 complete available English bodies/HTML, mechanics and current Chinese
variants were read, translated/corrected, then rechecked against the actual after.
There are40 real unactivated name/body proposals:39 individually verified names
retained and one taxonomic name correction (target652). Body proposals use natural
paragraphs, appropriate lists and the actual three-row damage table. Mixed-book
CHM headers, unsupported additions and later SC mechanics supply no authority.
Canonical English/mechanics and summaries remain unchanged, including nulls,
empty values and component flags. This is DB-English QA, not original-book QA.

| Outcome | Targets |
| --- | ---: |
| Complete available body, no material residual |34|
| Complete available body, structured mechanics residual |1|
| Available text translated, material body ambiguity/gap |5|
| Actual proposed names/bodies, all activation:false/sourceKeys:[] |40|

The six unresolved targets have these precise boundaries:

| Target ID | Residual |
| --- | --- |
|634|Equal caster-level outcome absent from the two strict comparison conditions.|
|639|Legacy concealment term lacks an explicit numerical definition in this entry.|
|652|Trample save DC missing; later CHM value not supplied.|
|653|Single/full attack bonuses differ for the same attack; values retained.|
|656|Size-to-quill-count table absent from both current English text and HTML.|
|702|Structured range is null despite touched target/body; no canonical fill.|

These6 are not unqualified quality passes. Existing Chinese fallback remains
for all40 until separate acceptance and explicit write authorization. No native
matched-only receipt, new entity/accepted native field, full-book completion,
or production activation is claimed. The original128-target ledger remains
unchanged:40 selected and88 outside, including the accepted43-target sibling,
queued37-target sibling and8 historical candidate outcomes. No #555 residual
was automatically copied to this slice.

Same-CD inherited full English/HTML/mechanics inputs bind651→653,666→667,
669→668 (and667 context), and685→688. Other explicit spell references use only
bounded read-only English identity/current Chinese-name lookups:35 bindings to
34 distinct existing spell IDs. This avoids later-publication substitutions and
skill/spell name confusion without reopening reference-body or PHB source QA.

The review binds35,747 English characters,317 nonempty physical lines,
309 exact source segments (eight wrapped joins) and323 actual-after sentence
groups. Actual Chinese body text is11,357 characters. All309 numeric records
pass after8 explicit source/after-bound numeral conversions. Dice, signs,
negation, timing, scope, optionality, bonus types, materials, costs, saves and
SR were checked against actual after. Strict nesting, HTML/text coverage and
the complete table pass; original/proposed body hyperlinks both number zero.
Placeholder/raw residue and repeated-translation checks found no defects or
repeated templates. These checks supplement semantic reading and main-gate review.

Prepared intake is `6d28f9391273979a35a6bcc86971f0aac5b9f2c8`; source/map is
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`; public base is `e2d4728682f0d1ecda9fae7f164f9fcc040b2dde`.
Maintained parse/source-coverage/reconcile helpers reproduce105 files with exact
5,606 candidate/5,097 target equality. The selected40 have no native candidate.
All shared source/map/alias/parser/intake/other QA and accepted SC remain frozen.

Both operator DBs are opened readonly/query_only and their size/mtime are unchanged.
No app-state access, writer/import, FTS, API, consumer rehearsal, PDF/errata, PHB,
#201/#529 work or deployment ran. The11 owned private files were committed with
explicit paths and commit --only; private data was not pushed. Raw NUL byte audits
preserve9,395 nonowned index records,1,480 status records,1,441 untracked paths
and39 unrelated staged deletions exactly, including the post-commit state. Raw
before/after snapshots stay in this checkout's ignored output for inspection.

Committed-evidence replay takes about2.75s and
323356KiB peak RSS. Private evidence is845076bytes and
current ignored temporary output is approximately3007587bytes;
both remain below5MiB. Complexity is O(5,606 intake +5,097 targets +selected body/
necessary reference volume); one data process uses existing shared runtime.
No installation, DB copy or paid external API was used. No ROM byte cap applies.
Local turn_context metadata verifies gpt-6.1-sol/high; main-gate independently
verified dispatch metadata. The worktree remains assigned pending acceptance.

For read-only reproduction, save this adapter in the assigned checkout's ignored
`data-tools/out/issue-557/replay-public.ts`. It resolves the private data root from
the checkout's ignored root .env and reads operator paths from the exact committed
manifest. It writes no files/DBs and works from root or data-tools working directories.
Raw nonowned-state protection is a separate byte audit, not inferred from replay.

```typescript
import {readFileSync,readdirSync,statSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {isDeepStrictEqual as equal} from 'node:util';import Database from 'better-sqlite3';import {load} from 'cheerio';
import {localDataDir,repoRoot} from '../../src/shared/env';import {loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';import {parseDiceFile} from '../../src/dice-intake/parse';import {reconcile} from '../../src/dice-intake/reconcile';
assert(process.argv[2]==='cf341faed424092642f5e767b53e3237cc8029f3','pass exact private evidence revision');
const started=performance.now(),root=localDataDir(),prefix='dice-baselines/issue-520/qa/books/56/slices/issue-557/',owned=root+'/'+prefix,base=root+'/dice-baselines/issue-520';
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)),j=(p:string)=>JSON.parse(readFileSync(p,'utf8')),norm=(s:string)=>s.replace(/\r\n/g,'\n'),git=(...a:string[])=>execFileSync('git',['-C',root,...a],{maxBuffer:64*1024*1024});
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json'),boundary=j(owned+'/coverage-boundary.json');
for(const b of m.bindings)assert(norm(readFileSync(root+'/'+b.path,'utf8'))===norm(git('show',b.revision+':'+b.path).toString('utf8')),'committed input drift '+b.path);
if(process.argv[2]){assert(/^[a-f0-9]{40}$/.test(process.argv[2]),'exact private evidence revision');for(const file of readdirSync(owned))assert(norm(readFileSync(owned+'/'+file,'utf8'))===norm(git('show',process.argv[2]+':'+prefix+file).toString('utf8')),'exact evidence revision '+file);}
const ids=[634,637,638,639,643,644,648,649,650,651,652,653,656,658,659,660,661,662,663,664,666,669,671,673,675,676,677,678,682,683,684,685,687,688,694,696,697,701,702,706];assert(equal(ids,m.selection.targetIds)&&equal(m.selection.sourceKeys,[])&&m.activation===false&&m.issue===557);
const sibling=j(root+'/dice-baselines/issue-520/qa/books/56/slices/issue-555/input-manifest.json');assert(!sibling.selection.targetIds.some((id:number)=>ids.includes(id))&&m.acceptedSiblingRevision==='541d3121c60661cca569c5af2bb3b4e3a0264dfe');
const meta=()=>m.readonly.databases.map((d:any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));assert(equal(meta(),m.readonly.databases),'DB metadata before');
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true}),c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});r.pragma('query_only=ON');c.pragma('query_only=ON');assert(r.pragma('query_only',{simple:true})===1&&c.pragma('query_only',{simple:true})===1);
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all(),zh:any[]=c.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' ORDER BY spellId,variant").all(),html=new Map((r.prepare('SELECT id,description_html AS html FROM dnd_spell').all() as any[]).map(t=>[t.id,t.html])),chm=new Map(zh.filter(t=>t.variant==='chm').map(t=>[t.spellId,t]));
const inputs=rows(owned+'/target-inputs.jsonl'),refs=rows(owned+'/referenced-inputs.jsonl'),proposals=rows(owned+'/proposals.jsonl'),reviews=rows(owned+'/reviews.jsonl'),residuals=rows(owned+'/residuals.jsonl'),numeric=rows(owned+'/numeric-checks.jsonl'),names=j(owned+'/reference-name-qa.json');
for(const xs of [inputs,proposals,reviews])assert(equal(xs.map(t=>t.targetId),ids)&&new Set(xs.map(t=>t.targetId)).size===40,'exact coverage');
for(const t of inputs)assert(equal(t.english,en.get(t.targetId))&&t.english.rulebookId===56&&t.english.editionId===5&&t.englishHtml===html.get(t.targetId)&&equal(t.chinese,zh.filter(v=>v.spellId===t.targetId)),'fresh source lock '+t.targetId);
assert(equal(refs.map(t=>t.targetId),[653,667,668,688]));for(const t of refs)assert(equal(t.english,en.get(t.targetId))&&t.english.rulebookId===56&&t.english.editionId===5&&t.englishHtml===html.get(t.targetId),'same-publication inherited input');
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl'),files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{const b=readFileSync(root+'/spells-dice-db-by-mo/'+n);assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':spells-dice-db-by-mo/'+n).toString('utf8')),'source frozen');return {bytes:b.length,parsed:parseDiceFile(n,b)};});validateSourceCoverage(files,inventory,candidates);
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null})),replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));assert(equal(replay.candidates,candidates)&&equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl'))&&files.length===105&&en.size===5097&&candidates.length===5606,'maintained full replay');assert(!candidates.some(t=>ids.includes(t.targetId)),'unexpected native candidate');
const outcomes=rows(root+'/dice-qa/books/56/target-outcomes.jsonl');assert(outcomes.length===128&&outcomes.filter(t=>t.sourceKeys.length===0).length===120&&equal(boundary.outsideTargetIds,outcomes.filter(t=>!ids.includes(t.targetId)).map(t=>t.targetId).sort((a,b)=>a-b)),'128 partition');for(const t of boundary.selectedPriorOutcomes)assert(equal(t.record,outcomes.find(x=>x.targetId===t.targetId))&&t.record.fields.name.status==='no-candidate'&&t.record.fields.descriptionHtml.status==='no-candidate','fallback not acceptance');
const plain=(s:string)=>load(s,null,false).root().text(),links=(s:string)=>load(s,null,false)('a').map((_,el)=>load(el).root().children().attr('href')).get(),nums=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/(?<=\d),(?=\d)/g,'').replaceAll('–','-').replaceAll('×','x').match(/[+-]?\d+(?:d\d+)?%?/gi)??[],canon=(xs:string[])=>xs.map(s=>s.replace(/^\+/,'').toLowerCase()).sort(),dice=(s:string)=>(s.match(/\d+d\d+/gi)??[]).map(s=>s.toLowerCase()).sort();
let segments=0,sentences=0,physical=0,nIndex=0;const repeated=new Map<string,Set<string>>();
for(let k=0;k<40;k++){const t=inputs[k],p=proposals[k],v=reviews[k];assert(p.activation===false&&v.activation===false&&equal(p.sourceKeys,[])&&equal(v.sourceKeys,[])&&p.rulebookId===56&&p.editionId===5&&v.name.english===t.english.name&&v.name.after===p.name&&equal(v.name.before,t.chinese.map((t:any)=>t.name)),'actual name');assert((t.targetId===652?p.name===names.nameChanges[0].after&&names.nameChanges[0].before===t.chinese[0].name:p.name===t.chinese[0].name),'bounded name change');assert(v.completeEnglishRead&&v.completeCurrentChineseRead&&v.englishHtmlRead&&v.allMechanicsRead&&v.actualAfterSecondReading&&equal(v.canonicalMechanicsPreserved,t.english.mechanics)&&v.englishBodyPreserved&&v.summaryUntouched&&v.reason.length>50,'full review fields');
 const expectedRefs=t.targetId===651?[653]:t.targetId===666?[667]:t.targetId===669?[668,667]:t.targetId===685?[688]:[];assert(equal(v.sameVersionReferenceIds,expectedRefs)&&expectedRefs.every(id=>refs.some(t=>t.targetId===id)),'inherited refs');
 assert(equal(links(t.englishHtml),links(p.descriptionHtml)),'link parity');const $=load(p.descriptionHtml,null,false);assert($.root().find('*').toArray().every(el=>['p','ul','li','a','em','table','tbody','tr','th','td'].includes(el.tagName)),'HTML tags');assert(!/(?:\uFFFD|\u0000|TODO|TBD|placeholder|空白占位|待翻译|\[\[|\|_|\*_)/i.test(p.descriptionHtml),'placeholder/raw residue');assert(!/[A-Za-z]{3,}/.test(p.descriptionText.replaceAll('DC','').replaceAll('XP','')),'untranslated alphabetic residue');
 const stack:string[]=[];for(const x of p.descriptionHtml.matchAll(/<(\/)?([a-z]+)(?:\s[^>]*)?>/g)){if(x[1])assert(stack.pop()===x[2],'HTML nesting');else stack.push(x[2]);}assert(stack.length===0,'HTML closure');assert($.root().find('p,li,tr').map((_,el)=>$(el).text()).get().join('\n\n')===p.descriptionText,'HTML/text parity');
 let sourceCursor=0,afterCursor=0;for(const b of v.bindings){assert(t.english.description.slice(b.start,b.end)===b.source&&b.start>=sourceCursor&&!t.english.description.slice(sourceCursor,b.start).trim(),'source locator');sourceCursor=b.end;const pos=p.descriptionHtml.indexOf(b.afterHtml,afterCursor);assert(b.afterText===plain(b.afterHtml)&&pos>=afterCursor,'actual-after HTML locator');afterCursor=pos+b.afterHtml.length;assert(b.numericMeaningReviewed&&b.negationTimingScopeBonusMaterialsSavingThrowsAndSrReviewed);assert(b.sentences.map((s:any)=>s.source).join(' ').replace(/\s+/g,' ')===b.source.replace(/\s+/g,' ')&&b.sentences.map((s:any)=>s.afterHtml).join('')===b.afterHtml,'source/sentence partition');for(const s of b.sentences){assert(s.reviewed&&s.afterText===plain(s.afterHtml));if(!repeated.has(s.afterText))repeated.set(s.afterText,new Set());repeated.get(s.afterText)!.add(s.source);sentences++;}
  assert(equal(dice(b.source),dice(b.afterText)),'dice parity');const n=numeric[nIndex++];assert(n.targetId===t.targetId&&n.segment===b.segment&&equal(n.sourceNumbers,nums(b.source))&&equal(n.afterNumbers,nums(b.afterText))&&n.humanNumericMeaningReviewed,'numeric exact after');const expected=n.sourceNumbers.slice();if(n.conversion){assert(b.source.includes(n.conversion.sourceNeedle)&&b.afterText.includes(n.conversion.afterNeedle)&&n.conversion.reason.length>10);for(const a of n.conversion.sourceRemove){const q=expected.indexOf(a);assert(q>=0);expected.splice(q,1);}expected.push(...n.conversion.afterAdd);}assert(equal(canon(expected),canon(n.afterNumbers)),'numeric value binding');segments++;
 }
 assert(!t.english.description.slice(sourceCursor).trim()&&plain(p.descriptionHtml).replace(/\s+/g,'')===v.bindings.map((b:any)=>b.afterText).join('').replace(/\s+/g,''),'complete source/actual-after coverage');physical+=t.english.description.split('\n').filter(Boolean).length;
 const rs=residuals.filter(t=>t.targetId===p.targetId);assert(v.materialResidualCount===rs.length&&v.availableBodyComplete===rs.every(t=>t.bodyComplete)&&equal(p.residualFields,rs.flatMap(t=>t.fields))&&p.bodyStatus===(v.availableBodyComplete?'complete-available-DB-English':'partial-or-ambiguous-DB-English'));
}
assert(nIndex===numeric.length&&numeric.filter(n=>n.conversion).length===8);const repeats=[...repeated].filter(([_,ss])=>ss.size>1).map(([t,ss])=>({afterText:t,distinctSourceSentences:ss.size}));assert(repeats.every(t=>t.afterText.length<45),'long template reuse');
assert(equal(residuals.map(t=>t.targetId),[634,639,652,653,656,702])&&residuals.every(t=>t.activation===false&&t.reason.length>100&&t.fallback&&t.locator));for(const s of residuals){const t=inputs.find(t=>t.targetId===s.targetId);if(s.needle)assert(t.english.description.includes(s.needle),'precise residual locator');else assert(t.english.mechanics.range===null&&s.targetId===702);}
assert(summary.targets===40&&summary.englishCharacters===35747&&summary.physicalNonemptyLines===physical&&physical===317&&summary.exactSourceSegments===segments&&segments===309&&summary.sentenceBindingGroups===sentences&&sentences===323&&summary.completeAvailableBodies===35&&summary.partialOrAmbiguousBodies===5&&summary.fullyReviewedWithoutMaterialResidual===34&&summary.changedNames===1&&summary.activation===false&&boundary.nativeMatchedSliceReceipt===false&&boundary.wholeBookComplete===false&&boundary.nativeAcceptedFieldsAdded===0);
assert(equal(names.reviewedTargetIds,ids)&&names.activation===false&&names.canonicalWrites===false&&equal(names.inheritedBodyReadIds,[653,667,668,688])&&names.externalReferences.length===35);for(const lookup of names.lookupNames){const current=(r.prepare('SELECT s.id,s.name,s.rulebook_id AS rulebookId,b.dnd_edition_id AS editionId FROM dnd_spell s JOIN dnd_rulebook b ON b.id=s.rulebook_id WHERE lower(s.name)=lower(?) ORDER BY s.rulebook_id,s.id').all(lookup.lookup) as any[]).map(t=>({...t,chineseNames:c.prepare("SELECT variant,name,sourceKey FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant").all(t.id)}));assert(equal(current,lookup.rows),'name identity drift');}
for(const a of names.externalReferences){const t=inputs.find(t=>t.targetId===a.targetId),v=reviews.find(t=>t.targetId===a.targetId),b=v.bindings[a.segment],n=names.lookupNames.flatMap((t:any)=>t.rows).find((t:any)=>t.id===a.referenceId);assert(n&&equal(a.englishIdentity,{id:n.id,name:n.name,rulebookId:n.rulebookId,editionId:n.editionId})&&equal(a.currentChineseNames,n.chineseNames)&&n.chineseNames.some((t:any)=>t.name===a.selectedChineseName)&&b.afterText.includes(a.selectedChineseName)&&a.actualAfter===b.afterText,'name actual after');assert(a.anchors.length&&a.anchors.every((p:any)=>t.english.description.slice(p.start,p.end).toLowerCase()===a.sourcePhrase),'name source anchor');}
for(const [i,v] of reviews.entries()){assert(v.explicitSpellReferenceNamesReviewed&&equal(v.referenceNameBindingIds,names.externalReferences.filter((t:any)=>t.targetId===v.targetId).map((t:any)=>t.referenceId)));assert(equal(names.coveredTargets[i],{targetId:v.targetId,currentEnglishName:inputs[i].english.name,currentChineseNames:inputs[i].chinese.map((t:any)=>t.name),actualAfterName:v.name.after,nameChanged:v.targetId===652,completeBodyNameReferencesRead:true,externalBindingCount:v.referenceNameBindingIds.length}));}
const table=load(proposals.find(t=>t.targetId===694).descriptionHtml,null,false);assert(table('tr').length===4&&table('th').length===3&&table('td').length===9,'complete3-row damage table');assert(summary.afterCharacters===proposals.reduce((n,t)=>n+[...t.descriptionText].length,0));
r.close();c.close();assert(equal(meta(),m.readonly.databases),'DB metadata after');const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+'/'+f.name):statSync(p+'/'+f.name).size),0);assert(bytes(owned)<5*1024*1024&&process.resourceUsage().maxRSS<512*1024,'resource budget');
export const result={status:'PASS',checks:['exact40 current English/HTML/mechanics/all-Chinese-variant source locks','committed source/map/alias/intake/book outcome equality','maintained105-file/5606-candidate/5097-target replay','128-target partition:40 selected/88 outside; no matched candidate or native receipt','309 complete source segments and323 actual-after sentence groups','HTML nesting/text/link/dice and3-row table parity','309 numeric records with8 bound numeral conversions','35 explicit spell-reference identities and4 same-CD inherited inputs','placeholder/raw source residue/repeated-template heuristic','six precise unresolved items and40 activation:false','readonly/query_only DB size/mtime unchanged'],targets:40,physicalSourceLines:physical,sourceSegments:segments,sentenceBindingGroups:sentences,numericSegments:numeric.length,explicitNumeralConversions:8,referenceBindings:35,distinctReferenceIds:new Set(names.externalReferences.map((t:any)=>t.referenceId)).size,links:proposals.reduce((n,t)=>n+links(t.descriptionHtml).length,0),repeatedShortSentenceGroups:repeats.length,longTemplateReuseGroups:repeats.filter(t=>t.afterText.length>=45).length,elapsedSeconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS,privateBytes:bytes(owned)};console.log(JSON.stringify(result));
```

From the repository root:

```powershell
node node_modules/tsx/dist/cli.mjs data-tools/out/issue-557/replay-public.ts cf341faed424092642f5e767b53e3237cc8029f3
```

From data-tools:

```powershell
node ../node_modules/tsx/dist/cli.mjs out/issue-557/replay-public.ts cf341faed424092642f5e767b53e3237cc8029f3
```
