# Action QA Rollout Evidence

Scope and acceptance belong to [#633](https://github.com/FrankHZ/dnd3.5-spellbook/issues/633),
under [#631](https://github.com/FrankHZ/dnd3.5-spellbook/issues/631). This is
DB-English action context review, without whole-body or original-book acceptance.
Source text, full contexts, queue and proposals remain in the private data repo
under `term-qa/issue-633/`, frozen in evidence revision
`d3688512802bc9321d7c695005da7bb0b201e325`. The maintained command is documented in
[readonly action QA](../operations/action-qa.md).

## Retrieval And Selection

The current readonly inventory covers 5,097 unique canonical identities once,
with effective-row presence before CHM fallback. There are 58 candidate entries
and 66 candidate occurrences. The disjoint initial queue partitions are:

| Status | Identities |
| --- | ---: |
| Previously reviewed current action context | 85 |
| Accepted pending application, excluded from new proposals | 4 |
| Unreviewed candidates | 51 |
| Unreviewed lexical support | 2,955 |
| Unreviewed without seeded action phrases | 1,460 |
| English fallback | 261 |
| Missing Chinese | 281 |

The private ledger preserves overlapping historical membership separately:
#622 actually reviewed 34 of its 100, leaving 66 unreviewed; #626 reviewed 60
held-out and three named follow-ups, including six English fallbacks. All 163
historical input pairs still match current English/selected rows. These numbers
do not add directly because of overlaps and the missing-language partitions.
The four #629 targets remain before-state and accepted-pending; their seven
accepted clauses are neither repeated nor assumed active.

Selection was frozen in private revision
`2c3d59dfeedb3f6988d4d449188c17995070cf89` before semantic review: 42 candidates
and 18 role/condition negative controls, across 27 books. The 60 reviews include
57 new identities and three revisits of unreviewed #622 entries. Family then
book round-robin with descending IDs avoids the earlier low-ID selection but
remains nonrandom. Standard-action book buckets dominate the negative quota;
the next slice should emphasize swift/immediate/no-action controls.

## Contextual Results

| Entry disposition | Entries |
| --- | ---: |
| Clarity-only proposals | 24 |
| Confirmed action discrepancy proposals | 3 |
| Candidate false positives | 11 |
| Unresolved source/version semantics | 4 |
| Readonly SC terminology observation | 1 |
| No action discrepancy observed | 17 |

The 50 selected candidate occurrences split into 27 clarity observations,
16 false positives, two confirmed errors, four unresolved items and one SC
observation. One additional confirmed discrepancy was found among the 18
noncandidate controls: the action label/cost was present but its concentration
requirement was absent. Matching labels therefore do not establish correctness.
No corpus precision or recall is inferred.

Thirty separately reviewable local text/HTML clauses cover 27 targets: three
confirmed discrepancies and 27 clarity edits, with 12 guarded effective updates
and 15 absence-guarded inserts. Full predecessors, raw prior ownership and
canonical mechanics are retained. An independent readonly verifier checks all
60 field edits and 27 compositions against the live before-state. Proposals
remain unaccepted until coordinator review; no writer or operator data changed.
Both SC entries are observations only, retaining their original source-bound
authority. Non-action differences and ambiguous DB English are not normalized.

## Remaining Queue And Cost

Nine unreviewed candidates remain, plus 2,937 unreviewed lexical-support entries,
1,460 unreviewed entries without seeded phrases, and the missing-language groups.
Four selected source/version conflicts and one SC label observation remain
separately unresolved. One clarity proposal also retains an uncertain later
invocation cost. The finite recommendation is all nine remaining candidates
plus 21–31 spread swift/immediate/no-action controls, frozen as a 30–40 entry
slice before review; source conflicts and SC changes need separate ownership.

The approximately 7.71 MiB combined-language input estimate used existing
frequency evidence. Full compact retrieval took about 0.78 seconds, peaked at
177 MiB RSS and emitted about 1.74 MiB including frequency output. Selected
context retrieval took about 39 ms and peaked at 90 MiB; enriched contexts,
decisions, full proposals and queue evidence together stayed below 50 MiB.
The target was below 512 MiB RSS and 50 MiB output, with zero paid bulk-model
API calls. Interactive semantic review time and chat billing were not separately
metered; scan times do not measure that work or human review.

Seeded retrieval misses some plural no-action expressions and generic `1 action`
casting headers, and merged paragraphs/embedded headers inflate counts. No-hit
or lexical-support partitions are unreviewed, not passed. Root/package readonly
replays, synthetic chunk/duplicate/fallback/output regressions and typecheck
validate retrieval behavior; exact-head remote portable CI remains the merge gate.
