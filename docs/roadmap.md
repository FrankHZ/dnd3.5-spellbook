# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned MVP plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

Active development is in the v3.3 acceptance track.

The v3.3 implementation focus has been data and workflow stability:

1. keep rules DB preparation out of server runtime
2. make missing spell imports reviewable and repeatable
3. reduce CHM parser hard misses
4. prepare a maintainable CHM source-of-truth path
5. preserve the Search/Browse query behavior already described in the feature
   map

The latest frozen release snapshot remains `docs/mvp/v3.2/FREEZE.md`; it is a
historical comparison point, not the active baseline.

## Recently Completed

The v3.3 data-tooling foundation is mostly in place:

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

1. **v3.3 acceptance pass**

   Confirm the implemented v3.3 plan set against the current repo:

   - data-tools workspace boundary
   - root local `data/` repo boundary
   - rules DB prep commands
   - structured missing-spell patch commands
   - `spells-full` known-miss import path
   - accepted Clean CHM source-of-truth state
   - Search/Browse query behavior described in `docs/features.md`

   Use the usual verification spine:

   ```bash
   npm run -w data-tools zh:parse
   npm run -w data-tools zh:qa
   npm run -w data-tools zh:backcheck
   npm run -w server db:app:import:zh-chm
   npm run verify
   ```

2. **v3.3 freeze document**

   After acceptance passes, add `docs/mvp/v3.3/FREEZE.md` as the shipped-state
   snapshot and update `docs/README.md` / root `README.md` so v3.3 becomes the
   latest frozen stage.

3. **Post-v3.3 candidate: short description pipeline**

   Do not block v3.3 on short descriptions. After v3.3 is frozen, make a new
   concrete plan for parsing class/spell summary tables from CHM sources and
   deciding where short descriptions live in the app-owned data model. Chinese
   short descriptions should use local CHM sources; English short descriptions
   still need a source decision.

4. **Post-v3.3 candidate: data harness hardening**

   Add focused tests or report checks for CHM parser matching, source-label
   normalization, and structured rules patch validation. Keep these small and
   close to the data tooling.

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- CI/CD
- release automation
- rollback playbook
- HTTPS / TLS and host hardening
- deeper architecture docs if the system grows enough to justify them

See `docs/stable-backlog.md`.

## Working Rule

When restarting after a gap:

1. read this roadmap
2. check `git status --short`
3. read the topic doc for the next area
4. run the smallest relevant validation command before editing
5. update this roadmap only when the next-work order or active track changes

