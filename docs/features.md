# Feature Map

This document describes the current user-facing feature surface.

Use it as the stable functional map for maintenance and harness work. For final
v3.2 release details and intentional deviations from earlier plans, use
`docs/mvp/v3.2/FREEZE.md`.

## Browse

Users can browse spells by class, domain, spell level, and selected rulebooks.

Current behavior:

- class and domain filters can both contribute results
- level can be a single level or all levels
- selected rulebooks constrain the result set
- default rulebooks are supplied by the backend when no explicit rulebook ids
  are provided
- results are paginated
- English and Chinese UI/content modes preserve the same response shape

Key code:

- `web/app/features/browse/BrowseSpellsPage.tsx`
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
- URL filters can constrain search by class, domain, and level
- the Search sidebar exposes editable class, domain, and level controls
- header search preserves current Browse or Search filter scope while replacing
  the name query
- results are paginated
- empty or too-short usable queries return an empty result set rather than a
  failed search

Key code:

- `web/app/features/search/SearchSpellsPage.tsx`
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
- detail pages render related spell references when matches exist
- related results are split into same-name matches and variant-form matches
- related result ordering is deterministic by rulebook abbreviation, page, then
  spell id

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
- Chinese display names are available where local app data provides overlays
- frontend bootstrapping loads metadata for selectors and labels

Key code:

- `web/app/api/bootstrap.ts`
- `web/app/api/meta.ts`
- `web/app/bootstrap/useBootstrap.ts`
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

Key code:

- `web/app/features/collections/SpellbooksIndexPage.tsx`
- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/spell-id/SpellIdBookDetail.tsx`
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

Users can adjust application preferences such as language, rulebook scope, and
class-related browsing defaults.

Current behavior:

- settings are browser-local
- selected rulebooks affect browse/search behavior
- language selection affects both UI text and API query parameters

Key code:

- `web/app/features/settings/SettingsPage.tsx`
- `web/app/features/settings/RulebookSelector.tsx`
- `web/app/features/settings/ClassSettings.tsx`
- `web/app/state/user-prefs-state.tsx`
- `web/app/storage/userPrefs.ts`

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
