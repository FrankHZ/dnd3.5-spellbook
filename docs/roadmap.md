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

5. **parallel or follow-up: frontend i18n convention cleanup**

   Keep `i18next`, but replace raw-English translation keys with stable
   semantic keys and make `npm run i18n:check` enforce the convention. This is
   independent from spell/content summaries and can move to v3.5.

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

