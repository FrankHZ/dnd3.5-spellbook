# v3.3 Freeze

## Status

**v3.3 FROZEN**

This document declares the final canonical documentation state for the v3.3
release handoff.

v3.3 is frozen around data-tooling ownership, repeatable local rules DB
preparation, missing-spell patch workflows, Clean CHM source-of-truth
acceptance, and Search/Browse query alignment.

## Canonical Source Order

When v3.3 documents conflict, treat this freeze document as authoritative over
earlier v3.3 planning documents.

Use this precedence order for v3.3:

1. `docs/mvp/v3.3/FREEZE.md`
2. `docs/features.md`
3. `docs/mvp/v3.3/acceptance-checklist.md`
4. focused v3.3 plan documents:
   - `docs/mvp/v3.3/data-tools-workspace-plan.md`
   - `docs/mvp/v3.3/local-data-layout-plan.md`
   - `docs/mvp/v3.3/rules-db-prep-workflow-plan.md`
   - `docs/mvp/v3.3/structured-spell-patch-plan.md`
   - `docs/mvp/v3.3/spells-full-import-plan.md`
   - `docs/mvp/v3.3/search-browse-query-plan.md`

Reason:

- the plan documents describe intended scope and design decisions
- the acceptance checklist records verification detail
- this freeze document records the shipped interpretation after acceptance

## Frozen Deliverables

v3.3 is frozen with these deliverables complete:

1. Data-tools workspace boundary
2. Root local `data/` repo boundary
3. Rules DB preparation commands
4. Structured missing-spell patch workflow
5. `spells-full` known-miss import path
6. Clean CHM source-of-truth acceptance
7. Mechanical CHM source QA
8. Search/Browse query and scope UI alignment
9. Contracts runtime import harness
10. v3.3 acceptance checklist and verification spine

## Final As-Built Summary

### 1. Data-Tools Workspace

Shipped behavior:

- `data-tools` owns CHM preprocessing/parsing, parser reports, rules DB
  inspection, SQL patch commands, structured spell patch commands, and
  `spells-full` source inspection/generation.
- `server` remains the API runtime and app DB import owner.
- Server runtime code does not import `data-tools` modules.
- Server wrapper scripts may remain for compatibility, but new data-preparation
  behavior belongs in `data-tools`.

### 2. Local Data Layout

Shipped behavior:

- `server/data/db/` remains the local runtime SQLite database location.
- root `data/` is the nested local repo for CHM inputs, upstream/source inputs,
  and local rules patch files.
- `data-tools/out/` is the generated report and parser-output location.
- The parent project repo intentionally ignores `data/` and generated output.

Frozen clarification:

- `data/chm-clean/` is the maintained local CHM source-of-truth tree for the
  current parser workflow.
- The nested `data/` repo may version content-bearing local source inputs that
  must not be added to the public parent repo.

### 3. Rules DB Preparation

Shipped behavior:

- legacy SQL patch assets live under `data/rules-patches/legacy-sql/`
- dry-run/apply commands are exposed by `data-tools`
- derived class/domain spell indexes can be rebuilt intentionally through
  `data-tools`
- rules DB mutation is never run from server startup

Representative commands:

```bash
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
```

### 4. Structured Missing-Spell Patches

Shipped behavior:

- structured missing-spell patches use JSONL files under
  `data/rules-patches/spells/`
- the first supported operation is `insertSpell`
- validation can run read-only
- dry-run applies to a temporary database copy
- real apply is explicit and rebuilds derived spell indexes
- repeated slug collisions are warnings when `name + rulebook` is distinct

Representative commands:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
```

Frozen clarification:

- Already-applied `insertSpell` patches are not expected to remain rerunnable
  against the same current rules DB. Revalidating them after apply can correctly
  fail on duplicate ids or existing `name + rulebook` rows.

### 5. Missing Spell Records

Shipped rules DB additions and decisions:

| ID     | Name                | Rulebook | Status                    |
| ------ | ------------------- | -------- | ------------------------- |
| `4916` | `Fiery Assault`     | `ToB`    | structured patch applied  |
| `4917` | `Resistance Item`   | `ECS`    | `spells-full` patch       |
| `4918` | `Skill Enhancement` | `ECS`    | `spells-full` patch       |
| `4919` | `Spider Poison`     | `Sc_`    | structured patch applied  |
| `1945` | `Shield Of Faith, Legion's` | `MH` | existing row mapped from CHM source |

Frozen clarification:

- `Shield Of Faith, Legion's` should not be inserted as a duplicate ECS spell.
  The CHM `ECS` source label resolves to the existing Miniatures Handbook row.
- `Spider Poison` exists as both an older `Mag` row and a Spell Compendium
  `Sc_` row. The repeated slug is intentional for this local rules DB.

### 6. Clean CHM Source-Of-Truth

Shipped behavior:

- local clean CHM source lives under `data/chm-clean/`
- parser hard misses are clear in the accepted local data state
- nested CHM source directories are supported
- Word/CHM `.files` companion folders are skipped
- `Tome of Battle` / `九剑` source labels resolve through the parser mapping

Accepted parser snapshot:

| Metric                 | Value |
| ---------------------- | ----: |
| `matched`              |  3235 |
| `unmatched`            |     0 |
| `unknownBookLabel`     |     0 |
| `missingRulebookInDb`  |     0 |
| `missingSpellInDb`     |     0 |
| `lowConfidence`        |     0 |
| `errors`               |     0 |

Accepted CHM QA snapshot:

| Metric              | Value |
| ------------------- | ----: |
| errors              |     0 |
| warnings            |     0 |
| info markers        |    38 |
| `body-note-marker`  |    20 |
| `long-bold-text`    |    18 |
| missing zh entries  |    55 |

Frozen clarification:

- Remaining body-note and long-bold markers are review leads, not v3.3
  blockers.
- Full bulk translation QA is deferred until a larger translation rewrite or a
  short-description import creates new target text to review.

### 7. Search/Browse Query Alignment

Shipped behavior:

- Browse remains the filter-first spell discovery page.
- Search remains name search plus the full Browse filter set.
- Header search preserves current Browse or Search filter scope while replacing
  `q` and resetting pagination.
- Browse does not consume Search's `q` parameter for Browse results.
- Search exposes editable class, domain, and level controls in its sidebar.
- Search exposes a clear action for Search-owned filters.
- Browse and Search share a compact scope summary above the spell list area.
  The summary includes class/domain filter counts, level scope, and selected
  rulebook scope.
- Rulebook scope remains Settings-owned.

Manual smoke accepted before freeze:

- Browse class/domain/level filtering
- Browse header search carrying scope to Search
- Search sidebar filter edit and clear behavior
- affected spell detail pages, including `Fiery Assault` and `Spider Poison`
- language and rulebook-scope changes across Browse/Search

### 8. Contracts Runtime Import Harness

Shipped behavior:

- `@dnd/contracts` builds as a NodeNext-compatible ESM package with explicit
  `.js` relative import/export specifiers.
- root `verify` builds contracts and then performs a real runtime import:

```bash
npm run check:contracts
```

Frozen clarification:

- This check exists because TypeScript compilation alone did not catch a
  runtime ESM resolution failure in the web dev server.

## Verification

The accepted v3.3 verification set includes:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools zh:parse
npm run -w data-tools zh:qa
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-chm
npm run i18n:check
npm run verify
```

The root `verify` command covers:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
```

At freeze, `npm run verify` passes with:

- server: 12 test files, 38 tests
- web: 17 test files, 60 tests

## Known Non-Goals Retained At Freeze

The following remain intentionally out of scope for v3.3:

- short description pipeline
- bulk translation QA beyond mechanical source markers
- broader browser automation or end-to-end test harness
- CI/CD and release automation
- production hardening beyond the existing deployment docs
- full character sheets
- automatic spell-slot legality enforcement
- account sync or backend persistence for user collections
- broad rules engine behavior beyond spell-centric workflows

## Post-v3.3 Candidates

Recommended follow-up candidates:

1. Short description pipeline:
   - parse class/spell summary tables from CHM sources
   - decide where Chinese and English short descriptions live
   - add QA around newly imported summary text
2. Data harness hardening:
   - focused parser matching checks
   - source-label normalization checks
   - structured rules patch fixture checks that remain rerunnable
3. Frontend i18n convention cleanup:
   - consider semantic keys for new UI copy
   - keep namespace ownership clear

## Documentation Rule For Future Project Docs

When updating project-wide documentation after v3.3:

- describe v3.3 using shipped behavior, not original plan language
- treat this `FREEZE.md` as the v3.3 stage snapshot
- keep future active planning in a new topic doc or later version folder rather
  than editing v3.3 as if it were still active development
- use `docs/roadmap.md` for current next-work ordering after a pause

## References

- `docs/mvp/v3.3/acceptance-checklist.md`
- `docs/mvp/v3.3/data-tools-workspace-plan.md`
- `docs/mvp/v3.3/local-data-layout-plan.md`
- `docs/mvp/v3.3/rules-db-prep-workflow-plan.md`
- `docs/mvp/v3.3/structured-spell-patch-plan.md`
- `docs/mvp/v3.3/spells-full-import-plan.md`
- `docs/mvp/v3.3/search-browse-query-plan.md`
- `docs/features.md`
- `docs/harness.md`
