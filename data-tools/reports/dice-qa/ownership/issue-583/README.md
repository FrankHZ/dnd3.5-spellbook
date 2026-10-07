# Issue #583 bounded current-inventory identity review

[Issue #583](https://github.com/FrankHZ/dnd3.5-spellbook/issues/583) selects all
36 original ordinal occurrences in the assigned Warcraft RPG file, currently
without an owner. Every complete header/body and boundary was read, alongside
40 current DB-English bodies, mechanics and HTML versions across 11 publications,
47 complete outside peer contexts and one peer within the selected slice.

| Outcome | Occurrences |
| --- | ---: |
| Current DB homonym with no equivalent whole envelope | 4 |
| Concrete related versions with materially different mechanics | 21 |
| No current identity lead after bounded lookup | 11 |
| Supported existing-version reference or actual identity deferral | 0 |

All 36 are bounded current-inventory missing findings. This does not claim
universal absence, authentic publication/edition, original-book verification or
permission to create entities. Complete private reasons identify the distinctive
envelope, actual search coverage, rejected counterparts and uncertainty for each
occurrence. Names, Chinese homonyms, filename labels and borrowed paragraphs do
not alone prove identity. No Chinese semantic field is accepted.

Lookup covers all 5,097 current English names using nonempty normalization,
maintained global aliases and intake hints, exact nonempty Chinese names across
stored variants, and normalized peer names across 5,606 frozen candidates.
Specific word-boundary body signatures supplement 15 entries still unlinked
after the first concrete expansion; their two hits were read and compared. Concrete lexical/body leads and
inherited parents expand the initial seven versions / 5,777 English characters
and 12 outside peers / 4,707 raw characters. Final related English volume is
33,553 characters; selected raw headers/bodies total 12,312 and outside peers
17,839. This is a bounded identity search, not an exhaustive semantic comparison
of every differently named spell. Peer coverage and acceptance remain unchanged.

Source internal targeting/formula/component ambiguities, one absent header book
label, an edition comment, and a related DB damage-table gap remain private,
unapplied findings. Parser replay proves complete source spans with no unparsed
span or suspected boundary line. Exact body equality preserves each occurrence
and its header; short inherited entries remain separate occurrences.

Nine related SC English/HTML and accepted Chinese name/body/HTML envelopes match
original source-bound authority `0688739d92a2aa9fb3eceeb444daa7260e711058` exactly;
no accepted successor exception is needed. Five relevant #573/#579 full input
bindings also match. These valid inputs confer no new ownership or semantic
acceptance on the selected occurrences. No historical accepted label or fallback
is promoted.

[dispositions.csv](./dispositions.csv) records each original ordinal and span
without source text; [summary.json](./summary.json) binds the local-only private
evidence revision. Disjoint coverage after independent acceptance is
3293 existing-book + 33 #545 + 43 #553 + 58 #563 + 40 #571 + 38 #573 + 52 #579 +
42 #581 + 36 this slice + 1971 unseen = 5606. Current unseen stays 2007 until
main-gate accepts. The inherited 131 identity deferrals and 98 unapplied
references stay unchanged under #197. #575/#577 subtract no extra occurrences;
995 outside-book targets remain outside automatic semantic QA scope.

The [read-only verifier](./verify.ts) reuses maintained `parseDiceFile`,
`reconcile`, `candidateRulebook`, `loadEnglishRecords` and source-coverage helpers
for one complete intake replay. It checks source/map/intake revisions, selected
spans, complete current pairs, concrete lookups, peers, prior coverage, SC
authority, raw reason anchors and public/private parity. Both operator DBs open
readonly/query_only and retain size/mtime; app-state is unopened.

Raw before/after NUL index mode/blob/stage/path, status and untracked records
preserve all nonowned bytes, including 39 staged deletions and 1,441 untracked
paths. All 21 original NUL audit files from #571/#573/#575/#577/#579/#581 were
directly retained in memory and compared byte-for-byte without backups; their
size and exact nanosecond mtime remain bound. Existing ignored configuration and
runtime match retained #577 evidence. Only the assigned new private directory
is committed with explicit owned staging and `commit --only`; no private push.

Replay uses the existing runtime, one data process, no corpus/DB copy, installs,
external collection or paid API. A small temporary protection observer held
prior audit bytes in memory only. Measured replay is about 3.4 seconds / 382 MiB
peak RSS, private evidence below 1 MiB and ignored output below 3 MiB, within
60 seconds / 512 MiB / respective 3 MiB budgets. Actual local rollout metadata
reports GPT-6.1 Sol/high; independent main-gate verification remains required.

From the assigned checkout root:

```powershell
$privateRevision = (Get-Content -LiteralPath ./data-tools/reports/dice-qa/ownership/issue-583/summary.json -Raw | ConvertFrom-Json).privateEvidenceRevision
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-583/verify.ts $privateRevision
git diff --check
```

From `data-tools/`, use `../node_modules/.bin/tsx.cmd` with script
`reports/dice-qa/ownership/issue-583/verify.ts` and the same private revision.
Full remote `ci:portable` on the final exact PR head is the merge gate; any
failure, cancellation or timeout stops without rerun. Main-gate owns acceptance,
merge, issue closeout and checkout release. Shared map/aliases/intake, canonical
fields, accepted Chinese, summaries and all DBs stay unchanged. PHB/PDF, #529,
writer/FTS/API, activation and deployment remain outside this delivery.
