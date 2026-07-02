# Data Setup

This document describes the current local data setup for the repository.

The app uses three SQLite database roles:

- the rules database
- the content database
- the app-state database

For deployment of already-prepared database files, use
[deployment.md](./deployment.md). For one-time remote host setup, use
[operations/bootstrap-remote.md](./operations/bootstrap-remote.md).

## Local-Only Data Policy

Local data is expected to exist in a few workspace-owned locations, but it is
intentionally not committed as part of the public repository baseline.

That means:

- the application may depend on local files during setup
- those files are local inputs or generated artifacts
- a fresh clone may require you to prepare those files yourself before the full
  workflow can run

Current local data ownership:

- `server/data/db/`: runtime SQLite databases used by the API
- `data/`: nested local data repo for parser and data-tool source inputs such
  as CHM HTML, upstream raw data, entity translation JSON, and rules DB patch
  files
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

### Content DB

Typical local file:

```text
server/data/db/content.sqlite
```

Purpose:

- generated/imported app-owned content overlays
- localized names and descriptions
- spell short summaries
- normalized rules-derived runtime tables generated from the legacy rules DB

During the v3.5 split, existing local or remote environments may still point at
`server/data/db/app.sqlite`; runtime code and content import tools accept
`APP_DATABASE_URL` as a transitional fallback for this same content DB role.

### App-State DB

Typical local file:

```text
server/data/db/app-state.sqlite
```

Purpose:

- future server-side users
- future favorites, notes, syncable collections, or other user-owned state

Current production behavior does not depend on app-state rows yet, but this DB
is preserve-sensitive by ownership. Do not use content import scripts to mutate
it.

## Data Origins

### Rules DB Origin

The rules DB lineage starts from the original `dnd.sqlite` dataset from the
`dndtools/dndtools` project:

- upstream source: `https://github.com/dndtools/dndtools`

This repository does not treat that upstream raw database as a tracked project
artifact. When present in this workspace's nested local data repo, keep the raw
upstream SQLite file under:

```text
data/upstream/dndtools/dnd.sqlite
```

Instead, the project works from a local processed rules database:

- `server/data/db/rules-clean.sqlite`

That processed database is what the backend and deployment workflow expect as
the rules-side SQLite source.

### Content DB Origin

The content DB is project-local and owned by this repository. It is created and
evolved from the Prisma content schema under:

```text
server/prisma-content/
```

It is not an upstream imported dataset. It is generated from the current schema
and populated through project import scripts.

### App-State DB Origin

The app-state DB is project-local and owned by this repository. It is created
and evolved from the Prisma app-state schema under:

```text
server/prisma-app-state/
```

It should remain separate from generated content so future user data can be
preserved independently.

## Current MVP DB Policy

For the current MVP stage, the content DB is treated as a rebuildable local
artifact.

The practical rule is:

- regenerate the content DB from scratch when rebuilding local app-owned content

The app-state DB is a separate future user/app-state boundary. It may start
empty locally, but it should not be collapsed into the content DB.

Normalized rules content is rebuildable from the prepared local rules DB plus
declared source patch/review inputs. It should be regenerated through
`data-tools`, not patched directly in the content DB.

## Environment Variables

The current local server environment points to these database files in
[server/.env](../server/.env):

- `RULES_DATABASE_URL`
- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`

Current default local paths:

```dotenv
RULES_DATABASE_URL="file:<repo>/server/data/db/rules-clean.sqlite"
CONTENT_DATABASE_URL="file:<repo>/server/data/db/content.sqlite"
APP_STATE_DATABASE_URL="file:<repo>/server/data/db/app-state.sqlite"
```

`APP_DATABASE_URL` is temporarily accepted by runtime code and content import
tools as a compatibility fallback for the content DB. Prefer
`CONTENT_DATABASE_URL` for new local setup.

If your local checkout lives elsewhere, update the paths accordingly.

## Rules DB Preparation

Rules DB preparation is owned by the `data-tools` workspace.

Legacy SQL patch assets live under:

```text
data/rules-patches/legacy-sql/
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
data/rules-patches/spells/
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

Patch files under `data/rules-patches/` may contain source text and belong to
the nested local `data/` repo. Parent-repo code should own patch schemas,
validators, generators, reports, and redacted/minimal fixtures.

The optional `spells-full` source dump, when present locally, lives under:

```text
data/spells-full/
```

That directory is ignored by the parent repo. It may be versioned in the nested
local `data/` repo. Use `docs/mvp/v3.3/spells-full-import-plan.md` before
generating structured patch candidates from it.

Current helper commands:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses --write-patch spells/spells-full-known-misses.jsonl
```

## Content DB Setup

Run:

```bash
npm run -w server db:content:reset
```

This runs Prisma migrations using the explicit content Prisma config:

- `server/prisma-content/prisma.config.ts`

It creates or updates the local content database referenced by
`CONTENT_DATABASE_URL`.

Populate the content DB through server import commands:

- `npm run -w server db:content:import:zh-chm`
- `npm run -w server db:content:import:zh-entities`

Compatibility aliases named `db:app:*` currently forward to the content commands
where practical, but new docs and scripts should use the content names.

Generate and import normalized spell-facing rules content:

```bash
npm run -w data-tools rules:content:audit
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:import -- --dry-run
npm run -w data-tools rules:content:import
```

The audit and generate commands read `RULES_DATABASE_URL` and write rebuildable
artifacts under `data-tools/out/rules-content/`. The import command writes only
the generated normalized rules content tables in `CONTENT_DATABASE_URL`; it does
not mutate the rules DB or app-state DB. Keep raw/source patch and review inputs
in the nested `data/` repo, not the parent repo.

## App-State DB Setup

Run:

```bash
npm run -w server db:app-state:reset
```

Optional local development seed:

```bash
npm run -w server db:app-state:seed
```

This runs the Prisma seed configured by:

- `server/prisma-app-state/prisma.config.ts`

## Generate Prisma Clients

If Prisma client output is stale or a schema changed, run:

```bash
npm run -w server db:generate
```

## Practical Local Setup Flow

For a normal local setup:

1. Ensure `server/.env` points to valid local database paths.
2. Ensure `server/data/db/rules-clean.sqlite` exists.
3. Run `npm install` from the repo root.
4. Run `npm run -w server db:generate`.
5. Run `npm run -w server db:content:reset`.
6. Run `npm run -w server db:app-state:reset` if server-side user/app-state
   storage is needed locally.
7. Run `npm run -w server db:content:import:zh-entities`.
8. Run `npm run -w server db:content:import:zh-chm`.

After that, the backend can use:

- `rules-clean.sqlite` as the rules DB
- `content.sqlite` as the content DB
- `app-state.sqlite` as the future app-state DB

## Notes

- The rules DB is treated as a prepared local input, not something created by
  Prisma migrations.
- The content DB is the Prisma-managed local database for app-owned content.
- The app-state DB is the Prisma-managed local database for future user-owned
  state.
- For the current MVP, content DB rebuilds are expected to start from a fresh
  reset rather than incremental local preservation.
- The current MVP content population path uses import commands, not the Prisma
  seed command.
- Deployment copies database files after they exist locally; deployment is not
  the step that creates the content DB schema.
- The public repo intentionally excludes data-bearing local artifacts such as
  `server/data/db/`, `data/`, and `data-tools/out/`, so local users must supply
  or recreate those files themselves.
- The root `data/` directory is a nested local Git repo in this workspace. Use
  that repo to version local source inputs without adding them to the parent
  project repo.

## Related Files

- [../server/package.json](../server/package.json)
- [../server/prisma-content/prisma.config.ts](../server/prisma-content/prisma.config.ts)
- [../server/prisma-app-state/prisma.config.ts](../server/prisma-app-state/prisma.config.ts)
- [../server/.env](../server/.env)
- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./operations/bootstrap-remote.md)
- [public-repo-notes.md](./public-repo-notes.md)
