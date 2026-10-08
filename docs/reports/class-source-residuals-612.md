# Class source residual review (#612)

This source-free handoff records the bounded investigation requested by
[#612](https://github.com/FrankHZ/dnd3.5-spellbook/issues/612), under
[#598](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598). It proposes 15
additional mappings after comparing exact DB variants with located CHM entries.
All outputs remain **proposed**; coordinator review, consumer policy and data-write
authorization are separate. No scanner, schema, DB, source or application behavior
changed. Issue #612 owns scope and subsequent decisions.

## Dispositions

The complete 133-row replay preserves the prior 100 accepted proposals and four
negative probes, including their identity, disposition, relation, evidence and
rationale. All 29 target rationales were updated after additional investigation.

| Proposed disposition | Before | After |
| --- | ---: | ---: |
| accepted | 100 | 115 |
| ambiguous | 25 | 10 |
| absent within CHM scope | 4 | 4 |
| not-applicable | 4 | 4 |

| Target group | Existing variant IDs | Result |
| --- | --- | --- |
| UA unnamed replacement packages | 950–959, 972 | 11 accepted proposals; gained/lost abilities distinguish each variant from its base class |
| CM prestige classes | 268, 271, 272 | 3 accepted proposals; entry and distinguishing progression resolve translated titles |
| DMG epic progression | 991 | 1 accepted proposal; explicit class section and progression resolve the earlier generic-page lead |
| UA specialist families | 960–967 | 8 ambiguous; source located, family consumption policy pending |
| MH book versions | 76, 79 | 2 ambiguous; local entries missing and external corroboration insufficient |
| UA Scions | 874, 875, 879, 880 | 4 absent within CHM scope; targeted external TOC corroborates book presence |

The eight specialist records each aggregate three independently selectable
replacement options. Private notes identify them as `variant-family`, list the
three options per row, and link the relevant section. The existing `variant`
relation cannot distinguish a family from a single variant build. Following the
main-gate decision on #612, these remain ambiguous until #598/#599 defines
inclusion and counting. No IDs were split and no schema was added.

The MH base-class directory contains only two other entries; both target DB
variants have empty requirements/features. A third-party class index supports
the names but does not establish edition-specific contents. The next evidence
needed is an attributable MH contents/class entry for the recorded page leads.
Other books' versions and spell lists were not used to prove these mappings.

The UA directory and 71 HTML files lack the Legendary Weapons section. An
ISBN-specific Ingram TOC hosted by a bookseller lists that section and the four
Scion tables, but its unrelated summary and table/entry page distinction limit
what can be inferred. The next step requires attributable class entries and an
explicit external-evidence acceptance decision if CHM remains incomplete.
`absent` does not claim that the printed book lacks these classes. Private notes
retain URLs, source types, edition, access date, observed limitations and failed
fetches. No external-only row was accepted.

These are identity comparisons, not whole-class mechanics QA. The private review
records the monk AC-detail omission and additional Holy Scourge entry details
without changing canonical content or claiming full-text accuracy.

## Evidence and reproduction

The private handoff is under `class-sources/issue-612/` in `DATA_REPO_PATH`.
Its private evidence commit is `18dbd1695a7bcaac9cfc5a82e1423d7780835d07`.
The baseline remains `class-sources/issue-610/` at private commit
`16b5b8676d6853e1c59f64c609732a8b79a32a0b`. The CHM revision remains
`7aed6890d88a6472f5fe9a857050a3823bdbf8ca`, with a clean source checkout.

- `targets.json`: the 29 exact DB identities and read-only comparison fields.
- `reviews.json`: per-row comparison, identity kind, disposition and next evidence.
- `chm-selected-pages.json`: private source context for the bounded comparisons.
- `external-review.json`, `external-fetches.json`: supplemental evidence and limits.
- `scope.json`, `proposed-decisions.json`: complete revision-bound scanner inputs.
- `replay-root/`, `replay-package/`: complete output evidence and resource reports.
- `verify.py`: checks all 29 target changes, protected 104 input/output rows,
  stable target identities, eight family records and byte-equal replay artifacts.

Use the existing [scanner contract](../operations/class-sources.md). From the
checkout root, with operator-supplied paths and a new output directory:

```powershell
$slice = Join-Path $env:DATA_REPO_PATH 'class-sources/issue-612'
npm run -w data-tools class-sources:scan -- --chm-root $chmRoot --rules-db $rulesDb --content-db $contentDb --scope "$slice/scope.json" --proposals "$slice/proposed-decisions.json" --out "$slice/reviewer-root"
python -X utf8 "$slice/verify.py" $env:DATA_REPO_PATH
npm run -w data-tools class-sources:test
```

Set `DATA_REPO_PATH` in the shell for this example; a root `.env` is read by the
scanner but does not export a PowerShell environment variable. From `data-tools`,
omit `-w data-tools` and select another new output directory. `verify.py` checks
the saved delivery pair; reviewers can compare a fresh replay to `replay-root`.
It takes an explicit private root and never depends on the primary checkout path.

## Validation and resources

- Existing class-source portable tests passed, including read-only boundaries and
  both caller directories. No implementation change required new tests.
- Six artifacts (`scope`, `identities`, `evidence`, `matches`, `candidates`,
  `proposals`) are byte-identical between root and package replays.
- The 104 protected output rows equal the baseline objects in full. Target
  identities remain unchanged; only their reviewed decisions/evidence changed.
- The scanner selected 106 pages, one more than the baseline, adding 11,903 bytes
  to actual source reads: 7,143,568 bytes per replay. The inventory remains
  5,958 HTML files / 224,887,688 bytes, without reading every body.
- Root/package runtime: 1,082 / 1,075 ms. Peak RSS: 299.51 / 300.45 MiB.
  Each replay produced 1,866,262 bytes before its report. The entire private slice
  was approximately 5.8 MB at verification, below the 50 MiB budget.
- Supplemental local inspection read 19 selected pages totaling 241,553 bytes,
  including the three bounded DMG context pages. This overlaps scanner inputs;
  it is not an additional full-corpus pass. Processing stayed sequential.

No operator DB copies, app-state access, DB writes, CHM edits, shared dependency
installs, paid APIs, whole-PDF collection, OCR, translation or UI work occurred.
Exact-head remote `ci:portable` is the PR merge gate; its result belongs in the
PR checks rather than this static evidence report.
