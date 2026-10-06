# Issue #563 candidate identity evidence

[Issue #563](https://github.com/FrankHZ/dnd3.5-spellbook/issues/563) reviews
exactly58 previously unassigned occurrences under #197 / #120. The file cohort
is a selection boundary, not evidence of publication ownership. Private evidence
is owned only under `dice-baselines/issue-520/ownership/issue-563/`; source text,
full version comparisons, source keys and individual clause reasons stay private.
The exact local-only private revision is recorded in [summary.json](./summary.json).

| Disposition | Occurrences | Effect |
| --- | ---: | --- |
| Proposed existing-version reference | 44 | Existing book86 identity, unapplied |
| Evidence-based deferral | 14 | Preserve alternative versions and fallback |

All58 complete headers/bodies were individually compared with144 current
DB-English/mechanic version records. One additional existing record identifies
foreign-body contamination; two same-version inherited references are separately
bound.85 peer contexts are preserved without claiming review or acceptance of
those other occurrences. [dispositions.csv](./dispositions.csv) matches the exact
private decision order, ordinals, line ranges and IDs; it contains no source text.

The14 deferrals comprise9 mixed publication metadata,3 indistinguishable or
corrupt reprints,1 mixed-spell body and1 mislabelled duplicate version segment.
Rows4/8/10/21/30/32/39/40/43 retain incompatible version fields or explicitly
annotated alternatives;17/18/22 cannot distinguish the reprint;52 has a body from
another already-accepted existing target;58 has misleading version labels and
repeated segments. They have concrete comparisons and exact line anchors, not
generic pending-review notes. Row23 has no existing book54 name match; the
positive existing book86 identity does not create a new entity or map authority.

Of the44 references,22 use distinctive full-text lineage while acknowledging
shared substantive rules. The other22 have a positive rules/header difference
or existing identity with no alternative target. Equal reprint rules alone never
select a publication. An identity proposal does not approve candidate translation
errors, replace accepted effective text or add accepted target coverage.

57 selected book54 inputs match accepted #161 / PR535 English, mechanics, HTML
and CHM fields exactly at `e0fdc03e36690afa2afb633a8f9cb630a0beecdf`. Its70-target
semantic review and unactivated proposals remain unchanged.59 selected SC
envelopes (58 name matches plus the contamination reference) match current
English and effective name/body exactly at
`0688739d92a2aa9fb3eceeb444daa7260e711058`, preserving their original source-bound
authority. The additional book56 target uses exact #555 evidence
`541d3121c60661cca569c5af2bb3b4e3a0264dfe` and #561 closeout
`5bdeab2366f048ef15bda45dd0bc086a9b844c08`. No genuinely unreviewed existing
target was discovered, and no body translation batch was reopened.

This is DB-English identity review, with no new original-book verification.
All proposals remain `activation:false` and `applied:false`; no semantic field
is newly accepted. The frozen5606-row ledger remains unchanged. The disjoint
partition is3293 existing-book occurrences +33 #545 +43 #553 +58 #563 +2179
unreviewed occurrences. The14 reviewed deferrals remain unresolved, and44
references still require later attachment acceptance.995 outside-book existing
targets remain untouched. PHB and #529 remain suspended; QA precedes integration.

Normalized body text is16,486 characters; raw body including final newlines is
16,544; header plus raw body is18,407. Hints cover116 targets/73,605 English
characters; explicit name lookup adds28 targets, yielding87,097 body characters.
The contamination reference adds759 and inheritance adds2,457. One process used
the existing runtime with no installation, DB copies or paid external APIs.
Private/temp outputs stay below5MiB each and peak RSS below512MiB. Actual measured
validation resources are recorded in the summary; input extraction took2.76s
with316,932KiB peak RSS. Actual local `turn_context` verifies `gpt-6.1-sol/high`.

Both operator DBs were readonly/query_only; their size/mtime remained unchanged.
No app-state, canonical English/mechanics/summary writes, importer, FTS, API,
consumer rehearsal or deployment occurred. Raw NUL nonowned index/status/untracked
audits preserve9,428 index records,1,480 status records,1,441 untracked paths and39
staged deletions. Only explicitly owned private paths are committed locally;
the private repository is not pushed.

For readonly reproduction, save the adapter below in this checkout's ignored
`data-tools/out/issue-563/readonly.ts`, then pass the exact private revision from
the summary. It uses `.env`, maintained helpers and existing dependencies;
it writes no DBs or files. The separate original raw NUL audit remains in the
assigned ignored output and is summarized in private/public verification.

```powershell
& ./node_modules/.bin/tsx.cmd ./data-tools/out/issue-563/readonly.ts <private-revision>
git diff --check
```

Full remote `ci:portable` on the final exact PR head remains the merge gate.
The PR records its run. Any remote failure/cancel/timeout stops without retry;
main-gate owns acceptance, merge and closeout.

```typescript
import {readFileSync,readdirSync,statSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {isDeepStrictEqual as equal} from 'node:util';import Database from 'better-sqlite3';
import {localDataDir,repoRoot} from '../../src/shared/env';import {candidateRulebook,loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';import {parseDiceFile} from '../../src/dice-intake/parse';import {reconcile} from '../../src/dice-intake/reconcile';
const started=performance.now(),root=localDataDir(),base=root+'/dice-baselines/issue-520',prefix='dice-baselines/issue-520/ownership/issue-563/',owned=root+'/'+prefix,out=repoRoot()+'/data-tools/out/issue-563',pub=repoRoot()+'/data-tools/reports/dice-qa/ownership/issue-563';
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)),j=(p:string)=>JSON.parse(readFileSync(p,'utf8')),norm=(s:string)=>s.replace(/\r\n/g,'\n'),git=(...args:string[])=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
const bound=(p:string,rev:string)=>{const s=readFileSync(root+'/'+p,'utf8');assert(norm(s)===norm(git('show',rev+':'+p).toString('utf8')),'committed input drift '+p);return s;};
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json');for(const b of m.bindings)bound(b.path,b.revision);
if(process.argv[2])for(const file of readdirSync(owned))bound(prefix+file,process.argv[2]);
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl'),files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{const p='spells-dice-db-by-mo/'+n,b=readFileSync(root+'/'+p);assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':'+p).toString('utf8')),'source drift');return {bytes:b.length,parsed:parseDiceFile(n,b)};});validateSourceCoverage(files,inventory,candidates);assert(files.length===105&&files.reduce((n,f)=>n+f.bytes,0)===m.sourceBytes);
const meta=()=>m.readonly.databases.map((d:any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));assert(equal(meta(),m.readonly.databases),'DB metadata changed');
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true}),c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});r.pragma('query_only=ON');c.pragma('query_only=ON');assert(r.pragma('query_only',{simple:true})===1&&c.pragma('query_only',{simple:true})===1);
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all(),html=new Map((r.prepare('SELECT id, CAST(description_html AS BLOB) AS html FROM dnd_spell').all() as any[]).map(t=>[t.id,t.html?.toString('utf8')??null]));
const zh:any[]=c.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh'").all(),chm=new Map(zh.filter(t=>t.variant==='chm').map(t=>[t.spellId,t]));
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null})),replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));assert(equal(replay.candidates,candidates)&&equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl')),'maintained full replay drift');
const selected=candidates.filter(t=>t.file===m.selection.file&&candidateRulebook(t)===null),keys=selected.map(t=>t.sourceKey),ordinals=[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,28,29,34,35,36,37,38,39,40,41,42,43,44,45,46,47,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,67,68,69],lines=[15,27,41,53,64,78,89,112,126,139,150,164,178,191,204,218,229,241,255,265,281,293,337,349,409,422,435,448,466,479,492,505,518,529,541,552,563,574,600,614,626,640,658,671,684,697,710,727,738,749,762,775,788,802,814,842,854,868];
assert(selected.length===58&&new Set(keys).size===58&&equal(selected,rows(owned+'/occurrences.jsonl'))&&equal(keys,m.selection.sourceKeys)&&equal(selected.map(t=>t.ordinal),ordinals)&&equal(selected.map(t=>t.startLine),lines),'exact issue scope');assert(selected.every(t=>t.targetId===null)&&selected.reduce((n,t)=>n+[...t.rawHeader+t.rawBody].length,0)===18407);assert(selected.reduce((n,t)=>n+[...t.rawBody].length,0)===m.bodyCharacters);
const gp=m.globalPartition,prior=gp.priorEvidence.map((v:any)=>({issue:v.issue,rows:bound(v.path,v.revision).trim().split(/\r?\n/).map(l=>JSON.parse(l))})),p545=prior.find((v:any)=>v.issue===545).rows,p553=prior.find((v:any)=>v.issue===553).rows,b545=JSON.parse(bound(gp.priorEvidence[0].manifestPath,gp.priorEvidence[0].revision)),scope545=b545.byBook.map((v:any)=>v.rulebook.id),bookScope=candidates.filter(t=>gp.bookScope.includes(candidateRulebook(t))),outsideKeys=new Set([...p545,...p553,...selected].map(t=>t.sourceKey));
assert(equal(p545,candidates.filter(t=>scope545.includes(candidateRulebook(t))))&&equal(p553,candidates.filter(t=>t.file==='完美神力.txt'&&candidateRulebook(t)===null))&&p545.length===33&&p553.length===43&&bookScope.length===3293&&outsideKeys.size===134&&!bookScope.some(t=>outsideKeys.has(t.sourceKey)),'overlapping prior/slice ownership');assert(candidates.filter(t=>!gp.bookScope.includes(candidateRulebook(t))&&!outsideKeys.has(t.sourceKey)).length===2179&&new Set(candidates.map(t=>t.sourceKey)).size===5606&&3293+33+43+58+2179===5606);assert(targets.filter(t=>gp.bookScope.includes(t.rulebookId)).length===3998&&targets.filter(t=>scope545.includes(t.rulebookId)).length===104&&targets.filter(t=>!gp.bookScope.includes(t.rulebookId)&&!scope545.includes(t.rulebookId)).length===995&&scope545.every((id:number)=>!gp.bookScope.includes(id)),'5097target partition');assert(selected.reduce((n,t)=>n+[...t.bodyText].length,0)===16486&&m.bodyTextCharacters===16486);
const related=rows(owned+'/related-db-inputs.jsonl'),extra=rows(owned+'/additional-db-inputs.jsonl'),inherited=rows(owned+'/inherited-db-inputs.jsonl'),lookups=rows(owned+'/identity-lookups.jsonl');assert(related.length===144&&extra.length===1&&inherited.length===2&&new Set([...related,...extra,...inherited].map(t=>t.targetId)).size===147);
for(const t of [...related,...extra,...inherited]){assert(equal(t.english,en.get(t.targetId))&&t.englishHtml===html.get(t.targetId),'complete English/mechanics/HTML drift '+t.targetId);if(t.book)assert(equal(t.book,books.find(b=>b.id===t.book.id))&&equal(t.chinese,zh.filter(z=>z.spellId===t.targetId)),'version/Chinese drift');}
const canon=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');for(const [i,l] of lookups.entries()){assert(l.sourceKey===keys[i]);const s=selected[i],ids=[...new Set([...s.nameHintTargetIds,...s.aliasHintTargetIds,...[...en].filter(([id,e])=>canon(e.name)===canon(s.enName)).map(([id])=>id)])];assert(equal(ids,l.relatedTargetIds),'explicit-name lookup drift');}
assert(extra[0].targetId===4300&&equal(extra[0].usedByRows,[52])&&/one-way communication/.test(extra[0].english.description));assert(equal([...en].filter(([id,e])=>/one.way/i.test(e.description)&&/allies/i.test(e.description)).map(([id])=>id),[4300]));assert(inherited.every(t=>t.english.rulebookId===6)&&equal(inherited.map(t=>t.targetId),[2676,2811]));
const ds=rows(owned+'/dispositions.jsonl'),proposed=ds.filter(t=>t.handoff),deferred=ds.filter(t=>!t.handoff);assert(equal(ds.map(t=>t.sourceKey),keys)&&proposed.length===44&&deferred.length===14);assert(equal(deferred.map(t=>t.row),[4,8,10,17,18,21,22,30,32,39,40,43,52,58]));
for(const [i,d] of ds.entries()){const s=selected[i],l=lookups[i];assert(d.row===i+1&&d.ordinal===s.ordinal&&d.startLine===s.startLine&&d.endLine===s.endLine&&d.completeRawHeaderAndBodyRead&&d.completeRelatedDbEnglishAndMechanicsRead&&d.activation===false&&d.applied===false&&d.semanticAccepted===false&&d.newFieldsAccepted===0&&d.newNativeReceipt===false&&d.reason.length>150);assert(equal(d.relatedTargetIds,l.relatedTargetIds)&&equal(d.alternatives.map((t:any)=>t.targetId),l.relatedTargetIds));for(const a of d.alternatives){const t=related.find(t=>t.targetId===a.targetId);assert(a.rulebookId===t.book.id&&a.editionId===t.book.editionId&&a.fullEnglishAndMechanicsCompared&&a.snapshotRef==='related-db-inputs.jsonl:'+(related.indexOf(t)+1));}assert(d.locators.length>=2);for(const a of d.locators)assert(a.file===s.file&&a.line>s.startLine&&a.line<=s.endLine&&s.rawBody.split('\n')[a.line-s.startLine-1]===a.text&&a.text.includes(a.needle),'exact source locator drift');if(d.handoff)assert(d.status==='proposed-handoff'&&d.handoff.targetId===d.relatedTargetIds.find((id:number)=>en.get(id)?.rulebookId===86)&&d.handoff.activation===false&&d.handoff.applied===false&&d.handoff.newTargetCoverage===false);else assert(d.status==='deferred'&&d.unresolved===d.reason);assert(equal(d.inheritedTargetIds,inherited.filter(t=>t.usedByRows.includes(i+1)).map(t=>t.targetId))&&equal(d.additionalTargetIds,extra.filter(t=>t.usedByRows.includes(i+1)).map(t=>t.targetId)));}
const peers=rows(owned+'/duplicate-peers.jsonl'),dups=rows(owned+'/duplicate-comparison.jsonl');assert(peers.length===85&&dups.length===85);for(const p of peers)assert(equal(p,candidates.find(t=>t.sourceKey===p.sourceKey)));for(const d of dups){const a=selected.find(t=>t.sourceKey===d.sourceKey),b=peers.find(t=>t.sourceKey===d.peerSourceKey);assert(a&&b&&(a.rawBody===b.rawBody)===d.rawBodyEqual&&(a.bodyText===b.bodyText)===d.bodyTextEqual&&d.peerWriteOrAcceptance===false);}
const boundary=j(owned+'/source-boundaries.json'),f=files.find(f=>f.parsed.file===m.selection.file)!;assert(f.parsed.unparsedSpans.length===0&&equal(f.parsed.unparsedSpans,boundary.unparsedSpans)&&f.bytes===boundary.bytes&&f.parsed.lineCount===boundary.lineCount&&equal(boundary.selected,selected.map(t=>({sourceKey:t.sourceKey,ordinal:t.ordinal,startLine:t.startLine,endLine:t.endLine,suspectedBoundaryLines:t.suspectedBoundaryLines}))));
const props=j(owned+'/unapplied-proposals.json');assert(props.activation===false&&props.applied===false&&props.semanticAcceptance===false&&equal(props.suggestedReferences,proposed.map(t=>t.handoff))&&equal(props.deferredKeys,deferred.map(t=>t.sourceKey))&&[props.mapChanges,props.aliasChanges,props.targetAttachmentsApplied,props.newEntities].every(t=>t.length===0));
const ca=rows(owned+'/accepted-adventurer-references.jsonl');assert(ca.length===57);const first=ca[0],caInputs=bound(first.inputPath,first.revision).trim().split(/\r?\n/).map(l=>JSON.parse(l)),caReviews=JSON.parse(bound(first.reviewPath,first.revision)),caProposals=bound(first.proposalPath,first.revision).trim().split(/\r?\n/).map(l=>JSON.parse(l));
for(const v of ca){const d=related.find(t=>t.targetId===v.targetId),z=chm.get(v.targetId);assert(v.revision==='e0fdc03e36690afa2afb633a8f9cb630a0beecdf'&&equal(v.input,caInputs[v.inputLine-1])&&equal(v.review,caReviews[v.reviewIndex])&&equal(v.proposal,v.proposalLine?caProposals[v.proposalLine-1]:null)&&equal(v.input.english,d.english)&&v.input.englishHtml===d.englishHtml&&v.input.baselineName===z.name&&v.input.baselineBody===z.descriptionText&&v.input.baselineHtml===z.descriptionHtml&&Object.values(v.matches).every(Boolean));assert(v.review.targetId===v.targetId&&equal(v.review.input,v.input));}
const sc=rows(owned+'/accepted-sc-references.jsonl');assert(sc.length===59);const s0=sc[0],scInputs=JSON.parse(bound(s0.inputPath,s0.revision)).inputs,fields=bound(s0.fieldPath,s0.revision).trim().split(/\r?\n/).map(l=>JSON.parse(l));for(const v of sc){const z=zh.find(t=>t.spellId===v.targetId&&t.variant==='effective');assert(v.revision==='0688739d92a2aa9fb3eceeb444daa7260e711058'&&equal(v.englishInput,scInputs.find((t:any)=>t.targetId===v.targetId).english)&&equal(v.englishInput,en.get(v.targetId))&&equal(v.fields,fields.filter((t:any)=>t.targetId===v.targetId))&&Object.values(v.matches).every(Boolean));assert(v.fields.length===2&&v.fields.find((t:any)=>t.field==='name').text===z?.name&&v.fields.find((t:any)=>t.field==='body').text===z?.descriptionText);}
const cd=rows(owned+'/accepted-divine-references.jsonl');assert(cd.length===5&&cd.every(t=>t.targetId===707));for(const v of cd){const all=bound(v.path,v.revision).trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));assert(equal(v.record,v.line?all[v.line-1]:null));if(v.path.endsWith('target-inputs.jsonl')){const d=related.find(t=>t.targetId===707);assert(equal(v.record.english,d.english)&&v.record.englishHtml===d.englishHtml&&equal(v.record.chinese,d.chinese));}}
for(const d of ds)for(const a of d.acceptedVersionReferences){const all=a.kind==='accepted-sc'?sc:a.kind==='accepted-adventurer'?ca:cd;const v=all[a.line-1];assert(v?.targetId===a.targetId&&v.revision===a.revision);if(a.kind!=='accepted-divine')assert(equal(a.inputMatches,v.matches)&&Object.values(a.inputMatches).every(Boolean));}
assert(summary.newTargets===0&&summary.newSemanticAcceptedFields===0&&summary.appliedMappingsAliasesAttachments===0&&summary.genuineUnreviewedExistingTargetsDiscovered===0&&summary.totalFrozenCandidates===5606&&summary.totalExistingTargets===5097&&summary.proposedHandoffs===44&&summary.deferred===14&&summary.remainingUnreviewedOccurrences===2179&&summary.outsideBookTargetsUntouched===995&&m.partition.previousResidualCandidates===2237&&m.partition.selectedCandidates===58&&m.partition.pendingCandidates===2179&&candidates.length===5606&&en.size===5097);
const csv=readFileSync(pub+'/dispositions.csv','utf8').trim().split('\n');assert(csv.length===59);for(const [i,d] of ds.entries())assert(csv[i+1]===[d.row,d.ordinal,d.startLine,d.status,d.reasonCode,d.handoff?.targetId??'',d.handoff?.rulebookId??'',false,false,false].join(','));const ps=j(pub+'/summary.json');for(const [k,v] of Object.entries(summary))assert(equal(ps[k],v),'public summary drift '+k);
r.close();c.close();assert(equal(meta(),m.readonly.databases),'DB metadata changed during replay');

console.log('PASS: committed evidence, maintained full replay, exact58 dispositions,147DB snapshots,85peers,accepted version envelopes,global partition,public parity and unchanged readonly DB metadata');
```
