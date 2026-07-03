# Server DB Layout

This directory owns tracked database lifecycle files for the server workspace.
It does not own local runtime SQLite files or source data.

## Roles

- `content/`: content DB migrations, fixtures, and future seed entry points.
- `app-state/`: app-state DB migrations, fixtures, and seed entry points.
- `rules-clean/`: portable synthetic fixtures for the locked legacy rules DB
  baseline. The real `rules-clean.sqlite` is a local runtime input, not a
  migrated schema.
- `local/`: ignored local SQLite files used by development and acceptance.

## Tracked Files

Tracked DB files use this shape:

```text
server/db/<db-role>/migrations/<timestamp>_<name>/migration.sql
server/db/<db-role>/migrations/migration_lock.toml
server/db/<db-role>/seed.ts
server/db/<db-role>/fixtures/portable/*.jsonl
```

`server/prisma-*` directories keep Prisma schemas, configs, and generated
clients. Migrations and fixtures live here so app-state and content lifecycle
files share one boundary.

The reset npm scripts create the target SQLite file before calling Prisma
Migrate. Prisma 7.8 reports a blank schema-engine error on Windows when the
configured SQLite file does not exist, even though the underlying engine emits a
`P1003` missing-database diagnostic.

## Fixtures

Portable fixtures must be public-safe, minimal, and synthetic. Use JSONL so CI
and local tooling can share the same loader shape:

```jsonl
{"op":"insert","table":"ExampleTable","key":"fixture:example","data":{"id":"fixture:example"}}
```

Fixture file names should describe the API or transform behavior they support,
for example `spell-detail.jsonl` or `rules-content-normalization.jsonl`.

CI uses portable fixtures under this directory. Local acceptance may point at
real JSONL in the nested `data/` repo through environment variables, but those
source files do not belong in the parent repo.

`server/db/fixtures.manifest.json` records the lightweight correspondence
between maintained local data JSONL inputs and the public-safe portable server
fixtures that cover the same DB role or table shape. Portable CI validates the
manifest and the checked-in fixture files. When the nested `data/` repo exists
locally, the same harness also scans the manifest roots and fails if a
maintained data JSONL file has no portable fixture mapping.

Server API tests load seed rows through
`server/tests/support/portable-fixtures.ts`. `server/tests/setup-test-dbs.ts`
owns disposable table DDL only; seed data belongs in role-specific JSONL files
under `rules-clean/fixtures/portable/` and `content/fixtures/portable/`.
