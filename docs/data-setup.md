# Data Setup

This document describes the current local data setup for the repository.

It focuses on the two SQLite databases used by the app:

- the rules database
- the app database

For deployment of already-prepared database files, use [deployment.md](./deployment.md).
For one-time remote host setup, use [operations/bootstrap-remote.md](./operations/bootstrap-remote.md).

## Local-Only Data Policy

Local data is expected to exist in a few workspace-owned locations, but it is
intentionally not committed as part of the public repository baseline.

That means:

- the application may depend on local files during setup
- those files are local inputs or generated artifacts
- a fresh clone may require you to prepare those files yourself before the full workflow can run

Current local data ownership:

- `server/data/db/`: runtime SQLite databases used by the API
- `server/data/i18n/`: app-owned entity translation JSON imported by server scripts
- `data-tools/data/`: parser and data-tool source inputs such as CHM HTML
- `data-tools/out/`: generated parser reports and intermediate output

## Current Database Roles

### Rules DB

Local file:

```text
server/data/db/rules-clean.sqlite
```

Purpose:

- read-only gameplay and reference data
- canonical spell and rules records consumed by the backend

The server treats this database as a prepared runtime input. Rules DB
preparation commands live in `data-tools`, not in server startup.

### App DB

Local file:

```text
server/data/db/app.sqlite
```

Purpose:

- app-owned data
- i18n overlay content
- user-facing app state stored by the project

## Data Origins

### Rules DB Origin

The rules DB lineage starts from the original `dnd.sqlite` dataset from the `dndtools/dndtools` project:

- upstream source: `https://github.com/dndtools/dndtools`

This repository does not treat that upstream raw database as a tracked project artifact.

Instead, the project works from a local processed rules database:

- `server/data/db/rules-clean.sqlite`

That processed database is what the backend and deployment workflow expect as the rules-side SQLite source.

### App DB Origin

The app DB is project-local and owned by this repository.

It is created and evolved from the Prisma app schema under:

```text
server/prisma-app/
```

The app DB is not an upstream imported dataset. It is generated from the current schema and then optionally seeded/imported through project scripts.

## Current MVP App DB Policy

For the current MVP stage, the app DB is treated as a rebuildable local artifact.

The practical rule is:

- regenerate the app DB from scratch when rebuilding local app-owned data

The current workflow does not treat the app DB as a long-lived migrated local store that must be incrementally preserved during development.

## Environment Variables

The current local server environment points to these database files in [server/.env](../server/.env):

- `RULES_DATABASE_URL`
- `APP_DATABASE_URL`

Current default local paths:

```dotenv
RULES_DATABASE_URL="file:<repo>/server/data/db/rules-clean.sqlite"
APP_DATABASE_URL="file:<repo>/server/data/db/app.sqlite"
```

If your local checkout lives elsewhere, update the paths accordingly.

## App DB Setup

The app DB is managed through Prisma in the `server` workspace.

## Rules DB Preparation

Rules DB preparation is owned by the `data-tools` workspace.

Legacy SQL patch assets live under:

```text
data-tools/data/rules-patches/legacy-sql/
```

Use dry-run before mutating the configured rules DB:

```bash
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:sql:apply -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

The dry-run command copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Structured missing-spell patches are JSONL files under:

```text
data-tools/data/rules-patches/spells/
```

Use validation and dry-run before applying:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

The structured spell apply command inserts rules DB base spell rows and related
descriptor/class/domain level rows, then rebuilds derived spell index tables.
It does not run from server startup.

### Reset / Create The App DB

Run:

```bash
npm run -w server db:app:reset
```

This runs Prisma migrations using the explicit app Prisma config:

- `server/prisma-app/prisma.config.ts`

It creates or updates the local app database referenced by `APP_DATABASE_URL`.

### Populate The App DB

For the current MVP workflow, the Prisma seed command exists but is not the normal path used to populate the app DB.

The active population path is the import commands in the `server` workspace:

- `npm run -w server db:app:import:zh-chm`
- `npm run -w server db:app:import:zh-entities`

These are the commands currently used after rebuilding the app DB from scratch.

### Seed Command Status

`npm run -w server db:app:seed` exists, but it is not the active population path for the current MVP workflow.

It should be treated as available infrastructure rather than the normal operational command.

### Optional Seed Command

Run:

```bash
npm run -w server db:app:seed
```

This runs the Prisma seed configured by:

- `server/prisma-app/prisma.config.ts`

### Generate Prisma Clients

If Prisma client output is stale or the schema changed, run:

```bash
npm run -w server db:generate
```

## Practical Local Setup Flow

For a normal local setup:

1. Ensure `server/.env` points to valid local database paths.
2. Ensure `server/data/db/rules-clean.sqlite` exists.
3. Run `npm install` from the repo root.
4. Run `npm run -w server db:generate`.
5. Run `npm run -w server db:app:reset`.
6. Run `npm run -w server db:app:import:zh-entities`.
7. Run `npm run -w server db:app:import:zh-chm`.

After that, the backend can use:

- `rules-clean.sqlite` as the rules DB
- `app.sqlite` as the app DB

## Notes

- The rules DB is treated as a prepared local input, not something created by Prisma migrations.
- The app DB is the opposite: it is the Prisma-managed local database for app-owned state.
- For the current MVP, app DB rebuilds are expected to start from a fresh reset rather than incremental local preservation.
- The current MVP data population path uses import commands, not the Prisma seed command.
- Deployment copies database files after they exist locally; deployment is not the step that creates the app DB schema.
- The public repo intentionally excludes data-bearing local artifacts such as
  `server/data/db/`, `data-tools/data/`, and `data-tools/out/`, so local users
  must supply or recreate those files themselves.

## Related Files

- [../server/package.json](../server/package.json)
- [../server/prisma-app/prisma.config.ts](../server/prisma-app/prisma.config.ts)
- [../server/.env](../server/.env)
- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./operations/bootstrap-remote.md)
- [public-repo-notes.md](./public-repo-notes.md)
