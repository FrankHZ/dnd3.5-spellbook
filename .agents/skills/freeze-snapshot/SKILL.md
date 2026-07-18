---
name: freeze-snapshot
description: Create or update as-built release freeze snapshots for this repository. Use when freezing an MVP/version folder, recording final acceptance evidence, updating docs after a release closeout, or turning active plans into a canonical shipped-state snapshot in dnd3.5-spellbook.
---

# Freeze Snapshot

Use this skill to freeze a version after implementation branches have been
reviewed and merged. The output is a concise as-built snapshot, not another
implementation plan.

At the current project scale, the freeze sweep is also the normal place for
routine closeout hygiene after the final implementation PR merges. This includes
clearing stale "ready for review" wording, moving roadmap next work to the next
active step, preserving non-blocking follow-up candidates as deferred work, and
aligning navigation docs. Do not create a separate pre-freeze branch for these
chores unless the cleanup changes release scope, ownership boundaries, delivery
sequence, or implementation behavior.

## Workflow

1. Confirm scope.
   - Read `docs/roadmap.md`.
   - Read `docs/releases/README.md` for formal releases or
     `docs/mvp/README.md` for MVP-stage freezes.
   - Read the version plans and acceptance checklist.
   - Check `git status --short --branch`.
   - Do not freeze a version while known blocking branches are still unmerged.
   - For a formal release, confirm root `package.json` is the canonical release
     version and matches the target version without the leading `v`. Update
     root `package.json` and `package-lock.json` together when it changes; do
     not bump workspace package versions unless those packages are released
     independently. Update any explicit expected-version assertion in
     `scripts/release-metadata.test.mjs` at the same time.

2. Run acceptance from the target branch, usually `main`.
   - Run the version checklist commands exactly when available.
   - For v3.4-style releases, use:

     ```bash
     npm run verify
     npm run -w data-tools test:portable
     npm run -w data-tools acceptance:local
     ```

   - Add focused checks only for shipped optional tracks, for example:

     ```bash
     npm run i18n:check
     npm run -w web build
     npm run -w data-tools summaries:coverage-report
     ```

   - For a formal release with production version metadata, also run:

     ```bash
     node scripts/release-metadata.mjs --label
     npm run test:release-metadata
     ```

   - Verify the production frontend and backend report the accepted release
     label, ref, and commit. An HTTP 200 response from `/about` alone is not
     release-metadata acceptance.

3. Write or update the freeze snapshot.
   - Use `docs/releases/<version>/FREEZE.md` for formal post-MVP releases.
   - Use `docs/mvp/<version>/FREEZE.md` for MVP-stage freezes.
   - Start from `docs/templates/freeze-snapshot.md` for new freeze files.
   - Start with status, canonical source order, and frozen deliverables.
   - Record final as-built behavior by shipped workstream.
   - Record exact validation commands and high-signal results.
   - Record local-data counts that future agents need for regression checks.
   - Record known backlog as non-blocking deferred work.

4. Update navigation surfaces together.
   - Root `README.md`.
   - `docs/README.md`.
   - `docs/releases/README.md` or `docs/mvp/README.md`, matching the freeze
     surface, when version-folder roles or latest snapshots change.
   - `docs/roadmap.md`.
   - `AGENTS.md` when the latest frozen snapshot or active planning track
     changes.
   - Current version README and child plans when they still contain stale
     active-implementation or review-pending wording.

5. Verify documentation-only changes.
   - Run `git diff --check`.
   - Run a smaller validation command if the freeze docs changed command names
     or script guidance.

## What To Include

Include evidence that can be checked later:

- command names and pass/fail result
- test file/test count summaries
- import dry-run inserted/updated/unchanged counts
- manifest pass state, patch counts, and relevant hashes
- coverage counts only with their scope
- warnings only when they are meaningful for future triage

Keep the prose short. Prefer tables for counts.

## What Not To Do

- Do not describe intended scope as shipped behavior unless acceptance proved it.
- Do not copy large command logs into the freeze document.
- Do not make root `npm run verify` depend on local ignored data just to make
  freeze easier.
- Do not put new active work into frozen version folders.
- Do not hide unfinished work. Move it into roadmap, vNext plans, or stable
  backlog as explicit deferred scope.
- Do not split routine closeout wording, navigation, or deferred-follow-up
  cleanup into a separate pre-freeze branch at the current project scale.

## Template

Use `docs/templates/freeze-snapshot.md` unless the existing version already has
a better established structure. Use `docs/templates/acceptance-checklist.md`
when adding a version acceptance checklist before freeze.

Use current operational paths in canonical source order, for example
`docs/operations/data-setup.md` and `docs/operations/deployment.md`.
