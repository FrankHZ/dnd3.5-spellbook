# Issue #553 candidate identity evidence

[Issue #553](https://github.com/FrankHZ/dnd3.5-spellbook/issues/553) accounts for
43 previously unassigned candidate occurrences under #197 / #120. The input-file
cohort selects rows; it supplies no publication authority. Private evidence commit:
`5003f08e833f51fa7e12063f40f58adadb20496e` (local only), owned exclusively under
`dice-baselines/issue-520/ownership/issue-553/` in the configured private repo.
Names, source locators, complete raw/DB text and individual reasons stay private.

All 43 complete headers/bodies (16,033 characters) and 127 related full current
DB-English/mechanic records were read. Two inherited records and 74 cross-file
peer comparisons are separately bound. There are no parser boundary gaps in this
file. Public `dispositions.csv` has exactly the private decision order and IDs.

| Disposition | Occurrences | Effect |
| --- | ---: | --- |
| Proposed handoff | 16 | Identity references to existing book86 targets |
| Evidence-based deferral | 27 | Preserve version alternatives and current fallback |

The 27 deferrals comprise 21 mixed or misattributed publication inputs, four
indistinguishable reprints (including two inherited forms), one conflicting
cross-version reference and one unmapped-label/reprint ambiguity. Full evidence
and exact line anchors explain each; these are not generic pending-review notes.
The 16 proposals have positive textual/mechanic differences or complete SC text
lineage, not an arbitrary choice between equal reprint rules. The five lineage
proposals distinguish the complete wording while acknowledging shared mechanics.
No target or translated field is newly accepted; all attachments remain unapplied.

Rows18/26/33 explicitly address spelling, publication-label and absent-hint
cases. Row18 already has spelling aliases but still contains multiple versions.
Row26 has an unapplied book72 label proposal corroborated by a mapped cross-file
peer; its book56/72 full-body ambiguity remains even if that label is accepted.
Row33 uses direct complete DB lookup and distinctive book86 evidence despite
absent hints. The private proposal inventories every affected label occurrence.
Any shared map change requires separate approval and fresh global input binding;
this report changes no map, alias, parser, intake or accepted QA file.

Existing book56 acceptance (#163 / PR #203) is reused as a coverage/fallback
boundary: these 43 targets had no matched candidate and no complete-body pass.
Existing source-bound SC candidate `0688739d92a2aa9fb3eceeb444daa7260e711058`
retains its authority. All 86 selected name/body envelopes match current effective
fields. English is exact for42/43; target3934 differs by an introductory article,
with mechanics unchanged. That mismatch is explicit, not relabeled as exact reuse.
This is DB-English identity work, with no new original-book verification or SC QA.

This cohort is a subset of2,280 residual occurrences, leaving2,237 other
occurrences untouched. The27 deferrals remain unresolved for integration; the16
references also require later attachment acceptance. Existing target inventory
remains5,097,including995 outside-book targets untouched. There is no new coverage
of previously accepted SC targets. #529 and PHB work remain paused.

Prepared input is `6d28f9391273979a35a6bcc86971f0aac5b9f2c8`; source/map is
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`; public base is
`25730444f6d6df684620d3c8b0efc9d3dde8d476`. Maintained parse/source coverage and
reconcile helpers replay all105 source files with exact5,606 candidate/5,097 target
equality. Both operator DBs were readonly/query_only; size/mtime were unchanged.
App-state, writers/importers, FTS, APIs, consumer rehearsals and deployment were
not accessed. Canonical English, mechanics, summaries and accepted SC fields are
unchanged.

Initial comparison measured160,425 English/mechanic characters,2.51s and302,896KiB
peak RSS. Committed-evidence validation took3.27s and380,952KiB; private evidence
is1,954,224bytes and ignored output about3.37MB. One process and the existing shared
runtime were used, without installations, database copies or paid external APIs.
Raw NUL index/status/untracked snapshots preserve all nonowned records exactly:
9,367 index records,1,480 status records,1,441 untracked paths and39 staged deletions.
Only17 owned private files were committed with explicit paths and `commit --only`;
the private repo was not pushed. Local `turn_context` metadata verified requested
`gpt-6.1-sol` with `high` effort for this chat.

For read-only reproduction, save the adapter below to the assigned checkout's
ignored `data-tools/out/issue-553/verify.ts` and pass the exact private evidence
commit. It uses the checkout's `.env` and existing dependencies. It writes no
outputs or DBs. The separate raw NUL audit remains in the assigned ignored output
and is summarized in private/public verification evidence. No shared-output
writer, intake regeneration or accepted QA command is required.

```typescript
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {isDeepStrictEqual as equal} from 'node:util';import Database from 'better-sqlite3';
import {localDataDir,repoRoot} from '../../src/shared/env';import {candidateRulebook,loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';import {parseDiceFile} from '../../src/dice-intake/parse';import {reconcile} from '../../src/dice-intake/reconcile';
const start=performance.now(),root=localDataDir(),base=root+'/dice-baselines/issue-520',owned=base+'/ownership/issue-553',out=repoRoot()+'/data-tools/out/issue-553',prefix='dice-baselines/issue-520/ownership/issue-553/';
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)),j=(p:string)=>JSON.parse(readFileSync(p,'utf8')),norm=(s:string)=>s.replace(/\r\n/g,'\n'),git=(...args:string[])=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json');
for(const b of m.bindings)assert(norm(readFileSync(root+'/'+b.path,'utf8'))===norm(git('show',b.revision+':'+b.path).toString('utf8')),'binding drift');
if(process.argv[2])for(const file of readdirSync(owned))assert(norm(readFileSync(owned+'/'+file,'utf8'))===norm(git('show',process.argv[2]+':'+prefix+file).toString('utf8')),'evidence revision drift '+file);
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl');
const files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{const b=readFileSync(root+'/spells-dice-db-by-mo/'+n);assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':spells-dice-db-by-mo/'+n).toString('utf8')),'source drift');return {bytes:b.length,parsed:parseDiceFile(n,b)};});validateSourceCoverage(files,inventory,candidates);
const meta=()=>m.readonly.databases.map((d:any)=>({path:d.path,size:statSync(d.path).size,mtimeMs:statSync(d.path).mtimeMs}));assert(equal(meta(),m.readonly.databases),'DB changed since initial read');
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true}),c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});r.pragma('query_only=ON');c.pragma('query_only=ON');assert(r.pragma('query_only',{simple:true})===1&&c.pragma('query_only',{simple:true})===1);
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all(),zh:any[]=c.prepare("SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh'").all(),chm=new Map(zh.filter(t=>t.variant==='chm').map(t=>[t.spellId,t]));
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:chm.get(id)?.name??null,zhBody:chm.get(id)?.descriptionText??null})),replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));assert(equal(replay.candidates,candidates)&&equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl')),'maintained replay drift');
const selected=candidates.filter(t=>t.file===m.selection.file&&candidateRulebook(t)===null);assert(equal(selected,rows(owned+'/occurrences.jsonl'))&&equal(selected.map(t=>t.sourceKey),m.selection.sourceKeys)&&selected.length===43,'exact scope');assert(new Set(selected.map(t=>t.sourceKey)).size===43&&selected.reduce((n,t)=>n+[...t.rawHeader+t.rawBody].length,0)===16033);
const related=rows(owned+'/related-db-inputs.jsonl');assert(related.length===127&&new Set(related.map(t=>t.targetId)).size===127);for(const t of related)assert(equal(t.english,en.get(t.targetId))&&equal(t.book,books.find(b=>b.id===t.book.id))&&equal(t.chinese,zh.filter(v=>v.spellId===t.targetId)),'related DB drift '+t.targetId);for(const t of rows(owned+'/inherited-db-inputs.jsonl'))assert(equal(t.english,en.get(t.targetId)),'inherited DB drift');
const ds=rows(owned+'/dispositions.jsonl'),lookups=rows(owned+'/identity-lookups.jsonl');assert(equal(ds.map(t=>t.sourceKey),m.selection.sourceKeys));assert(ds.filter(t=>t.status==='proposed-handoff').length===16&&ds.filter(t=>t.status==='deferred').length===27);for(const [i,d] of ds.entries()){const s=selected[i];assert(d.completeRawHeaderAndBodyRead&&d.completeRelatedDbEnglishAndMechanicsRead&&d.applied===false&&d.semanticAccepted===false&&d.reason.length>150);assert(equal(d.relatedTargetIds,lookups[i].relatedTargetIds)&&d.relatedTargetIds.every((id:number)=>related.some(t=>t.targetId===id)));for(const l of d.locators)assert(l.file===s.file&&l.line>s.startLine&&l.line<=s.endLine&&s.rawBody.split('\n')[l.line-s.startLine-1]===l.text&&l.text.includes(l.needle),'locator drift');if(d.handoff)assert(d.handoff.rulebookId===en.get(d.handoff.targetId)?.rulebookId&&d.handoff.rulebookId===86&&d.relatedTargetIds.includes(d.handoff.targetId));else assert(d.unresolved===d.reason);}
const peers=rows(owned+'/duplicate-peers.jsonl'),dups=rows(owned+'/duplicate-comparison.jsonl');assert(peers.length===74&&dups.length===74);for(const p of peers)assert(equal(p,candidates.find(t=>t.sourceKey===p.sourceKey)),'peer drift');for(const d of dups){const a=selected.find(t=>t.sourceKey===d.sourceKey),b=peers.find(t=>t.sourceKey===d.peerSourceKey);assert(a&&b&&(a.rawBody===b.rawBody)===d.rawBodyEqual&&(a.bodyText===b.bodyText)===d.bodyTextEqual&&d.peerWriteOrAcceptance===false);}
const boundary=j(owned+'/source-boundaries.json'),f=files.find(f=>f.parsed.file===m.selection.file)!;assert(f.parsed.unparsedSpans.length===0&&equal(f.parsed.unparsedSpans,boundary.unparsedSpans)&&f.bytes===boundary.bytes&&f.parsed.lineCount===boundary.lineCount&&boundary.selected.length===43);
const props=j(owned+'/unapplied-proposals.json');assert(props.every((p:any)=>p.applied===false));assert(equal(props[0].suggestedRows.map((t:any)=>t.sourceKey),ds.filter(t=>t.handoff).map(t=>t.sourceKey)));assert(equal(props[1].allAffectedSourceKeys,candidates.filter(t=>t.sourceBookLabels.includes(props[1].from)).map(t=>t.sourceKey)));
for(const name of ['existing-qa-references','existing-target-outcomes']){const values=rows(owned+'/'+name+'.jsonl'),cache=new Map();for(const v of values){const k=v.revision+':'+v.path;if(!cache.has(k)){const current=readFileSync(root+'/'+v.path,'utf8');assert(norm(current)===norm(git('show',k).toString('utf8')),'existing QA file drift');cache.set(k,rows(root+'/'+v.path));}assert(equal(v.record,cache.get(k).find((q:any)=>q.targetId===v.targetId)??null),'existing QA row drift');}}
const sc=rows(owned+'/accepted-sc-references.jsonl'),first=sc[0],rev=first.revision,inputs=j(root+'/'+first.inputPath).inputs,fields=rows(root+'/'+first.fieldPath);for(const p of [first.inputPath,first.fieldPath])assert(norm(readFileSync(root+'/'+p,'utf8'))===norm(git('show',rev+':'+p).toString('utf8')),'selected SC envelope drift');assert(sc.length===43);for(const v of sc){const z=zh.find(t=>t.spellId===v.targetId&&t.variant==='effective');assert(equal(v.englishInput,inputs.find((t:any)=>t.targetId===v.targetId).english)&&equal(v.fields,fields.filter(t=>t.targetId===v.targetId))&&equal(v.englishInput,en.get(v.targetId))===v.englishEqual);assert(equal(v.fieldMatchesCurrent,v.fields.map((t:any)=>({field:t.field,equal:t.text===(t.field==='name'?z?.name:z?.descriptionText)})))&&v.fieldMatchesCurrent.every((t:any)=>t.equal),'SC current field changed');}assert(sc.filter(t=>t.englishEqual).length===42&&!sc.find(t=>t.targetId===3934).englishEqual);
assert(summary.newTargets===0&&summary.newSemanticAcceptedFields===0&&summary.appliedMappingsAliasesAttachments===0);assert(candidates.length===5606&&en.size===5097&&m.partition.previousResidualCandidates===2280&&m.partition.pendingCandidates===2237&&m.partition.outsideBookTargetsUntouched===995);
r.close();c.close();assert(equal(meta(),m.readonly.databases),'DB metadata changed');
console.log('PASS: committed inputs/evidence, maintained full replay,43 dispositions,129 DB snapshots,74 peer comparisons,unapplied proposal impact,existing QA/SC envelopes,readonly metadata and unchanged inventory');
```

```powershell
& ./node_modules/.bin/tsx.cmd ./data-tools/out/issue-553/verify.ts 5003f08e833f51fa7e12063f40f58adadb20496e
git diff --check
```

Full remote `ci:portable` on the final PR head is the merge gate. Its exact run
belongs in the PR. This delivery does not merge or close the issue; main-gate
reviews the actual evidence and controls acceptance/integration.