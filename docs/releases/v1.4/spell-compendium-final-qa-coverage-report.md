# SC current source-QA coverage audit

[Issue #344](https://github.com/FrankHZ/dnd3.5-spellbook/issues/344) audits the
frozen delivery for [#342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
It does **not** certify full bilingual QA completion. The
[exact source-free map](../../../data-tools/reports/dice-qa/books/86/final-qa-coverage.json)
lists every target disposition, current summary key, old residual and suggested
batch. Source text and full field bindings remain private.

## What the existing evidence proves

| Surface | Exact current coverage and limit |
| --- | --- |
| Original universe | 1,001 SC entries; 1,002 existing book-86 DB targets. 4837 is outside SC. |
| English name/body/HTML and mechanics | All 1,001 complete original-entry records match current maintained fields. Original dispositions remain 775 source-correct / 210 corrected / 16 unresolved for English and 841 / 124 / 36 for mechanics. Matching fields proves reuse, not resolution of the unresolved source/relationship questions. |
| Accepted Chinese changes | 41 names and 985 bodies match Git-bound native/independent ledgers plus ten amendments. Native bodies additionally match all 652 full-body audits before amendments; the amendments retain exact prior owners/rows. |
| 961 retained names | **948** match the exact source-reviewed name and original-entry record. Three names remain terminology questions, nine lack Chinese, and 4837 lacks SC identity. Excluded native name decisions alone are not quality passes. |
| Summaries | 1,700 maintained rows: 780 English and 920 Chinese. The 29 accepted original-source corrections (12 EN / 17 ZH) match their current text and stable keys. **1,671 rows across 967 targets lack a located exact current source-summary pass.** This is missing reusable certification, not a claim that all those summaries are incorrect or were never read. |

The read-only operator baseline matches the frozen 1,002-row baseline. Comparing
the maintained 315 guarded patch operations as Python values, plus current CHM
fields, reproduces the entire accepted current-input snapshot. No patch SQL,
writer, importer, database backup or operator mutation ran. Thus “current” means
the accepted maintained delivery after those declared corrections, rather than
pretending the still-unactivated operator artifact already contains them.

The original source remains the SC December 2005 first printing and complete
official errata. A fresh extraction replay compared 311 explicitly bound SC/PHB/
errata pages and 48,094 spans, and rechecked printing/errata against the
Git-authenticated authority record. Old ignored extraction caches were comparison
aids only: no historical Git continuity or new semantic rereview is claimed.
Old CHM, dice and English DB values are comparison inputs, not final authority.

## The 17 retained body dispositions

| Exact IDs | Current disposition |
| --- | --- |
| 3855, 4546, 4583, 4726, 4761 | Complete retained text matches its source-correct #259 review. Current CHM HTML has identical text under the existing effective-projection whitespace parity boundary. The old joint record did not bind that HTML; this is text/representation evidence, not a new visual HTML review. |
| 3997, 4097 | Existing operative DMG expansions lack original-source proof. [#347](https://github.com/FrankHZ/dnd3.5-spellbook/issues/347) now owns faithful SC replacement; retaining only named DMG references is authorized, without authenticating removed expansion. In progress, unaccepted at this audit baseline. |
| 3846, 4521, 4611–4614, 4616–4617, 4677 | Missing Chinese name/body, owned by [#343](https://github.com/FrankHZ/dnd3.5-spellbook/issues/343). Reviewed absence and English fallback are not Chinese QA completion. |
| 4837 | No SC entry/heading. Preserve ID, current publication locator, English/mechanics/relationships and fallback pending identity acceptance; do not silently reassign or count it as SC source-complete. Historical [#197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197), current owner [#349](https://github.com/FrankHZ/dnd3.5-spellbook/issues/349). |

The 4837 official Magic of Eberron sample/contents evidence is new work under
#349, outside this frozen input. Publication proof and any guarded reassignment
require that slice's acceptance. Full entry evidence is still needed for MoE
English/mechanics/Chinese QA; a contents locator cannot certify its full body.
SC original-entry completion has denominator 1,001. Existing-target integration
has denominator 1,002 until an accepted ownership change; neither authorizes
removing an existing ID.

## Source questions and remaining work

The original 34 question list reconciles to 33 faithful unresolved source
questions and one official correction (4709). Later 3958, 4153 and 4743 notes add
three questions. They remain distinct from Chinese translation acceptance:
34 current accepted bodies retain 36 concrete source issues. 4153/4743 Chinese
preserve the omitted casting-time header while the current English mechanism
still retains its unadjudicated standard-action value; 3958 preserves the printed
HD/effect ambiguity. No default-time or interpretation ruling is inferred.

All 180 old residual rows have an explicit current disposition in the map:
88 historical obligations retired without source authentication; 17 additional
relationship-source obligations; 35 rows with faithful source notes; one official
correction; four accepted name/body terminology dispositions; three unresolved
names; two operative external expansions; seven named references without external
capability certification; three preserved candidate mapping boundaries; six old
mixed-entry missing-Chinese rows; 4837; and 13 excluded null candidate occurrences.
The later source questions are additional rows, not inflated old residual counts.
3942's former S-only conflict is contradicted by the actual SC header/material
paragraph, and 4618's caption is authentic under #335; neither is a new open
original-source dispute. 4736 still has the explicitly unreviewed flavor wording.

Only these bounded content deliveries need follow-up; ongoing owners are not
duplicate dispatch recommendations:

- **#347:** names 3935/3944/4007; complete bodies 3997/4097; 4736 flavor wording.
- **#343:** the nine missing-Chinese entries above.
- **#349:** 4837 publication identity; no MoE full-text certification implied.
- **Extra relationships:** 3542, 3837, 3883, 3921, 3924, 3952, 3983, 3987, 3993,
  3994, 3996, 3997, 3998, 4433, 4434, 4435, 4437. Exact fields and current source
  obligations are in `suggestedContentSlices`. In particular 3883's extra
  Wu Jen/Warmage lists and class 848 elsewhere were preserved, not authenticated
  by #332's normalization/consumer acceptance. Use applicable original headers/
  indexes and narrow foreign-source evidence; no arbitrary relation deletion.
- **Summary certification:** `suggestedSummarySlices` contains 20 disjoint,
  source-page-ordered batches (19 × 50 targets, then 17), listing every exact
  stable key/EN-ZH field needing evidence. Reuse accepted body/name/English checks;
  read complete entries and necessary parents only to check those summaries.
  Longer entries or shared dependencies may justify splitting a batch. The map
  separately lists absent summary rows (222 EN / 82 ZH; 26 targets have neither).
  Absence is an explicit disposition, not invented text or an assumed defect.

The later 149 complete-body slices inspected actual consumers and recorded
summary/facet problems. Those observations, and #332's successful rebuilding and
API checks, do not grant a row-specific source pass to unchanged summaries. #331
provides exact accepted source correction evidence for its 29 rows only. Existing
summary reuse/class-list/source-index provenance is not a substitute for checking
the current summary against SC and applicable errata.

## Reproduce and validate

The standalone [helper](../../../data-tools/audits/sc_coverage.py) requires Python
3.13, Git, explicit private root/revision and explicit read-only rules/content
paths. It works from root or package cwd, writes only new #344 output files, and
optionally exports a compact source-free public map. It does not change a fixed
accepted baseline. Its [portable tests](../../../data-tools/audits/test_sc_coverage.py)
exercise stale evidence/name rejection, missing/identity boundaries, HTML parity,
complete correction application, exact slice partitioning and SQLite read-only
protection:

```powershell
python -B -X utf8 -m unittest discover -s '<code-root>/data-tools/audits' -v
python -B -X utf8 '<code-root>/data-tools/audits/sc_coverage.py' `
  --data-root '<data-root>' --private-revision a9cbe07747b1bc908ff4ebcd24244e38e58cb411 `
  --public-base f7fd8e682e3335e7117f03def9bda4e97ae9b1ed `
  --public-helper-revision '<committed-helper-revision>' `
  --rules-db '<operator-root>/rules-clean.sqlite' --content-db '<operator-root>/content.sqlite' `
  --output '<data-root>/dice-qa/books/86/issue-344/new-run.json'
```

Optional `--pdf-runtime '<existing-pymupdf-packages>'` replays original spans with
PyMuPDF 1.28.2; `--code-root` defaults to the helper's checkout, not caller cwd.
`--public-output` must be a new file under that checkout's `data-tools/reports/`.
Frozen public base is `f7fd8e682e3335e7117f03def9bda4e97ae9b1ed`; private input is
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`; accepted union/amendments are
`296903c61e20ce359812148fc0faa234ca2508e7` /
`6a73f4d64682325c67e2c40595008344fb5c3be5`. Exact input paths/revisions are in the
map and local-only evidence under `dice-qa/books/86/issue-344/`.
Committed helper: `3ce3cf1248fea2ca41728a41f21c0fcdfa09646b`; local-only private
evidence: `654f54287a2a1adf937f23012813b03ace7ca243`. The latter commits only the
five #344 evidence files, alongside independently verified `gpt-6.1-sol` / `high`
turn metadata. Other concurrent private changes are not audit inputs.
The public dependency label for 3997 is SC40 (physical index 39), matching its
existing original-page binding; the recorded helper's SC37 label is corrected
without changing the frozen private evidence or any coverage conclusion.

Validation: seven portable tests, current-field reconciliation, original-span/
authority replay, root/package reproduction, source-free export and diff/link
checks. Shared G-drive ENOSPC prevented unnecessary dependency installation;
standard-library checks and an existing read-only PDF runtime completed the audit.
No partial installed dependency was used. Remote exact-head portable CI remains
the merge gate. No content, prior QA, maintained input, operator DB or app-state
was modified; no private push, backup, deployment or activation occurred.
