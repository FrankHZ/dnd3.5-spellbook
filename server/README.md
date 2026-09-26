# Server Workspace

Express API, request validation, and Prisma runtime access. Data preparation
and rules patching belong to `data-tools/`.

## Setup And Commands

Install dependencies from the repository root. Configure the three DB roles in
`server/.env` using [data setup](../docs/operations/data-setup.md), then generate
clients with `npm run -w server db:generate`. Build shared contracts with
`npm run build:contracts` on a fresh checkout or after contract changes.

Run these commands from the repository root; [package.json](./package.json)
owns the executable definitions.

| Task | Command |
| --- | --- |
| Develop | `npm run -w server dev` |
| Build | `npm run -w server build` |
| Check compiled imports after building | `npm run -w server check:runtime` |
| Run the built API | `npm run -w server start` |
| Run API tests once | `npm run test:server` |

Tests use disposable synthetic DB fixtures. Documentation-only changes need
link, command, and diff checks, not the API suite. For behavior changes, run the
closest API tests first; see [validation](../docs/modules/server.md#validation).

Use npm scripts for TS maintenance commands: they set the required Node
`source` condition. Bare `tsx` does not provide it. Built runtime commands
resolve imports to `dist/`; see [module imports](../docs/modules/server.md#module-imports).
The build excludes local data import scripts so deployment does not depend on
source-data files.

## Configuration And Files

- `src/app.ts`: route registration; `src/services/spells/`: spell behavior.
- `tests/`: API tests; `prisma-*/`: role-specific schemas and clients.
- `db/`: tracked migrations, seed entry points, and portable fixtures.
- `db/local/`: ignored, operator-owned runtime databases; do not replace them
  as part of setup or validation without explicit write authorization.
- `scripts/`: content import and maintenance entry points.

Runtime requires `RULES_DATABASE_URL`, `CONTENT_DATABASE_URL`, and
`APP_STATE_DATABASE_URL` before the HTTP listener starts. `APP_DATABASE_URL`
is a compatibility alias for content only. The API defaults to normalized
content reads; `SPELL_READ_SOURCE=rules` is the explicit legacy rollback path.

`HOST` should normally be `127.0.0.1` in production behind Nginx; `PORT` defaults
to `3000`. Production browser origins belong in `SPELLBOOK_CORS_ORIGINS`.
Detailed `/api/status/db` access uses `SPELLBOOK_DB_STATUS_TOKEN` by default;
`ENABLE_DB_STATUS_PUBLIC=true` is an intentional public-provenance opt-in.
Public UI uses the redacted `/api/status/app` summary.

Read only the topic needed for the task:

- [Server boundaries and API contracts](../docs/modules/server.md)
- [Local import commands and mutation boundaries](../docs/operations/import-workflow.md)
- [Deployment configuration and activation](../docs/operations/deployment.md)
