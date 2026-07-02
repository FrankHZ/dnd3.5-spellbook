---
name: freeze-snapshot
description: Create or update as-built release freeze snapshots for this repository. Use when freezing an MVP/version folder, recording final acceptance evidence, updating docs after a release closeout, or turning active plans into a canonical shipped-state snapshot in dnd3.5-spellbook.
---

# Freeze Snapshot

Use this skill to freeze a version after implementation branches have been
reviewed and merged. The output is a concise as-built snapshot, not another
implementation plan.

## Workflow

1. Confirm scope.
   - Read `docs/roadmap.md`.
   - Read the version integrated plan and acceptance checklist.
   - Check `git status --short --branch`.
   - Do not freeze a version while known blocking branches are still unmerged.

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

3. Write or update `docs/mvp/<version>/FREEZE.md`.
   - Start with status, canonical source order, and frozen deliverables.
   - Record final as-built behavior by shipped workstream.
   - Record exact validation commands and high-signal results.
   - Record local-data counts that future agents need for regression checks.
   - Record known backlog as non-blocking deferred work.

4. Update navigation surfaces together.
   - Root `README.md`.
   - `docs/README.md`.
   - `docs/roadmap.md`.
   - `AGENTS.md` when the latest frozen snapshot or active planning track
     changes.

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

## Template

Use this structure unless the existing version already has a better one:

```markdown
# vX.Y Freeze

## Status

**vX.Y FROZEN**

One short paragraph naming the release boundary.

## Canonical Source Order

1. docs/mvp/vX.Y/FREEZE.md
2. docs/features.md
3. docs/mvp/vX.Y/acceptance-checklist.md
4. focused plan docs

## Frozen Deliverables

Numbered list of shipped workstreams.

## Final As-Built Summary

### 1. Workstream Name

Shipped behavior:

- concise behavior bullets

Accepted snapshot:

| Metric | Value |
| ------ | ----: |

Frozen clarification:

- important boundary or non-goal

## Final Validation Evidence

Commands run:

```bash
...
```

Accepted results:

- high-signal command summaries

## Deferred Backlog

- explicit non-blocking follow-up
```
