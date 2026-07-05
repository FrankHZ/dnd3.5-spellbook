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
- The status API lives under `/api/status/*`:
  - `/api/status/app` reports backend deploy metadata from explicit environment
    variables with local-development fallback values and a public content DB
    summary for the About / Version page.
  - `/api/status/db` reports read-only runtime DB role/provenance state and
    must not upload, migrate, or activate artifacts. In production it is
    operator-facing by default.
- Prisma client wrappers live in `server/src/lib/`.

## Module Imports

Server source uses Node package imports owned by `server/package.json`:

- `#server/*` maps to `server/src/*`.
- `#prisma-rules-clean/*` maps to the rules-clean Prisma schema/client tree.
- `#prisma-content/*` maps to the content Prisma schema/client tree.
- `#prisma-app-state/*` maps to the app-state Prisma schema/client tree.

Do not add new `~` imports or TypeScript-only `paths` aliases in the server
package. The production build runs plain `tsc`, so runtime-resolvable import
specifiers are part of the module boundary.

`server/package.json` uses a custom `source` condition for local TS execution
and a default condition for built runtime execution:

- `npm run -w server dev` and npm-managed `tsx` maintenance scripts set
  `NODE_OPTIONS=--conditions=source` and resolve package imports to `.ts`
  source.
- `npm run -w server test` uses `server/vitest.config.ts`
  `resolve.conditions: ["source"]` so Vitest resolves package imports to
  `.ts` source without sending source resolution through raw Node loading.
- `npm run -w server start` and `npm run -w server check:runtime` do not set
  the source condition and resolve package imports to `dist/`.

Do not run server maintenance scripts that import server code with bare `tsx`
unless you explicitly pass the source condition.

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

Public UI surfaces should use the redacted content summary in
`GET /api/status/app` instead of depending on `/api/status/db`.

## Contracts

Server responses should use DTOs exported from `@dnd/contracts`. If a response
shape changes, update `contracts/` first, rebuild it, and then validate both
server and web consumers.

Browse/Search normalized filter contracts are owned by the server plus
contracts boundary. The current public normalized filter vocabulary is:

- taxonomy ids: `schoolIds`, `subschoolIds`, `descriptorIds`
- descriptor buckets: `descriptorBuckets` for public descriptor options that are
  not legacy descriptor ids
- base component keys: `componentKeys`
- accepted mechanics buckets: `castingTimeKeys`, `rangeKeys`, and
  `durationKeys`

`componentKeys` accepts stable normalized keys only and uses `all` semantics:
every selected component must be present. `castingTimeKeys`, `rangeKeys`, and
`durationKeys` use `any` semantics within each family and `all` semantics
across selected families. Extra component text, unaccepted mechanics facets,
and separate Tome of Battle query params remain review-only until their owning
plan promotes them.

Taxonomy vocabulary items include `sourceKind` and `category` metadata. Tome of
Battle disciplines and maneuver categories are marked as `sourceKind:
"maneuver"` so frontend grouping does not need to parse raw names or keys.
Legacy combined school/subschool labels are not public vocabulary; generated
content splits them into base taxonomy facets, and server fallback query logic
expands single base ids across old combined legacy ids.
Legacy descriptor noise such as `see text...` is exposed through the descriptor
bucket `descriptorBuckets=see-text` / `key: "see-text"`; server fallback query
logic expands that bucket across the old legacy descriptor ids, and spell DTOs
may include descriptor `rawText` / `note` so detail views can explain the
source note.

`GET /api/meta/filters` is the vocabulary source for frontend consumers. Do not
make the frontend derive component or mechanics filters from raw spell fields.

## Validation

Use:

```bash
npm run build:contracts
npm run check:contracts
npm run -w server db:generate
npm run build:server
npm run -w server check:runtime
npm run test:server
```

`npm run test:server` uses synthetic disposable SQLite fixtures, so it is safe
for clean-checkout CI. Local content acceptance still belongs to data-tools
commands when imported data or local DB fingerprints are the subject of the
change.

## Related Docs

- [../features.md](../features.md)
- [../operations/data-setup.md](../operations/data-setup.md)
- [../operations/deployment.md](../operations/deployment.md)
- [../../server/README.md](../../server/README.md)
- [../mvp/v3.5/db-ownership-boundary-plan.md](../mvp/v3.5/db-ownership-boundary-plan.md)
- [../mvp/v3.5/rules-content-normalization-plan.md](../mvp/v3.5/rules-content-normalization-plan.md)
