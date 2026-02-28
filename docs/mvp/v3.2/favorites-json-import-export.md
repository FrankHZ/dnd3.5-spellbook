# v3.2 Implementation Notes: Favorites JSON Import/Export (3.2)

## Scope

This document records the implemented behavior for v3.2 favorites JSON import/export from plan section `3.2`.

It reflects the shipped frontend behavior for spell-id collection books, especially the default `Favorite` book, and the supporting collection-detail refactor done alongside the feature.

## Goals

- Allow favorites to be exported as a deterministic JSON file.
- Allow favorites to be imported back into a spell-id collection safely.
- Validate imported spell ids against current API availability before saving.
- Keep collection-level JSON actions grouped in the detail page header.

## 1. Detail Page Integration

Implemented behaviors:

- `SpellbookDetailPage` now delegates collection-level actions to book-type-specific components instead of owning all import/export state directly.
- Prepared books render `PreparedBookJsonActions`.
- Spell-id books render `SpellIdBookJsonActions`.
- This keeps `SpellbookDetailPage` focused on page composition and content rendering.

Files:

- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/prepared/PreparedBookJsonActions.tsx`
- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`

## 2. Export Format

Implemented behaviors:

- Spell-id book export is JSON-only.
- The exported payload shape is flat and deterministic:
  - `schemaVersion`
  - `exportedAt`
  - `favoriteSpellIds`
- Exported spell ids are normalized to positive unique integers before serialization.
- Export filenames are derived from the book name and current UTC date.

Example shape:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-xx-xxTxx:xx:xxZ",
  "favoriteSpellIds": [123, 456, 789]
}
```

Files:

- `web/app/features/collections/spell-id/spell-id-json.ts`

## 3. Import Validation

Implemented behaviors:

- Import accepts JSON only through a file picker.
- Invalid JSON parsing fails with an inline import error.
- The parser validates:
  - top-level object shape
  - `schemaVersion`
  - `favoriteSpellIds` being an array
- Imported ids are normalized to positive unique integers.
- The parser also reports how many raw entries were discarded during normalization as `invalidEntriesCount`.
- After parsing, the UI validates candidate ids with `getSpellsBatch(...)`.
- Spell ids reported by the API as missing are excluded from the saved collection.

Files:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/spell-id/spell-id-json.ts`
- `web/app/api/spells.ts`

## 4. Import Modes

Implemented behaviors:

- Spell-id books support two explicit import actions:
  - `Import Merge`
  - `Import Replace`
- `Import Merge`:
  - appends imported valid ids to the current collection
  - ignores ids already present in the collection
- `Import Replace`:
  - replaces the current collection with the imported valid ids
- Both modes use the same file picker; the chosen mode is captured before file selection.

Note:

- The original plan called for `Merge` as the default behavior and `Replace` as optional. The implemented UI exposes both actions explicitly so the user chooses the behavior up front.

Files:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/state/collections-state.tsx`

## 5. Import Summary and Clear Action

Implemented behaviors:

- Import success shows an inline summary card.
- Both import modes report:
  - invalid entries skipped
  - missing spell ids
- `Import Merge` additionally reports:
  - added spell ids
  - already existing ids
- `Import Replace` reports:
  - imported spell ids
- Spell-id books now also expose a dedicated `Clear` action in the same header action group.
- Prepared books were aligned to this layout by moving their existing `Clear` action into `PreparedBookJsonActions`.

Files:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/prepared/PreparedBookJsonActions.tsx`
- `web/app/features/collections/prepared/PreparedBookDetail.tsx`

## 6. State Management

Implemented behaviors:

- Collection state now exposes a spell-id-specific mutation surface:
  - `spellIdBook.setSpellIds(bookId, spellIds)`
- This method normalizes ids before persisting them.
- The mutation is shared by:
  - merge import
  - replace import
  - clear action

Files:

- `web/app/state/collections-state.tsx`

## Non-Goals (Current)

- No backend persistence or account sync.
- No import of nested spell metadata beyond spell ids.
- No toast migration in this pass; import results still use inline status cards.
- No automated test suite added in this pass.

## Manual Validation Snapshot

Manual checks performed during implementation:

- export creates a valid favorites JSON payload
- merge import adds new valid ids and ignores duplicates
- replace import swaps the collection contents to imported valid ids
- missing spell ids are excluded and reported
- invalid ids are skipped and counted
- clear empties the spell-id collection
- `npm run typecheck` passes in `web/`

## Follow-up

- Replace inline import status cards with the v3.2 toast system from plan section `3.4`.
- Consider extracting shared low-level JSON action utilities used by prepared and spell-id collection actions.
