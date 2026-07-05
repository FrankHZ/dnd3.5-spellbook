# v3.8 Freeze

## Status

**v3.8 FROZEN**

This document records the final canonical documentation state for the v3.8
handoff.

## Canonical Source Order

When v3.8 documents conflict, treat this freeze document as authoritative over
earlier v3.8 planning documents.

Use this precedence order for v3.8:

1. `docs/mvp/v3.8/FREEZE.md`
2. current focused topic docs changed by v3.8
3. current operational docs changed by v3.8
4. focused v3.8 plan documents

## Frozen Deliverables

1. Backend normalized query contract for public spell filters.
2. Frontend Browse/Search consumer for normalized taxonomy and component
   filters, with a bounded filter and spell-card polish pass.
3. Server module-boundary cleanup using Node package imports instead of
   TypeScript-only alias rewriting.

## Final As-Built Summary

### 1. Normalized Query Contract

Shipped behavior:

- Shared spell query DTOs include `componentKeys` and descriptor bucket support.
- `GET /api/meta/filters` exposes server-owned normalized filter vocabulary for
  taxonomy and base components.
- Public taxonomy filters remain `schoolIds`, `subschoolIds`, `descriptorIds`,
  and the synthetic `descriptorBuckets=other` path for descriptor noise.
- Public component filters use stable keys with `all` semantics:
  `verbal`, `somatic`, `material`, `arcane_focus`, `divine_focus`, `xp`,
  `metabreath`, `truename`, and `corrupt`.
- Taxonomy vocabulary includes `sourceKind` and `category`, so Tome of Battle
  disciplines and maneuver categories can be grouped without frontend string
  parsing.
- Combined school/subschool labels are split into base taxonomy facets, and
  legacy descriptor noise such as `see text...` is collapsed into the public
  `Other` bucket.
- Search and Browse/by-level endpoints parse and echo sanitized normalized
  filter params in both content-backed reads and legacy rules rollback reads.

Accepted evidence:

- PR `#27` shipped the contracts, server query behavior, normalized content
  handling, fixture coverage, and docs.
- GitHub `Portable validation` passed for PR `#27`, run `28717659465`.

Frozen clarification:

- Casting time, range, target/effect/area, duration, saving throw, spell
  resistance, and extra component text remain review-only or deferred.
- Tome of Battle entries are grouped through metadata; v3.8 does not add
  separate maneuver query params.

### 2. Frontend Filter Consumer And Polish

Shipped behavior:

- Browse remains filter-first and Search remains name-first while sharing the
  same structured class, domain, level, taxonomy, component, and rulebook scope.
- Browse/Search consume server-provided normalized filter vocabulary instead of
  parsing legacy source strings in the browser.
- URL helpers parse, normalize, canonicalize, and preserve `componentKeys`
  alongside existing class/domain/level/taxonomy scope.
- Taxonomy controls group spell taxonomy and Tome of Battle maneuver vocabulary
  from server metadata.
- Active scope summaries count taxonomy and component filters separately.
- A single detail-filter reset clears taxonomy and component filters without
  clearing the primary class/domain/level scope.
- Component chip styling is shared across filters, Browse/Search rows, and Spell
  Detail. Related-spell lists reuse the compact summary row treatment.
- Spell Detail mechanics use compact metadata rows; the underlying backend
  fallback behavior is unchanged.

Accepted evidence:

- PR `#28` shipped the frontend consumer, filter UX pass, styling polish, and
  docs.
- GitHub `Portable validation` passed for PR `#28`, run `28731013967`.
- Local implementation validation covered targeted web tests, i18n check, web
  typecheck, web build, and browser smoke on Browse/Search desktop and mobile
  flows.

Frozen clarification:

- The accepted v3.8 sidebar and chip work is not a full filter-design system.
  Broader filter vocabulary still needs a deliberate future UX pass.
- Summary spell cards remain scan-only; action controls stay in full-detail card
  mode.

### 3. Server Module Boundary Cleanup

Shipped behavior:

- Server source, tests, and maintenance scripts use Node package imports:
  `#server/*`, `#prisma-rules-clean/*`, `#prisma-content/*`, and
  `#prisma-app-state/*`.
- `server/package.json` owns the runtime import map with a `source` condition
  for local TypeScript execution and default `dist/` resolution for built
  runtime commands.
- `server/tsconfig.json` no longer owns TypeScript-only alias `paths`.
- The server build uses plain `tsc`; `tsc-alias` and `tsconfig-paths` are no
  longer server workspace dependencies.
- `server/vitest.config.ts` resolves the `source` condition for tests.
- The server package remains CommonJS while TypeScript keeps NodeNext
  compilation and resolution.
- `@dnd/contracts` remains a runtime-light DTO package and does not need a dual
  CJS/ESM build for v3.8.

Accepted evidence:

- PR `#29` shipped the import migration, runtime import map, dependency cleanup,
  docs, and runtime checks.
- GitHub `Portable validation` passed for PR `#29`, run `28745679588`.
- Local review checks confirmed source and built package import resolution,
  contracts build/check, server Prisma generation, server build, runtime import
  smoke, and server tests.

Frozen clarification:

- A full server ESM runtime migration remains deferred until the current
  CommonJS package-import boundary creates real deploy/runtime risk.
- A dual contracts package build remains deferred until contracts gains runtime
  behavior that cannot be consumed safely from the current server path.

## Validation Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `npm run ci:portable` | Passed | Local final pass on `58f50a1`; server `18` files / `76` tests, data-tools portable `9` checks, web `27` files / `105` tests, web typecheck/build passed. |
| GitHub `Portable validation` | Passed | PR `#27`, run `28717659465`, merge commit `a14e9a6`. |
| GitHub `Portable validation` | Passed | PR `#28`, run `28731013967`, merge commit `f513dbb`. |
| GitHub `Portable validation` | Passed | PR `#29`, run `28745679588`, merge commit `58f50a1`. |

## Known Deferred Work

- Complete filter UX design for larger future normalized filter vocabularies,
  including grouping, density, labels, resets, mobile disclosure, and advanced
  versus primary scope behavior.
- Promote casting time, range, and other mechanics filters only after stable
  buckets and fallback semantics are accepted.
- Add remaining source-backed English spells from `data/spells-full` through a
  future content/rules DB workflow.
- Large-scale Chinese/English translation and proofreading QA remains deferred.
- Content artifact/versioned DB release automation remains deferred; DB upload
  is still operator-owned rather than part of CD.
- Static HTML/offline artifact generation remains deferred.
- Full server ESM runtime migration and a dual contracts build remain deferred
  until the current package-import boundary stops being sufficient.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Do not treat older v3.8 plan documents as newer than this snapshot.
- v3.8 closed the focused normalized query, frontend filter consumer, and
  module-boundary cleanup pass without expanding into a broad filter redesign.
