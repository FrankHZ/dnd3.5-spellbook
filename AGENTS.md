# Agent Guide

This file is the agent-facing entry point for this repository.

Use it to make safe, consistent changes without rereading every historical MVP
document first. Human-facing overview material stays in `README.md`; durable
project docs live under `docs/`.

## Project Shape

- `server/`: Express API, Prisma clients, SQLite access, import tooling, API tests.
- `web/`: React Router frontend, local UI wrappers, browser-facing app state.
- `contracts/`: shared TypeScript DTOs used by both `server` and `web`.
- `docs/`: current operational docs plus historical MVP planning records.
- `server/data/`: local-only data and databases; do not assume it is portable.

## Canonical Docs

Start with these files when orienting:

1. `docs/README.md` for the documentation map.
2. `docs/mvp/v3.2/FREEZE.md` for frozen shipped behavior.
3. `docs/features.md` for the current user-facing feature map.
4. `docs/harness.md` for validation and test-harness strategy.
5. Workspace READMEs for operational commands:
   - `server/README.md`
   - `web/README.md`
   - `contracts/README.md`

Older files under `docs/mvp/` are historical unless the current freeze document
or `docs/README.md` says otherwise. Treat plan documents as intended scope, not
as proof of shipped behavior.

## Working Rules

- Prefer existing patterns over new frameworks or broad rewrites.
- Keep changes scoped to the requested behavior.
- Do not commit local data, database files, generated logs, or personal wrapper
  scripts.
- Do not treat root-level `.bat` files as canonical; tracked deployment scripts
  live under `docs/deployment-scripts/`.
- If shared DTOs change, rebuild `contracts` before validating `server` or
  `web`.
- If behavior differs from documentation, update the newest canonical doc rather
  than editing old MVP history.

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
npm run build:contracts
npm run -w server test -- --run
npm run -w web typecheck
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
2. Add API contract tests around frozen v3.2 behavior.
3. Add pure frontend logic tests for JSON import/export and collection storage.
4. Add browser smoke tests for browse, search, spell detail, and collections.
5. Only then add larger end-to-end workflows.

See `docs/harness.md` for details.

## Frontend Notes

- Main routes and feature entry points are mapped in `docs/frontend-map.md`.
- Local UI wrappers live in `web/app/components/ui/`.
- API calls should go through `web/app/api/`.
- Browser-facing API paths are relative `/api/...`; development proxy behavior
  is defined in `web/vite.config.ts`.

## Backend Notes

- API route registration starts in `server/src/app.ts`.
- Spell behavior is split across controllers, service files, and repo files
  under `server/src/services/spells/`.
- Existing API tests use Vitest and Supertest under `server/tests/`.
- Runtime database clients are generated from both Prisma schemas. Regenerate
  clients when schemas change.

## Documentation Notes

Keep docs lightweight:

- `README.md` files are navigation and short operational entry points.
- `docs/` files are durable project truth by topic.
- `docs/features.md` is the user-facing feature map.
- `docs/mvp/` is release history and should not become the daily agent working
  surface.
- New agent or harness guidance should go in `AGENTS.md` or `docs/harness.md`,
  not inside old MVP plan files.
