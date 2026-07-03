# Data Tools Workspace Plan

This plan defines the v3.3 repository boundary change for data tooling before
adding new missing-spell import workflows.

Status: implemented in v3.3. `data-tools` owns parser, inspection, rules DB
prep, structured spell patch, and `spells-full` workflows. Server runtime code
does not import data-tools modules.

## User Outcome

Maintainers and agents should have one clear place for data import, inspection,
and rules DB patch tooling.

The server workspace should stay focused on the API runtime. Data preparation
tools should live in a separate workspace so future workflows, such as adding
missing Tome of Battle spells and Chinese overlays, do not get mixed into
server runtime code.

## Current Problem

The repository currently has three overlapping tool locations:

- `server/tools/zh-parser/` for CHM Chinese parser tooling
- `server/scripts/` for app DB import scripts and rules DB inspection
- `server/src/` for runtime API code

This worked for the MVP, but v3.3 needs more data operations:

- inspect the rules DB
- author missing spell records
- validate rules DB patches
- sync derived class/domain spell indexes
- import Chinese overlays after base spell records exist

Keeping those workflows under `server/` makes it too easy for agents to mix
data pipelines with API behavior.

## Proposed Boundary

Add a new npm workspace named `data-tools`.

Responsibilities:

- CHM preprocessing and parsing
- parser backchecks and reports
- rules DB inspection
- future rules DB patch authoring and validation
- future new-spell import workflows

Non-responsibilities:

- serving API requests
- frontend behavior
- shared browser/server DTO contracts
- long-lived app user state

`server/` remains responsible for:

- Express runtime
- API services/controllers/repos
- Prisma schema/client generation used by the runtime
- server tests

## Migration Scope

In scope for the first migration:

- Create `data-tools/` as an npm workspace.
- Move `server/tools/zh-parser/` into `data-tools/src/zh-parser/`.
- Move the read-only rules DB inspector into `data-tools/src/inspect-rules-db.ts`.
- Give `data-tools` its own `package.json` and `tsconfig.json`.
- Keep root/server command ergonomics by adding or preserving wrapper scripts.
- Update docs and `AGENTS.md` so future agents know data tooling belongs in
  `data-tools`.
- Keep tool behavior unchanged.

Out of scope for the first migration:

- Implementing the Tome of Battle spell import.
- Writing to the rules DB.
- Changing Prisma schemas.
- Replacing npm workspaces with Nx.
- Changing server API behavior.
- Changing parser output schemas unless path changes require documentation.

## Command Compatibility

The first migration should preserve familiar commands where practical.

Preferred new commands:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
```

Compatibility wrappers may remain in `server/package.json` during the transition
if that keeps existing docs and muscle memory from breaking immediately.

Root-level convenience scripts can be added later only if they reduce repeated
manual command composition.

## Dependency Direction

Allowed:

- `data-tools` may depend on local generated Prisma clients or direct SQLite
  access when inspecting or patching databases.
- `data-tools` may depend on parsing libraries such as `cheerio`,
  `sanitize-html`, `iconv-lite`, and `better-sqlite3`.
- `server` may expose wrapper scripts that call `data-tools` commands.

Avoid:

- importing `server/src` runtime modules from `data-tools`
- importing `data-tools` modules from `server/src`
- putting new data tooling under `server/src`
- adding frontend dependencies to `data-tools`

If the generated Prisma clients remain physically under `server/prisma-*`, the
first migration can use path aliases as a temporary bridge. A later cleanup can
decide whether generated clients or DB helpers need a more neutral package.

## Documentation Updates

Update these docs during migration:

- `AGENTS.md`
- `docs/README.md`
- `docs/operations/import-workflow.md`
- `docs/operations/rules-db-notes.md`
- `server/README.md`

Add a `data-tools/README.md` with:

- workspace purpose
- command list
- data path assumptions
- read-only vs write-capable command warnings

## Harness Plan

Validation for the migration:

- `npm run -w data-tools inspect:rules -- counts`
- `npm run -w data-tools inspect:rules -- spell fireball`
- `npm run -w data-tools zh:parse:test`
- `npm run build:server`
- `npm run verify`

If wrapper scripts remain in `server/package.json`, validate at least one
wrapper command after migration.

## Acceptance Criteria

- Data tooling has a dedicated workspace and README.
- Existing parser and rules DB inspection commands still work through documented
  commands.
- Runtime server code does not import data-tools modules.
- Data-tools code does not import server runtime modules.
- Import workflow docs point to `data-tools` as the owner for data preparation.
- The migration does not change generated parser outputs except for documented
  path changes.

## Follow-Up After Migration

Once the workspace boundary is in place, plan the missing-spell workflow:

- canonical source format for new spell patches
- dry-run validation
- id allocation policy
- derived index synchronization
- Tome of Battle import fixture
- Chinese overlay import after base spell creation
