# Agent Guide

This is the agent-facing execution guide for this repository.

Keep it compact. Human-facing overview material belongs in `README.md`; the
canonical documentation map belongs in `docs/README.md`; current work ordering
belongs in `docs/roadmap.md`.

## Project Shape

- `server/`: Express API, Prisma clients, SQLite runtime access, API tests.
- `web/`: React Router frontend, UI components, browser state, i18n runtime.
- `contracts/`: shared TypeScript DTOs used by both `server` and `web`.
- `data-tools/`: parser, import, inspection, rules patch, short-description,
  and data harness tooling.
- `docs/`: durable project docs, operational docs, and MVP history.
- `data/`: ignored nested local data repo for source inputs, maintained patch
  data, normalized import JSONL, and review decisions.
- `server/data/db/`: ignored local runtime SQLite databases.
- `data-tools/out/`: generated reports, parser output, review queues, and other
  rebuildable intermediates.

## Start Here

Use these docs for orientation instead of expanding this file:

- `docs/README.md`: canonical documentation map and historical/current doc
  ownership.
- `docs/roadmap.md`: current active work ordering after a pause.
- `docs/features.md`: current user-facing feature map.
- `docs/feature-workflow.md`: feature intake and implementation loop.
- `docs/modules/README.md`: high-level module ownership and validation
  boundaries.
- `docs/harness.md`: validation and harness strategy.
- `docs/design.md`: durable UI design direction.
- `docs/i18n.md`: frontend copy, language fallback, and locale workflow.
- `docs/deployment.md`: deployment and environment operations.

For workspace command references, use:

- `server/README.md`
- `web/README.md`
- `contracts/README.md`
- `data-tools/README.md`

Version folders under `docs/mvp/` are stage records and active plan spaces. A
`FREEZE.md` records a shipped stage; it is not automatically the baseline for
later development. Treat plan documents as intended scope, not as proof of
shipped behavior.

## Repo-Local Skills

Use the repo-local `$branch-naming` skill before creating, renaming, or
assigning Codex work branches.

Use the repo-local `$commit-message` skill before committing.

Use the repo-local `$freeze-snapshot` skill before creating or updating a
version `FREEZE.md`, recording release acceptance evidence, or moving the
latest frozen snapshot in navigation docs.

Repo-local skills live under `.agents/skills/` in the current worktree. When
using repo skills such as `branch-naming` or `commit-message`, read
`.agents/skills/<skill>/SKILL.md` relative to the active worktree root. Do not
probe a user-level `.agents` path first.

## Working Rules

- Prefer existing patterns over new frameworks or broad rewrites.
- Keep changes scoped to the requested behavior.
- Use this main thread as the planning and review gate for broad work. Use
  specialist agents or focused branches for domain-heavy work such as design,
  i18n, data tooling, deployment, harness, or frontend UI passes.
- Treat `main` as remote-managed. Work on feature branches, push the branch,
  open a PR, and let remote CI protect merges. Do not locally merge and push
  `main` unless the user explicitly asks for a direct main update.
- Use subagents for bounded implementation or corpus-inspection slices after
  the main agent has set the boundary. The main agent still owns review,
  merge-readiness, and source-of-truth docs.
- When editing from a sibling worktree, use absolute paths with patch tools or
  otherwise prove the edit target is inside the intended worktree before
  applying changes.
- Do not commit local data, database files, generated logs, or personal wrapper
  scripts to the parent repo. The nested `data/` repo may version local source
  data separately.
- Do not treat root-level `.bat` files as canonical. Tracked deployment scripts
  live under `docs/deployment-scripts/`; the GitHub deploy workflow should stay
  a thin wrapper around those scripts.
- If shared DTOs change, rebuild `contracts` before validating `server` or
  `web`.
- If behavior differs from documentation, update the newest topic-specific
  canonical doc rather than editing old MVP history.

## Feature Change Workflow

For ordinary feature requests:

1. Locate the feature in `docs/features.md`.
2. Read the existing feature entry point and nearby tests before editing.
3. For non-trivial changes with clear scope, copy
   `docs/templates/feature-plan.md` to `docs/tmp-feature-plan.md` and use it as
   a working checklist.
4. For ambiguous, structural, or workflow-changing requests, write a durable
   concrete plan under the active development docs indicated by
   `docs/roadmap.md`, commit that plan first, and only then implement the
   deliverable. Do not add new active scope to frozen version folders.
5. Reuse current API helpers, storage helpers, UI wrappers, and feature folders
   instead of creating parallel structures.
6. Add or update the closest harness layer.
7. Delete `docs/tmp-feature-plan.md` before commit unless the user explicitly
   wants it archived.
8. Run the smallest relevant validation command before handoff.
9. Update durable docs when behavior, workflow, workspace shape, validation
   commands, or agent guidance changed.

When adding, moving, or retiring a workspace, tool command, active plan, or
source-of-truth document, check the navigation surface together: root
`README.md`, `docs/README.md`, `AGENTS.md`, and the relevant workspace
`README.md`.

Use the plan-first path especially when the user corrects product semantics,
the change affects workspace boundaries or agent workflow, data import behavior
could create parallel sources of truth, or a feature request needs confirmation
before implementation details are safe.

## Data And Environment

The app depends on local SQLite files configured by `server/.env`:

- `RULES_DATABASE_URL`
- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`

`APP_DATABASE_URL` is a transitional compatibility alias for the content DB
only. These point at local files under `server/data/db/`. That tree is
intentionally excluded from the public repo baseline. Do not replace it, move
it, or assume a fresh clone has the same data.

Data tools may inspect local SQLite files, but must not modify
`server/data/db/` unless the user explicitly asked for a write-capable workflow.

Content-bearing local patch data, maintained source indexes, normalized import
JSONL, and durable review decisions belong in the nested `data/` repo. Keep
schemas, validators, generators, generated queues, run reports, and
redacted/minimal fixtures in the parent repo.

For any large-scale source reading or broad content QA over local data sources,
spawn a subagent to inspect the corpus and return summarized findings instead
of loading the source corpus into the main agent context.

## Validation Commands

Run the smallest relevant local check first. Do not default to full portable CI
for every branch while iterating; remote PR CI is the merge gate.

```bash
npm run verify
npm run ci:portable
```

`npm run ci:portable` is the clean-checkout CI subset used by GitHub Actions. It
includes backend API tests against disposable fixtures. Run it locally for
merge-readiness spot checks or CI/debugging, not as mandatory overhead for every
small edit.

Useful pieces:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
npm run -w web build
```

Use local data acceptance only when the change touches local source data,
rules DB manifests, parser output, or import behavior:

```bash
npm run -w data-tools acceptance:local
```

For frontend copy changes:

```bash
npm run i18n:sync
npm run i18n:check
```

For frontend behavior or layout changes, combine targeted tests/builds with a
manual browser smoke test of the affected pages.

## Module Notes

- Frontend routes and feature entry points are mapped in `docs/frontend-map.md`.
- High-level module ownership lives in `docs/modules/`.
- API calls should go through `web/app/api/`.
- Local UI wrappers live in `web/app/components/ui/`.
- Server API route registration starts in `server/src/app.ts`.
- Spell backend behavior is split under `server/src/services/spells/`.
- Runtime database clients are generated from both Prisma schemas; regenerate
  clients when schemas change.
- Data-tool code belongs under the owning `data-tools/src/` module:
  `shared/`, `db/`, `rules/`, `short-desc/`, `zh-parser/`, or `harness/`.
- Classify every `data-tools/package.json` script in
  `data-tools/scripts.manifest.json`.
- Maintained data-tool commands deserve focused helper tests. One-time or
  dormant local scripts should not be wired into always-on validation unless
  they are promoted into the maintained workflow.

## Documentation Notes

- `README.md` files are navigation and short operational entry points.
- `docs/` files are durable project truth by topic.
- `docs/features.md` is the user-facing feature map.
- `docs/modules/` is the high-level module design surface.
- `docs/mvp/` is stage history plus active plan space; frozen version folders
  should not become the daily agent working surface.
- New agent or harness guidance belongs in `AGENTS.md` or `docs/harness.md`,
  not inside old MVP plan files.
- Current work ordering after a pause belongs in `docs/roadmap.md`, while
  detailed implementation plans stay in focused topic docs.
