# v3.5 Freeze

## Status

**v3.5 FROZEN**

This document declares the final canonical documentation state for the v3.5
release handoff.

v3.5 is frozen around the content DB / app-state DB split, normalized
rules-derived content generation, the first Browse/Search taxonomy consumer
slice, rulebook display labels, portable CI, script-backed deployment, and
agent/module documentation cleanup.

## Canonical Source Order

When v3.5 documents conflict, treat this freeze document as authoritative over
earlier v3.5 planning documents.

Use this precedence order for v3.5:

1. `docs/mvp/v3.5/FREEZE.md`
2. `docs/features.md`
3. `docs/operations/data-setup.md`
4. `docs/operations/deployment.md`
5. focused v3.5 plan documents:
   - `docs/mvp/v3.5/integrated-plan.md`
   - `docs/mvp/v3.5/db-ownership-boundary-plan.md`
   - `docs/mvp/v3.5/rules-content-normalization-plan.md`
   - `docs/mvp/v3.5/normalized-rules-frontend-consumer-plan.md`
   - `docs/mvp/v3.5/rulebook-display-labels-plan.md`
   - `docs/mvp/v3.5/agent-guide-review-plan.md`
   - `docs/mvp/v3.5/ci-cd-and-module-docs-plan.md`

Reason:

- the plan documents describe intended scope and implementation rationale
- `docs/features.md` records shipped user-facing behavior
- operational docs own current DB and deployment workflow
- this freeze document records the shipped interpretation after acceptance

## Frozen Deliverables

v3.5 is frozen with these deliverables complete:

1. Separate content DB and future app-state DB lifecycle boundaries.
2. Normalized rules-derived spell content generated into the content DB.
3. Default content-backed spell reads with `SPELL_READ_SOURCE=rules` rollback.
4. Backend and frontend taxonomy filters for schools, subschools, and
   descriptors in Browse/Search.
5. Rulebook display-label metadata and shared frontend display helpers.
6. Browser-language default detection for first-run language preferences.
7. Portable CI with disposable backend API fixtures.
8. Script-backed code/web deployment docs and helpers, with DB upload kept
   manual.
9. Compact `AGENTS.md`, feature-doc boundaries, and baseline module docs.
10. v3.5 freeze documentation and v3.6 follow-up roadmap.

## Final As-Built Summary

### 1. DB Ownership Boundary

Shipped behavior:

- Runtime DB roles are explicit: `RULES_DATABASE_URL`,
  `CONTENT_DATABASE_URL`, and `APP_STATE_DATABASE_URL`.
- `APP_DATABASE_URL` remains only as a transitional compatibility alias for the
  content DB.
- Tracked lifecycle files live under `server/db/`; ignored runtime SQLite files
  live under `server/db/local/`.
- The content DB is rebuildable app-owned content. The app-state DB is reserved
  for future preserve-sensitive user/app state.

Accepted local files:

| Role       | Local file                           |
| ---------- | ------------------------------------ |
| rules      | `server/db/local/rules-clean.sqlite` |
| content    | `server/db/local/content.sqlite`     |
| app-state  | `server/db/local/app-state.sqlite`   |

Frozen clarification:

- Do not collapse future user/app-state data into the content DB.
- Do not treat the legacy rules DB as the permanent runtime schema.

### 2. Normalized Rules Content

Shipped behavior:

- `data-tools` generates normalized rules-derived spell content from the locked
  local rules DB into the content DB.
- Each import writes a `RulesContentBuild` provenance row with input hashes,
  migration hash, parent repo commit, and data repo commit.
- The server defaults to content-backed spell reads when `SPELL_READ_SOURCE` is
  unset.
- `SPELL_READ_SOURCE=rules` is the explicit legacy rollback switch.

Accepted local content snapshot:

| Metric               | Value |
| -------------------- | ----: |
| `SpellContent`       |  4926 |
| `SpellAppearance`    |  4926 |
| `RulebookContent`    |   110 |
| `SpellListEntry`     | 13846 |
| `SpellTaxonomyFacet` |  8658 |
| `SpellComponent`     | 44474 |
| `SpellMechanicFacet` | 39408 |
| `RulesContentIssue`  |  3523 |
| `RulesContentBuild`  |     1 |

Accepted provenance snapshot:

| Metric               | Value |
| -------------------- | ----- |
| content DB sha256    | `b077d6afe2f4e815c91382ad040b34f23b7a8fd05824bb32c8c2aaf2bba61c68` |
| source sha256        | `5b40407713f0c966a2131539dd8a17114b1a5fee6b6a710599d6cf4ad2a8e3b0` |
| rules DB sha256      | `023a0c059d96723f3f68441cf76d28fbd927a3646993d78645c3d8581d469de0` |
| rules manifest hash  | `5f48be1232ea4a641be495a1a1fbeea7d6e8b00d90d6b65c1f1955c92a63ad4e` |
| migration-set hash   | `05e18173b895dda56935637546d912fd212dba5ad4ed14687cec77b53a4c967c` |
| parent repo commit   | `2609c9291a13de9d0680b3d86ca72a81c030885e` |
| data repo commit     | `cbb0a05e2da3148d5e3520c0a1bc0955b6287e16` |

Accepted parity snapshot:

| Metric                    | Legacy | Content |
| ------------------------- | -----: | ------: |
| spells                    |   4926 |    4926 |
| rulebooks                 |    110 |     110 |
| descriptors               |   2291 |    2291 |
| class list entries        |  12297 |   12297 |
| domain list entries       |   1549 |    1549 |
| corrupt spells            |     19 |      19 |
| prestige class entries    |   1176 |    1176 |
| components                |  44334 |   44334 |
| extra components          |    140 |     140 |

Frozen clarification:

- `RulesContentIssue` rows are review inventory for dirty/ambiguous source
  values, not acceptance failures.
- The accepted content DB build parent commit is an ancestor of this freeze
  branch. Later v3.5 web/docs changes did not alter the rules-content generator
  or local data inputs.

### 3. Browse/Search Taxonomy Filters

Shipped behavior:

- Backend metadata exposes normalized school, subschool, and descriptor filter
  vocabulary.
- Browse and Search accept URL/API scope for school, subschool, and descriptor
  ids.
- Browse remains filter-first.
- Search remains name-first while exposing Browse-equivalent structured scope.
- Header search preserves the current Browse/Search filter scope while replacing
  the name query.
- Browse and Search share a compact scope summary above the spell list.

Frozen clarification:

- Mechanics filters, component filters, range/duration/saving-throw facets, and
  broader detail-display normalization are deferred to v3.6 review.
- The current taxonomy vocabulary still needs review before grouping Tome of
  Battle disciplines/categories separately from ordinary spell schools and
  subschools.

### 4. Rulebook Display Labels

Shipped behavior:

- Source `slug` and legacy `abbr` values remain stable identifiers.
- Curated display abbreviations and localized display names are content
  metadata.
- Frontend rulebook labels flow through shared display helpers instead of ad
  hoc fallbacks.
- Chinese rulebook display prefers localized full names when available.

Accepted label-audit snapshot:

| Metric                         | Value |
| ------------------------------ | ----: |
| rulebooks                      |   110 |
| runtime-visible rulebooks      |    83 |
| keep                           |    81 |
| replace                        |     0 |
| needs review                   |     2 |
| defer                          |    27 |
| missing Chinese names          |     1 |
| source artifact abbreviations  |     3 |
| duplicate proposed display abbrs |   0 |
| publication display mismatches |     0 |

Frozen clarification:

- The two non-blocking review rows are `Player's Guide to Eberron` and
  `Psionics Handbook 3.0`.
- Deferred rulebooks are not v3.5 blockers when they are not current
  runtime-visible user surfaces.

### 5. Local Data And Fixtures

Shipped behavior:

- Public CI uses synthetic portable fixtures in the parent repo.
- Source-bearing local data and normalized JSONL inputs stay in the nested
  ignored `data/` repo.
- Generated reports stay under ignored `data-tools/out/`.

Accepted fixture snapshot:

| Fixture area | Files | Lines |
| ------------ | ----: | ----: |
| content      |     3 |    53 |
| rules-clean  |     3 |    38 |
| app-state    |     0 |     0 |

Accepted nested data JSONL snapshot:

| Metric                       | Value |
| ---------------------------- | ----: |
| tracked JSONL files          |    22 |
| tracked JSONL rows           |  8547 |
| normalized summary rows      |  6532 |
| `I18nSpellSummaryText` rows  |  6532 |

Frozen clarification:

- Portable fixtures prove code behavior in CI; they are not the source of truth
  for full content coverage.
- Full local content acceptance remains a data-tools workflow.

### 6. CI, Dependencies, And Deployment

Shipped behavior:

- `npm run ci:portable` is the clean-checkout CI spine.
- GitHub Actions run portable CI on pull requests and pushes to `main`.
- Local development uses targeted checks first; PR CI is the merge gate.
- Safe dependency updates within existing semver ranges were applied and
  validated. Major/risky upgrades remain deferred.
- Code/web deployment is a manual workflow wrapper around tracked remote
  scripts.
- DB deployment remains manual and operator-owned.
- Remote deployment docs use `remote` as the placeholder SSH alias; local
  helpers read the real alias from ignored root `.env`.

Frozen clarification:

- DB upload is not part of CD.
- Remote content DB activation requires `rules:content:parity` and
  `rules:content:meta` evidence before default content-backed reads are trusted.
- A v3.6 server DB status API should make remote artifact verification visible
  without SSH/SQLite inspection.

### 7. Agent, Feature, And Module Docs

Shipped behavior:

- `AGENTS.md` is a compact execution guide, not a second documentation map.
- Repo-local skills resolve from the active worktree's `.agents/skills/`
  directory.
- `docs/features.md` owns user-facing behavior and now states the data backing
  boundary.
- `docs/feature-workflow.md` owns feature intake and update workflow.
- `docs/frontend-map.md` remains a quick frontend entry-point map.
- `docs/modules/` provides baseline high-level module ownership docs.

Frozen clarification:

- Merge-to-main module-doc automation is documented but blocked on runner and
  secrets decisions.
- Future broad docs restructuring is deferred to v3.6.

### 8. I18n Quality-Of-Life

Shipped behavior:

- First-run language defaults can detect Chinese browser preferences when no
  stored language preference exists.
- Stored user language preference still wins over browser preference.
- Frontend i18n audit covers 12 namespaces.

Frozen clarification:

- Bulk Chinese/English translation and proofreading QA remains future content
  work.

## Final Validation Evidence

Commands run on `codex/docs-v3-5-closeout` before this freeze:

```bash
npm run ci:portable
npm run i18n:check
npm run -w data-tools rules:content:parity
npm run -w data-tools rules:content:meta
npm run -w data-tools rulebooks:labels:audit
```

Accepted results:

- `npm run ci:portable`: passed
  - contracts build and runtime import passed
  - Prisma clients generated for rules-clean, content, and app-state schemas
  - server build passed
  - server tests passed: 15 files, 55 tests
  - data-tools typecheck passed
  - portable data-tools tests passed: 8 checks
  - web tests passed: 22 files, 82 tests
  - web typecheck passed
  - web build passed
  - React Router v8 future-flag warnings were emitted
  - existing Vite sourcemap warnings were emitted for local UI wrappers
- `npm run i18n:check`: passed
  - extractor dry-run reported no file updates
  - i18n audit passed for 12 namespaces
- `npm run -w data-tools rules:content:parity`: passed
  - spells: 4926
  - report: `data-tools/out/rules-content/2026-07-03T15-00-05-149Z-parity.json`
- `npm run -w data-tools rules:content:meta`: passed
  - report: `data-tools/out/rules-content/2026-07-03T15-00-05-079Z-content-db-meta.json`
- `npm run -w data-tools rulebooks:labels:audit`: passed
  - report: `data-tools/out/rulebook-labels/rulebook-label-audit.json`

## Deferred Backlog

These items are explicitly outside the v3.5 freeze gate:

- Server DB status API for remote content artifact verification.
- Broader normalized mechanics/filter contracts.
- Taxonomy normalization review for school/subschool/discipline/category
  grouping.
- Normalized detail display polish.
- Filter selection display density for broader vocabularies.
- v3.6 docs directory structure cleanup.
- Merge-to-main module-doc automation runner/secrets decision.
- Major dependency upgrades deferred from the v3.5 safe update pass.
- Bulk Chinese/English translation and proofreading QA.
- PDF/source-backed short-description coverage expansion.
- `data/spells-full` completion workflow for remaining source-backed spell
  imports.
- Static HTML/offline artifact generation.
- DB release artifact and rollback model beyond manual SQLite upload.
