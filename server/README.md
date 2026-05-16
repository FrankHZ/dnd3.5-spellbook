# Server Workspace

This workspace contains the backend API and database access layer.

It serves the spell data consumed by the frontend and also contains the Prisma schemas and scripts used to manage local application data. Parser, inspection, and rules DB patch tooling lives in the `data-tools` workspace.

## Key Directories

- `src/`: application source code
- `tests/`: backend tests
- `prisma-app/`: app database schema and config
- `prisma-rules-clean/`: rules-side schema and generated client setup
- `scripts/`: app DB import and maintenance scripts
- `data/`: local runtime DB files and app-owned entity translation inputs

## Main Commands

Run the API in development:

```bash
npm run -w server dev
```

Build the server:

```bash
npm run -w server build
```

Run the built server:

```bash
npm run -w server start
```

Run tests:

```bash
npm run -w server test
```

Generate Prisma clients:

```bash
npm run -w server db:generate
```

## Configuration

The server runtime is driven primarily by environment variables and local SQLite paths.

Local development currently uses:

- `server/.env`

The main database variables are:

- `RULES_DATABASE_URL`
- `APP_DATABASE_URL`

These point to:

- the prepared local rules DB (`rules-clean.sqlite`)
- the Prisma-managed local app DB (`app.sqlite`)

The canonical data setup and database lifecycle doc is:

- [../docs/data-setup.md](../docs/data-setup.md)

The `server/data/db/` tree is intentionally local-only and is not part of the
public repo baseline. CHM/parser source data belongs to `data-tools/data/`, and
parser output belongs to `data-tools/out/`.

The canonical import pipeline doc is:

- [../docs/import-workflow.md](../docs/import-workflow.md)

Data tooling commands live in:

- [../data-tools/README.md](../data-tools/README.md)

Rules DB preparation, including legacy SQL patch dry-runs/applies and derived
index rebuilds, belongs to `data-tools`; the server runtime does not apply rules
DB migrations at startup.

For deployed runtime configuration, including `/etc/default/spellbook-api`, use:

- [../docs/deployment.md](../docs/deployment.md)

## Notes

- The server depends on `@dnd/contracts` for shared DTOs and type contracts.
- Database setup and import workflows are project-specific; use the existing
  `server` and `data-tools` scripts rather than inventing parallel flows.
- Deployment and database update workflows are documented in [../docs/deployment.md](../docs/deployment.md).
- For current feature behavior, start with [../docs/features.md](../docs/features.md).

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
- [../docs/deployment.md](../docs/deployment.md)
- [../docs/data-setup.md](../docs/data-setup.md)
- [../docs/import-workflow.md](../docs/import-workflow.md)
- [../data-tools/README.md](../data-tools/README.md)
