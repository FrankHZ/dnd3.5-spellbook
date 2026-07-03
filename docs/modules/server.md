# Server Module

## Role

`server/` owns the Express API, backend request validation, Prisma runtime
clients, and the mapping from rules/content data into shared DTOs. It should
serve application behavior; parser, source-data inspection, and rules patch
work belong in `data-tools/`.

## Main Boundaries

- API registration starts in `server/src/app.ts`.
- HTTP route modules live under `server/src/routes/`.
- Controllers translate HTTP concerns into service calls under
  `server/src/controllers/`.
- Spell behavior is split under `server/src/services/spells/`:
  - `*.service.ts` files own feature behavior.
  - `*.repo.rules.ts` reads legacy rules-side data.
  - `*.repo.app.ts` reads app/content overlay data.
  - `*.mapper.ts` shapes records into contract DTOs.
- Meta, class, domain, and rulebook APIs have narrower service modules under
  `server/src/services/`.
- The DB status API lives under `/api/status/db`; it reports read-only runtime
  DB role/provenance state and must not upload, migrate, or activate artifacts.
- Prisma client wrappers live in `server/src/lib/`.

## Data Ownership

The current runtime reads three SQLite connection roles:

- `RULES_DATABASE_URL`: legacy rules-side content input.
- `CONTENT_DATABASE_URL`: app-owned content overlays such as i18n names,
  descriptions, and summaries. `APP_DATABASE_URL` is a temporary compatibility
  fallback for this same content DB.
- `APP_STATE_DATABASE_URL`: future user/app-state data such as server-owned
  users, notes, synced collections, or preferences.

The first v3.5 split creates the physical schema/client boundary. Do not add
server-owned user state to the content DB.

`GET /api/status/db` is the operator-facing runtime check for this boundary. It
reports sanitized file role state, the active spell read source, the latest
`RulesContentBuild`, and normalized content table counts without exposing raw
source data or full filesystem paths.

## Contracts

Server responses should use DTOs exported from `@dnd/contracts`. If a response
shape changes, update `contracts/` first, rebuild it, and then validate both
server and web consumers.

## Validation

Use:

```bash
npm run build:contracts
npm run check:contracts
npm run -w server db:generate
npm run build:server
npm run test:server
```

`npm run test:server` uses synthetic disposable SQLite fixtures, so it is safe
for clean-checkout CI. Local content acceptance still belongs to data-tools
commands when imported data or local DB fingerprints are the subject of the
change.

## Related Docs

- [../features.md](../features.md)
- [../data-setup.md](../data-setup.md)
- [../deployment.md](../deployment.md)
- [../../server/README.md](../../server/README.md)
- [../mvp/v3.5/db-ownership-boundary-plan.md](../mvp/v3.5/db-ownership-boundary-plan.md)
- [../mvp/v3.5/rules-content-normalization-plan.md](../mvp/v3.5/rules-content-normalization-plan.md)
