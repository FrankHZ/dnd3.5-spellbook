# Readonly units and durations QA

`units:qa` produces compact literal retrieval evidence for a bounded DB-English
review. It reuses existing SQLite row-presence selection and action-QA output
guards. Effective wins even when empty; CHM is selected only when absent.

```powershell
npm run -w data-tools units:qa -- --content-db '<content.sqlite>' --out '<private-data-root>/term-qa/issue-N/inventory-new' --exclude-ids '1992,1024'
```

Paths resolve from the checkout root, including package-directory invocation.
Output must be a fresh child of configured `DATA_REPO_PATH/term-qa/`. Supply the
owning issue's complete frozen residual list, not just these illustrative IDs.
Distinct positive exclusion IDs are capped at 1,000. The command opens SQLite
readonly, records size/mtime, elapsed time and peak RSS, caps output at 50 MiB,
and has no apply, review, acceptance, conversion or activation option.

`inventory.jsonl` covers every canonical identity once. Disjoint partition
precedence is SC, the fifty accepted-pending #629/#637/#645 targets, supplied
residuals, then eligible-unreviewed. It retains raw duration/range, selected
variant and language/identity status. Literal offsets distinguish duration,
range and geometry fields from English body and translated mechanic headers.
Near-context per-level, interval, maximum and conditional hints stay unverified.
Existing mechanism-line detection separates supported Chinese header labels;
unsupported spellings remain body/other-header candidates, never semantic errors.

`frequency.json` counts eligible document frequency once per language/scope/token
and occurrences separately. Each token has at most two earliest-ID concordances,
each capped at 280 characters. Literal English words cover seconds, rounds,
minutes, hours, days, weeks, months, years, feet/foot/ft, inches, miles, yards,
meters/metres and instantaneous/permanent/concentration. Chinese unit literals
include common simplified/traditional spellings. Abbreviated `min.`/`hr.` are
not seeds; their complete raw fields are retained. Ordinary words such as
`second`, `round` and Chinese 日/年/里 can be false positives. This is not an
exhaustive detector, an aligned phrase dictionary or a corpus accuracy estimate.

Estimate resources and freeze a finite selection before full semantic reading.
Retrieve complete paired contexts using existing readonly action-QA helpers;
discard unrelated action findings, retain full selected/effective ownership,
canonical/rules English and mechanics, facets, components and provenance. Exclude
pending targets and registered residuals; disclose older reviews by dimension.
Unknown identity, selected-version conflict, English fallback and missing Chinese
remain unknown. SC authority and suspended PHB extraction remain unchanged.

Review local unit, amount expression, role and condition together. Distinguish
main duration, secondary effect, repeated interval, maximum and per-level terms;
distinguish distance, range category, geometry, speed and recipient counts.
Use existing `getSpellMechanicDisplayValue` with actual facets/vocabulary when
checking missing prose headers: complete facets localize supported values,
while partial facets preserve the raw field. A missing translated header is
not itself evidence of missing mechanics. Legitimate unit synonyms need no edit.
Do not infer units, invent conversion/rounding rules, turn action counts into
elapsed rounds or globally normalize numbers or geometry.

Supported proposals require one original full selected predecessor and separate
exact text/HTML edits composed once; unrelated bytes, names, summaries, canonical
English/mechanics and CHM remain unchanged. Proposals stay unaccepted/unactivated
until independent review. Wider conflicts remain bounded residuals. A zero-proposal
pilot is valid; stop based on observed value rather than remaining-ID quotas.

Run `npm run -w data-tools units:qa:test` for field/header/body roles, qualifier
limits, ordinal/geometry/action controls, DF, effective-row presence, gaps,
exclusions, arguments and readonly private-output guards. See the
[finite pilot report](../reports/units-qa-pilot.md). Exact-head remote
`ci:portable` gates merge; operator writes, DB copies and activation are separate.
