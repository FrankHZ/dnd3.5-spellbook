# Finite Action QA Remainder

[Issue #635](https://github.com/FrankHZ/dnd3.5-spellbook/issues/635) is the
second finite review under [#631](https://github.com/FrankHZ/dnd3.5-spellbook/issues/631).
It follows the [first rollout](action-qa-rollout.md). Its comparison baseline is
complete aligned database English/mechanics and the actual current Chinese row,
not original-book verification or whole-body acceptance.

## Frozen selection and input boundary

Private selection revision `34d2a36061511e844111f8d52d0c743eebc93f1a` freezes
30 identities before semantic reading: all nine remaining candidates
443/498/525/2166/2167/2168/4935/4936/4945, plus seven previously unreviewed
controls each for swift, immediate and no-action contexts. Controls use book
round-robin, alternating variant preference and descending-ID ties. The sample
is intentionally nonrandom; no corpus precision or recall estimate follows.

There are 21 new entries and nine revisits of previously unreviewed #622 sample
members, across 16 books: four selected CHM rows and 26 effective rows. Prior
sample membership is not a QA pass. Three SC controls are readonly observations.

The #633 inventory/queue at private revision
`d3688512802bc9321d7c695005da7bb0b201e325` was reused. An inexpensive readonly
check found unchanged identity, book, selected-variant and language boundaries
for all 5,097 entries, and unchanged complete predecessors for 64 historical
review/accepted-pending entries. Only the frozen 30 contexts were retrieved and
enriched; affected seeded findings still matched the prior inventory. No new
full action/frequency scan or full semantic batch was run.

## Local results

| Decision | Entries / clauses |
| --- | ---: |
| Clarity-only proposals | 10 / 10 |
| Confirmed mechanical errors | 0 / 0 |
| No action discrepancy observed in reviewed context | 20 |
| Remaining candidate occurrences reviewed as clarity-only | 9 |

The ten targets comprise eight guarded effective-row updates and two
absence-guarded inserts. Text and HTML each have an independently checked,
single local replacement with complete canonical mechanics, selected/effective
predecessors, provenance and composed after-bodies retained privately. The
proposals are unaccepted and unactivated. They do not overlap the 31 targets
already accepted but pending activation under #629 and #633.

The nine remaining candidates concern standard casting labels and free-action
command wording. Control 818 adds a local clarification distinguishing two
full rounds of casting from two full-round actions; it is not classified as a
confirmed mechanical error. A separate non-action geometry/self-exclusion
residual on that entry remains untouched and coordinator-owned.

No-discrepancy observations apply only to the reviewed action roles, counts,
conditions and negations. They do not approve whole bodies. Five entries retain
explicit field uncertainty: 4208/687 lack an available Chinese casting header;
954/987/948 have generic DB-English action headers that do not establish the
action family. Unknown fields are not passes. The SC observations on
4208/4591/3946 do not change existing source-bound acceptance.

## Seed gaps and remaining queue

Entry 899 contains a plural prohibition on other actions until the next turn,
preserved in Chinese but omitted by the fixed seeds. Three selected generic
casting headers also lack family retrieval. These observations justify a
separately bounded detector correction: retrieve the plural prohibition and
flag generic casting family as unknown. This ticket adds no detector machinery
and no new inventory wave. The exact plural phrase “no actions” was not observed
in this selection and is not claimed to have been tested against real content.

All nine named candidates now have dispositions. The full queue still has
5,097 unique identities, partitioned as follows; zero unreviewed seeded
candidates does not imply corpus acceptance.

| Queue partition | Entries |
| --- | ---: |
| Historical previously reviewed | 85 |
| No seeded action, unreviewed | 1,460 |
| Lexical support, unreviewed | 2,916 |
| Accepted, pending activation | 31 |
| English fallback | 261 |
| Missing Chinese | 281 |
| Reviewed local action context, no discrepancy observed | 37 |
| This slice's clarity-only proposals, pending review | 10 |
| Earlier unresolved source semantics | 4 |
| Earlier false positives | 11 |
| Earlier readonly SC clarity observation | 1 |

Version/source conflicts 1992/1024/1534/1964, the later invocation cost on 624,
and SC observation 3913 remain unresolved under #631. Missing Chinese,
fallbacks and unreviewed lexical/no-seed entries retain their own partitions.

## Validation, resources and next ownership

Private evidence is confined to `DATA_REPO_PATH/term-qa/issue-635/`.
The complete review/evidence revision is
`3e5ba3d5c7a86a67b41a54461eebb968c26fc8be`.
Independent readonly SQLite verification checks all 30 complete current
predecessors, 20 exact text/HTML edits, ten compositions, the full unique-ID
partition and exclusion of all 31 accepted-pending targets. Maintained portable
action-QA regressions pass. Operator database metadata stayed unchanged;
database writes and paid bulk-model API calls were zero.

Preflight took about 70 ms at 85 MiB peak RSS; maintained context retrieval
about 36 ms at 91 MiB, producing 210 KiB; enrichment about 64 ms at 115 MiB,
producing 688 KiB. These are measured processing stages, not interactive review
time or billing. Initial budgets were 512 MiB peak memory and 50 MiB output.
The evidence directory measured approximately 5.6 MiB before commit.
Sparse language comparisons still examine total text; per-entry rich retrieval
uses existing helpers and is not asserted to be a linear full-corpus algorithm.

Main-gate independently reviews the exact local clauses and exact-head remote
`ci:portable`. After acceptance, the concrete next delivery is separately scoped
fixed safe patch preparation for the accepted #633 and #635 clauses, retaining
actual before-state and independent text/HTML guards. The #629 four-target
writer remains fixed and unactivated. Main-gate owns source/version residuals,
the non-action residual, detector follow-up and any further expansion. No DB
copy/import, canonical/mechanics/summary/CHM mutation, writer change, production
activation or PHB extraction/translation resumption occurs here.
