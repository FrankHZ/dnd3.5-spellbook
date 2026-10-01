# Data Setup

This document describes the current local data setup for the repository.

The app uses three SQLite database roles:

- the rules database
- the content database
- the app-state database

For DB/content handoff flow, use
[db-content-workflow.md](./db-content-workflow.md). For deployment of
already-prepared database files, use [deployment.md](./deployment.md). For
one-time remote host setup, use [bootstrap-remote.md](./bootstrap-remote.md).

## Local-Only Data Policy

Local data is expected to exist in a few operator-owned locations, but it is
intentionally not committed as part of the public repository baseline.

That means:

- the application may depend on local files during setup
- those files are local inputs or generated artifacts
- a fresh clone may require you to prepare those files yourself before the full
  workflow can run

Current local data ownership:

- `server/db/`: tracked DB migrations, seed entry points, portable fixtures,
  and ignored runtime SQLite databases under `server/db/local/`
- Private data repo selected by root `.env` `DATA_REPO_PATH`: parser and data-tool source inputs such
  as CHM HTML, upstream raw data, entity translation JSON, and rules DB patch
  files
- `data-tools/out/`: generated parser reports and intermediate output

## Private Data Repository Path

Keep the private data repo outside public-code checkouts and worktrees. Set
`DATA_REPO_PATH` in each public checkout's ignored root `.env`, for example:

```dotenv
DATA_REPO_PATH="G:/spell-book/data"
```

An absolute path may contain spaces. A relative value such as `../data` resolves
from the public repository root, regardless of whether a command starts from
that root or a workspace directory. A process environment value takes
precedence over root `.env`. When unset, data tools use the legacy
`<public-repo>/data` path; an explicitly configured missing path or file fails.
The root [`.env.example`](../../.env.example) documents this fallback.

Create public worktrees manually and give each its own ignored root `.env`.
Do not place or link the private repo or `server/db/local/` SQLite files inside
a removable worktree. `data/...` paths in manifests, provenance, and reports
remain logical labels relative to the selected private repo; they are not
physical paths under the public checkout.

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
artifact. When present in the configured private data repo, keep the raw
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

The content DB is a rebuildable local artifact. A full rebuild requires explicit
write authorization and all accepted inputs; ordinary code or documentation
work must preserve the operator's existing database.

The app-state DB is a separate future user/app-state boundary. It may start
empty locally, but it should not be collapsed into the content DB.

Normalized rules content is rebuildable from the locked local rules DB plus
declared review inputs. It should be regenerated through `data-tools`, not
patched directly in the content DB or by replacing the legacy rules baseline.
Local rules DB patching is an input-preparation step for accepted handoffs; the
artifact consumed by the app and activated remotely is the regenerated content
DB.

## Environment Variables

Configure these variables in the ignored, operator-supplied `server/.env`:

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

The rules DB is an operator-provided locked baseline, not a Prisma-created
or automatically replaced database. Source-bearing patches live only in the
private data repo. Use [rules patch operations](./import-workflow.md#rules-patches)
for validation, temporary-copy dry-runs, apply, pending-to-applied movement,
and manifest verification. [Spells-full candidates](./import-workflow.md#spells-full-candidates)
produce review inputs, not DB activation.

## Content DB Setup

Only when the task authorizes creating or updating the configured content DB:

```bash
npm run -w server db:content:reset
```

Despite its name, this script pre-creates a missing SQLite file and runs Prisma
Migrate with `server/prisma-content/prisma.config.ts`; migrations live under
`server/db/content/migrations/`. Inspect the configured target before running
it. It is not a read-only check or permission to discard existing data.

If an older migration checksum requires a destructive reset, use this only
for an explicitly authorized rebuildable content DB, from `server/`:

```bash
npx prisma migrate reset --force --config ./prisma-content/prisma.config.ts
```

Then repopulate all required content. Never use that command on app-state or
other preserve-sensitive user data. The canonical population order and
operation-specific safety rules are in [import workflow](./import-workflow.md):
entity overlays, CHM text, normalized summaries, normalized rules content, then
the derived search index. Prisma seed is not the content population path.

The server uses normalized content-backed spell reads by default. The content
schema and normalized tables must be populated before that path can serve data.
`APP_DATABASE_URL` remains a compatibility alias for content only.
Use the legacy read path only as an explicit rollback switch:

```dotenv
SPELL_READ_SOURCE=rules
```

Leaving it unset selects normalized content. Use the
[parity and metadata checks](./import-workflow.md#normalized-content-and-search)
to validate the artifact before runtime use. `/api/status/db` reports sanitized
DB roles, active read source, compatibility-alias state, and build provenance;
production access is operator-facing by default. It does not migrate or
activate anything. Public UI should use `/api/status/app` instead.

## App-State DB Setup

Only for explicitly authorized app-state schema setup, preserving existing data:

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

For a local setup with explicit DB creation/update authorization:

1. Ensure `server/.env` points to valid local database paths.
2. Ensure `server/db/local/rules-clean.sqlite` exists.
3. Run `npm install` from the repo root.
4. Run `npm run -w server db:generate`.
5. Run `npm run -w server db:content:reset`.
6. Ensure the app-state role has its schema, even while it has no user rows.
   Use `db:app-state:reset` only for authorized setup; preserve existing user data.

After the DB files and Prisma clients are ready, use
[`db-content-workflow.md`](./db-content-workflow.md) as the handoff entry point
and [`import-workflow.md`](./import-workflow.md) for the canonical local content
population and rebuild commands.

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
- The current content population path uses import commands, not the Prisma
  seed command.
- Deployment copies database files after they exist locally; deployment is not
  the step that creates the content DB schema.
- The public repo intentionally excludes data-bearing local artifacts such as
  `server/db/local/`, `data/`, and `data-tools/out/`, so local users must supply
  or recreate those files themselves.
- Parent-repo DB fixtures belong under `server/db/<db-role>/fixtures/portable/`
  as public-safe JSONL. CI uses these dummy fixtures; local acceptance may point
  to real JSONL in the configured private data repo through environment variables.
- `server/db/fixtures.manifest.json` maps maintained local data JSONL inputs to
  their public-safe server DB portable fixture coverage. Portable CI checks the
  parent-repo fixture paths. Explicit local acceptance checks maintained JSONL
  under `DATA_REPO_PATH` for missing mappings.
- The private data repo versions source inputs separately from the public repo.

## Related Files

- [../../server/package.json](../../server/package.json)
- [../../server/prisma-content/prisma.config.ts](../../server/prisma-content/prisma.config.ts)
- [../../server/prisma-app-state/prisma.config.ts](../../server/prisma-app-state/prisma.config.ts)
- [../../server/db/README.md](../../server/db/README.md)
- Local runtime configuration: `server/.env` (ignored, operator supplied)
- [db-content-workflow.md](./db-content-workflow.md)
- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./bootstrap-remote.md)
- [public-repo-notes.md](./public-repo-notes.md)
