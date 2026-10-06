# Issue #545 identity and coverage evidence

[Issue #545](https://github.com/FrankHZ/dnd3.5-spellbook/issues/545) is a bounded
child of [#197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197), under
[#120](https://github.com/FrankHZ/dnd3.5-spellbook/issues/120). This report accounts
for 33 unmatched occurrences and 104 existing targets. It accepts no translated
fields and creates no entities. Private evidence commit: `58d7e6424f16b31492d495a972506455f7d1a823` (local only).
Public files contain IDs/counts/dispositions only; raw text, names, source keys, complete DB snapshots and reasons stay in
`dice-baselines/issue-520/ownership/issue-545/` in the configured private repo.

| Current owner | Occurrences | Targets | Identity disposition |
| --- | ---: | ---: | --- |
| 43 | 6 | 28 | Publication/edition conflict; mapping proposal unapplied |
| 63 | 9 | 0 | Excluded from existing-entity intake; no stored entity |
| 64 | 11 | 0 | 10 cross-publication deferrals; 1 rejected mechanism homonym |
| 79 | 5 | 75 | Publication/edition conflict; mapping proposal unapplied |
| 102 | 1 | 0 | Publication/version gap across two distinct reprints |
| 112 | 1 | 1 | Unique same-publication spelling handoff proposed, unapplied |

All 33 raw headers/bodies and boundaries were read. Counts: 22 evidence-backed
deferrals, 9 exclusions, 1 rejected identity attachment and 1 proposed handoff.
The private reasons distinguish missing entities, edition conflicts, semantic
mechanism differences, references and alias spelling. No parser boundary defect
was found in these six files; all occurrences and nine equal/two unequal
cross-publication duplicate bodies remain separately traceable. CHM name lookup
has two incidental substring hits in unrelated publications, no identity proof.

All 104 targets have current English name/body fallback; none has a current
Chinese text in any variant or an attached candidate. Current ownership remains
43:28, 79:75, 112:1. `target-coverage.csv` records every ID; `dispositions.csv`
uses the exact private decision row order, without publishing source locators.
The full English/mechanic snapshots make this availability/identity check
repeatable. They do not establish complete translation or semantic QA.

The unapplied planar proposal affects exactly 11 effective header-label inputs
in the full ledger, not just a filename subset. All complete entries have
unique other-book English identities and distinctive corresponding body and
mechanic evidence; edition presentation differences and publication authority
still require main-gate acceptance. It directly affects books 43/79 and no
currently matched accepted candidate. A shared map revision would nevertheless
invalidate global input bindings used by earlier #520-native validators; preserve
historical accepted evidence and re-evaluate affected consumers against a fresh
baseline after approval. It does not authorize reopening accepted SC or PHB.

The book 112 proposal affects one occurrence/target 4957 only. Same stored
publication/edition, unique identity and full body/mechanics support the spelling
repair. Existing aliases provide hints only, so an alias addition alone cannot
attach a QA/import candidate. The narrow attachment mechanism requires separate
approval; no broad whitespace parser change is proposed.

Later work: books 43/79 need publication/edition disposition followed by full
DB-English QA for 103 targets (including 92 without proposed candidates); book 112
needs its spelling handoff followed by 1-target semantic QA. The 9 book63 entries
are excluded from current-entity intake, with no new-entity authority. Book 64's
publication conflict belongs to197/201 and retains #195/110 evidence. Book 102's
version gap retains books 37/72 and #151 evidence. None is silently handed off.
The other 2,280 residual candidates and 995 targets remain unprocessed/pending or
already suspended. #529 and PHB extraction/translation remain paused.

The complete partition is 5,606=3,293+33+2,280 candidates and
5,097=3,998+104+995 targets. Maintained parser/source coverage/reconcile helpers
replayed all 105 TXT files with exact candidate and target equality. Inputs bind
prepared revision `6d28f9391273979a35a6bcc86971f0aac5b9f2c8` and source/map revision
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`; public base is
`1fdc731b02297ae731d31cef6d5e46bed33c8681`. Physical ledger is 22,292,460 bytes;
source TXT is 5,544,957 bytes; selected raw content is 11,446 characters,
maximum 636. Initial replay took 2.914s with 322,332KiB peak RSS. Delivery and
ignored outputs remain below 3 MiB each. One data process, existing runtime,
no database/source copy or paid external API. Rules/content were read-only and
query-only; DB size/mtime remained unchanged. App-state was never opened.

Private unrelated state: raw NUL before/after audit preserves every existing
index mode/blob/stage/path, status and untracked path. Actual initial state was
39 staged deletions and 1,441 untracked files. Only owned paths are staged and
committed with `--only`; private evidence is not pushed. Model/effort requested
was GPT-6.1 Sol/medium. Local rollout `turn_context` metadata verified actual
`gpt-6.1-sol` with `medium` effort for this thread.

To replay read-only from this checkout with its existing runtime and configured
root `.env`, save the following source-free adapter to the ignored
`data-tools/out/issue-545/verify.ts`. It calls maintained helpers and writes no
corpus, evidence or DB output. Pass the exact private SHA recorded in
`summary.json`; the committed evidence comparison then runs before DB queries.
Do not run intake regeneration or semantic QA against shared/accepted inputs.

```typescript
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as equal} from 'node:util';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {localDataDir} from '../../src/shared/env';
import {parseDiceFile} from '../../src/dice-intake/parse';
import {reconcile} from '../../src/dice-intake/reconcile';
import {candidateRulebook,loadEnglishRecords,validateSourceCoverage} from '../../src/dice-intake/qa';
const root=localDataDir(),base=root+'/dice-baselines/issue-520',owned=base+'/ownership/issue-545';
const j=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const rows=(p:string)=>readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));
const m=j(owned+'/input-manifest.json'),summary=j(owned+'/review-summary.json');
const candidates=rows(base+'/intake/candidates.jsonl'),inventory=rows(base+'/intake/source-inventory.jsonl');
const norm=(s:string)=>s.replace(/\r\n/g,'\n');
const git=(...args:string[])=>execFileSync('git',['-C',root,...args],{maxBuffer:32*1024*1024}).toString('utf8');
for(const b of m.bindings)assert(norm(readFileSync(root+'/'+b.path,'utf8'))===norm(git('show',b.revision+':'+b.path)),'input revision drift');
if(process.argv[2])for(const file of readdirSync(owned))assert(norm(readFileSync(owned+'/'+file,'utf8'))===norm(git('show',process.argv[2]+':dice-baselines/issue-520/ownership/issue-545/'+file)),'evidence revision drift');
const files=readdirSync(root+'/spells-dice-db-by-mo').filter(n=>n.endsWith('.txt')).sort().map(n=>{
 const b=readFileSync(root+'/spells-dice-db-by-mo/'+n);
 assert(norm(b.toString('utf8'))===norm(git('show',m.sourceRevision+':spells-dice-db-by-mo/'+n)),'source revision drift');
 return {bytes:b.length,parsed:parseDiceFile(n,b)};
});
validateSourceCoverage(files,inventory,candidates);
const r=new Database(m.readonly.databases[0].path,{readonly:true,fileMustExist:true});
const c=new Database(m.readonly.databases[1].path,{readonly:true,fileMustExist:true});
r.pragma('query_only=ON');c.pragma('query_only=ON');
const en=loadEnglishRecords(r),books:any[]=r.prepare('SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook').all();
const zh=new Map<number,any>((c.prepare("SELECT spellId,rulebookId,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh' AND variant='chm'").all() as any[]).map(t=>[t.spellId,t]));
const targets=[...en].map(([id,e])=>({id,rulebookId:e.rulebookId,enName:e.name,zhName:zh.get(id)?.name??null,zhBody:zh.get(id)?.descriptionText??null}));
const replay=reconcile(files.flatMap(f=>f.parsed.records),j(root+'/dice-intake/publication-map.json'),books,targets,m.sourceRevision,j(root+'/chm-mapping/enName-aliases-global.json'));
assert(equal(replay.candidates,candidates),'candidate replay drift');
assert(equal(replay.targetDispositions,rows(base+'/intake/target-inventory.jsonl')),'target replay drift');
const scope=m.byBook.map((b:any)=>b.rulebook.id),selected=candidates.filter(t=>scope.includes(candidateRulebook(t)));
assert(equal(selected,rows(owned+'/occurrences.jsonl')),'selected occurrence drift');
assert(new Set(candidates.map(t=>t.sourceKey)).size===5606&&selected.length===33,'candidate partition');
const decisions=rows(owned+'/dispositions.jsonl'),coverage=rows(owned+'/target-coverage.jsonl');
assert(decisions.length===33&&new Set(decisions.map(d=>d.sourceKey)).size===33,'decision coverage');
assert(decisions.every(d=>selected.some(t=>t.sourceKey===d.sourceKey)&&d.completeRawHeaderAndBodyRead&&d.applied===false&&d.semanticAccepted===false),'decision boundaries');
assert(coverage.length===104&&new Set(coverage.map(t=>t.targetId)).size===104,'target coverage');
assert(equal(coverage.map(t=>t.targetId),targets.filter(t=>scope.includes(t.rulebookId)).map(t=>t.id)),'target ownership');
for(const t of coverage){
 assert(equal(t.english,en.get(t.targetId))&&equal(t.chinese,zh.get(t.targetId)??null),'target input drift');
 assert(t.englishNameAvailable&&t.englishBodyAvailable&&!t.currentCandidateKeys.length&&!t.candidateOwners.length,'fallback gap');
 assert(!(c.prepare("SELECT spellId FROM I18nSpellText WHERE lang='zh' AND spellId=?").all(t.targetId)).length,'Chinese fallback changed');
}
for(const t of rows(owned+'/related-db-inputs.jsonl'))assert(equal(t.english,en.get(t.targetId))&&equal(t.chinese,zh.get(t.targetId)??null),'related identity input drift');
const proposals=j(owned+'/unapplied-proposals.json');
const labels=proposals[0].suggestedRows.map((v:any)=>v.file.replace(/\.txt$/,''));
assert(equal(candidates.filter(t=>(t.sourceBookLabels.length?t.sourceBookLabels:[t.file.replace(/\.txt$/,'')]).some((l:string)=>labels.includes(l))).map(t=>t.sourceKey),proposals[0].allAffectedSourceKeys),'map impact drift');
const alias=proposals[1],nameKey=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');
assert([...en].filter(([id,e])=>nameKey(e.name)===nameKey(alias.from)).length===1&&en.get(alias.targetId)?.rulebookId===alias.rulebookId&&en.get(alias.targetId)?.editionId===alias.editionId,'alias uniqueness/publication');
for(const d of rows(owned+'/duplicate-comparison.jsonl')){
 const a=candidates.find(t=>t.sourceKey===d.sourceKey),b=candidates.find(t=>t.sourceKey===d.peerSourceKey);
 assert(a&&b&&(a.rawBody===b.rawBody)===d.rawBodyEqual&&(a.bodyText===b.bodyText)===d.bodyTextEqual,'duplicate drift');
}
const hits=rows(owned+'/chm-identity-checks.jsonl'),chm=readdirSync(root+'/chm-clean').filter(f=>f.endsWith('.htm')).map(f=>({file:f,lines:readFileSync(root+'/chm-clean/'+f,'utf8').split(/\r?\n/)}));
for(const h of hits)assert(equal(h.exactSubstringHits,chm.flatMap(f=>f.lines.flatMap((text,line)=>h.searchNames.filter(Boolean).some((n:string)=>text.toLowerCase().includes(n.toLowerCase()))?[{file:f.file,line:line+1,text}]:[]))),'CHM reference drift');
const book66=[58,7,8,9,10,12,14,16,19,20,22,23,24,25,26,27,28,30,33,34,37,38,39,44,47,48,49,51,52,53,54,55,56,57,60,61,62,65,66,67,68,69,70,71,72,74,75,80,81,82,83,84,85,86,87,89,92,93,94,95,96,98,101,105,110,153];
assert(scope.every((id:number)=>!book66.includes(id)),'overlapping books');
assert(candidates.filter(t=>book66.includes(candidateRulebook(t)!)).length===3293&&candidates.filter(t=>!book66.includes(candidateRulebook(t)!)&&!scope.includes(candidateRulebook(t))).length===2280,'candidate partition');
assert(targets.filter(t=>book66.includes(t.rulebookId)).length===3998&&targets.filter(t=>!book66.includes(t.rulebookId)&&!scope.includes(t.rulebookId)).length===995,'target partition');
assert(summary.semanticAccepted===0&&summary.targetCoverage.semanticReviewPending===104,'acceptance boundary');
r.close();c.close();console.log('PASS: committed inputs, maintained replay,33 dispositions,104 current fallback snapshots,related identity/CHM/duplicate bindings,proposal impact and5606/5097 partition; zero semantic acceptance');
```

```powershell
& ./node_modules/.bin/tsx.cmd ./data-tools/out/issue-545/verify.ts <privateEvidenceCommit>
git diff --check
```

Full remote `ci:portable` at the final PR head is the merge gate; its exact run
is recorded in the PR. No local full suite is needed for this report-only change.
No self-merge, issue closeout, mapping application or production write is implied.
