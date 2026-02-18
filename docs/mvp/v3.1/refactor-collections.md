# v3.1 Refactor Notes: Collections / Prepared Workflow

## Scope

This document records the v3.1 refactor for collection-related fields and prepared workflow ownership.

For MVP, this refactor is documented based on implementation + manual validation. Automated tests are intentionally deferred.

## Goals

- Simplify ownership of collection/prepared logic.
- Keep prepared entries as the source of truth.
- Separate read selectors from mutation logic.
- Support both:
  - active prepared-book operations (global actions), and
  - book-scoped prepared-book operations (prepared book pages/components).

## Key Changes

## 1. State shape updates

`CollectionsState` now includes:

- `activePreparedBookId: string`

This allows operations to target the active prepared book without hardcoding `PREPARED_BOOK_ID`.

File:

- `web/app/storage/collections.type.ts`

## 2. Storage normalization (`collections.ts`)

Load/normalize now ensures:

- default spellbook exists
- default prepared book exists
- `activePreparedBookId` is valid and points to an existing prepared book (or safe fallback)

File:

- `web/app/storage/collections.ts`

## 3. Selector layer extraction (`collections.selectors.ts`)

Read concerns are centralized:

- `getActivePreparedBook(state)`
- `getPreparedBookById(state, bookId)`
- `getPreparedEntries(state)`
- `getPreparedPrefs(state)`
- `getPreparedPrefsByBookId(state, bookId)`

Selectors return copied arrays for safer consumption.

File:

- `web/app/storage/collections.selectors.ts`

## 4. Context API refactor (`collections-state.tsx`)

Collections context is split into facades:

- `spellbook.*` for spell-id books
- `prepared.*` for active prepared-book operations
- `preparedBook.*` for explicit book-scoped prepared operations

Prepared entry mutations were consolidated:

- from per-field setters
- to one patch-style mutation:
  - `setEntry(..., patch)`

File:

- `web/app/state/collections-state.tsx`

## 5. Prepared UI adoption

Prepared book components now use book-scoped operations (`preparedBook.*`) because they already have direct book context (`book.id`):

- `PreparedBookDetail`
- `PreparedTable`
- `PreparedTableCell`
- `BulkPasteDialog`

Files:

- `web/app/features/collections/prepared/PreparedBookDetail.tsx`
- `web/app/features/collections/prepared/PreparedTable.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`
- `web/app/features/collections/prepared/BulkPasteDialog.tsx`

## 6. Domain helper extraction

Prepared derivation and import mapping logic were moved out of UI components:

- level/grouping derivation:
  - `prepared-derivation.ts`
- bulk paste resolve-row modeling/helpers:
  - `prepared-import-model.ts`

Files:

- `web/app/features/collections/prepared/prepared-derivation.ts`
- `web/app/features/collections/prepared/prepared-import-model.ts`

## Usage Guidelines

- Use `preparedBook.*` in components that already know `book.id`.
- Use `prepared.*` for cross-page/global actions where only active prepared book is available.
- Keep selector logic in `collections.selectors.ts`.
- Keep persistence/bootstrap concerns in `collections.ts`.
- Keep mutation orchestration in `collections-state.tsx`.

## Non-Goals (MVP)

- No additional automated test suite added in this refactor.
- No multi-collection manager UI introduced.
- No backend/cloud persistence introduced.

## Manual Validation Summary

Quick manual checks were performed during implementation:

- prepared entry add/remove/update flows
- used-state reset flow
- bulk paste resolve/add flow
- preference selection updates
- typecheck passes after refactor

## Follow-up (optional, post-MVP)

- Add selector + mutation unit tests for regression safety.
- Add focused integration tests around prepared-book scoped operations.
