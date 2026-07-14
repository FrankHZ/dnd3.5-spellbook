# Data Setup

This document describes the current local data setup for the repository.

The app uses three SQLite database roles:

- the rules database
- the content database
- the app-state database

For deployment of already-prepared database files, use
[deployment.md](./deployment.md). For one-time remote host setup, use
[bootstrap-remote.md](./bootstrap-remote.md).

## Local-Only Data Policy

Local data is expected to exist in a few workspace-owned locations, but it is
intentionally not committed as part of the public repository baseline.

That means:

- the application may depend on local files during setup
- those files are local inputs or generated artifacts
- a fresh clone may require you to prepare those files yourself before the full
  workflow can run

Current local data ownership:

- `server/db/`: tracked DB migrations, seed entry points, portable fixtures,
  and ignored runtime SQLite databases under `server/db/local/`
- `data/`: nested local data repo for parser and data-tool source inputs such
  as CHM HTML, upstream raw data, entity translation JSON, and rules DB patch
  files
- `data-tools/out/`: generated parser reports and intermediate output

## Current Database Roles

### Rules DB

Local file:

```text
server/db/local/rules-clean.sqlite
```

Purpose:

- read-only gameplay and reference data
- canonical spell and rules records consumed by the backend

The server treats this database as a prepared runtime input. For v3.5 and the
content DB migration, the current `rules-clean.sqlite` is the locked legacy
baseline. Do not swap it back to a fresh upstream DnDTools database during this
migration; move future durable fixes into the content DB generation path.

### Content DB

Typical local file:

```text
server/db/local/content.sqlite
```

Purpose:

- generated/imported app-owned content overlays
- localized names and descriptions
- spell short summaries
- normalized rules-derived runtime tables generated from the legacy rules DB

During the v3.5 split, existing local or remote environments may still use
`APP_DATABASE_URL` as a transitional fallback for this same content DB role. New
local setup should point that alias at the same file as `CONTENT_DATABASE_URL`
rather than creating a separate `app.sqlite`.

### App-State DB

Typical local file:

```text
server/db/local/app-state.sqlite
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

- `server/db/local/rules-clean.sqlite`

That processed database is what the backend and deployment workflow expect as
the rules-side SQLite source. It is locked as the legacy baseline while runtime
reads migrate to normalized content DB tables.

### Content DB Origin

The content DB is project-local and owned by this repository. It is created and
evolved from the Prisma content schema under:

```text
server/prisma-content/
```

Tracked content DB migrations and portable fixtures live under:

```text
server/db/content/
```

The content DB is not an upstream imported dataset. It is generated from the
current schema and populated through project import scripts.

### App-State DB Origin

The app-state DB is project-local and owned by this repository. It is created
and evolved from the Prisma app-state schema under:

```text
server/prisma-app-state/
```

Tracked app-state DB migrations, portable fixtures, and the development seed
entry point live under:

```text
server/db/app-state/
```

It should remain separate from generated content so future user data can be
preserved independently.

## Current Local DB Policy

For the current local/release stage, the content DB is treated as a rebuildable
local artifact.

The practical rule is:

- regenerate the content DB from scratch when rebuilding local app-owned content

The app-state DB is a separate future user/app-state boundary. It may start
empty locally, but it should not be collapsed into the content DB.

Normalized rules content is rebuildable from the locked local rules DB plus
declared review inputs. It should be regenerated through `data-tools`, not
patched directly in the content DB or by replacing the legacy rules baseline.

## Environment Variables

The current local server environment points to these database files in
[server/.env](../../server/.env):

- `RULES_DATABASE_URL`
- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`

Current default local paths:

```dotenv
RULES_DATABASE_URL="file:<repo>/server/db/local/rules-clean.sqlite"
CONTENT_DATABASE_URL="file:<repo>/server/db/local/content.sqlite"
APP_STATE_DATABASE_URL="file:<repo>/server/db/local/app-state.sqlite"
```

`APP_DATABASE_URL` is temporarily accepted by runtime code and content import
tools as a compatibility fallback for the content DB. Prefer
`CONTENT_DATABASE_URL` for new local setup, and point the compatibility alias at
the same SQLite file when it is present.

If your local checkout lives elsewhere, update the paths accordingly.

## Rules DB Preparation

Rules DB preparation is owned by the `data-tools` workspace.

Applied SQL patch assets live under `data/rules-patches/applied/legacy-sql/`.
New SQL patch candidates should be authored under:

```text
data/rules-patches/pending/legacy-sql/
```

Use dry-run before mutating the configured rules DB:

```bash
npm run -w data-tools rules:sql:dry-run -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:sql:apply -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

The dry-run command copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Applied structured spell JSONL patches live under
`data/rules-patches/applied/spells/`. New structured spell patch candidates
should be authored under:

```text
data/rules-patches/pending/spells/
```

Use validation and dry-run before applying:

```bash
npm run -w data-tools rules:spells:validate -- pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- pending/spells/example.jsonl
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
local `data/` repo. Use
`docs/releases/v1.1/full-spell-corpus-plan.md` for the active full-corpus
workflow. The older `docs/mvp/v3.3/spells-full-import-plan.md` records the
initial known-miss workflow only.

Current helper commands:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses --write-patch pending/spells/spells-full-known-misses.jsonl
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
```

The `corpus-inventory` path produces rebuildable reports, ready-only patch
JSONL, and row-level rejected/ambiguous review JSONL under `data/spells-full/`.
It does not apply rules DB patches or rebuild the content DB. The
`spells-full:rulebooks` command produces local source-label review JSONL under
`data/spells-full/`, including a focused ambiguous source-label queue.

## Content DB Setup

Run:

```bash
npm run -w server db:content:reset
```

This runs Prisma migrations using the explicit content Prisma config:

- `server/prisma-content/prisma.config.ts`
- tracked migrations under `server/db/content/migrations/`

It creates or updates the local content database referenced by
`CONTENT_DATABASE_URL`. The reset script pre-creates the SQLite file before
running Prisma Migrate because Prisma 7.8 can otherwise report a blank schema
engine error when the target SQLite file does not exist on Windows.

Populate the content DB through server import commands:

- `npm run -w server db:content:import:zh-chm`
- `npm run -w server db:content:import:zh-entities`
- `npm run -w data-tools summaries:import`

Compatibility aliases named `db:app:*` currently forward to the content commands
where practical, but new docs and scripts should use the content names.

Generate and import normalized spell-facing rules content:

```bash
npm run -w data-tools rules:content:audit
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:import -- --dry-run
npm run -w data-tools rules:content:import
npm run -w data-tools rules:content:review
```

The audit and generate commands read `RULES_DATABASE_URL` and write rebuildable
artifacts under `data-tools/out/rules-content/`. The import command writes only
the generated normalized rules content tables in `CONTENT_DATABASE_URL`; it does
not mutate the rules DB or app-state DB. Keep raw/source patch and review inputs
in the nested `data/` repo, not the parent repo.

The review command opens the content DB read-only after import and summarizes
normalized taxonomy, component, and mechanic facet readiness for future filter
contracts. It is a planning/review aid, not a deploy or DB mutation step.

Each successful rules-content import writes one `RulesContentBuild` row with the
generated artifact hash, rules manifest hash, locked rules DB hash, content
migration-set hash, and parent/data repo commit ids. This is provenance for
local and remote artifact comparison; it is not a replacement for committing
source-bearing data.

Inspect the current content DB artifact metadata with:

```bash
npm run -w data-tools rules:content:meta
```

This command is read-only. It writes a report under
`data-tools/out/rules-content/` containing the content DB checksum, generated
rules-content counts, and the latest `RulesContentBuild` row.

When a server is running, inspect the runtime DB state with:

```bash
curl -fsS http://127.0.0.1:3000/api/status/db
```

Use that response to compare the active read source, sanitized DB role file
names, `APP_DATABASE_URL` compatibility alias state, latest `RulesContentBuild`,
and content table counts against the local `rules:content:meta` report.

The server uses normalized content-backed spell reads by default once
`CONTENT_DATABASE_URL` points at a verified content DB artifact.

Use the legacy rules-backed read path only as an explicit rollback switch:

```dotenv
SPELL_READ_SOURCE=rules
```

Leaving `SPELL_READ_SOURCE` unset uses the normalized content-backed read path.
That path requires the normalized rules content tables to be populated in
`CONTENT_DATABASE_URL`.

Before using the normalized content path against local or remote data, run:

```bash
npm run -w data-tools rules:content:parity
npm run -w data-tools rules:content:meta
```

`rules:content:parity` proves the current local rules DB and content DB agree
on key normalized spell counts and detail fields. `rules:content:meta` records
the provenance needed to compare a manually uploaded remote content DB without
committing data-bearing artifacts.

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
- seed entry point `server/db/app-state/seed.ts`

## Generate Prisma Clients

If Prisma client output is stale or a schema changed, run:

```bash
npm run -w server db:generate
```

## Practical Local Setup Flow

For a normal local setup:

1. Ensure `server/.env` points to valid local database paths.
2. Ensure `server/db/local/rules-clean.sqlite` exists.
3. Run `npm install` from the repo root.
4. Run `npm run -w server db:generate`.
5. Run `npm run -w server db:content:reset`.
6. Run `npm run -w server db:app-state:reset` if server-side user/app-state
   storage is needed locally.
7. Run `npm run -w server db:content:import:zh-entities`.
8. Run `npm run -w server db:content:import:zh-chm`.
9. Run `npm run -w data-tools summaries:import`.
10. Run `npm run -w data-tools rules:content:generate`.
11. Run `npm run -w data-tools rules:content:import`.
12. Run `npm run -w data-tools rules:content:parity`.
13. Run `npm run -w data-tools rules:content:meta`.

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
- For the current local workflow, content DB rebuilds are expected to start
  from a fresh reset rather than incremental local preservation.
- The current content population path uses import commands, not the Prisma
  seed command.
- Deployment copies database files after they exist locally; deployment is not
  the step that creates the content DB schema.
- The public repo intentionally excludes data-bearing local artifacts such as
  `server/db/local/`, `data/`, and `data-tools/out/`, so local users must supply
  or recreate those files themselves.
- Parent-repo DB fixtures belong under `server/db/<db-role>/fixtures/portable/`
  as public-safe JSONL. CI uses these dummy fixtures; local acceptance may point
  to real JSONL in the nested `data/` repo through environment variables.
- `server/db/fixtures.manifest.json` maps maintained local data JSONL inputs to
  their public-safe server DB portable fixture coverage. Portable CI checks the
  parent-repo fixture paths, and local runs with the nested `data/` repo present
  also catch maintained data JSONL file roots or files under listed directory
  roots that have no manifest mapping.
- The root `data/` directory is a nested local Git repo in this workspace. Use
  that repo to version local source inputs without adding them to the parent
  project repo.

## Related Files

- [../../server/package.json](../../server/package.json)
- [../../server/prisma-content/prisma.config.ts](../../server/prisma-content/prisma.config.ts)
- [../../server/prisma-app-state/prisma.config.ts](../../server/prisma-app-state/prisma.config.ts)
- [../../server/db/README.md](../../server/db/README.md)
- [../../server/.env](../../server/.env)
- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./bootstrap-remote.md)
- [public-repo-notes.md](./public-repo-notes.md)
