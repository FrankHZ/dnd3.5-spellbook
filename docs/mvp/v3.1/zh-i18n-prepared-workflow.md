# v3.1 Implementation Notes: ZH i18n for Prepared Workflow (3.3)

## Scope

This document records the implemented behavior for v3.1 plan section `3.3`.

Goal: make prepared-workflow screens usable in ZH mode by replacing hardcoded UI text with i18n keys and locale-backed translations.

## Implemented Coverage

## 1. Prepared workflow UI labels

Localized prepared workflow components:

- `PreparedBookDetail`
- `PreparedTable`
- `PreparedTableCell`
- `PreparedClassSidebar`
- `PreparedEntryEditDialog`
- `PreparedCopyDialog`
- `BulkPasteDialog`

Implemented changes:

- user-facing strings wrapped with `t(...)` (`collections` namespace)
- interpolation keys added for dynamic counts and summaries
- status/error labels and button labels localized
- loading/empty/error placeholders localized

## 2. Spellbook detail import/export text

Localized `SpellbookDetailPage` texts for JSON import/export flow:

- action labels (`Export JSON`, `Import JSON`, `Importing...`)
- tooltip/help text
- import error/summary headings and labels
- close-button accessibility labels
- fallback messages (`Invalid JSON file.`, `Import failed.`, etc.)

## 3. Spell-id book detail text

Localized `SpellIdBookDetail` texts:

- spell count
- empty/loading/error states
- missing spell ids message

## 4. New i18n namespaces

### `metamagic`

Added dedicated metamagic namespace:

- `web/public/locales/en/metamagic.json`
- `web/public/locales/zh/metamagic.json`

Usage:

- common metamagic tags now render via `t("metamagic")` by key
- custom metamagic names remain user-entered text

### `collections-default`

Added namespace for default collection names:

- `web/public/locales/en/collections-default.json`
- `web/public/locales/zh/collections-default.json`

Usage:

- default book ids (`default`, `prepared`) are mapped to localized display names at render time
- existing persisted `book.name` values are not migrated

## Files

Primary implementation files:

- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/SpellIdBookDetail.tsx`
- `web/app/features/collections/SpellbooksIndexPage.tsx`
- `web/app/features/collections/collection-display-name.ts`
- `web/app/features/collections/prepared/BulkPasteDialog.tsx`
- `web/app/features/collections/prepared/PreparedBookDetail.tsx`
- `web/app/features/collections/prepared/PreparedClassSidebar.tsx`
- `web/app/features/collections/prepared/PreparedCopyDialog.tsx`
- `web/app/features/collections/prepared/PreparedEntryEditDialog.tsx`
- `web/app/features/collections/prepared/PreparedTable.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`
- `web/app/i18n/i18n.ts`

Locale files:

- `web/public/locales/en/collections.json`
- `web/public/locales/zh/collections.json`
- `web/public/locales/en/metamagic.json`
- `web/public/locales/zh/metamagic.json`
- `web/public/locales/en/collections-default.json`
- `web/public/locales/zh/collections-default.json`

## Notes

- Translation extraction and served locale files are now separated:
  - extract output: `web/extracted/...`
  - served output: `web/public/locales/...`
- `npm run typecheck` passes after the i18n changes.
