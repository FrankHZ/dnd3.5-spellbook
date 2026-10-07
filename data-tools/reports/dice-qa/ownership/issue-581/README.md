# Issue #581 identity and version dispositions

[Issue #581](https://github.com/FrankHZ/dnd3.5-spellbook/issues/581) selects exactly
42 original ordinal occurrences across nine residual file cohorts. All complete
headers/bodies and source boundaries were read and compared with 137 existing
DB-English bodies, mechanics and HTML versions across 27 publications. This is
identity review against current database inputs, with no original-book claim or
new Chinese semantic acceptance.

| Disposition | Occurrences | Consequence |
| --- | ---: | --- |
| Supported existing-version reference | 7 | Existing targets 3048, 927, 926, 925, 928, 3936, 1408; later field QA remains required |
| Mixed version | 30 | Preserve complete combined entries; no whole-entry owner assigned |
| Indistinguishable reprint | 5 | Complete comparisons do not establish one publication/version |

The seven references rely on complete distinctive class, timing, target and body
envelopes, not names or filenames. The 35 deferrals identify actual mixed rules,
parent-version inheritance or competing reprints after complete reading. Five
duplicate pairs retain ten separate selected occurrences. No database-absent
candidate or new entity is proposed. Concrete gaps in current English tables,
candidate annotations and inherited parent versions remain private per-row
findings; this slice does not correct or translate them.

The selected raw volume is 18,591 characters; complete related English bodies
total 83,258 characters. A concrete reversed-letter spelling lead adds one
target and two outside peers to the initial 136-target / 86-peer budget. All 88
outside peer contexts (31,124 characters) were compared, with exact equal bodies
reusing already-read selected payloads and every differing complete body read.
Peers remain outside this slice's coverage and acceptance. HTML inspection
preserves the one four-row table, checks all current English HTML, and records
source-text/HTML presentation differences without changing canonical fields.

All 33 related SC source-bound envelopes match private accepted revision
`0688739d92a2aa9fb3eceeb444daa7260e711058`: English, HTML and accepted Chinese
name/body/HTML remain exact. No successor exception is required. Seventeen
historical decisions across 77 related targets are bound to the restored source
revision; their old occurrence/map inputs do not establish a new current owner
or accepted Chinese field. Historical fallback is not promoted to acceptance.
Thirty-eight relevant #571/#573/#577 input bindings match current English, HTML
and Chinese baselines exactly. Six belong to #577's unaccepted semantic
proposals; these comparisons confer no new occurrence or field acceptance.

[dispositions.csv](./dispositions.csv) provides ordered original ordinals and
spans, actual dispositions and supported target IDs without source text.
[summary.json](./summary.json) binds the full local-only private evidence commit.
The private package contains full selected occurrences, relevant DB pairs,
complete peer contexts, per-occurrence reasoning and raw line anchors, prior
authority references and nonowned-state protection. Only this issue's directory
is committed privately; the private repository is not pushed.

Disjoint coverage after independent acceptance is
3293 existing-book + 33 #545 + 43 #553 + 58 #563 + 40 #571 + 38 #573 + 52 #579 +
42 this slice + 2007 unseen = 5606. Current unseen remains 2049 until main-gate
accepts this delivery. The inherited 96 identity deferrals and 91 unapplied
references are unchanged; this slice adds 35 and seven respectively, yielding
131 and 98 after acceptance. #575/#577 semantic proposals subtract no additional
occurrences. The 995 outside-book targets retain existing content and scope.

The [read-only verifier](./verify.ts) reuses maintained `parseDiceFile`,
`reconcile`, `candidateRulebook`, `loadEnglishRecords` and source-coverage helpers
for one complete intake replay per invocation. It validates committed bindings,
the exact ordinal selections, disjoint coverage, full current DB pairs, SC
authority, raw anchors, peer equality/reuse, historical nonreuse and
public/private parity. Both operator DBs open readonly/query_only and retain
size/mtime; app-state is unopened. No writer, shared-output regeneration or
native unmatched receipt is invoked.

Raw before/after NUL records preserve every nonowned private index, status and
untracked byte, including 39 unrelated staged deletions and 1441 untracked paths.
All #571/#573/#575/#577/#579 audit files retain size/mtime. The existing ignored
configuration and runtime match retained #577 evidence. Preserve these audits,
all previous evidence and the occupied checkout until main-gate releases it.

Replay measured about 3.4 seconds / 398 MiB peak RSS, with about 1.93 MiB private
and 1.40 MiB ignored evidence, within the 60 seconds / 512 MiB / respective 4 MiB
budgets. One process uses the existing runtime; no installs, corpus/DB copies,
external collection or paid APIs. Read-only local rollout metadata reports
GPT-6.1 Sol/high; main-gate independently verifies the actual configuration.

From the assigned checkout root:

```powershell
$privateRevision = (Get-Content -LiteralPath ./data-tools/reports/dice-qa/ownership/issue-581/summary.json -Raw | ConvertFrom-Json).privateEvidenceRevision
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-581/verify.ts $privateRevision
git diff --check
```

From `data-tools/`, use `../node_modules/.bin/tsx.cmd` with script
`reports/dice-qa/ownership/issue-581/verify.ts` and the same revision. Full remote
`ci:portable` on the final PR head remains the merge gate; any failure,
cancellation or timeout stops without automatic rerun. Main-gate owns acceptance,
merge, issue closeout and residual handoff. Shared map/aliases/intake, accepted
fields, canonical English/mechanics/summaries and all operator DBs stay unchanged.
PHB/PDF, #529 and writer/FTS/API/consumer work remain suspended.
