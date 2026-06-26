# Agent Guide

This file is the agent-facing entry point for this repository.

Use it to make safe, consistent changes without rereading every historical MVP
document first. Human-facing overview material stays in `README.md`; durable
project docs live under `docs/`.

## Project Shape

- `server/`: Express API, Prisma clients, SQLite access used by runtime, API tests.
- `web/`: React Router frontend, local UI wrappers, browser-facing app state.
- `contracts/`: shared TypeScript DTOs used by both `server` and `web`.
- `data-tools/`: import, inspection, parser, and future rules DB patch tooling.
  Server-side wrapper scripts may remain for command compatibility.
- `docs/`: current operational docs plus historical MVP planning records.
- `server/data/db/`: local-only runtime SQLite databases; do not assume they are
  portable.
- `server/data/i18n/`: local app-owned entity translation inputs consumed by
  server import scripts.
- `data/`: nested local data repo for parser/import source inputs and rules
  patch files. The parent repo ignores this directory.
- `data-tools/out/`: generated data-tool reports and parser output.

## Canonical Docs

Start with these files when orienting:

1. `docs/README.md` for the documentation map.
2. `docs/roadmap.md` for current active work ordering after a pause.
3. `docs/features.md` for the current user-facing feature map.
4. `docs/feature-workflow.md` before implementing non-trivial new features.
5. `docs/mvp/v3.3/acceptance-checklist.md` during v3.3 acceptance/freeze work.
6. `docs/mvp/v3.3/data-tools-workspace-plan.md` before moving or adding data
   import, parser, rules DB inspection, or rules DB patch tooling.
7. `docs/mvp/v3.3/local-data-layout-plan.md` before moving CHM inputs, parser
   outputs, local source data, or future rules patch files.
8. `docs/mvp/v3.3/rules-db-prep-workflow-plan.md` before moving SQL patch
   assets, adding rules DB preparation commands, or importing missing English
   base spell records.
9. `docs/mvp/v3.3/structured-spell-patch-plan.md` before designing or applying
   missing English spell patch data.
10. `docs/mvp/v3.3/spells-full-import-plan.md` before using local
   `spells-full` source data to generate missing English spell patches.
11. `docs/harness.md` for validation and test-harness strategy.
12. `docs/i18n.md` when changing UI copy, language fallback, or locale files.
13. `docs/mvp/v3.2/FREEZE.md` only when you need the latest frozen release
    snapshot for historical comparison or regression checks.
14. Workspace READMEs for operational commands:

- `server/README.md`
- `data-tools/README.md`
- `web/README.md`
- `contracts/README.md`

Version folders under `docs/mvp/` are stage records. A `FREEZE.md` describes the
state of that stage; it is not automatically the baseline for later active
development. Treat plan documents as intended scope, not as proof of shipped
behavior.

## Working Rules

- Prefer existing patterns over new frameworks or broad rewrites.
- Keep changes scoped to the requested behavior.
- Do not commit local data, database files, generated logs, or personal wrapper
  scripts to the parent repo. The nested `data/` repo may version local source
  data separately.
- For any large-scale source reading or broad content QA over local data
  sources, spawn a subagent to inspect the corpus and return summarized findings
  instead of loading the source corpus into the main agent context.
- Do not treat root-level `.bat` files as canonical; tracked deployment scripts
  live under `docs/deployment-scripts/`.
- If shared DTOs change, rebuild `contracts` before validating `server` or
  `web`.
- If behavior differs from documentation, update the newest topic-specific
  canonical doc rather than editing old MVP history.

## Feature Change Workflow

For ordinary feature requests, follow this default loop:

1. Locate the feature in `docs/features.md`.
2. Read the existing feature entry point and nearby tests before editing.
3. For non-trivial changes with clear scope, copy `docs/templates/feature-plan.md` to
   `docs/tmp-feature-plan.md` and use it as a working checklist.
4. For ambiguous, structural, or workflow-changing requests, write a durable
   concrete plan under the active development docs, commit that plan first, and
   only then implement the deliverable. Current active development plans live
   under `docs/mvp/v3.3/`.
5. Reuse the current API helpers, storage helpers, UI wrappers, and feature
   folders instead of creating parallel structures.
6. Make the smallest change that satisfies the requested behavior.
7. Add or update the closest harness layer:
   - API shape or error tests for backend contract changes
   - pure frontend tests for storage, import/export, derivation, or API wrapper
     changes
   - typecheck/build verification for UI integration changes
8. Delete `docs/tmp-feature-plan.md` before commit unless the user explicitly
   wants it archived.
9. Run `npm run verify` before handing off.
10. Update durable docs when behavior, workflow, workspace shape, validation
    commands, or agent guidance changed.
11. When adding, moving, or retiring a workspace, tool command, active plan, or
    source-of-truth document, check and update the navigation surface together:
    root `README.md`, `docs/README.md`, `AGENTS.md`, and the relevant workspace
    `README.md`.

Use the plan-first path especially when:

- the user corrects or clarifies product semantics after an implementation
- the change affects workspace boundaries or agent workflow
- data import behavior could create parallel sources of truth
- a feature request needs confirmation before implementation details are safe

## Data And Environment

The app depends on local SQLite files configured by `server/.env`:

- `RULES_DATABASE_URL`
- `APP_DATABASE_URL`

These point at local files under `server/data/db/`. That tree is intentionally
excluded from the public repo baseline. Do not replace it, move it, or assume a
fresh clone has the same data.

## Validation Commands

Run the smallest relevant set first:

```bash
npm run verify
```

Or run the pieces individually:

```bash
npm run build:contracts
npm run typecheck:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
```

For frontend behavior changes, also build or manually smoke-test the app:

```bash
npm run -w web build
```

Some environments block Vite/esbuild child processes unless command execution is
allowed outside the sandbox. If a command fails with `spawn EPERM`, rerun the
same command with the appropriate approval rather than treating it as a project
failure.

## Harness Priorities

When improving reliability, prefer this order:

1. Make existing tests deterministic and avoid generated-output interference.
2. Add API contract tests around the current feature map and relevant frozen
   release snapshots.
3. Add pure frontend logic tests for JSON import/export and collection storage.
4. Add browser smoke tests for browse, search, spell detail, and collections.
5. Only then add larger end-to-end workflows.

See `docs/harness.md` for details.

## Frontend Notes

- Main routes and feature entry points are mapped in `docs/frontend-map.md`.
- Local UI wrappers live in `web/app/components/ui/`.
- API calls should go through `web/app/api/`.
- Frontend i18n runtime and fallback helpers live under `web/app/i18n/`; use
  `npm run i18n:sync` and `npm run i18n:check` after changing UI copy.
- Browser-facing API paths are relative `/api/...`; development proxy behavior
  is defined in `web/vite.config.ts`.

## Backend Notes

- API route registration starts in `server/src/app.ts`.
- Spell behavior is split across controllers, service files, and repo files
  under `server/src/services/spells/`.
- Existing API tests use Vitest and Supertest under `server/tests/`.
- Runtime database clients are generated from both Prisma schemas. Regenerate
  clients when schemas change.

## Data Tooling Notes

- Keep data import, parser, inspection, and future rules DB patch tooling out of
  `server/src`.
- Follow `docs/mvp/v3.3/data-tools-workspace-plan.md` when moving existing tools
  or adding new data tooling.
- Follow `docs/mvp/v3.3/local-data-layout-plan.md` before moving local data
  inputs or generated parser outputs.
- Preserve command compatibility when moving existing tooling, and keep behavior
  unchanged unless a feature plan says otherwise.
- New missing-spell workflows should treat base spell data as rules DB patches,
  not app DB overlays. Use `docs/rules-db-notes.md` before designing those
  imports.
- Follow `docs/mvp/v3.3/rules-db-prep-workflow-plan.md` before turning manual
  SQL patches into commands or adding write-capable rules DB workflows.
- Follow `docs/mvp/v3.3/structured-spell-patch-plan.md` before adding missing
  English base spell records.
- Follow `docs/mvp/v3.3/spells-full-import-plan.md` before generating
  structured spell patches from local `data/spells-full/` inputs.
- Run `npm run -w data-tools zh:qa` after CHM source cleanup or parser changes
  to catch mechanical source/header drift before import.
- Use `npm run -w data-tools rules:spells:validate -- <patch.jsonl>` and
  `npm run -w data-tools rules:spells:apply -- --dry-run <patch.jsonl>` before
  applying structured missing-spell patches.
- Content-bearing local patch data belongs in the nested `data/` repo. Keep
  schemas, validators, generators, reports, and redacted/minimal fixtures in the
  parent repo.
- Data tools may inspect local SQLite files, but must not modify
  `server/data/db/` unless the user explicitly asked for a write-capable
  workflow.

## Documentation Notes

Keep docs lightweight:

- `README.md` files are navigation and short operational entry points.
- `docs/` files are durable project truth by topic.
- `docs/features.md` is the user-facing feature map.
- `docs/mvp/` is stage history plus active plan space; frozen version folders
  should not become the daily agent working surface.
- New agent or harness guidance should go in `AGENTS.md` or `docs/harness.md`,
  not inside old MVP plan files.
- Current work ordering after a pause should go in `docs/roadmap.md`, while
  detailed implementation plans stay in focused topic docs.

