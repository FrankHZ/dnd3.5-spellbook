# Feature Map

This document describes the current user-facing feature surface.

Use it as the stable functional map for maintenance and harness work. For final
v3.3 release details and intentional deviations from earlier plans, use
`docs/mvp/v3.3/FREEZE.md`.

## Data Backing Boundary

The user-facing spell, metadata, and localization features are backed by
prepared rules/content data served through backend APIs.

Current data roles:

- rules-derived spell content, filter metadata, and rulebook metadata are served
  from prepared runtime databases, not from raw source files at request time
- normalized rules-derived runtime content and app-owned overlays such as
  localized names, rulebook display labels, and short descriptions live in the
  content DB
- collection and settings features are browser-local in the current app; the
  app-state DB has no shipped user-facing feature yet

This file records user-visible behavior. Database ownership, rebuild commands,
fixture policy, provenance tracking, and deployment activation are documented in
`docs/operations/data-setup.md`, `docs/operations/import-workflow.md`, and `docs/operations/deployment.md`.

## Browse

Users can browse spells by class, domain, spell level, and selected rulebooks.

Current behavior:

- class and domain filters can both contribute results
- level can be a single level or all levels
- selected rulebooks constrain the result set
- URL filters can constrain results by normalized school, subschool, and
  descriptor ids
- API filters can constrain results by normalized base spell components through
  `componentKeys`; Browse exposes this server-provided vocabulary in the
  Advanced filters panel
- API filters can constrain results by accepted normalized mechanics buckets
  through `castingTimeKeys`, `rangeKeys`, `durationKeys`, and
  `savingThrowKeys`, plus `spellResistanceKeys`; Browse exposes this
  server-provided vocabulary in the Advanced filters panel
- the Advanced filters panel drafts taxonomy, component, and mechanics changes
  locally, then applies them to the shareable URL in one action
- default rulebooks are supplied by the backend when no explicit rulebook ids
  are provided
- the spell-list area shows a compact shared scope summary with selected
  class/domain filter counts, level, taxonomy filter count, component filter
  count, mechanics filter count, and rulebook scope
- spell list density follows browser-local Display settings, while full-detail
  card display is controlled from the Browse sidebar for the current reading
  context
- summary spell cards are scan-only; favorite/prepare actions are shown in
  full-detail card mode
- spell cards can show compact special-component markers such as `M`, `AF`,
  `DF`, or `XP` beside spell names
- results are paginated
- English and Chinese UI/content modes preserve the same response shape

Key code:

- `web/app/features/browse/BrowseSpellsPage.tsx`
- `web/app/components/SpellCard.tsx`
- `web/app/features/spells/SpellFilterScopeSummary.tsx`
- `web/app/api/spells.ts`
- `server/src/controllers/spells.controller.ts`
- `server/src/services/spells/spells.service.by-level.ts`
- `server/tests/spells.by-level.test.ts`

## Search

Users can search spells by name.

Current behavior:

- English and other non-CJK queries require at least two characters
- CJK queries may search from one character
- rulebook filtering is supported
- URL filters can constrain search by class, domain, and a specific numeric
  level; omitted level means any level in Search
- URL filters can also constrain search by normalized `schoolIds`,
  `subschoolIds`, and `descriptorIds` using the same comma-separated id-list
  convention
- API filters can also constrain search by normalized base spell components via
  `componentKeys`, using stable server-provided keys rather than raw component
  strings
- descriptor filter vocabulary collapses legacy `see text...` values into the
  server-provided `See text` option via `descriptorBuckets=see-text` instead
  of exposing those source artifacts individually
- API filters can also constrain search by accepted normalized mechanics
  buckets via `castingTimeKeys`, `rangeKeys`, `durationKeys`, and
  `savingThrowKeys`, plus `spellResistanceKeys`
- the Search sidebar exposes editable class, domain, and level controls
- the Search sidebar exposes the same school, subschool, and descriptor scope
  controls as Browse without making name lookup secondary
- the Search sidebar also exposes the same normalized base component controls as
  Browse
- the Search sidebar also exposes the same accepted normalized mechanics
  controls as Browse
- Search uses the same Advanced filters panel as Browse so secondary filter
  changes do not update the URL until users apply the draft
- header search preserves current Browse or Search filter scope while replacing
  the name query
- the spell-list area uses the same compact scope summary as Browse, including
  active taxonomy, component, mechanics, and selected rulebook scope
- spell list density follows browser-local Display settings, while full-detail
  card display is controlled from the Search sidebar for the current reading
  context
- summary spell cards are scan-only; favorite/prepare actions are shown in
  full-detail card mode
- spell cards can show compact special-component markers such as `M`, `AF`,
  `DF`, or `XP` beside spell names
- results are paginated
- empty or too-short usable queries return an empty result set rather than a
  failed search

Key code:

- `web/app/features/search/SearchSpellsPage.tsx`
- `web/app/components/SpellCard.tsx`
- `web/app/features/spells/SpellFilterScopeSummary.tsx`
- `web/app/features/search/search-url.ts`
- `web/app/features/search/validation.ts`
- `web/app/api/spells.ts`
- `server/src/controllers/spells.controller.ts`
- `server/src/services/spells/spells.service.ts`
- `server/tests/spells.search.test.ts`

## Spell Detail

Users can open a spell detail page with rule text, metadata, class/domain levels,
components, mechanics, and related spell references.

Current behavior:

- invalid ids return a bad-request error
- missing spell ids return not found
- Chinese content overlays are applied when available
- spell names follow the Chinese Display setting for English comparison text
- source, school/subschool, and descriptor metadata are grouped in the detail
  sidebar overview, while the page header focuses on the spell name, short
  description, and local actions
- detail pages render related spell references when matches exist
- related results are split into same-name matches and variant-form matches
- related result ordering is deterministic by source rulebook abbreviation,
  page, then spell id, while visible labels use the shared rulebook display
  helper
- content-backed detail responses can include accepted normalized mechanics
  flags under `casting.mechanics` for duration, saving throw, and spell
  resistance notes; Spell Detail renders those as secondary text notes beside
  the raw source field, while legacy raw strings remain the displayed fallback
  text

Key code:

- `web/app/features/spells/SpellDetailPage.tsx`
- `web/app/features/spells/RelatedSpellsSection.tsx`
- `web/app/api/spells.ts`
- `server/src/controllers/spells.controller.ts`
- `server/src/services/spells/spells.service.ts`
- `server/tests/spells.detail.test.ts`

## Rule Metadata

Users rely on rulebooks, classes, domains, schools, subschools, and descriptors
as filter labels and spell metadata.

Current behavior:

- metadata is exposed through dedicated API endpoints
- normalized taxonomy filter vocabulary is exposed by `GET /api/meta/filters`
- taxonomy filter vocabulary includes `sourceKind` and `category` metadata so
  Tome of Battle disciplines and maneuver categories can be grouped separately
  from ordinary spell schools/subschools
- Tome of Battle discipline/category options are hidden from school/subschool
  filter controls unless the selected rulebook scope includes that rulebook
- combined legacy school/subschool labels are split into their base taxonomy
  filters rather than shown as separate combined options
- normalized base component filter vocabulary is exposed by
  `GET /api/meta/filters` under `components.base`
- accepted normalized mechanics filter vocabulary is exposed by
  `GET /api/meta/filters` under `mechanics.castingTimes` and
  `mechanics.ranges`, plus duration buckets under `mechanics.durations` and
  saving throw buckets under `mechanics.savingThrows`, and spell resistance
  buckets under `mechanics.spellResistances`
- Spell Detail exposes accepted duration, saving throw, and spell resistance
  flags as optional `casting.mechanics` metadata when served from normalized
  content
- rulebook responses preserve source `abbr` and can include curated
  `displayAbbr` / `displayName` metadata from normalized content
- frontend rulebook display uses a shared helper so English and default Chinese
  display can show curated/source abbreviations consistently
- Chinese Display settings can opt into localized Chinese short rulebook labels
  in frontend content surfaces
- Chinese display names are available where local app data provides overlays
- frontend bootstrapping loads metadata for selectors and labels

Key code:

- `web/app/api/bootstrap.ts`
- `web/app/api/meta.ts`
- `web/app/bootstrap/useBootstrap.ts`
- `web/app/i18n/display/rulebook.ts`
- `web/app/i18n/hooks/useRulebookDisplay.ts`
- `server/src/routes/meta.routes.ts`
- `server/src/routes/rulebooks.routes.ts`
- `server/src/routes/classes.routes.ts`
- `server/src/routes/domains.routes.ts`
- `server/tests/meta.test.ts`
- `server/tests/rulebooks.test.ts`
- `server/tests/classes.test.ts`
- `server/tests/domains.test.ts`

## Spellbooks And Favorites

Users can keep local spell-id based collections for favorites and spellbooks.

Current behavior:

- collections are browser-local state
- spell-id books store spell ids
- books can fetch spell summaries in batches
- JSON export uses a flat payload with `schemaVersion`, `exportedAt`, and
  `favoriteSpellIds`
- JSON import supports explicit merge and replace actions
- imported ids are normalized to positive unique integers
- ids missing from the API are excluded from persistence
- spell-id books expose a clear action
- spell-id book spell cards follow browser-local Display settings

Key code:

- `web/app/features/collections/SpellbooksIndexPage.tsx`
- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/spell-id/SpellIdBookDetail.tsx`
- `web/app/components/SpellCard.tsx`
- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/spell-id/spell-id-json.ts`
- `web/app/state/collections-state.tsx`
- `web/app/storage/collections.ts`
- `web/app/storage/collections.selectors.ts`
- `server/tests/spells.batch.test.ts`

## Prepared Spells

Users can manage prepared-spell collections by class and spell level.

Current behavior:

- prepared books are browser-local state
- prepared entries can be organized by class and level
- users can bulk paste spell names and resolve them through the backend
- users can import and export prepared-book JSON
- the prepared view uses responsive per-level cards
- main prepared actions live in a sticky floating action bar
- loading and batch-error states avoid showing misleading empty level grids

Key code:

- `web/app/features/collections/prepared/PreparedBookDetail.tsx`
- `web/app/features/collections/prepared/PreparedTable.tsx`
- `web/app/features/collections/prepared/BulkPasteDialog.tsx`
- `web/app/features/collections/prepared/prepared-json-export.ts`
- `web/app/features/collections/prepared/prepared-import-model.ts`
- `web/app/storage/prepared-normalize.ts`
- `server/src/services/spells/spells.service.resolve.ts`
- `server/tests/spells.resolve.test.ts`

## JSON Import And Export

Users can move local collection data through JSON files.

Current behavior:

- spell-id books support JSON import/export
- prepared books support JSON import/export
- import validates schema and payload shape
- import filters invalid values
- import validates candidate spell ids against the API before saving
- toast feedback is used for success and failure states

Key code:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/spell-id/spell-id-json.ts`
- `web/app/features/collections/prepared/PreparedBookJsonActions.tsx`
- `web/app/features/collections/prepared/prepared-json-export.ts`
- `web/app/features/collections/prepared/prepared-import-model.ts`
- `web/app/components/ui/sonner.tsx`

## Language And Content Variants

Users can switch between English and Chinese UI/content behavior.

Current behavior:

- language preference is stored in browser-local state
- backend requests receive language query parameters
- spell endpoints may also receive a Chinese variant query parameter
- Chinese entity names and spell text are supplied by app-owned overlay data
- English remains the fallback baseline

Key code:

- `web/app/i18n/init.ts`
- `web/app/i18n/config.ts`
- `web/app/i18n/storage.ts`
- `web/app/i18n/display/`
- `web/app/i18n/hooks/`
- `web/app/api/http.ts`
- `server/src/middlewares/i18nQuery.ts`
- `server/src/utils/i18n.ts`
- `server/src/services/spells/spells.mapper.ts`

## Settings

Users can adjust application preferences such as display density, language,
rulebook scope, and class-related browsing defaults.

Current behavior:

- settings are browser-local
- Display settings control compact versus comfortable spell-list density
- Browse and Search sidebars expose the browser-local summary/full-detail spell
  card toggle for context-specific scanning
- Chinese Display settings control English comparison text for spell names,
  class/domain labels, other filter labels, and rulebook abbreviations
- selected rulebooks affect browse/search behavior
- language selection affects both UI text and API query parameters

Key code:

- `web/app/features/settings/SettingsPage.tsx`
- `web/app/features/settings/DisplaySettings.tsx`
- `web/app/features/settings/RulebookSelector.tsx`
- `web/app/features/settings/ClassSettings.tsx`
- `web/app/features/display/useDisplayPrefs.ts`
- `web/app/state/user-prefs-state.tsx`
- `web/app/storage/userPrefs.ts`

## About / Status

Users and operators can view compact build, deployment, content, and source
credit status from the app.

Current behavior:

- `/about` shows frontend build metadata from `VITE_SPELLBOOK_*` build-time
  variables
- the page identifies the frontend hosting surface and the configured API
  origin; local development reports same-origin `/api`
- the page shows backend deploy metadata and a public content DB summary from
  `GET /api/status/app`
- detailed runtime DB provenance remains operator-facing through
  `GET /api/status/db`
- missing, local, or unavailable status data renders as a compact
  unavailable/local state instead of blocking the page
- the page includes compact English and Chinese community source credits, with
  detailed credit source notes under `docs/credits/`
- the page is read-only and does not upload, activate, or mutate DB artifacts

Key code:

- `web/app/features/about/AboutVersionPage.tsx`
- `web/app/features/about/build-metadata.ts`
- `web/app/features/about/credits.ts`
- `web/app/api/status.ts`
- `server/src/routes/status.routes.ts`
- `server/src/controllers/status.controller.ts`
- `server/src/services/app-status.service.ts`
- `server/src/services/db-status.service.ts`
- `server/tests/status.app.test.ts`
- `server/tests/status.db.test.ts`

## Feedback And UI Shell

Users get global toast feedback for collection and spell actions.

Current behavior:

- a single global toaster is mounted at the app root
- default toast duration is 2500ms
- toast placement is top-center
- collection JSON actions, favorite actions, and prepare actions use toast
  feedback
- desktop navigation uses a navigation menu
- mobile navigation uses a sheet

Key code:

- `web/app/root.tsx`
- `web/app/layout/TopBar.tsx`
- `web/app/components/SpellActionButtons.tsx`
- `web/app/components/ui/sonner.tsx`
- `web/app/components/ui/navigation-menu.tsx`
- `web/app/components/ui/sheet.tsx`

## Non-Goals

The current app intentionally does not provide:

- accounts or backend sync
- full character sheets
- automatic spell-slot legality enforcement
- multi-edition support
- a broad rules engine beyond spell-centric workflows
- a hardened production operations model

See `docs/stable-backlog.md` for deferred stable-version work.
