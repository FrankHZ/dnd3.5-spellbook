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
- local data layout was moved under `data-tools/data/` and generated reports
  under `data-tools/out/`.
- legacy rules SQL patch assets moved to
  `data-tools/data/rules-patches/legacy-sql/`.
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

- `matched`: `3234`
- `unmatched`: `7`
- `unknownBookLabel`: `5`
- `missingSpellInDb`: `2`

The hard parser misses are now mostly source-label and source-text cleanup:

- combined or note-like labels:
  - `Death Dragon`
  - `Defenestrating Sphere`
  - `Delay Death`
  - `Phantasmal Thief`
- typo/source noise:
  - `Otiluke's Impressing Field` should resolve to
    `Otiluke's Suppressing Field`
- non-spell source page:
  - `Summon` from `召唤列表-summon.htm`

`missing-zh` is a broader coverage report, not the same thing as parser hard
misses. Its count may increase when a new rulebook label becomes recognized and
the backcheck coverage set grows.

## Next Work

Recommended next sequence:

1. **CHM hard-miss cleanup**

   Fix parser/source-label handling for combined labels, note-like labels, and
   obvious source-text typos. Target outcome: `unmatched` contains only true
   non-spell or explicitly deferred source records.

2. **Clean CHM source-of-truth**

   Copy the current cleaned CHM output into a maintainable local source tree,
   then make known source-name and formatting fixes there instead of patching
   generated output. Keep source material local-only unless a redacted fixture
   is needed for tests.

3. **Short description pipeline**

   Parse class/spell summary tables from CHM sources and decide where short
   descriptions live in the app-owned data model. Chinese short descriptions
   should use local CHM sources; English short descriptions still need a source
   decision.

4. **Data harness hardening**

   Add focused tests or report checks for CHM parser matching, source-label
   normalization, and structured rules patch validation. Keep these small and
   close to the data tooling.

5. **Search/Browse feature work**

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
