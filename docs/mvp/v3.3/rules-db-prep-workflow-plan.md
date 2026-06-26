# Rules DB Preparation Workflow Plan

This plan defines the v3.3 workflow for preparing the local rules SQLite
database outside the server runtime.

Status: implemented for legacy SQL asset relocation, SQL dry-run/apply commands,
and derived spell index rebuild commands. Structured missing-spell patch inputs
remain follow-up work.

## User Outcome

Maintainers and agents should have one repeatable place for rules DB preparation:

- inspect a local rules DB
- apply known legacy SQL patches
- rebuild derived spell lookup indexes
- validate missing-spell candidates before app DB imports run
- keep runtime server code free of database preparation behavior

## Current Problem

The server runtime reads `server/data/db/rules-clean.sqlite`, but historical SQL
assets previously lived under `server/data/db/sql/`:

- `rules-clean-v2.0.patch.sql`
- `create-idx-spell-class-level.sql`
- `create-idx-spell-domain-level.sql`
- `derive-spell-class-domain-mapping.sql`

Current code and npm scripts do not reference these files. They appear to be
manual rules DB preparation assets, which makes it easy to forget whether a
local database has already had them applied.

This is especially risky before adding missing English base records such as
future Tome of Battle corrections, because the CHM overlay importer can only
attach Chinese text to spell ids that already exist in the rules DB.

## Boundary Decision

Move rules DB preparation ownership to `data-tools`.

`server/` remains responsible for:

- reading `RULES_DATABASE_URL` at runtime
- generating Prisma clients from the rules schema
- importing app-owned data into the app DB
- serving API requests

`data-tools/` owns:

- read-only rules DB inspection
- SQL patch dry-runs and explicit applies
- derived index rebuilds
- future structured new-spell patch validation
- reports that explain what changed or what would change

The app should not run rules DB migration or patch logic at startup.

## File Layout

Existing SQL assets live under:

```text
data/rules-patches/legacy-sql/
  rules-clean-v2.0.patch.sql
  create-idx-spell-class-level.sql
  create-idx-spell-domain-level.sql
  derive-spell-class-domain-mapping.sql
```

Future structured patch inputs should live under:

```text
data/rules-patches/spells/
```

Generated validation reports should live under:

```text
data-tools/out/rules-patches/
```

## Command Plan

Data-tools exposes explicit commands:

```bash
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:sql:apply -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Rules:

- `dry-run` copies the target DB to a temporary file, applies SQL there, and
  reports success/failure without modifying `RULES_DATABASE_URL`.
- `apply` must be explicit and should print the target DB path before mutating.
- SQL file paths are resolved under `data/rules-patches/`.
- Commands should reject paths outside that directory.
- Derived index rebuild can reuse existing SQL, but should be exposed as an
  intentional command rather than a remembered manual sqlite step.

## Missing English Spell Workflow

Do not start new English spell imports as ad hoc SQL.

Preferred next design:

- author structured patch data under `data/rules-patches/spells/`
- validate ids, slugs, rulebook ids, school ids, descriptors, and class/domain
  levels before writing
- generate or apply SQL from structured input
- rebuild derived `idx_spell_*_level` tables after class/domain changes
- run CHM parser/import only after base spell rows exist

The current parser miss for `Fiery Assault` should use this workflow if it turns
out to be a real missing rules DB row rather than a source typo.

## Documentation Updates During Migration

Update:

- `AGENTS.md`
- `docs/README.md`
- `docs/data-setup.md`
- `docs/rules-db-notes.md`
- `data-tools/README.md`
- `.gitignore` if the new patch/report paths need local-only protection

Docs should make clear that `server/data/db/` is a runtime DB location, while
rules DB preparation inputs and reports belong to `data-tools`.

## Harness Plan

For the SQL asset migration:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run verify
```

For the later missing-spell workflow:

```bash
npm run -w data-tools rules:spells:validate
npm run -w data-tools rules:spells:apply -- --dry-run
npm run -w data-tools zh:parse
npm run -w server db:app:import:zh-chm
npm run verify
```

## Acceptance Criteria

- No SQL patch assets remain under `server/data/db/sql/`.
- Data-tools exposes a documented dry-run path for SQL patches.
- Write-capable rules DB commands are explicit and never run from server startup.
- Derived spell index rebuilds are data-tools commands.
- Docs describe rules DB preparation as a data-tools responsibility.
- Missing English spell work starts from a structured patch plan, not manual
  runtime migration.

