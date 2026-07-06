# Web Module

## Role

`web/` owns the React Router frontend and browser-facing experience: Browse,
Search, Spell Detail, collections, prepared spellbooks, Settings, About /
Version status, local browser state, and UI i18n display behavior.

## Main Boundaries

- Route files live under `web/app/routes/` and delegate to feature pages.
- Feature pages live under `web/app/features/`.
- Browser API calls go through `web/app/api/`.
- Local browser storage helpers live under `web/app/storage/`.
- App-wide state providers live under `web/app/state/`.
- Layout components live under `web/app/layout/`.
- Shared components live under `web/app/components/`.
- Local shadcn wrappers live under `web/app/components/ui/`.
- i18n runtime, display helpers, and meta-name hooks live under `web/app/i18n/`.

## Feature Ownership

Browse remains filter-first. Search remains name-first while accepting shared
structured scope where the feature map says it should. Spell Detail owns detailed
reference rendering. Collections own local spellbook and prepared-spell browser
state.

Normalized filter controls should consume `GET /api/meta/filters` vocabulary.
Base component filters use server-provided `componentKeys` with `all`
semantics. Mechanics filters use server-provided casting time, range,
duration, saving throw, and spell resistance buckets with `any` semantics
within each mechanics family and combined scope across selected families. Tome
of Battle taxonomy grouping uses server-provided `sourceKind` / `category`
metadata. Do not derive filter options by parsing raw spell component,
taxonomy, or mechanics strings in the browser.

Secondary normalized filters in Browse/Search should be edited through the
shared Advanced filters panel. The panel owns local draft state and writes the
URL only when the user applies the draft, so long filter lists do not cause
repeated navigation or scroll resets while users are checking boxes.

Spell Detail may render accepted content-backed `casting.mechanics` flags as
secondary notes for duration, saving throw, and spell resistance. It should not
infer structured mechanic notes from legacy raw strings or promote deferred
target, effect, or area values into normalized UI.

Settings owns broad user preferences such as language and content scope
defaults. Ordinary page filters should stay in URL state unless the feature plan
explicitly promotes them to preferences.

About / Version owns read-only deploy and content status display. It should use
frontend build-time `VITE_SPELLBOOK_*` metadata plus the public
`/api/status/app` summary; detailed `/api/status/db` provenance is
operator-facing and should not be required for the public page.

## Contracts And API

Frontend code should import shared DTOs from `@dnd/contracts` and use API helper
modules under `web/app/api/` rather than calling `fetch` directly from feature
components.

If the backend contract changes, rebuild `contracts` and update the closest
frontend API/helper tests before touching page UI.

## Validation

Use:

```bash
npm run build:contracts
npm run check:contracts
npm run test:web
npm run typecheck:web
npm run -w web build
```

For UI copy changes, also use:

```bash
npm run i18n:sync
npm run i18n:check
```

For broad layout or visual changes, combine these checks with a browser smoke
test of the affected pages.

## Related Docs

- [../features.md](../features.md)
- [../frontend-map.md](../frontend-map.md)
- [../design.md](../design.md)
- [../i18n.md](../i18n.md)
- [../../web/README.md](../../web/README.md)
- [../mvp/v3.5/normalized-rules-frontend-consumer-plan.md](../mvp/v3.5/normalized-rules-frontend-consumer-plan.md)
