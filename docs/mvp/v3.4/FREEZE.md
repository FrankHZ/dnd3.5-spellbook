# v3.4 Freeze

## Status

**v3.4 FROZEN**

This document declares the final canonical documentation state for the v3.4
release handoff.

v3.4 is frozen around the spell short-description pipeline, portable
data-tools harness hardening, local data acceptance, a small frontend design
refresh, and frontend i18next semantic-key conventions.

## Canonical Source Order

When v3.4 documents conflict, treat this freeze document as authoritative over
earlier v3.4 planning documents.

Use this precedence order for v3.4:

1. `docs/mvp/v3.4/FREEZE.md`
2. `docs/features.md`
3. `docs/mvp/v3.4/acceptance-checklist.md`
4. focused v3.4 plan documents:
   - `docs/mvp/v3.4/integrated-plan.md`
   - `docs/mvp/v3.4/short-description-pipeline-plan.md`
   - `docs/mvp/v3.4/data-harness-hardening-plan.md`
   - `docs/mvp/v3.4/design-refresh-plan.md`
   - `docs/mvp/v3.4/i18next-conventions-plan.md`

Reason:

- the plan documents describe intended scope and implementation rationale
- the acceptance checklist records reusable command gates
- this freeze document records the shipped interpretation after acceptance

## Frozen Deliverables

v3.4 is frozen with these deliverables complete:

1. Spell short-description extraction, QA, normalization, import, API exposure,
   and first frontend consumers.
2. Local app DB `I18nSpellSummaryText` import path with idempotent dry-run
   acceptance.
3. Rules DB manifest verification for local rules patch state.
4. Portable data-tools harness command and script manifest guard.
5. Local data-tools acceptance command for short-description/rules DB gates.
6. Reviewable short-description QA queues and coverage reports.
7. Small frontend reference-style design refresh.
8. Frontend i18next semantic-key migration and audit guardrail.
9. v3.4 acceptance checklist and freeze documentation.

## Final As-Built Summary

### 1. Short-Description Pipeline

Shipped behavior:

- Chinese short summaries are extracted from local CHM overview sources.
- English short summaries are sourced from the local IMarvinTPA source index.
- Summary QA, source-gap reuse, same-name reuse, punctuation cleanup, and
  coverage reporting live under `data-tools`.
- Reviewed normalized rows live under the nested local `data/` repo.
- The app DB stores accepted spell summaries in `I18nSpellSummaryText`.
- Spell search, browse, batch, resolve, and detail API responses expose
  `spell.i18n.summary`.
- Frontend spell list/detail surfaces consume summaries through existing i18n
  display helpers.

Accepted local import snapshot:

| Metric    | Value |
| --------- | ----: |
| rows      |  6532 |
| inserted  |     0 |
| updated   |     0 |
| unchanged |  6532 |

Frozen clarification:

- The import dry-run is idempotent against the current local app DB.
- Remaining summary coverage gaps are content backlog, not v3.4 blockers.
- Future coverage should be source/PDF-backed rather than fuzzy reuse.

### 2. Short-Description QA And Coverage

Accepted local QA snapshot:

| Metric                     | Value |
| -------------------------- | ----: |
| issueCount                 |     8 |
| errors                     |     0 |
| warnings                   |     3 |
| info                       |     5 |
| import blockers            |     0 |
| zh matched                 |  5820 |
| zh unmatched               |     0 |
| zh conflicts               |   414 |
| zh alias review required   |     3 |
| en candidates              |  3433 |
| en matched candidates      |  2605 |
| en missing candidates      |   816 |
| en ambiguous candidates    |    12 |
| en strict35 QA candidates  |    80 |

Accepted scoped coverage report:

| Metric                       | Value |
| ---------------------------- | ----: |
| books                        |    60 |
| total spells                 |  3938 |
| normalized rows              |  6532 |
| zh summaries                 |  3152 |
| en summaries                 |  3380 |
| missing zh summaries         |   786 |
| missing en summaries         |  1273 |
| missing both summaries       |   369 |
| en source rows missing DB spell | 531 |
| en source rows book mismatch |   151 |
| zh source rows missing DB spell |   0 |

Frozen clarification:

- The coverage report scope is `core-35`, `supplementals-35`, `eberron-35`,
  and `forgotten-realms-35`.
- Coverage numbers are not the same as import blockers. The v3.4 import gate
  has zero blockers.

### 3. Data Harness Hardening

Shipped behavior:

- `npm run -w data-tools test:portable` runs fixture-only data-tools helper
  coverage without local CHM/raw data, nested `data/`, or SQLite dependencies.
- `npm run -w data-tools acceptance:local` bundles the explicit local data
  gates:
  - data-tools typecheck
  - `rules:manifest:verify`
  - `summaries:qa`
  - `summaries:import -- --dry-run`
- `data-tools/scripts.manifest.json` classifies maintained scripts so new
  commands do not become implicit maintenance promises.

Accepted portable tests:

- script manifest classification
- source-label mapping for built-in Chinese labels
- English name matching normalization and known aliases
- normalized summary JSONL validation
- structured spell patch JSONL/schema validation

Remaining optional follow-up:

- deeper parser fixture coverage
- temp-database write-path fixture coverage
- CI fixture database design

### 4. Rules DB Manifest

Accepted local manifest snapshot:

| Metric                    | Value |
| ------------------------- | ----: |
| dbSha256                  | `c8575c1b0e78687cb26a40628fb585c72beb103660eb2bd1b53f821d77432dc2` |
| patches                   |     8 |
| spell operations          |    15 |
| verified spell operations |    15 |
| missing spell operations  |     0 |
| mismatched operations     |     0 |

Frozen clarification:

- Rules DB patching remains a data-prep workflow.
- Server runtime does not apply rules DB migrations or patches.
- Root `npm run verify` remains portable and does not depend on mutable local
  SQLite state.

### 5. Frontend Design Refresh

Shipped behavior:

- The app keeps its dense reference-tool shape.
- The design pass tightened component consistency, scan-friendly metadata,
  layout density, and mobile text fit without broad workflow redesign.
- Durable visual direction lives in `docs/design.md`.
- The v3.4 scope boundary remains in
  `docs/mvp/v3.4/design-refresh-plan.md`.

Frozen clarification:

- This is not a full visual rebrand.
- Larger whole-site redesign work remains a separate future project.

### 6. Frontend i18next Convention Cleanup

Shipped behavior:

- Frontend UI copy keeps `i18next` and `react-i18next`.
- Raw-English UI translation keys were migrated to stable semantic keys.
- `web/public/locales/{en,zh}/` remains the durable UI-copy source of truth.
- `npm run i18n:check` runs extractor drift detection and the local i18n audit.
- The i18n audit verifies namespace/config consistency, rejects raw-English
  keys outside the legacy allowlist, and compares English/Chinese locale
  coverage by normalized plural base key.
- `web/scripts/i18n-legacy-keys.json` is empty for the migrated namespaces.

Accepted audit snapshot:

| Metric       | Value |
| ------------ | ----: |
| namespaces   |    11 |
| legacy keys  |     0 |

Frozen clarification:

- Spell names, spell descriptions, short summaries, and imported entity labels
  remain content data, not frontend locale JSON.
- `collections-default` and `metamagic` remain manually maintained data-like
  namespaces ignored by extraction but still covered by audit.

## Final Validation Evidence

Commands run on local `main` before this freeze:

```bash
npm run verify
npm run -w data-tools test:portable
npm run -w data-tools acceptance:local
npm run i18n:check
npm run -w web build
npm run -w data-tools summaries:coverage-report
```

Accepted results:

- `npm run verify`: passed
  - contracts build and runtime import passed
  - data-tools typecheck passed
  - portable data-tools tests passed
  - server tests passed: 12 files, 42 tests
  - web tests passed: 19 files, 67 tests
  - web typecheck passed
- `npm run -w data-tools test:portable`: passed, 5 checks
- `npm run -w data-tools acceptance:local`: passed
  - rules DB manifest verification OK
  - short-description QA completed with zero errors and zero import blockers
  - summary import dry-run OK, 6532 unchanged rows
- `npm run i18n:check`: passed
  - extractor dry-run reported no file updates
  - i18n audit passed for 11 namespaces
- `npm run -w web build`: passed
  - React Router v8 future-flag warnings were emitted
  - existing Vite sourcemap warning messages were emitted for local UI wrappers
- `npm run -w data-tools summaries:coverage-report`: passed

## Deferred Backlog

These items are explicitly outside the v3.4 freeze gate:

- PDF-backed short-description coverage expansion.
- Large-scale Chinese/English translation proofreading and QA.
- Content DB versus future user app-state DB split.
- Normalized rules content schema and fine-grained frontend consumers.
- Rulebook abbreviation/display-label review.
- Importing remaining `data/spells-full` source-backed English spell rows.
- Static HTML/offline artifact generation.
- Full CI/CD and merge-triggered module documentation automation.
- Deployment automation beyond the current tracked scripts.
- Broader frontend redesign.
