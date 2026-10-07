# Issue #571 identity review

[Issue #571](https://github.com/FrankHZ/dnd3.5-spellbook/issues/571) covers exactly
40 previously unassigned occurrences, with the 38 remaining occurrences left for
a later slice. All 40 complete raw headers/bodies were compared with 111 current
DB-English/mechanics/HTML versions across 14 publications and 61 peer contexts.
The full evidence stays private. This report contains no source text.

| Outcome                            | Occurrences | Effect                                   |
| ---------------------------------- | ----------: | ---------------------------------------- |
| Existing book 55 version reference |          15 | Unactivated identity proposal            |
| Existing SC version reference      |           3 | Unactivated identity proposal            |
| Mixed-version defer                |          14 | Preserve explicit conflicting versions   |
| Indistinguishable-reprint defer    |           8 | Preserve unresolved publication identity |

The 14 mixed rows are 1, 6, 8, 14, 19, 22, 25, 26, 29, 31, 34, 37, 38, 40. The 8 reprint rows are
4, 11, 13, 15, 17, 24, 33, 35. Each private disposition includes concrete full-version
comparisons and exact source anchors. Supported references use positive header,
rule or distinctive wording evidence; shared substantive rules and filename/name
leads alone do not choose a publication. Source publication claims, intended
version, existing target and prior accepted fields are recorded separately.

40 current SC envelopes bind exact accepted English/name/body inputs, preserving
the original source-bound authority. Three current differences from the original
snapshot bind accepted successors for 3930/4354/3901 from #461/#467/#476, including
complete current English and Chinese pairs. No original-book QA is newly claimed.
40 related book 55 targets instead have 80 historical fallback outcomes and zero
accepted replacement fields to reuse. The original #162 accepted Git object is
unavailable; the six recovered files are bound at the surviving revision, and
are not relabelled current accepted-input receipts. This slice does not reopen
book 55 semantic work or replace SC fields. Current CHM copies may contain cross-
version material; preserving fallback does not certify their quality.

All 40 occurrences remain natively unmatched. New entities, native attachments,
new accepted fields and activation are zero. [dispositions.csv](./dispositions.csv)
gives exact ordered source boundaries and IDs without source content.
[summary.json](./summary.json) records the local-only private revision and counts.
Frozen source/map/alias/intake and shared acceptance files remain unchanged.

The disjoint partition is 3293 existing-book occurrences + 33 #545 + 43 #553 + 58 #563
+ 40 this review + 2139 unreviewed, totaling 5606. Parent #197 unseen 2179 becomes 2139
only after independent acceptance of this 40; 22 reviewed deferrals still remain
unresolved and 18 references remain unapplied. #565/#567/#569 add no second count.
The 995 outside-book targets remain untouched. PHB and #529 remain suspended;
QA precedes writer/FTS/API/consumer integration.

Actual English bodies total 90,311 characters, versus the issue's approximate
89,642 estimate; the maintained lookup includes 111 versions versus 108 preliminary
leads. This bounded expansion adds no translation targets. Raw header/body is
16,052 characters. Readonly replay took 3.51 s with 379,664 KiB peak RSS; private evidence
is about 1.9 MB and ignored output about 1.2 MB, within 3 MiB/512 MiB budgets. One process,
existing dependencies, no installation, DB copies or paid external API.

Both operator DBs were readonly/query_only with unchanged size/mtime. Raw NUL
nonowned audits preserve 9,484 index records, 1,480 status records, 1,441 untracked
paths and 39 staged deletions. The original audit remains in this held checkout's
ignored output; do not remove it before acceptance. No app-state, canonical
English/mechanics/summary writes, new entities, imports, FTS, APIs, rehearsal, PHB/PDF,
web collection or production work occurred.

Run the bounded [readonly adapter](./verify.ts) from the configured checkout with
the exact private revision from the summary. It reuses maintained parsing,
source coverage, reconcile, candidateRulebook and loadEnglishRecords; it produces
no files and never invokes a shared-output CLI. The original raw NUL audit must
remain in `data-tools/out/issue-571/` for its nonowned-state check.

```powershell
$privateRevision = (Get-Content -LiteralPath ./data-tools/reports/dice-qa/ownership/issue-571/summary.json -Raw | ConvertFrom-Json).privateEvidenceRevision
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-571/verify.ts $privateRevision
git diff --check
```

Full remote `ci:portable` on the exact final PR head is required; the PR records
its run. Any failure, cancel or timeout stops without automatic retry. Main-gate
owns independent acceptance, merge and issue closeout. Refs #571 / #197 / #120.
