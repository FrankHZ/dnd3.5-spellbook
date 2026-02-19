# v3.1 Implementation Notes: JSON Import/Export (3.1)

## Scope

This document records the implemented behavior for v3.1 JSON import/export from plan section `3.1`.

It is implementation-first and reflects the shipped behavior, including pragmatic guardrails where full multi-kind IO is not yet implemented.

## Goals

- Provide deterministic local backup/restore for prepared collections.
- Support device transfer through JSON files.
- Keep import behavior safe:
  - schema mismatch must fail fast
  - no partial state update on hard validation failure

## Implemented JSON Schema

Export payload currently uses:

- `schemaVersion: 1`
- `exportedAt: string` (ISO datetime)
- `collectionMeta?: { id, name, kind: "prepared" }`
- `preparedEntries: PreparedEntry[]`
- `resolutionPrefs: { selectedClassIds: number[]; selectedDomainIds: number[] }`

Files:

- `web/app/features/collections/prepared/prepared-json-export.ts`
- `web/app/storage/collections.type.ts`

## 1. Export Behavior

Implemented behaviors:

- Export action is available on `SpellbookDetailPage` header actions.
- Current book can be exported as JSON when the book kind is `prepared`.
- Export filename format:
  - `<sanitized-book-name>-YYYY-MM-DD.json`
- Payload is normalized before serialization:
  - prepared entries sanitized with shared normalization
  - selected class/domain ids normalized to positive unique ints

Files:

- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/prepared/prepared-json-export.ts`
- `web/app/storage/prepared-normalize.ts`

## 2. Import Behavior

Implemented behaviors:

- Import action is available on `SpellbookDetailPage` header actions.
- Import requires a JSON file and validates:
  - top-level object shape
  - `schemaVersion === 1`
  - `preparedEntries` array presence
- Parsed entries are normalized using the shared normalization path.
- Invalid rows are skipped and counted (`invalidEntriesCount`).
- Missing spell ids are checked via `getSpellsBatch(...)` and skipped from applied entries.
- Import replaces current prepared book content using atomic replacement:
  - `entries`
  - `selectedClassIds`
  - `selectedDomainIds`

Files:

- `web/app/features/collections/SpellbookDetailPage.tsx`
- `web/app/features/collections/prepared/prepared-json-export.ts`
- `web/app/state/collections-state.tsx`
- `web/app/api/spells.ts`

## 3. UI Feedback and Safety

Implemented behaviors:

- Import button is destructive-styled and marked as replacement behavior.
- Import status banners are shown on `SpellbookDetailPage`:
  - error banner (`Import failed`) with dismiss button
  - summary banner (`Import complete`) with dismiss button
- Summary includes:
  - imported entry count
  - invalid entries skipped count
  - missing spell ids

File:

- `web/app/features/collections/SpellbookDetailPage.tsx`

## 4. Book-Kind Guardrail (Current Limitation)

`SpellbookDetailPage` now hosts IO controls for both book kinds, but JSON IO logic is only implemented for prepared books.

Current guard behavior:

- for non-prepared books (`spellbook` / `custom`):
  - import/export buttons are disabled
  - tooltip text explains IO is not implemented for that kind yet

This keeps UI location unified while preventing unsupported operations.

File:

- `web/app/features/collections/SpellbookDetailPage.tsx`

## 5. Shared Normalization Refactor

To avoid divergence between local-load normalization and import normalization, prepared-entry/id normalization is extracted into:

- `normalizePreparedEntries(...)`
- `normalizePositiveIntIds(...)`

These helpers are now reused by:

- local storage load path in `collections.ts`
- JSON export/import path in `prepared-json-export.ts`

Files:

- `web/app/storage/prepared-normalize.ts`
- `web/app/storage/collections.ts`
- `web/app/features/collections/prepared/prepared-json-export.ts`

## Non-Goals (Current)

- No JSON IO implementation yet for `spellbook` / `custom` spell-id books.
- No backend/cloud sync integration.
- No rules/legality validation for prepared entries beyond structural normalization.
- No additional automated test suite added in this pass.

## Manual Validation Snapshot

Manual checks performed during implementation:

- export from prepared page downloads JSON with expected fields
- schema-version mismatch import fails with clear error and no apply
- invalid prepared entries are skipped and counted
- missing spell ids are reported and excluded from apply
- successful import fully replaces entries + prefs
- non-prepared books show disabled IO actions with guard tooltip
- `npm run typecheck` passes in `web/`

## Follow-up

- Add JSON IO implementation for `spellbook` / `custom` kinds (or hide controls per kind until implemented).
- Add focused tests for:
  - schema validation branches
  - normalization parity between storage load and JSON import
  - import summary math (invalid + missing + imported)
