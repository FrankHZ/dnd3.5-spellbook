# Issue #573 identity review

[Issue #573](https://github.com/FrankHZ/dnd3.5-spellbook/issues/573) covers the
remaining 38 null-owner occurrences in the selected aggregate file. All complete
raw headers/bodies/boundaries, 107 actual current DB-English/mechanics/HTML
versions across nine publications, and 63 complete peer contexts were compared.
Raw header/body volume is 15,089 characters; English bodies total 76,839 characters
and peer header/body volume is 22,618 characters. Full evidence stays private.

| Outcome | Occurrences | Effect |
| --- | ---: | --- |
| Existing book 55 version reference | 13 | Unapplied identity reference |
| Mixed-version defer | 21 | Keep explicit alternative versions |
| Indistinguishable-reprint defer | 4 | Keep unresolved publication identity |

Supported rows are 1, 3, 5, 8, 11, 19, 25, 26, 27, 29, 31, 32, 33. They use positive
class, distinctive rule, component, or exact cross-reference evidence. Reprint
rows are 16, 20, 23, 24; the other 21 preserve mixed headers, annotated rule
changes, or parallel publication-specific text. The private per-row rationale
records all actual alternatives, concrete Chinese gaps and exact source anchors.
Filename, shared mechanics, missing SC vignette and newer dates do not choose a
publication. Publication claims, intended version, existing target and previous
accepted field ownership remain separate. All 38 remain natively unmatched.

38 SC envelopes match their accepted English and Chinese name/body/HTML fields.
One English difference, target 3958, binds the exact accepted
[#434 successor](https://github.com/FrankHZ/dnd3.5-spellbook/issues/434#issuecomment-5972281973):
private `790f9ebbd024916d16577d69c01d868155a9ccfd` candidate, with the owner acceptance
snapshot at `7f8ea2df1104fe4345141f0712dbb43739e98b7e`. Its Chinese fields and original
source question retain their source-bound authority. This review performs no new
original-book verification and accepts no new Chinese field.

The 38 related book 55 targets have 76 historical fallback outcomes and zero
accepted replacement fields. [book55-targets.csv](./book55-targets.csv) lists every
target, its identity-reference status and pending semantic QA owner #120. The
13 supported references still need later semantic QA; the other 25 additionally
need identity resolution under #197. Recovered #162 files are bound at source
revision `47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`, while the original accepted
object is unavailable. Historical labels and current CHM copies are not current
accepted-input receipts. No second field owner or translated hybrid is created.

[dispositions.csv](./dispositions.csv) gives exact ordered boundaries and IDs
without source text. [summary.json](./summary.json) binds the local-only private
evidence commit. Prior #571's accepted 40 are reused at private
`8dca5f2eeec8d794adcea65a0a961623156dc000`, without new semantic review or counting.
The previous 40 and this 38 exactly partition all 78 null-owner occurrences in
this file. Six already reviewed parent-version inputs are reused for inheritance
comparisons only; peer occurrences are not accepted or counted by this review.

The disjoint partition is 3293 existing-book occurrences + 33 #545 + 43 #553 +
58 #563 + 40 #571 + 38 this review + 2101 unseen = 5606. Parent #197 unseen remains
2139 until independent acceptance, then becomes 2101. Reviewed deferrals remain
unresolved and all 13 references remain unapplied. #565/#567/#569 cause no second
subtraction. The 995 outside-book targets are untouched. PHB and #529 remain
suspended; QA precedes writer, FTS, API and consumer integration.

The bounded [read-only adapter](./verify.ts) reuses maintained parsing, source
coverage, reconcile, candidateRulebook and loadEnglishRecords. It produces no
files and invokes no shared-output CLI. It verifies committed inputs, exact
38/40 partition, current DB pairs and accepted fields, related versions/peers,
source locators, public/private parity and raw nonowned Git state. Both operator
DBs were readonly/query_only with unchanged size/mtime; app-state was untouched.
All 39 staged deletions and 1441 unrelated untracked paths remain exact. Preserve
both this review's ignored NUL audits and the original #571 audits: that older
accepted verifier still depends on its original files.

Measured replay is about 3.5 seconds and 388 MiB peak RSS, with about 1.8 MiB
private evidence and 1.1 MiB temporary evidence, within the issue's 60 seconds /
512 MiB / 3 MiB budgets. One data process, reused dependencies, no installation,
DB copies, corpus copies, new generic framework or paid external API. Shared
source/map/alias/intake/canonical inputs, DBs and acceptance packages were not
modified. No new entities, translations, import, rehearsal or production work.

```powershell
$privateRevision = (Get-Content -LiteralPath ./data-tools/reports/dice-qa/ownership/issue-573/summary.json -Raw | ConvertFrom-Json).privateEvidenceRevision
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-573/verify.ts $privateRevision
git diff --check
```

Full remote `ci:portable` on the exact final PR head is mandatory; the PR records
its run. Failure, cancellation or timeout stops without automatic rerun.
Main-gate owns independent acceptance, merge, issue closeout and checkout release.
Refs #573 / #197 / #120.
