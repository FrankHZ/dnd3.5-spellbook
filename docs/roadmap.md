# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned MVP plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

Active development is still in the post-v3.2 / v3.3 track.

The current emphasis is data and workflow stability:

1. keep rules DB preparation out of server runtime
2. make missing spell imports reviewable and repeatable
3. reduce CHM parser hard misses
4. prepare a maintainable CHM source-of-truth path
5. return to search/browse UI work after data inputs are steadier

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
current report has no errors or warnings; remaining body-note markers are
informational review leads, not parser blockers. Full bulk translation QA is
deferred until a large translation rewrite or short-description import creates
new target text to review.

## Next Work

Recommended next sequence:

1. **Clean CHM source-of-truth**

   Treat the current `data/chm-clean/` tree as the maintained local source
   input. Continue making known source-name and formatting fixes there, backed
   by `zh:parse`, `zh:backcheck`, and `zh:qa`.

2. **Short description pipeline**

   Parse class/spell summary tables from CHM sources and decide where short
   descriptions live in the app-owned data model. Chinese short descriptions
   should use local CHM sources; English short descriptions still need a source
   decision.

3. **Data harness hardening**

   Add focused tests or report checks for CHM parser matching, source-label
   normalization, and structured rules patch validation. Keep these small and
   close to the data tooling.

4. **Search/Browse feature work**

   Resume the planned query unification and UI cleanup in
   `docs/mvp/v3.3/search-browse-query-plan.md` after the current data inputs are
   less noisy.

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

