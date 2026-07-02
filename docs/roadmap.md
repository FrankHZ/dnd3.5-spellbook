# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned MVP plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

v3.3 is frozen. The latest release snapshot is
`docs/mvp/v3.3/FREEZE.md`.

The completed v3.3 implementation focus was data and workflow stability:

1. keep rules DB preparation out of server runtime
2. make missing spell imports reviewable and repeatable
3. reduce CHM parser hard misses
4. prepare a maintainable CHM source-of-truth path
5. preserve the Search/Browse query behavior already described in the feature
   map

Older frozen snapshots remain historical comparison points, not active
baselines.

## Recently Completed

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

Full bulk translation QA is deferred until a large translation rewrite or a
future short-description import creates new target text to review.

## Next Work

Recommended next sequence:

1. **v3.4 closeout: integrated plan**

   Use `docs/mvp/v3.4/integrated-plan.md` as the coordination surface. v3.4
   should close around the short-description pipeline, data harness hardening,
   and freeze documentation rather than expanding into every planned frontend
   cleanup track.

2. **v3.4 closeout: data harness hardening**

   Use `docs/mvp/v3.4/data-harness-hardening-plan.md` to add the smallest
   durable harness slice: portable data-tools tests plus explicit local-data
   acceptance checks around CHM parser matching, summary QA/import dry-runs,
   structured rules patch validation, and the local rules DB manifest.

3. **v3.4 closeout: acceptance and freeze docs**

   Record the final validation commands and counts in a v3.4 acceptance
   checklist and `FREEZE.md`. At minimum, rerun and record:

   ```bash
   npm run verify
   npm run -w data-tools summaries:qa
   npm run -w data-tools summaries:import -- --dry-run
   npm run -w data-tools rules:manifest:verify
   ```

4. **parallel or follow-up: frontend design refresh**

   Use `docs/mvp/v3.4/design-refresh-plan.md` to review existing frontend
   components against `docs/design.md`, then implement small styling and
   consistency improvements that are easy to inspect in the running app. This
   is not a v3.4 freeze blocker unless explicitly promoted.

5. **completed: frontend i18n convention cleanup**

   Keep `i18next`, but replace raw-English translation keys with stable
   semantic keys and make `npm run i18n:check` enforce the convention. This is
   independent from spell/content summaries.

   See:

   - `docs/mvp/v3.4/i18next-conventions-plan.md`

6. **follow-up: PDF-backed short-description coverage**

   Use `docs/mvp/v3.4/short-description-pipeline-plan.md` as the source of
   truth for the implemented extraction, normalization, import, API, and UI
   consumer path. The current local app DB import contains `6,532` accepted
   spell summary rows in `I18nSpellSummaryText`. Low-risk automatic English
   source-gap reuse has been exhausted for core plus supplementals; the latest
   scoped coverage report shows `328` missing Chinese summaries, `1,053`
   missing English summaries, and `168` missing-both rows across those scopes.
   Further short-description coverage should be source/PDF-backed rather than
   fuzzy reuse.

7. **follow-up architecture review: DB ownership boundaries**

   Review the current app DB after the short-description pipeline settles. Today
   it effectively acts as an app-owned content DB, despite having placeholder
   user/app-state tables. Before real user state ships, decide whether to split
   generated content overlays into a content DB and keep user data in a separate
   app-state DB.

8. **follow-up TypeScript module config cleanup**

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

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- content artifact pipeline for versioned content releases
- large-scale Chinese/English translation and QA workflow
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

