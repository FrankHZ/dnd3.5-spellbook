# Issue #579 identity dispositions

[Issue #579](https://github.com/FrankHZ/dnd3.5-spellbook/issues/579) reviews exactly
52 frozen null-owner occurrences, original ordinals 1–52 in the selected aggregate.
All complete raw headers/bodies and boundaries, 21 current DB-English bodies,
mechanics and HTML versions, and 17 complete peer contexts were read. Raw volume
is 13,005 characters and the related English bodies total 28,765 characters.
Full source-bearing evidence and per-row reasoning remain private.

| Outcome | Occurrences | Meaning |
| --- | ---: | --- |
| Excluded from current existing-entity intake | 44 | No supported current entity; includes four demonstrated homonym conflicts |
| Referenced publication/version unresolved | 7 | Rows 11, 15, 21, 24, 36, 49, 50 have related current entities but insufficient version binding |
| Parser title and entity unresolved | 1 | Row 48 preserves its complete span; an embedded alias prevents normal English-name parsing |
| Supported existing-version reference | 0 | No new attachment or semantic acceptance |

The private missing-entity inventory has 45 candidates: the 44 exclusions and
row 48. Absence is bounded to current 5,097-target English names, maintained
name/alias hints, exact current Chinese names and concrete alternative spellings
or body references. Each entry records the actual checks, rejected alternative
IDs, confidence and limitations. This does not prove absence under unknown,
unindexed aliases. Publication or new-entity/English preparation requires a later
scope decision; no entities or IDs were created.

The initial ten target leads were expanded to 21 through explicit body references,
reversed or related names, and one exact Chinese-name lead. Each additional
version was fully compared. The 17 initial peer contexts contain 12 real same-name
contexts and five unrelated malformed/null-name collisions. All were read; the
five collisions are explicitly rejected as identity evidence. No peer occurrence
is counted or accepted. Repeated Chinese titles remain separate occurrences.

The evidence shows a consistent specialist-class context, internal monster
references and legacy rule wording. It does not authenticate an exact publication,
edition or printing. Sparse cross-references cannot substitute current full
English rules for an unverified version. The malformed title is recovered only
in private review evidence: parser, aliases, publication map and intake remain
unchanged. No external source or original-book verification was performed.

The two related SC envelopes, targets 4438 and 3909, match accepted private
`0688739d92a2aa9fb3eceeb444daa7260e711058` English, English HTML and accepted Chinese
name/body/HTML. No successor exception was needed. No accepted Chinese field is
reused as a new owner, and historical fallback is not promoted to acceptance.
Other shared accepted evidence remains protected by the unchanged inputs and
nonowned Git-state audit.

[dispositions.csv](./dispositions.csv) lists ordered spans, actual dispositions
and related target IDs without source text. [summary.json](./summary.json) binds
the local-only private evidence revision. The eight deferrals remain concrete
identity residuals under #197; the excluded candidates require a separately
scoped publication/entity decision before reconsideration. There are no new
unapplied references or Chinese proposals.

The disjoint partition after independent acceptance is
3293 existing-book occurrences + 33 #545 + 43 #553 + 58 #563 + 40 #571 + 38 #573 +
52 this review + 2049 unseen = 5606. Parent unseen stays 2101 until main-gate accepts
this slice. The issue's prior 88 identity deferrals and 91 unapplied references
remain unchanged; this slice adds eight reviewed deferrals, yielding 96 under
that inherited baseline. #575/#577 semantic proposals cause no extra subtraction.
The 995 outside-book targets remain untouched. PHB and #529 remain suspended;
writer, FTS, API and consumer rehearsal are outside this delivery.

The bounded [read-only verifier](./verify.ts) reuses maintained parse/reconcile,
candidateRulebook, loadEnglishRecords and source-coverage checks for one full
intake replay per invocation. It checks committed input bindings, all per-row
anchors, actual current DB pairs, exact accepted SC fields, public/private parity
and the partition. Both operator DBs open readonly/query_only, with unchanged
size/mtime; app-state is unopened. The verifier produces no files and invokes no
shared-output CLI.

Raw before/after NUL audits compare every nonowned index, status and untracked
record. All 39 unrelated staged deletions and 1441 unrelated untracked paths stay
exact. The original #571/#573/#575/#577 audit files retain their size and mtime.
Preserve this issue's ignored audits and all prior evidence until main-gate releases
the checkout; its independent review owns acceptance, merge and issue closeout.

Measured replay is about 3.1 seconds and 371 MiB peak RSS, with 0.57 MiB private
and 1.39 MiB temporary evidence, within the 60 seconds / 512 MiB / 3 MiB budgets.
One process uses the existing runtime; no installation, corpus/DB copies or paid
external API calls. Read-only local rollout metadata confirms GPT-6.1 Sol/high;
main-gate independently verifies the actual task configuration.

```powershell
$privateRevision = (Get-Content -LiteralPath ./data-tools/reports/dice-qa/ownership/issue-579/summary.json -Raw | ConvertFrom-Json).privateEvidenceRevision
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-579/verify.ts $privateRevision
git diff --check
```

Full remote `ci:portable` is required on the exact final PR head. The PR records
its run; any failure, cancellation or timeout stops without automatic rerun.
Refs #579 / #197 / #120.
