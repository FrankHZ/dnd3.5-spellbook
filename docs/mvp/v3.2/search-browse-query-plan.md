# Search And Browse Query Plan

This plan captures the clarified feature requirement for connecting Browse and
Search without treating Browse as the owner of Search behavior.

## User Outcome

Users can move between browsing and searching without losing the active spell
scope.

- Browse remains the filter-first spell discovery page.
- Search becomes name search plus the full Browse filter set.
- The app header search preserves the current Browse or Search query scope when
  submitting a name search.
- Search provides its own way to clear filter scope.

## Confirmed Requirements

- Search owns a complete URL query model:
  - `q`
  - `classIds`
  - `domainIds`
  - `level`
  - `page`
- Search should expose editable class, domain, and level controls in its
  sidebar, not just a read-only scope summary.
- Browse should not consume Search's `q` parameter for Browse results.
- Browse can hand the current filter query to Search through the header search
  flow.
- The existing previous implementation should be corrected forward rather than
  reverted.

## Existing Surface To Reuse

- Feature map entries:
  - `docs/features.md#browse`
  - `docs/features.md#search`
- Frontend entry points:
  - `web/app/layout/TopBar.tsx`
  - `web/app/features/browse/BrowseSpellsPage.tsx`
  - `web/app/features/search/SearchSpellsPage.tsx`
  - `web/app/features/search/search-url.ts`
  - existing Browse selector components under `web/app/features/browse/`
- Backend entry points:
  - `web/app/api/spells.ts`
  - `server/src/controllers/spells.controller.ts`
  - `server/src/services/spells/spells.service.ts`
- Existing tests:
  - `web/app/features/search/search-url.test.ts`
  - `server/tests/spells.search.test.ts`

## Scope

In scope:

- Update header search submission so Browse and Search preserve relevant scope
  query parameters while replacing `q` and resetting `page`.
- Replace Search's current scope summary sidebar with editable Browse-equivalent
  filter controls.
- Keep Search URL state canonical for its own filters and pagination.
- Keep Browse result fetching independent from Search's `q`.
- Add or update tests for URL preservation and query construction.
- Update user-facing feature docs after implementation.

Out of scope:

- Replacing npm workspaces or changing repository structure.
- Adding a new backend search endpoint if the existing endpoint can support the
  confirmed query model.
- Changing rulebook scope storage; Settings remains the rulebook scope owner.
- Adding account sync, saved searches, or advanced query syntax.

## Data And Contract Impact

- Contract change: expected no.
- Database or local data change: no.
- i18n change: yes, if Search sidebar labels or actions change.
- API behavior change: expected no new endpoint; preserve existing search filter
  behavior and extend tests only if implementation uncovers a gap.

## Harness Plan

- Backend/API:
  - Keep or extend `server/tests/spells.search.test.ts` for class, domain, and
    level filters if current coverage is incomplete.
- Frontend pure logic:
  - Extend `search-url.test.ts` for preserving scope from Browse and Search.
  - Add tests for clearing only Search filter scope while preserving or removing
    `q` according to the UI action.
- Typecheck/build:
  - `npm run verify`
  - `npm run i18n:check`
  - `npm run build:web`
- Browser smoke:
  - Optional after pure tests pass: Browse with filters, submit header search,
    edit scope on Search, clear Search filters.

## Acceptance Criteria

- From Browse, selecting class/domain/level and using the app header search lands
  on Search with `q` plus the active Browse filter query.
- Browse results do not change because of a `q` URL parameter.
- Search sidebar can edit the same filter dimensions as Browse.
- Search result requests include `q`, class/domain ids, level, page, language,
  and Settings-owned rulebook scope as appropriate.
- Clearing Search filter scope leaves the user in a clean Search state without
  requiring a trip through Browse.
- Pagination resets when `q` or filter scope changes.

