# Contracts Module

## Role

`contracts/` owns the shared TypeScript DTOs and exported types that define the
runtime boundary between `server/` and `web/`.

It should stay small and declarative. Do not put server data access, frontend
state, or UI behavior in this package.

## Main Boundaries

- `contracts/src/index.ts` is the public export surface.
- DTOs live under `contracts/src/dto/`.
- Shared HTTP and i18n helper types live in `contracts/src/http.ts` and
  `contracts/src/i18n.ts`.
- Generated output lives under `contracts/dist/`.

## Runtime Packaging

`@dnd/contracts` is an ESM package with runtime-light DTO/helper exports. The
CommonJS server consumes the built package through its normal package export
and guards that boundary with:

```bash
npm run build:contracts
npm run check:contracts
npm run build:server
npm run -w server check:runtime
```

Do not add a dual CJS/ESM build unless contracts gains runtime behavior that
breaks this guarded path. Keep contracts free of server data access, frontend
state, top-level async work, and environment-dependent side effects.

## Change Flow

When a shared shape changes:

1. Update `contracts/src/`.
2. Rebuild contracts.
3. Update server mapping/service tests.
4. Update frontend API/helper consumers and tests.
5. Run the relevant server and web validation.

Server and web code should not define parallel DTOs for the same API response.

Current normalized spell query contracts live in `contracts/src/dto/spell.ts`
and metadata vocabulary lives in `contracts/src/dto/meta.ts`.

- Taxonomy filters use numeric id arrays: `schoolIds`, `subschoolIds`, and
  `descriptorIds`.
- Descriptor taxonomy buckets that are not legacy ids use
  `descriptorBuckets`.
- Taxonomy vocabulary items include `sourceKind` and `category` metadata for
  grouping ordinary spell taxonomy separately from Tome of Battle maneuver
  disciplines/categories.
- Combined legacy school/subschool labels should not appear as vocabulary items;
  consumers should use the base taxonomy ids returned by the metadata endpoint.
- Legacy descriptor noise values such as `see text...` should not appear as
  individual vocabulary items; consumers should use the server-provided
  `See text` descriptor item with `queryParam: "descriptorBuckets"` and
  `queryValue: "see-text"`. Spell descriptor DTOs can carry `rawText` and
  `note` for detail display.
- Base component filters use stable string keys through `componentKeys`.
- `GET /api/meta/filters` exposes the component vocabulary under
  `components.base`, including the query parameter name and `all` selection
  mode.
- Accepted mechanics filters use stable string keys through `castingTimeKeys`
  and `rangeKeys`.
- `GET /api/meta/filters` exposes mechanics vocabulary under
  `mechanics.castingTimes` and `mechanics.ranges`, including query parameter
  names and `any` selection mode within each family.

Do not add frontend-only filter vocabulary outside this package and the server
metadata endpoint.

## Validation

Use:

```bash
npm run build:contracts
npm run check:contracts
```

`npm run check:contracts` catches missing build artifacts or broken package
exports from a clean consumer import.

## Related Docs

- [../../contracts/README.md](../../contracts/README.md)
- [./server.md](./server.md)
- [./web.md](./web.md)
