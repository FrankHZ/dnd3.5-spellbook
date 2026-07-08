# Server Workspace

This workspace contains the backend API and database access layer.

It serves the spell data consumed by the frontend and also contains the Prisma schemas and scripts used to manage local application data. Parser, inspection, and rules DB patch tooling lives in the `data-tools` workspace.

## Key Directories

- `src/`: application source code
- `tests/`: backend tests
- `prisma-content/`: generated/imported content overlay schema and config
- `prisma-app-state/`: future user/app-state schema and config
- `prisma-rules-clean/`: rules-side schema and generated client setup
- `db/`: tracked DB migrations, seed entry points, portable fixtures, and
  ignored local runtime SQLite files under `db/local/`
- `scripts/`: content DB import and maintenance scripts

## Main Commands

Run the API in development:

```bash
npm run -w server dev
```

Build the server:

```bash
npm run -w server build
```

The production build compiles runtime source, Prisma generated clients, and
server tests. Local data import scripts under `server/scripts/` are run with
`tsx` by their dedicated npm commands and are intentionally outside the server
build so deployment does not depend on local source-data files.

Server imports use Node package imports defined in `server/package.json`:
`#server/*` for application source and `#prisma-*/*` for generated Prisma
client trees. Development and TS maintenance scripts run with
`NODE_OPTIONS=--conditions=source` through the npm scripts in this file, while
Vitest uses `server/vitest.config.ts` source-condition resolution. Both paths
resolve those imports to current `.ts` source. The build does not run a
post-build alias rewrite; built runtime commands resolve the same imports to
`dist/`.

Do not run `tsx scripts/*.ts` directly when the script imports server code.
Use the matching npm script, or pass `NODE_OPTIONS=--conditions=source`.

Smoke the compiled runtime import after a build:

```bash
npm run -w server check:runtime
```

This imports `dist/src/app.js` without starting the listener. It catches
compiled module-format issues in the server app, package imports, contracts
runtime consumption, or generated Prisma clients.

Run the built server:

```bash
npm run -w server start
```

Run tests:

```bash
npm run -w server test
```

## Spell API Filters

`GET /api/spells/search` and `GET /api/spells/by-level` accept normalized
taxonomy filters as comma-separated id lists:

- `schoolIds`
- `subschoolIds`
- `descriptorIds`

Use `GET /api/meta/filters` for the filter vocabulary. It returns stable
id/key/slug/name values from accepted normalized content facets and overlays
localized labels when `lang`/`variant` are provided.

Generate Prisma clients:

```bash
npm run -w server db:generate
```

## Configuration

The server runtime is driven primarily by environment variables and local SQLite paths.

Local development currently uses:

- `server/.env`

The main database variables are:

- `HOST`, normally `127.0.0.1` in production so Nginx remains the only public
  entry point
- `PORT`, normally `3000`
- `RULES_DATABASE_URL`
- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`
- `SPELLBOOK_DB_STATUS_TOKEN` for production operator access to
  `GET /api/status/db`
- `ENABLE_DB_STATUS_PUBLIC=true` only when DB provenance is intentionally public
- `SPELLBOOK_CORS_ORIGINS` as a comma-separated production browser allowlist
  when trusted external origins need API access

These point to:

- the prepared local rules DB (`rules-clean.sqlite`)
- the Prisma-managed local content DB (`content.sqlite`; `APP_DATABASE_URL`
  may point to this same file as a temporary alias)
- the future app-state DB (`app-state.sqlite`)

`APP_DATABASE_URL` is still accepted as a temporary fallback for the content DB
so older local and remote environments keep running during the split.

The canonical data setup and database lifecycle doc is:

- [../docs/operations/data-setup.md](../docs/operations/data-setup.md)

The `server/db/local/` tree is intentionally local-only and is not part of the
public repo baseline. Tracked migrations and portable fixtures live under
`server/db/`. CHM/parser source data belongs to the parent workspace's root
`data/` local repo, and parser output belongs to `data-tools/out/`.

The canonical import pipeline doc is:

- [../docs/operations/import-workflow.md](../docs/operations/import-workflow.md)

Data tooling commands live in:

- [../data-tools/README.md](../data-tools/README.md)

Rules DB preparation, including legacy SQL patch dry-runs/applies and derived
index rebuilds, belongs to `data-tools`; the server runtime does not apply rules
DB migrations at startup.

For deployed runtime configuration, including `/etc/default/spellbook-api`, use:

- [../docs/operations/deployment.md](../docs/operations/deployment.md)

## Notes

- The server depends on `@dnd/contracts` for shared DTOs and type contracts.
- Rebuild `contracts` before validating server changes that import shared
  runtime values or DTOs.
- Database setup and import workflows are project-specific; use the existing
  `server` and `data-tools` scripts rather than inventing parallel flows.
- Deployment and database update workflows are documented in [../docs/operations/deployment.md](../docs/operations/deployment.md).
- For current feature behavior, start with [../docs/features.md](../docs/features.md).

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
- [../docs/operations/deployment.md](../docs/operations/deployment.md)
- [../docs/operations/data-setup.md](../docs/operations/data-setup.md)
- [../docs/operations/import-workflow.md](../docs/operations/import-workflow.md)
- [../data-tools/README.md](../data-tools/README.md)

