# Complete Divine DB-English proposal review

[Issue #555](https://github.com/FrankHZ/dnd3.5-spellbook/issues/555) owns these
43 exact existing book56/edition5 targets, selected from accepted #553 identity
evidence `5003f08e833f51fa7e12063f40f58adadb20496e`. This is direct translation
and correction against current DB English, separate from candidate attachment.
Private evidence revision: `541d3121c60661cca569c5af2bb3b4e3a0264dfe` (local only),
exclusively under `dice-baselines/issue-520/qa/books/56/slices/issue-555/` in the
configured private data repo. Complete inputs, actual Chinese after, sentence
reasoning and residual locators stay private.

All43 full English bodies/HTML, mechanics and current Chinese variants were read.
All43 proposed names retain individually verified current terminology; every body
has an actual unactivated Chinese HTML/text proposal. The after contains the
translated body; mixed-publication CHM headers, flavor and unsupported additions
are removed from this proposal. Canonical structured mechanics remain separate,
unchanged, with null/empty/zero values preserved. Dice/CHM references and later
SC versions supply no authority for missing CD rules. This is DB-English QA,
not original-book verification or content activation.

| Review outcome | Targets |
| --- | ---: |
| Complete available body, no material residual |37|
| Complete available body, structured mechanics residual |2|
| Available text translated, material body ambiguity/gap |4|
| Actual proposed names/bodies, all activation:false |43|

Six targets retain precise unresolved items:

| Target ID | Residual boundary |
| --- | --- |
|647|Missing class/domain level relationships; no later-version values supplied.|
|699|Missing dragon-specific breath table and material details; existing table remains unverified fallback.|
|703|Body focus terminology conflicts with material-only component flags; consumption unresolved.|
|748|Legacy action terminology; no move-action modernization inferred.|
|752|Conflicting save/SR conditions; actual disjunction retained, no conjunction repair.|
|754|Target content embedded in range while structured target is empty; no canonical repartition.|

The37 entries with no material residual are review proposals awaiting main-gate
acceptance. The remaining6 are not quality passes. Existing Chinese fallback
remains for all43 until separate acceptance and explicit write authorization.
The owning issue retains these residuals; this report grants no native receipt,
new accepted field, or whole-book completion. Book56 still has128 original targets:
this slice reviews43 previously no-candidate targets; the other77 no-candidate
targets and8 historical reviewed targets remain outside it. All original outcome
records are unchanged.

Same-publication inherited inputs are bound for636→635,665→667 and749→732.
Target655 instead explicitly links to PHB v3.5 target2807; that full original
reference is bound read-only with its distinct book/edition catalog identifiers.
No later-publication plant spell is substituted. Other linked spells and monster
manual references retain their URLs/references without unrequested full QA.

A bounded explicit spell-reference name check covers all43 entries and binds31
external references to current read-only English identity/Chinese name rows. One
wrong-spell identity reference is corrected (target640 must reference2884, not
2886), and ten existing-name alignments avoid introducing alternate lookup names.
Only references in targets635,640,679,729 and741 change. The private name audit
binds source offsets, current catalog names and actual after; its verifier proves
that rule wording, links, original inputs and the six residuals remain unchanged.
No referenced spell body, PHB extraction or original-source QA was reopened.

The private review binds29,093 English characters,215 nonempty physical lines,
214 exact source segments and264 actual-after sentence groups. One wrapped source
sentence accounts for the line/segment difference. There are9,006 Chinese body
characters. Eight original body hyperlinks, exact source-locked fields, source
offsets, complete after coverage, strict HTML nesting/text parity, dice/numeric
values,17 number-word conversions, negation, timing, scope, bonus types, materials,
saves and SR exceptions were checked. Placeholder/raw residue and repeated-line
heuristics found no defects or repeated templates. Heuristics supplement actual
semantic reading; counters do not constitute independent acceptance.

Prepared intake revision is `6d28f9391273979a35a6bcc86971f0aac5b9f2c8`; source/map
is `47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`; public base is
`cb89e0708d55659a006f9a7f5baab4cd80556846`. Maintained parse/source-coverage and
reconcile helpers replay105 files with exact5,606 candidate/5,097 target equality.
These43 targets have no matched candidate; the matched-only native slice receipt
is unsupported and is not fabricated. The adapter below authenticates committed
inputs and the bounded semantic proposals, independently of native fallback.

Both operator DBs were readonly/query_only; size/mtime were unchanged. No app-state,
writer/import, FTS, API, consumer rehearsal, PDF/errata, PHB, production or deploy
workflow ran. Source/map/alias/intake, shared QA/SC, canonical English/mechanics
and summaries are unchanged. The11 owned private evidence files were committed with
explicit paths and `commit --only`; the private repo was not pushed. Raw NUL
protection before and after commit preserves9,384 nonowned index records,1,480
status records,1,441 untracked paths and39 unrelated staged deletions exactly.
The difference from #553's earlier index count is its17 committed owned files.
Raw snapshots remain in this checkout's ignored output for main-gate inspection.

Committed-evidence verification took2.91s and
305300KiB peak RSS. Private evidence is788057bytes; current
ignored temporary output is4510590bytes. Complexity is
O(5,606 candidates +5,097 targets +43 semantic entries); one data process,
existing shared runtime and no installations, database copies or paid external
APIs were used. No fixed ROM byte cap applies. Runtime `turn_context` metadata
verified `gpt-6.1-sol/high`, independently of prompt text.

For read-only reproduction, save this adapter to the assigned checkout's ignored
`data-tools/out/issue-555/replay-public.ts`. It resolves the private root from
the checkout's ignored root `.env`, reads the exact committed evidence and
operator paths from its manifest, uses existing dependencies and writes no file
or DB. It also works from the data-tools package directory. Raw nonowned-state
protection is a separate before/after byte audit, not inferred from this adapter.

```typescript
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {isDeepStrictEqual as equal} from 'node:util';import Database from 'better-sqlite3';import {load} from 'cheerio';
import {localDataDir,repoRoot} from '../../src/shared/env';import {loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';import {parseDiceFile} from '../../src/dice-intake/parse';import {reconcile} from '../../src/dice-intake/reconcile';
assert(process.argv[2]==='541d3121c60661cca569c5af2bb3b4e3a0264dfe','pass exact private evidence revision');
const started=performance.now(),root=localDataDir(),prefix='dice-baselines/issue-520/qa/books/56/slices/issue-555/',owned=root+'/'+prefix,base=root+'/dice-baselines/issue-520';
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)),j=(p:string)=>JSON.parse(readFileSync(p,'utf8')),norm=(s:string)=>s.replace(/\r\n/g,'\n'),git=(...a:string[])=>execFileSync('git',['-C',root,...a],{maxBuffer:64*1024*1024});
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json'),boundary=j(owned+'/coverage-boundary.json');
for(const b of m.bindings)assert(norm(readFileSync(root+'/'+b.path,'utf8'))===norm(git('show',b.revision+':'+b.path).toString('utf8')),'committed input drift '+b.path);
if(process.argv[2])for(const file of readdirSync(owned))assert(norm(readFileSync(owned+'/'+file,'utf8'))===norm(git('show',process.argv[2]+':'+prefix+file).toString('utf8')),'exact evidence revision '+file);
const ids=[633,635,636,640,641,645,646,647,654,655,665,667,668,670,672,674,679,680,681,686,689,695,698,699,700,703,704,705,707,708,714,726,727,728,729,731,732,741,748,749,752,754,758];assert(equal(ids,m.selection.targetIds)&&equal(m.selection.sourceKeys,[])&&m.activation===false);
const meta=()=>m.readonly.databases.map((d:any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));assert(equal(meta(),m.readonly.databases),'DB metadata before');
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true}),c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});r.pragma('query_only=ON');c.pragma('query_only=ON');assert(r.pragma('query_only',{simple:true})===1&&c.pragma('query_only',{simple:true})===1);
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all(),zh:any[]=c.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' ORDER BY spellId,variant").all(),html=new Map((r.prepare('SELECT id,description_html AS html FROM dnd_spell').all() as any[]).map(t=>[t.id,t.html])),chm=new Map(zh.filter(t=>t.variant==='chm').map(t=>[t.spellId,t]));
const inputs=rows(owned+'/target-inputs.jsonl'),refs=rows(owned+'/referenced-inputs.jsonl'),proposals=rows(owned+'/proposals.jsonl'),reviews=rows(owned+'/reviews.jsonl'),residuals=rows(owned+'/residuals.jsonl');
for(const xs of [inputs,proposals,reviews])assert(equal(xs.map(t=>t.targetId),ids)&&new Set(xs.map(t=>t.targetId)).size===43,'exact coverage');
const prior=rows(root+'/dice-baselines/issue-520/ownership/issue-553/related-db-inputs.jsonl').filter(t=>t.book.id===56).sort((a,b)=>a.targetId-b.targetId);assert(equal(prior.map(t=>t.targetId),ids));
for(const t of inputs){assert(equal(t.english,en.get(t.targetId))&&t.english.rulebookId===56&&t.english.editionId===5&&t.englishHtml===html.get(t.targetId)&&equal(t.chinese,zh.filter(v=>v.spellId===t.targetId)),'fresh source lock '+t.targetId);const p=prior.find(q=>q.targetId===t.targetId);assert(equal(p.english,t.english)&&equal(p.chinese.slice().sort((a,b)=>a.variant.localeCompare(b.variant)),t.chinese.slice().sort((a,b)=>a.variant.localeCompare(b.variant))),'#553 reuse');}
assert(equal(refs.map(t=>t.targetId),[635,667,732,2807]));for(const t of refs)assert(equal(t.english,en.get(t.targetId))&&t.englishHtml===html.get(t.targetId),'base binding');
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl'),files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{const b=readFileSync(root+'/spells-dice-db-by-mo/'+n);assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':spells-dice-db-by-mo/'+n).toString('utf8')),'source frozen');return {bytes:b.length,parsed:parseDiceFile(n,b)};});validateSourceCoverage(files,inventory,candidates);
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null})),replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));assert(equal(replay.candidates,candidates)&&equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl'))&&en.size===5097&&candidates.length===5606,'maintained full replay');assert(!candidates.some(t=>ids.includes(t.targetId)),'selected target has unexpected native candidate');
const outcomes=rows(root+'/dice-qa/books/56/target-outcomes.jsonl');assert(outcomes.length===128&&outcomes.filter(t=>t.sourceKeys.length===0).length===120&&equal(boundary.outsideTargetIds,outcomes.filter(t=>!ids.includes(t.targetId)).map(t=>t.targetId).sort((a,b)=>a-b)),'whole-book partition');for(const t of boundary.selectedPriorOutcomes)assert(equal(t.record,outcomes.find(x=>x.targetId===t.targetId))&&t.record.fields.name.status==='no-candidate'&&t.record.fields.descriptionHtml.status==='no-candidate','prior fallback not acceptance');
const plain=(s:string)=>load(s,null,false).root().text(),links=(s:string)=>load(s,null,false)('a').map((_,el)=>load(el).root().children().attr('href')).get(),nums=(s:string)=>{const clean=s.replace(/"_?[^\"]+_?":(?:skills|spells)\/[^\s,]+/g,'').replace(/<[^>]*>/g,'').replaceAll('–','-').replaceAll('--','-');return clean.match(/[+-]?\d+(?:d\d+)?%?/gi)??[];},dice=(s:string)=>(s.match(/\d+d\d+/gi)??[]).map(s=>s.toLowerCase()).sort();
const numericDetails:any[]=[],repeated=new Map<string,Set<string>>();let segments=0,sentences=0,physical=0;
for(let k=0;k<43;k++){const t=inputs[k],p=proposals[k],v=reviews[k];assert(p.activation===false&&v.activation===false&&equal(p.sourceKeys,[])&&equal(v.sourceKeys,[])&&p.rulebookId===56&&p.editionId===5&&p.name===t.chinese[0].name&&v.name.english===t.english.name&&v.name.after===p.name,'actual name');assert(v.completeEnglishRead&&v.completeCurrentChineseRead&&v.englishHtmlRead&&v.allMechanicsRead&&equal(v.canonicalMechanicsPreserved,t.english.mechanics)&&v.englishBodyPreserved&&v.summaryUntouched,'review fields');
 const expectedRefs=t.targetId===636?[635]:t.targetId===655?[2807]:t.targetId===665?[667]:t.targetId===749?[732]:[];assert(equal(v.sameVersionReferenceIds,expectedRefs)&&expectedRefs.every(id=>refs.some(t=>t.targetId===id)),'inherited refs');
 assert(equal(links(t.englishHtml),links(p.descriptionHtml)),'link parity '+t.targetId);const $=load(p.descriptionHtml,null,false);assert($.root().find('*').toArray().every(el=>['p','ul','li','a','em'].includes(el.tagName)),'HTML tags');assert(!/(?:\uFFFD|\u0000|TODO|TBD|placeholder|空白占位|待翻译|\[\[)/i.test(p.descriptionHtml),'placeholder/residue');
 // Strict tag stack complements tolerant HTML parsing; there are no void tags.
 const stack:string[]=[];for(const x of p.descriptionHtml.matchAll(/<(\/)?([a-z]+)(?:\s[^>]*)?>/g)){if(x[1])assert(stack.pop()===x[2],'HTML nesting');else stack.push(x[2]);}assert(stack.length===0,'HTML closure');
 const display=$.root().find('p,li').map((_,el)=>$(el).text()).get().join('\n\n');assert(display===p.descriptionText,'HTML/text parity');let sourceCursor=0,afterCursor=0;
 for(const b of v.bindings){assert(t.english.description.slice(b.start,b.end)===b.source&&b.start>=sourceCursor&&!t.english.description.slice(sourceCursor,b.start).trim(),'source locator');sourceCursor=b.end;assert(b.afterText===plain(b.afterHtml)&&p.descriptionHtml.indexOf(b.afterHtml,afterCursor)>=afterCursor,'actual-after binding');afterCursor=p.descriptionHtml.indexOf(b.afterHtml,afterCursor)+b.afterHtml.length;
  assert(b.numericMeaningReviewed&&b.negationTimingScopeBonusMaterialsSavingThrowsAndSrReviewed);assert(b.sentences.map((s:any)=>s.source).join(' ').replace(/\s+/g,' ')===b.source.replace(/\s+/g,' ')&&b.sentences.map((s:any)=>s.afterHtml).join('')===b.afterHtml,'complete sentence partition');for(const s of b.sentences){assert(s.reviewed&&s.afterText===plain(s.afterHtml));if(!repeated.has(s.afterText))repeated.set(s.afterText,new Set());repeated.get(s.afterText)!.add(s.source);sentences++;}
  assert(equal(dice(b.source),dice(b.afterText)),'dice parity '+t.targetId+':'+b.segment);numericDetails.push({targetId:t.targetId,segment:b.segment,sourceNumbers:nums(b.source),afterNumbers:nums(b.afterText),humanNumericMeaningReviewed:true});segments++;
 }
 assert(!t.english.description.slice(sourceCursor).trim()&&plain(p.descriptionHtml).replace(/\s+/g,'')===v.bindings.map((b:any)=>b.afterText).join('').replace(/\s+/g,''),'complete exact source/after');physical+=t.english.description.split('\n').filter(Boolean).length;
 const rs=residuals.filter(t=>t.targetId===p.targetId);assert(v.materialResidualCount===rs.length&&v.availableBodyComplete===rs.every(t=>t.bodyComplete)&&equal(p.residualFields,rs.flatMap(t=>t.fields))&&p.bodyStatus===(v.availableBodyComplete?'complete-available-DB-English':'partial-or-ambiguous-DB-English'));
}
const repeats=[...repeated].filter(([t,ss])=>ss.size>1).map(([t,ss])=>({afterText:t,distinctSourceSentences:ss.size}));assert(repeats.every(t=>t.afterText.length<45),'long template reuse');
if(existsSync(owned+'/numeric-checks.jsonl')){const ns=rows(owned+'/numeric-checks.jsonl');assert(ns.length===214);for(const [i,n] of ns.entries()){const x=numericDetails[i];assert(n.targetId===x.targetId&&n.segment===x.segment&&equal(n.sourceNumbers,x.sourceNumbers)&&equal(n.afterNumbers,x.afterNumbers),'numeric actual-after drift');const conversion=n.wordConversion,source=reviews.find(t=>t.targetId===n.targetId).bindings[n.segment].source;if(conversion)assert(source.includes(conversion.needle)&&conversion.reason===n.reason,'numeric source-word binding');const canonical=(a:string[])=>a.map(t=>t.replaceAll('+','')).sort();assert(equal(canonical([...n.sourceNumbers,...(conversion?.added??[])]),canonical(n.afterNumbers)),'numeric values');}assert(ns.filter(t=>t.wordConversion).length===17);}
assert(equal(residuals.map(t=>t.targetId),[647,699,703,748,752,754])&&residuals.every(t=>t.activation===false&&t.reason.length>100&&t.fallback&&t.locator));assert(summary.exactSourceSegments===segments&&summary.sentenceBindingGroups===sentences&&physical===215&&summary.completeAvailableBodies===39&&summary.partialOrAmbiguousBodies===4&&summary.fullyReviewedWithoutMaterialResidual===37&&summary.newNativeAcceptedFields===0&&summary.activation===false&&boundary.nativeMatchedSliceReceipt===false&&boundary.wholeBookComplete===false);
const nameAudit=j(owned+'/reference-name-qa.json');assert(equal(nameAudit.reviewedTargetIds,ids)&&nameAudit.activation===false&&nameAudit.canonicalWrites===false&&nameAudit.referenceBodiesRead===false&&nameAudit.externalReferences.length===31&&nameAudit.changes.length===11&&nameAudit.identityGuard.correctReferenceId===2884&&nameAudit.identityGuard.distinctSpellId===2886,'bounded name scope');
for(const lookup of nameAudit.lookupNames){const current=(r.prepare('SELECT s.id,s.name,s.rulebook_id AS rulebookId,b.dnd_edition_id AS editionId FROM dnd_spell s JOIN dnd_rulebook b ON b.id=s.rulebook_id WHERE lower(s.name)=lower(?) ORDER BY s.rulebook_id,s.id').all(lookup.lookup) as any[]).map(t=>({...t,chineseNames:c.prepare("SELECT variant,name,sourceKey FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant").all(t.id)}));assert(equal(current,lookup.rows),'current name-only lookup drift');}
for(const a of nameAudit.externalReferences){const t=inputs.find(t=>t.targetId===a.targetId),v=reviews.find(t=>t.targetId===a.targetId),b=v.bindings[a.segment],n=nameAudit.lookupNames.flatMap((t:any)=>t.rows).find((t:any)=>t.id===a.referenceId);assert(n&&equal(a.englishIdentity,{id:n.id,name:n.name,rulebookId:n.rulebookId,editionId:n.editionId})&&equal(a.currentChineseNames,n.chineseNames)&&n.chineseNames.some((t:any)=>t.name===a.selectedChineseName)&&b.afterText.includes(a.selectedChineseName)&&a.actualAfter===b.afterText,'named actual-after binding');assert(a.anchors.length>0&&a.anchors.every((p:any)=>t.english.description.slice(p.start,p.end).toLowerCase()===a.sourcePhrase),'named source locator');}
for(const [i,v] of reviews.entries()){assert(v.explicitSpellReferenceNamesReviewed&&equal(v.referenceNameBindingIds,nameAudit.externalReferences.filter((t:any)=>t.targetId===v.targetId).map((t:any)=>t.referenceId)));assert(equal(nameAudit.coveredTargets[i],{targetId:v.targetId,currentEnglishName:inputs[i].english.name,currentChineseName:inputs[i].chinese[0].name,selfNameRetained:true,completeBodyNameReferencesRead:true,externalBindingCount:v.referenceNameBindingIds.length}));}
const priorFile=(file:string)=>norm(git('show',nameAudit.previousEvidenceRevision+':'+prefix+file).toString('utf8'));for(const file of ['target-inputs.jsonl','referenced-inputs.jsonl','input-manifest.json','coverage-boundary.json','residuals.jsonl','numeric-checks.jsonl'])assert(norm(readFileSync(owned+'/'+file,'utf8'))===priorFile(file),'frozen owned input '+file);
for(const [file,current] of [['proposals.jsonl',proposals],['reviews.jsonl',reviews]] as const){const expected=priorFile(file).trim().split(/\r?\n/).map(l=>JSON.parse(l));for(const a of nameAudit.changes){const row=expected.find(t=>t.targetId===a.targetId);if(file==='proposals.jsonl'){row.descriptionHtml=row.descriptionHtml.replaceAll(a.from,a.to);row.descriptionText=row.descriptionText.replaceAll(a.from,a.to);}else{const b=row.bindings[a.segment];b.afterHtml=b.afterHtml.replaceAll(a.from,a.to);b.afterText=plain(b.afterHtml);for(const s of b.sentences){s.afterHtml=s.afterHtml.replaceAll(a.from,a.to);s.afterText=plain(s.afterHtml);}}}if(file==='reviews.jsonl')for(const v of expected){v.explicitSpellReferenceNamesReviewed=true;v.referenceNameBindingIds=nameAudit.externalReferences.filter((t:any)=>t.targetId===v.targetId).map((t:any)=>t.referenceId);}assert(equal(expected,current),'only exact reference names and audit bindings changed');}
assert(summary.afterCharacters===proposals.reduce((n,t)=>n+[...t.descriptionText].length,0)&&summary.referenceNameCheck.changedTargets===5&&summary.referenceNameCheck.changedReferences===11&&summary.referenceNameCheck.wrongSpellIdentityCorrections===1);
r.close();c.close();assert(equal(meta(),m.readonly.databases),'DB metadata after');const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+'/'+f.name):statSync(p+'/'+f.name).size),0);assert(bytes(owned)<5*1024*1024&&process.resourceUsage().maxRSS<512*1024,'resources');
export const result={status:'PASS',checks:['exact43 source/target/name/body/proposal coverage','committed source/map/alias/intake and#553 input equality','maintained105-file/5606-candidate/5097-target replay','128-target partition77+8 untouched and native fallback not semantic acceptance','43 fresh English/HTML/mechanics/all-Chinese-variant snapshots and4 inherited snapshots','214 exact source segments/264 actual-after sentence bindings','HTML nesting/text/link/dice parity','per-clause numeric meaning and negation/timing/scope/material/SR review','placeholder/raw residue and repeated-translation heuristic','six explicit residuals and all43 activation:false','43 bounded explicit spell-reference name checks/31 external bindings/11 corrections','current name catalog identity guard and exact prior-to-after-only-name changes','readonly/query_only and DB size/mtime unchanged'],targets:43,physicalSourceLines:physical,sourceSegments:segments,sentenceBindingGroups:sentences,links:proposals.reduce((n,t)=>n+links(t.descriptionHtml).length,0),repeatedShortSentenceGroups:repeats.length,longTemplateReuseGroups:repeats.filter(t=>t.afterText.length>=45).length,elapsedSeconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS,privateBytes:bytes(owned)};
export const numericLedger=numericDetails;export const repeatLedger=repeats;
console.log(JSON.stringify(result));
```

```powershell
& ./node_modules/.bin/tsx.cmd ./data-tools/out/issue-555/replay-public.ts 541d3121c60661cca569c5af2bb3b4e3a0264dfe
git diff --check
```

Full remote `ci:portable` on the final PR head remains the merge gate; the exact
run belongs in the PR. Main-gate reviews the private actual-after evidence and
controls acceptance/merge/closeout. This task does not merge or close the issue.
