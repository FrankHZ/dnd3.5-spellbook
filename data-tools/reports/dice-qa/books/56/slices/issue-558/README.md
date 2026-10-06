# Complete Divine remaining batch B DB-English review

[Issue #558](https://github.com/FrankHZ/dnd3.5-spellbook/issues/558) owns the exact
37 existing book56/edition5 targets in [target-dispositions.csv](target-dispositions.csv)
and [summary.json](summary.json). Private evidence is local revision
`6607eafc40fbdbf7c7d27741fa68c9a8eb4aaa6e`, exclusively under
`dice-baselines/issue-520/qa/books/56/slices/issue-558/` in the configured private data
repo. Complete inputs, proposed Chinese after, individual clause review, numeric
conversions and reference evidence remain private. This is DB-English QA.

All 37 complete available English bodies/HTML, mechanics and all current Chinese
variants were read, translated/corrected, then rechecked against actual after.
All 37 have real unactivated name/body proposals; 36 established names are retained
and target723 corrects a final-character typo. Natural paragraphs and the actual
ability lists retain meaningful structure. No missing tables were reconstructed.
Mixed-publication CHM rules are references only. Canonical English, mechanics and
summaries remain unchanged, including null/empty fields and component flags.

| Outcome | Targets |
| --- | ---: |
| Complete available body, no material residual | 28 |
| Complete body, structured mechanics residual | 3 |
| Available text translated, material body/reference ambiguity or gap | 6 |
| Proposed names/bodies, activation:false/sourceKeys:[] | 37 |

| Target ID | Precise unresolved boundary |
| --- | --- |
| 717 | Temperature scale unspecified; exact altitude boundary unassigned. |
| 722 | Literal disease-cure reference has no current DB identity; no automatic alias. |
| 740 | Level-dependent maximum object-size mapping absent from text and HTML. |
| 746 | Cumulative penalty dice versus level-factor grouping/odd-level rounding unclear. |
| 747 | Explicit body material requirement conflicts with structured material flag0. |
| 750 | Level-dependent lifting capacity mapping absent from text and HTML. |
| 753 | Four explicit in-body headers have null structured counterparts. |
| 755 | Structured range contains target-header text; target remains null. |
| 759 | Referenced deity/alignment special-property list absent from text and HTML. |

These nine targets are not unqualified quality passes. Existing Chinese fallback
remains for all 37 until separate acceptance and explicit write authorization.
No native matched-only receipt, new entity, accepted native field, whole-book
completion or activation is claimed. The frozen original128-target ledger retains
91 outside targets, including both accepted sibling slices and all8 historical
candidate outcomes. No sibling-specific conclusion was copied into this review.

Full inherited DB-English/HTML/mechanics inputs bind736/744→735,739→738,
756/757→758 and724→2728. The latter is a bounded existing DB reference read,
not PHB extraction or source QA. Own publication overrides remain authoritative.
Other spell references use bounded identity/current-Chinese-name lookups:
31 bindings to22 distinct existing IDs; one unmatched literal remains unresolved.
The later publication of a uniquely named reference supplies no substitute body.

The review covers33,796 English body characters,299 nonempty physical lines,
295 exact source segments (four wrapped joins) and308 actual-after sentence groups.
Chinese body text is10,238 characters. External inherited English is
767 characters; in-slice inherited English is
742 characters. All295 numeric records pass
with19 explicit bound conversions, including one page-range separator conversion.
Dice, signs, conditions, negation, timing, scope, optionality, bonus types, fees,
materials, saves/SR and absent tables were rechecked against actual after.
HTML nesting/text coverage pass; all3 original body links are retained with bound
Chinese names. Placeholder/raw-residue checks found no defects. Two repeated short
groups are the same cost and same sense ability with only source capitalization or
unit-abbreviation differences; no long repeated template was found. Mechanical
checks supplement semantic reading and independent main-gate review.

Prepared intake is `6d28f9391273979a35a6bcc86971f0aac5b9f2c8`; source/map is
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`; public base is `ad4cfda32ea37d562209ccabad75c95661a85dfb`.
Maintained parse/source-coverage/reconcile helpers reproduce105 files with exact
5,606 candidate/5,097 target equality. The selected37 have no native candidate.
Shared source/map/alias/parser/intake/other QA and accepted SC remain frozen.

Both operator DBs are readonly/query_only and retain their recorded size/mtime.
No app-state, writer/import, FTS, API, consumer rehearsal, PDF/errata, extraction,
#201/#529 work or deployment ran. Private data was not pushed. The11 private files
were committed with explicit owned paths and commit --only. Raw NUL byte audits
preserve9,406 nonowned index records,1,480 status records,1,441 untracked paths and
39 unrelated staged deletions exactly, including after commit. Snapshots remain
in this checkout's ignored output; adapter replay does not replace that audit.

Measured replay takes about2.74s with
323192KiB peak RSS; private evidence is769108bytes and
current temporary output is approximately2872091bytes.
Private/temp each remain below5MiB; peakRSS remains below512MiB. Complexity is
O(5,606 intake +5,097 targets +selected/necessary-reference volume), using the
maintained full-English loader and one data process. The22.3MB (about21.3MiB) intake is read
in place. Existing runtime/dependencies are reused; no install, DB copy, new
framework or paid API was used. No ROM byte cap applies. Local turn_context
metadata verifies gpt-6.1-sol/high. The worktree remains assigned for review.

For read-only reproduction, save this adapter under the assigned checkout's ignored
`data-tools/out/issue-558/replay-public.ts`. It resolves DATA_REPO_PATH from root
.env and reads operator paths from the committed manifest; it writes no files/DBs.
It binds all11 private files to the exact revision below and replays current inputs.

~~~typescript
import {readFileSync,readdirSync,statSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {isDeepStrictEqual as equal} from 'node:util';import Database from 'better-sqlite3';import {load} from 'cheerio';
import {localDataDir,repoRoot} from '../../src/shared/env';import {loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';import {parseDiceFile} from '../../src/dice-intake/parse';import {reconcile} from '../../src/dice-intake/reconcile';
assert(process.argv[2]==='6607eafc40fbdbf7c7d27741fa68c9a8eb4aaa6e','pass exact private evidence revision');
const started=performance.now(),root=localDataDir(),prefix='dice-baselines/issue-520/qa/books/56/slices/issue-558/',owned=root+'/'+prefix,base=root+'/dice-baselines/issue-520';
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)),j=(p:string)=>JSON.parse(readFileSync(p,'utf8')),norm=(s:string)=>s.replace(/\r\n/g,'\n'),git=(...a:string[])=>execFileSync('git',['-C',root,...a],{maxBuffer:64*1024*1024});
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json'),boundary=j(owned+'/coverage-boundary.json');
for(const b of m.bindings)assert(norm(readFileSync(root+'/'+b.path,'utf8'))===norm(git('show',b.revision+':'+b.path).toString('utf8')),'committed input drift '+b.path);
if(process.argv[2]){assert(/^[a-f0-9]{40}$/.test(process.argv[2]),'exact private evidence revision');for(const file of readdirSync(owned))assert(norm(readFileSync(owned+'/'+file,'utf8'))===norm(git('show',process.argv[2]+':'+prefix+file).toString('utf8')),'exact evidence revision '+file);}
const ids=[709,710,711,712,713,715,716,717,718,720,721,722,723,724,725,733,734,735,736,737,738,739,740,742,743,744,745,746,747,750,751,753,755,756,757,759,760];assert(equal(ids,m.selection.targetIds)&&equal(m.selection.sourceKeys,[])&&m.activation===false&&m.issue===558);
for(const [issue,rev] of [[555,'541d3121c60661cca569c5af2bb3b4e3a0264dfe'],[557,'cf341faed424092642f5e767b53e3237cc8029f3']] as const){const sibling=j(root+'/dice-baselines/issue-520/qa/books/56/slices/issue-'+issue+'/input-manifest.json');assert(!sibling.selection.targetIds.some((id:number)=>ids.includes(id))&&m.acceptedSiblingRevisions.includes(rev));}
const meta=()=>m.readonly.databases.map((d:any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));assert(equal(meta(),m.readonly.databases),'DB metadata before');
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true}),c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});r.pragma('query_only=ON');c.pragma('query_only=ON');assert(r.pragma('query_only',{simple:true})===1&&c.pragma('query_only',{simple:true})===1);
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all(),zh:any[]=c.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' ORDER BY spellId,variant").all(),html=new Map((r.prepare('SELECT id,description_html AS html FROM dnd_spell').all() as any[]).map(t=>[t.id,t.html])),chm=new Map(zh.filter(t=>t.variant==='chm').map(t=>[t.spellId,t]));
const inputs=rows(owned+'/target-inputs.jsonl'),refs=rows(owned+'/referenced-inputs.jsonl'),proposals=rows(owned+'/proposals.jsonl'),reviews=rows(owned+'/reviews.jsonl'),residuals=rows(owned+'/residuals.jsonl'),numeric=rows(owned+'/numeric-checks.jsonl'),names=j(owned+'/reference-name-qa.json');
for(const xs of [inputs,proposals,reviews])assert(equal(xs.map(t=>t.targetId),ids)&&new Set(xs.map(t=>t.targetId)).size===37,'exact coverage');
for(const t of inputs)assert(equal(t.english,en.get(t.targetId))&&t.english.rulebookId===56&&t.english.editionId===5&&t.englishHtml===html.get(t.targetId)&&equal(t.chinese,zh.filter(v=>v.spellId===t.targetId)),'fresh source lock '+t.targetId);
assert(equal(refs.map(t=>t.targetId),[758,2728]));for(const t of refs)assert(equal(t.english,en.get(t.targetId))&&t.englishHtml===html.get(t.targetId),'fresh referenced input');assert(refs[0].english.rulebookId===56&&refs[0].english.editionId===5&&refs[1].english.rulebookId===6);
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl'),files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{const b=readFileSync(root+'/spells-dice-db-by-mo/'+n);assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':spells-dice-db-by-mo/'+n).toString('utf8')),'source frozen');return {bytes:b.length,parsed:parseDiceFile(n,b)};});validateSourceCoverage(files,inventory,candidates);
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null})),replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));assert(equal(replay.candidates,candidates)&&equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl'))&&files.length===105&&en.size===5097&&candidates.length===5606,'maintained full replay');assert(!candidates.some(t=>ids.includes(t.targetId)),'unexpected native candidate');
const outcomes=rows(root+'/dice-qa/books/56/target-outcomes.jsonl');assert(outcomes.length===128&&outcomes.filter(t=>t.sourceKeys.length===0).length===120&&equal(boundary.outsideTargetIds,outcomes.filter(t=>!ids.includes(t.targetId)).map(t=>t.targetId).sort((a,b)=>a-b)),'128 partition');for(const t of boundary.selectedPriorOutcomes)assert(equal(t.record,outcomes.find(x=>x.targetId===t.targetId))&&t.record.fields.name.status==='no-candidate'&&t.record.fields.descriptionHtml.status==='no-candidate','fallback not acceptance');
const plain=(s:string)=>load(s,null,false).root().text(),links=(s:string)=>load(s,null,false)('a').map((_,el)=>load(el).root().children().attr('href')).get(),nums=(s:string)=>s.replace(/"_([^_]+)_":spells\/[^\s]+/g,'$1').replace(/<[^>]*>/g,'').replace(/(?<=\d),(?=\d)/g,'').replaceAll('–','-').replaceAll('×','x').replace(/-\s+(?=\d)/g,'-').match(/[+-]?\d+(?:d\d+)?%?/gi)??[],canon=(xs:string[])=>xs.map(s=>s.replace(/^\+/,'').toLowerCase()).sort(),dice=(s:string)=>(s.match(/\d+d\d+/gi)??[]).map(s=>s.toLowerCase()).sort();
let segments=0,sentences=0,physical=0,nIndex=0;const repeated=new Map<string,Set<string>>();
for(let k=0;k<37;k++){const t=inputs[k],p=proposals[k],v=reviews[k];assert(p.activation===false&&v.activation===false&&equal(p.sourceKeys,[])&&equal(v.sourceKeys,[])&&p.rulebookId===56&&p.editionId===5&&v.name.english===t.english.name&&v.name.after===p.name&&equal(v.name.before,t.chinese.map((t:any)=>t.name)),'actual name');assert((t.targetId===723?p.name===names.nameChanges[0].after&&names.nameChanges[0].before===t.chinese[0].name:p.name===t.chinese[0].name),'bounded name change');assert(v.completeEnglishRead&&v.completeCurrentChineseRead&&v.englishHtmlRead&&v.allMechanicsRead&&v.actualAfterSecondReading&&equal(v.canonicalMechanicsPreserved,t.english.mechanics)&&v.englishBodyPreserved&&v.summaryUntouched&&v.reason.length>50,'full review fields');
 const expectedRefs=t.targetId===724?[2728]:[736,744].includes(t.targetId)?[735]:t.targetId===739?[738]:[756,757].includes(t.targetId)?[758]:[];assert(equal(v.sameVersionReferenceIds,expectedRefs)&&expectedRefs.every(id=>refs.some(t=>t.targetId===id)||inputs.some(t=>t.targetId===id)),'inherited refs');
 assert(equal(links(t.englishHtml),links(p.descriptionHtml)),'link parity');const $=load(p.descriptionHtml,null,false);assert($.root().find('*').toArray().every(el=>['p','ul','li','a','em','table','tbody','tr','th','td'].includes(el.tagName)),'HTML tags');assert(!/(?:\uFFFD|\u0000|TODO|TBD|placeholder|空白占位|待翻译|\[\[|\|_|\*_)/i.test(p.descriptionHtml),'placeholder/raw residue');assert(!/[A-Za-z]{3,}/.test(p.descriptionText.replaceAll('DC','').replaceAll('XP','').replaceAll('d6','')),'untranslated alphabetic residue');
 const stack:string[]=[];for(const x of p.descriptionHtml.matchAll(/<(\/)?([a-z]+)(?:\s[^>]*)?>/g)){if(x[1])assert(stack.pop()===x[2],'HTML nesting');else stack.push(x[2]);}assert(stack.length===0,'HTML closure');assert($.root().find('p,li,tr').map((_,el)=>$(el).text()).get().join('\n\n')===p.descriptionText,'HTML/text parity');
 let sourceCursor=0,afterCursor=0;for(const b of v.bindings){assert(t.english.description.slice(b.start,b.end)===b.source&&b.start>=sourceCursor&&!t.english.description.slice(sourceCursor,b.start).trim(),'source locator');sourceCursor=b.end;const pos=p.descriptionHtml.indexOf(b.afterHtml,afterCursor);assert(b.afterText===plain(b.afterHtml)&&pos>=afterCursor,'actual-after HTML locator');afterCursor=pos+b.afterHtml.length;assert(b.numericMeaningReviewed&&b.negationTimingScopeBonusMaterialsSavingThrowsAndSrReviewed);assert(b.sentences.map((s:any)=>s.source).join(' ').replace(/\s+/g,' ')===b.source.replace(/\s+/g,' ')&&b.sentences.map((s:any)=>s.afterHtml).join('')===b.afterHtml,'source/sentence partition');for(const s of b.sentences){assert(s.reviewed&&s.afterText===plain(s.afterHtml));if(!repeated.has(s.afterText))repeated.set(s.afterText,new Set());repeated.get(s.afterText)!.add(s.source);sentences++;}
  assert(equal(dice(b.source),dice(b.afterText)),'dice parity');const n=numeric[nIndex++];assert(n.targetId===t.targetId&&n.segment===b.segment&&equal(n.sourceNumbers,nums(b.source))&&equal(n.afterNumbers,nums(b.afterText))&&n.humanNumericMeaningReviewed,'numeric exact after');const expected=n.sourceNumbers.slice();if(n.conversion){assert(b.source.includes(n.conversion.sourceNeedle)&&b.afterText.includes(n.conversion.afterNeedle)&&n.conversion.reason.length>10);for(const a of n.conversion.sourceRemove){const q=expected.indexOf(a);assert(q>=0);expected.splice(q,1);}expected.push(...n.conversion.afterAdd);}assert(equal(canon(expected),canon(n.afterNumbers)),'numeric value binding');segments++;
 }
 assert(!t.english.description.slice(sourceCursor).trim()&&plain(p.descriptionHtml).replace(/\s+/g,'')===v.bindings.map((b:any)=>b.afterText).join('').replace(/\s+/g,''),'complete source/actual-after coverage');physical+=t.english.description.split('\n').filter(Boolean).length;
 const rs=residuals.filter(t=>t.targetId===p.targetId);assert(v.materialResidualCount===rs.length&&v.availableBodyComplete===rs.every(t=>t.bodyComplete)&&equal(p.residualFields,rs.flatMap(t=>t.fields))&&p.bodyStatus===(v.availableBodyComplete?'complete-available-DB-English':'partial-or-ambiguous-DB-English'));
}
assert(nIndex===numeric.length&&numeric.filter(n=>n.conversion).length===19);const repeats=[...repeated].filter(([_,ss])=>ss.size>1).map(([t,ss])=>({afterText:t,distinctSourceSentences:ss.size}));assert(repeats.every(t=>t.afterText.length<45),'long template reuse');
assert(equal(residuals.map(t=>t.targetId),[717,722,740,746,747,750,753,755,759])&&residuals.every(t=>t.activation===false&&t.ownerIssue===558&&t.reason.length>100&&t.fallback&&t.locator));for(const x of residuals){const t=inputs.find(t=>t.targetId===x.targetId);assert(x.needles.every((n:string)=>t.english.description.includes(n)),'precise residual locator');}assert(inputs.find(t=>t.targetId===747).english.mechanics.components.material===0);for(const key of ['target','duration','savingThrow','spellResistance'])assert(inputs.find(t=>t.targetId===753).english.mechanics[key]===null);assert(inputs.find(t=>t.targetId===755).english.mechanics.target===null&&inputs.find(t=>t.targetId===755).english.mechanics.range.includes('Area/Effect/Target'));
assert(summary.targets===37&&summary.englishCharacters===33796&&summary.physicalNonemptyLines===physical&&physical===299&&summary.exactSourceSegments===segments&&segments===295&&summary.sentenceBindingGroups===sentences&&sentences===308&&summary.completeAvailableBodies===31&&summary.partialOrAmbiguousBodies===6&&summary.fullyReviewedWithoutMaterialResidual===28&&summary.changedNames===1&&summary.activation===false&&boundary.nativeMatchedSliceReceipt===false&&boundary.wholeBookComplete===false&&boundary.nativeAcceptedFieldsAdded===0);
assert(equal(names.reviewedTargetIds,ids)&&names.activation===false&&names.canonicalWrites===false&&equal(names.inheritedBodyReadIds,[735,738,758,2728])&&names.externalReferences.length===31);for(const lookup of names.lookupNames){const current=(r.prepare('SELECT s.id,s.name,s.rulebook_id AS rulebookId,b.dnd_edition_id AS editionId FROM dnd_spell s JOIN dnd_rulebook b ON b.id=s.rulebook_id WHERE lower(s.name)=lower(?) ORDER BY s.rulebook_id,s.id').all(lookup.lookup) as any[]).map(t=>({...t,chineseNames:c.prepare("SELECT variant,name,sourceKey FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant").all(t.id)}));assert(equal(current,lookup.rows),'name identity drift');}
for(const a of names.externalReferences){const t=inputs.find(t=>t.targetId===a.targetId),v=reviews.find(t=>t.targetId===a.targetId),b=v.bindings[a.segment],n=names.lookupNames.flatMap((t:any)=>t.rows).find((t:any)=>t.id===a.referenceId);assert(n&&equal(a.englishIdentity,{id:n.id,name:n.name,rulebookId:n.rulebookId,editionId:n.editionId})&&equal(a.currentChineseNames,n.chineseNames)&&n.chineseNames.some((t:any)=>t.name===a.selectedChineseName)&&b.afterText.includes(a.selectedChineseName)&&a.actualAfter===b.afterText,'name actual after');assert(a.anchors.length&&a.anchors.every((p:any)=>t.english.description.slice(p.start,p.end).toLowerCase()===a.sourcePhrase),'name source anchor');}
for(const [i,v] of reviews.entries()){assert(v.explicitSpellReferenceNamesReviewed&&equal(v.referenceNameBindingIds,names.externalReferences.filter((t:any)=>t.targetId===v.targetId).map((t:any)=>t.referenceId)));assert(equal(names.coveredTargets[i],{targetId:v.targetId,currentEnglishName:inputs[i].english.name,currentChineseNames:inputs[i].chinese.map((t:any)=>t.name),actualAfterName:v.name.after,nameChanged:v.targetId===723,completeBodyNameReferencesRead:true,externalBindingCount:v.referenceNameBindingIds.length,unresolvedReferenceCount:v.unresolvedReferencePhrases.length}));}
assert(proposals.every(t=>load(t.descriptionHtml,null,false)('table').length===0),'no invented missing tables');assert(summary.afterCharacters===proposals.reduce((n,t)=>n+[...t.descriptionText].length,0));assert(names.unresolvedReferences.length===1&&names.unresolvedReferences[0].targetId===722&&names.lookupNames.find((t:any)=>t.lookup==='cure disease').rows.length===0&&reviews.find(t=>t.targetId===722).bindings[3].afterText.includes(names.unresolvedReferences[0].literalAfterName));
r.close();c.close();assert(equal(meta(),m.readonly.databases),'DB metadata after');const bytes=(p:string):number=>readdirSync(p,{withFileTypes:true}).reduce((n,f)=>n+(f.isDirectory()?bytes(p+'/'+f.name):statSync(p+'/'+f.name).size),0);assert(bytes(owned)<5*1024*1024&&process.resourceUsage().maxRSS<512*1024,'resource budget');
export const result={status:'PASS',checks:['exact37 current English/HTML/mechanics/all-Chinese source locks','committed source/map/alias/intake/book outcome equality','maintained105-file/5606-candidate/5097-target replay','128-target partition:37 selected/91 outside,no native receipt','295 source segments and308 actual-after sentence groups','HTML nesting/text/link/dice parity,no invented tables','295 numeric records with19 explicit conversions','31 reference bindings to22 identities plus cure-disease unresolved','full inherited inputs735/738/758/2728','placeholder/raw residue and repeated-template review','nine precise residual records,activation:false','readonly/query_only size/mtime unchanged'],targets:37,physicalSourceLines:physical,sourceSegments:segments,sentenceBindingGroups:sentences,numericSegments:numeric.length,explicitNumeralConversions:19,referenceBindings:31,distinctReferenceIds:new Set(names.externalReferences.map((t:any)=>t.referenceId)).size,links:proposals.reduce((n,t)=>n+links(t.descriptionHtml).length,0),repeatedShortSentenceGroups:repeats.length,longTemplateReuseGroups:repeats.filter(t=>t.afterText.length>=45).length,elapsedSeconds:(performance.now()-started)/1000,maxRssKiB:process.resourceUsage().maxRSS,privateBytes:bytes(owned)};console.log(JSON.stringify(result));
~~~

From the repository root:

~~~powershell
node node_modules/tsx/dist/cli.mjs data-tools/out/issue-558/replay-public.ts 6607eafc40fbdbf7c7d27741fa68c9a8eb4aaa6e
~~~

From data-tools:

~~~powershell
node ../node_modules/tsx/dist/cli.mjs out/issue-558/replay-public.ts 6607eafc40fbdbf7c7d27741fa68c9a8eb4aaa6e
~~~
