# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned MVP plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

v3.4 is frozen. The latest release snapshot is
`docs/mvp/v3.4/FREEZE.md`.

The completed v3.4 implementation focus was content/data reliability plus small
frontend workflow polish:

1. ship spell short-description extraction, QA, normalization, import, API
   exposure, and first frontend consumers
2. harden the data-tools validation surface with portable tests and explicit
   local acceptance
3. keep rules DB manifest verification outside server runtime
4. land a small reference-style frontend design refresh
5. migrate frontend UI copy to semantic i18next keys with an audit guardrail
6. record v3.4 as-built behavior and validation evidence in the freeze snapshot

Older frozen snapshots remain historical comparison points, not active
baselines.

## Recently Completed

The v3.4 release is frozen with:

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
  `data/rules-patches/legacy-sql/`.
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
- `docs/rules-db-notes.md`

## Current Data State

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

1. **v3.5 scope review**

   Start from `docs/mvp/v3.5/integrated-plan.md`. Review whether the existing
   v3.5 child plans still fit after the v3.4 freeze and dependency updates.

2. **Content DB / app-state DB split**

   Review the current app DB after the short-description pipeline settles. Today
   it effectively acts as an app-owned content DB, despite having placeholder
   user/app-state tables. Before real user state ships, decide whether to split
   generated content overlays into a content DB and keep user data in a separate
   app-state DB.

3. **Rules content normalization and frontend consumers**

   Use `docs/mvp/v3.5/rules-content-normalization-plan.md` and
   `docs/mvp/v3.5/normalized-rules-frontend-consumer-plan.md` together. The
   goal is to stop treating dirty legacy string columns as the runtime query
   model and to expose finer Browse/Search facets without bloating page
   controls.

4. **Rulebook display-label review**

   Use `docs/mvp/v3.5/rulebook-display-labels-plan.md` to audit rulebook
   abbreviations and localized display labels. Keep source slugs stable, but
   improve reader-facing labels.

5. **Dependency, CI/CD, module-doc, and agent-guide cleanup**

   Use the v3.5 dependency/CI and agent-guide plans to add clean-checkout CI,
   review dependencies, preserve CD as script-backed deployment, and shrink
   `AGENTS.md` back toward a compact execution guide.

   Current dependency status: the first v3.5 infra slice refreshes lockfile
   entries that fit existing semver ranges. Major or ecosystem upgrades remain
   deferred into focused branches: React Router 8, Vite 8, i18next 26,
   i18next-http-backend 4, react-i18next 17, lucide-react 1, shadcn 4,
   vite-tsconfig-paths 6, @types/node 26, and the Prisma dev-chain audit fix
   once a Prisma 7-compatible path is available.

6. **PDF-backed short-description coverage**

   Keep this as follow-up content work unless explicitly promoted into v3.5.
   Further short-description expansion should be source/PDF-backed rather than
   fuzzy reuse.

7. **TypeScript module config cleanup**

   `data-tools` has moved to `moduleResolution: "Node16"` with an explicit
   `rootDir`. The server still uses CommonJS plus `moduleResolution: "node"`
   with `ignoreDeprecations: "6.0"` because direct Node16 migration exposes the
   existing CommonJS server / ESM `@dnd/contracts` boundary. Treat the real
   server migration as a focused follow-up: decide whether to move server to ESM
   or add an explicit CJS-compatible contracts boundary, then remove the
   deprecation suppression.

## v3.5 Planning Candidates

These items are intentionally future-facing. Do not let them disrupt active
v3.4 acceptance work unless a v3.4 implementation exposes the same boundary.

Start v3.5 planning from `docs/mvp/v3.5/integrated-plan.md`. That plan owns the
cross-plan delivery sequence and conflict review; the items below remain the
topic-specific child plans.

1. **Content DB / app-state DB split**

   Use `docs/mvp/v3.5/db-ownership-boundary-plan.md` to split generated content
   overlays from future user/app-state data before real server-side user data
   ships. The current app DB is effectively content-owned today; v3.5 should
   make that physical and tooling boundary explicit.

2. **Rules content normalization**

   Use `docs/mvp/v3.5/rules-content-normalization-plan.md` to generate and
   maintain this repo's own normalized rules content model from the cleaned
   legacy rules DB plus local review decisions. The target is to stop treating
   dirty legacy string columns as the runtime schema and to unlock finer
   Browse/Search filters such as schools, descriptors, components, casting
   facets, range, duration, saving throws, and spell resistance.

3. **Normalized rules frontend consumer**

   Use `docs/mvp/v3.5/normalized-rules-frontend-consumer-plan.md` before adding
   broad Browse/Search controls for normalized rules facets. Keep URL state,
   API helper tests, scope summaries, and mobile sidebar behavior aligned while
   preserving Browse as filter-first and Search as name-first.

4. **Rulebook display-label review**

   Use `docs/mvp/v3.5/rulebook-display-labels-plan.md` to audit rulebook
   abbreviations and localized display labels. Keep rules DB slugs and legacy
   source abbreviations stable, but stop treating them as the default
   reader-facing UI labels.

5. **Agent guide review**

   Use `docs/mvp/v3.5/agent-guide-review-plan.md` to shrink `AGENTS.md` back
   into a compact execution guide. In the same pass, review `docs/features.md`,
   `docs/feature-workflow.md`, and `docs/frontend-map.md` so feature docs,
   workflow docs, and future module docs have clear ownership. Make repo-local
   skill path resolution explicit so agents read
   `.agents/skills/commit-message/SKILL.md` from the active worktree instead of
   probing user-level paths first.

6. **CI/CD, dependency review, and module-doc automation**

   Use `docs/mvp/v3.5/ci-cd-and-module-docs-plan.md` to add CI around the
   existing unit/API/typecheck validation spine, review and update dependencies
   in a dedicated maintenance lane, keep browser E2E out of the first CI scope,
   preserve CD as a thin wrapper around the current deployment scripts, and
   design a merge-to-main agent job that refreshes high-level module design docs
   after accepted changes.

   Treat held-back major dependency upgrades as separate follow-up branches, not
   incidental cleanup inside DB, data, i18n, or frontend feature branches.

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

