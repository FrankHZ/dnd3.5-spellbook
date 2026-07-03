# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned MVP plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

v3.5 is frozen. The latest release snapshot is
`docs/mvp/v3.5/FREEZE.md`.

The completed v3.5 implementation focus was content DB ownership, normalized
rules content, first taxonomy filter consumers, rulebook labels, portable CI/CD
rails, and agent/module documentation cleanup.

v3.6 is active as a lightweight post-freeze coordination stage. Its server DB
status API, UI/UX display, docs structure cleanup, and normalized rules review
slices have landed. No broader v3.6 filter-contract implementation slice is
currently promoted. v3.7 planning has started in a separate plan worktree for
security review and dependency-maintenance work after v3.6 closeout.

For final v3.5 as-built behavior and validation evidence, start at
`docs/mvp/v3.5/FREEZE.md`.

Older frozen snapshots remain historical comparison points, not active
baselines.

## Recently Completed

The v3.5 release is frozen with:

- `docs/mvp/v3.5/FREEZE.md` as the as-built snapshot.
- separate rules, content, and app-state DB roles.
- normalized rules-derived spell content in the content DB:
  - `SpellContent`: `4,926`
  - `SpellTaxonomyFacet`: `8,658`
  - `RulesContentBuild`: `1`
- content-backed spell reads by default, with `SPELL_READ_SOURCE=rules` as the
  legacy rollback switch.
- Browse/Search taxonomy filters for schools, subschools, and descriptors.
- rulebook display-label metadata and shared frontend display helpers.
- portable CI through `npm run ci:portable`.
- script-backed code/web deployment with DB upload still manual.
- compact agent guidance and baseline module docs.

The v3.6 DB status slice has landed with:

- `GET /api/status/db` as a read-only runtime DB provenance endpoint.
- sanitized database role reporting for rules/content/content alias/app-state.
- latest `RulesContentBuild` metadata and normalized content table counts.
- deployment/data setup docs explaining comparison with `rules:content:meta`.
- portable fixture manifest coverage for maintained local data JSONL inputs.

The v3.6 UI/UX display slice has landed with:

- browser-local display settings for list density and summary/full-detail spell
  cards.
- compact special-component markers and restrained shared spell-card styling.
- Browse/Search scope summary density updates.
- clarified docs that summary spell cards are scan-only and favorite/prepare
  actions live in full-detail card mode.

The v3.6 normalized rules review slice has landed with:

- `npm run -w data-tools rules:content:review` as the read-only content DB
  inventory command for taxonomy, component, and mechanic facets.
- documented review results in
  `docs/mvp/v3.6/normalized-rules-review-plan.md`.
- confirmation that existing school/subschool/descriptor contracts remain
  stable.
- base component flags accepted as the safest next filter-contract candidate,
  but not promoted inside v3.6.
- casting time, range, target/effect/area, duration, saving throw, and spell
  resistance filters deferred until further normalization or fallback semantics.
- Tome of Battle discipline/category handling deferred until a source-kind or
  category boundary is accepted.

The v3.4 release remains frozen with:

- `docs/mvp/v3.4/FREEZE.md` as the as-built snapshot.
- `6,532` accepted local spell-summary rows in `I18nSpellSummaryText`.
- an idempotent summary import dry-run: `0` inserted, `0` updated, `6,532`
  unchanged.
- local data acceptance through `npm run -w data-tools acceptance:local`.
- portable data-tools coverage through `npm run -w data-tools test:portable`.
- semantic frontend i18n keys enforced by `npm run i18n:check`.
- a small frontend design refresh documented by `docs/design.md` and the v3.4
  design plan.

The v3.3 data-tooling foundation is in place:

- `data-tools` owns parser, inspection, rules SQL, and structured spell patch
  workflows.
- local data layout was moved under the root `data/` local repo and generated
  reports under `data-tools/out/`.
- legacy rules SQL patch assets moved to
  `data/rules-patches/applied/legacy-sql/`.
- structured `insertSpell` JSONL patches can be validated, dry-run, and applied.
- `spells-full` can inspect known misses and generate reviewable patch
  candidates.
- verified missing rows have been added for:
  - `Fiery Assault`, `ToB`, id `4916`
  - `Resistance Item`, `ECS`, id `4917`
  - `Skill Enhancement`, `ECS`, id `4918`
  - `Spider Poison`, `Sc_`, id `4919`
- `Shield Of Faith, Legion's` is resolved as existing `MH` id `1945`; the CHM
  `ECS` source label maps to that row rather than creating a duplicate.
- Clean CHM source-of-truth work has been accepted for the current v3.3 data
  pass:
  - hard parser misses are clear
  - maintained CHM inputs live under the nested local `data/chm-clean/` repo
  - mechanical source QA runs through `npm run -w data-tools zh:qa`
- Search/Browse query behavior is represented in the current feature map and
  code surface: Search owns name search plus Browse-equivalent filter scope, and
  header search preserves the active Browse/Search filter scope.

See:

- `docs/mvp/v3.3/data-tools-workspace-plan.md`
- `docs/mvp/v3.3/local-data-layout-plan.md`
- `docs/mvp/v3.3/rules-db-prep-workflow-plan.md`
- `docs/mvp/v3.3/structured-spell-patch-plan.md`
- `docs/mvp/v3.3/spells-full-import-plan.md`
- `docs/operations/rules-db-notes.md`

## Current Data State

Latest v3.5 local DB/content foundation snapshot:

- rules DB manifest: verified, `18` spell operations, `18` verified
- locked legacy rules baseline: `data/rules-clean/rules-clean.sqlite` in the
  nested local data repo
- local runtime DB files: ignored `server/db/local/*.sqlite`
- normalized rules content import:
  - `SpellContent`: `4,926`
  - `RulesContentIssue`: `3,523`
  - `RulesContentBuild`: `1`
- content DB provenance is tracked in `RulesContentBuild` through input hashes
  and parent/data repo commit metadata
- server API tests include content-backed normalized repository parity coverage
  for representative Search, Browse/by-level, detail, batch, and resolve flows
- `rules:content:parity` and `rules:content:meta` provide local-only normalized
  content DB acceptance and artifact provenance checks without adding DB upload
  to CD
- production uses the explicit content DB file role (`content.sqlite`) after
  manual upload/activation; remote runtime state can be checked through
  `GET /api/status/db`, but DB upload remains operator-owned rather than CD

Latest v3.4 local short-description acceptance snapshot:

- normalized summary rows: `6,532`
- app DB import dry-run: `0` inserted, `0` updated, `6,532` unchanged
- short-description QA: `0` errors, `0` import blockers
- rules DB manifest: verified, `8` patches, `15` spell operations, `15`
  verified
- scoped coverage report:
  - books: `60`
  - total spells: `3,938`
  - zh summaries: `3,152`
  - en summaries: `3,380`
  - missing zh summaries: `786`
  - missing en summaries: `1,273`
  - missing both summaries: `369`
  - en source rows missing DB spell: `531`
  - en source rows book mismatch: `151`

Latest local CHM parser snapshot:

- `matched`: `3235`
- `unmatched`: `0`
- `unknownBookLabel`: `0`
- `missingSpellInDb`: `0`

The CHM parser currently has no hard unmatched records. The latest cleanup:

- removed note-like source labels from `Death Dragon` and `Phantasmal Thief`
- split combined source labels for `Defenestrating Sphere` and `Delay Death`
- downgraded the `召唤列表-summon.htm` page title so `Summon` is not parsed as a
  spell record

`missing-zh` is a broader coverage report, not the same thing as parser hard
misses. Its count may increase when a new rulebook label becomes recognized and
the backcheck coverage set grows.

Mechanical CHM source QA now runs through `npm run -w data-tools zh:qa`. The
current report has no errors or warnings; remaining body-note and long-bold-text
markers are informational review leads, not parser blockers.

Full bulk Chinese/English translation and proofreading QA is deferred until a
large translation rewrite or a future short-description import creates new
target text to review.

## Next Work

Recommended next sequence:

1. **Prepare v3.6 closeout**

   No remaining v3.6 review candidate is promoted for implementation. Create an
   acceptance checklist from `docs/templates/acceptance-checklist.md`, then
   prepare a freeze snapshot with the repo-local `$freeze-snapshot` skill.

2. **Choose the next post-v3.6 data/contract slice**

   After v3.6 is frozen, use
   `docs/mvp/v3.6/normalized-rules-review-plan.md` to decide whether the next
   branch should promote base component flags, add a Tome of Battle source-kind
   boundary, or continue mechanics normalization.

3. **Run v3.7 security review follow-up**

   Use `docs/mvp/v3.7/README.md` and
   `docs/mvp/v3.7/security-review.md`. The first recommended slice is
   operator/status endpoint exposure plus production-safe error responses.
   Keep authentication, user accounts, automatic DB release artifacts, and
   broad deployment redesign out of this first pass.

## v3.6 Committed Workstreams

These are v3.6 workstreams. Read `docs/mvp/v3.6/integrated-plan.md` before
opening implementation branches.

1. **Server DB status API**

   Landed. `GET /api/status/db` reports deployment-safe DB provenance: active
   read source, content DB file role, latest `RulesContentBuild` metadata, hash
   fields, and minimal row counts. The endpoint verifies remote content DB
   activation without requiring SSH/SQLite access for every check.

2. **UI/UX display update**

   Landed. Browser-local display settings, spell card/list presentation,
   compact scope summaries, and restrained styling polish are in place. Keep
   display settings browser-local unless a separate app-state feature is
   accepted later.

3. **Docs directory structure cleanup**

   Landed. The docs map now separates durable topic docs, module docs,
   operations docs, version plans, freeze snapshots, and historical records.
   Frozen version folders remain immutable records.

## v3.6 Review Candidates

These were planning inputs. Normalized rules review has resolved the immediate
v3.6 decision: do not broaden filter contracts inside v3.6.

1. **Normalize more filter contracts**

   Reviewed. Base component flags are the safest next filter-contract candidate,
   but they are not promoted in v3.6. Range and casting-time categories need
   stable fallback semantics before public vocabulary exposure.

2. **Review taxonomy normalization**

   Reviewed for the current contract. Existing school/subschool/descriptor
   vocabulary remains stable, but Tome of Battle disciplines and maneuver
   categories need an accepted source-kind/category boundary before UI grouping
   changes.

3. **Review normalized detail display**

   Not promoted for v3.6. Raw source text remains the fallback, and normalized
   mechanics should not become a Spell Detail QA/provenance surface.

4. **Review filter selection display density for broader filters**

   Not promoted for v3.6 because no broader filter vocabulary is shipping.

5. **Review TypeScript module config cleanup**

   `data-tools` has moved to `moduleResolution: "Node16"` with an explicit
   `rootDir`. The server still uses CommonJS plus `moduleResolution: "node"`
   with `ignoreDeprecations: "6.0"` because direct Node16 migration exposes the
   existing CommonJS server / ESM `@dnd/contracts` boundary. Treat the real
   server migration as a focused follow-up: decide whether to move server to ESM
   or add an explicit CJS-compatible contracts boundary, then remove the
   deprecation suppression.

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- content artifact pipeline for versioned content releases
- large-scale Chinese/English translation/proofreading QA workflow
- `data/spells-full` completion workflow for adding remaining source-backed
  English spells into the content/rules DB path
- static HTML/offline artifact generation to replace old loose HTML
  distribution
- search/index artifact generation for offline or static deployments
- release automation beyond the v3.5 script-backed CD pass
- rollback playbook
- HTTPS / TLS and host hardening
- deeper architecture docs beyond the v3.5 module-doc automation pass

See `docs/stable-backlog.md`.

## Working Rule

When restarting after a gap:

1. read this roadmap
2. check `git status --short`
3. read the topic doc for the next area
4. run the smallest relevant validation command before editing
5. update this roadmap only when the next-work order or active track changes
