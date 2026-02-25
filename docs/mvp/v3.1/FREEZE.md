# D&D 3.5 Spellbook - v3.1 Freeze Document

## Version: 3.1

## Status: Feature Complete - Freeze Ready

---

# 1. Scope Summary

## Core Goal

Deliver a prepared-workflow enhancement release focused on:

- deterministic local backup/restore (JSON per collection)
- spreadsheet-friendly copy workflows (TSV)
- ZH i18n completeness in prepared workflow screens
- richer per-entry modeling (state, display override, metamagic, level control)
- collection/prepared refactor to stabilize ownership and derivation boundaries

---

## In Scope (v3.1)

### JSON Import/Export (Prepared Collection)

- export current active prepared book as JSON
- import JSON replaces current prepared book entries + prefs atomically
- schema validation required (`schemaVersion === 1`)
  - Future schema versions must increment this integer; minor shape changes are not backward-compatible without explicit migration.
- import summary includes:
  - imported entries count
  - invalid entries skipped count
  - missing spell ids

### Copy-Friendly Table View

- simple one-click `Copy Table` (TSV)
- `Advanced Copy` dialog with modes:
  - `simple` (board-shaped level columns)
  - `detailed` (fixed spreadsheet columns)
- detailed mode supports optional aggregation
- deterministic/stable column order and traversal

### ZH i18n Coverage (Prepared Workflow)

- prepared table and related dialogs/components localized
- bulk paste workflow localized
- JSON import/export statuses/messages localized
- metamagic labels localized via dedicated namespace
- default collection names localized at render time

### Prepared Entry Enhancements

PreparedEntry model (shipped):

- `state: "ok" | "used" | "reserved"`
- `displayNameOverride?: string`
- `metamagic?: { key: string; name?: string; levelAdj?: number }[]`
- `levelOverride?: number`
- `notes?: string`

Behavior highlights:

- default state `ok`
- normal mode toggles `ok <-> used`
- `reserved` lock is edit-mode controlled
- effective display name uses override when present
- metamagic modeled as metadata (no legality engine)

### Collections/Prepared Refactor

- `activePreparedBookId` added to state
- selector layer extracted for read concerns
- mutation API consolidated with patch-style entry updates
- prepared UI moved to book-scoped operations where `book.id` is known
- derivation/import helpers extracted from components
- shared normalization reused by storage load + JSON IO

---

## Explicitly Out of Scope (v3.1)

- backend persistence/accounts/sync
- multi-collection manager UI
- CSV import/export pipeline
- slot legality/rules enforcement
- same-name spell references in spell detail (deferred)
- JSON IO for non-prepared book kinds (`spellbook`/`custom`) in this release

---

# 2. Finalized Data and Derivation Rules

## 2.1 Prepared Entry Source of Truth

Prepared entries remain authoritative persisted units.
Grouping, level columns, and summaries are derived views.

## 2.2 Effective Level (Shipped Decision)

Final shipped rule uses `levelOverride` (not `levelAdjustment`):

1. if `levelOverride` is set, use it
2. else use `derivedBaseLevel + sum(metamagic.levelAdj)`
3. clamp via prepared-level clamp logic before grouping

## 2.3 Legacy Compatibility

Normalization on load/import provides migration safety:

- legacy `used: boolean` mapped to `state`
- invalid/missing state falls back to `ok`
- prepared entries/id arrays/metamagic/override fields sanitized

---

# 3. JSON Import/Export Freeze

## Export Payload (Prepared)

```ts
{
  schemaVersion: 1,
  exportedAt: string,
  collectionMeta?: { id: string; name: string; kind: "prepared" },
  preparedEntries: PreparedEntry[],
  resolutionPrefs: {
    selectedClassIds: number[],
    selectedDomainIds: number[]
  }
}
```

## Import Safety

- hard validation failure (shape/version) aborts apply
- invalid rows are skipped and counted
- missing spell ids are excluded and reported
- apply is replacement-based for entries + prefs

## Book-Kind Guardrail

- IO controls shown in unified page location
- non-prepared books: controls disabled with explanatory tooltip

---

# 4. Copy/Spreadsheet Freeze

## Simple Copy

- `Copy Table` outputs TSV matching current prepared board layout
- level columns (`Level 0`..`Level 9`), cell values are effective display names

## Advanced Copy

- `simple` mode mirrors Simple Copy semantics
- `detailed` mode exports fixed columns:
  - `SpellId`
  - `Name (EN)`
  - `Name (ZH)`
  - `Level`
  - `PreparedCount`
  - `UsedCount`
  - `DisplayName`
  - `Metamagic`
  - `LevelAdj`
  - `Notes`
- optional aggregation merges equivalent detailed rows and sums counts

## Determinism

- fixed column order
- stable traversal order
- TSV cell sanitation for predictable paste into Sheets/Excel

---

# 5. i18n Freeze (Prepared Workflow)

Implemented localization coverage includes:

- prepared workflow components
- bulk paste labels/messages/states
- JSON import/export actions, status banners, and fallback errors
- spell-id detail page user-facing states
- metamagic namespace (`metamagic`)
- default collection display-name namespace (`collections-default`)

No missing prepared-workflow translation keys are accepted at freeze.

---

# 6. Architecture/Ownership Freeze

Final ownership boundaries:

- persistence/bootstrap/normalization: `collections.ts`
- read selectors: `collections.selectors.ts`
- mutation orchestration/context API: `collections-state.tsx`
- prepared derivation logic: `prepared-derivation.ts`
- prepared import row modeling: `prepared-import-model.ts`

Guideline:

- use `preparedBook.*` when component already has `book.id`
- use `prepared.*` for active-book/global flows

---

# 7. Manual Validation Snapshot

Implementation docs record manual checks covering:

- prepared JSON export/import replacement behavior
- schema mismatch fail-fast behavior
- invalid/missing-entry counting and reporting
- copy workflows for spreadsheet paste
- prepared-entry edit/state/override/metamagic/level behaviors
- refactored prepared-book operations and bulk paste flow
- ZH i18n screen-level coverage in prepared workflow
- `npm run typecheck` passing in `web/`

Automated test expansion remains deferred post-MVP.

---

# 8. Deferred / Known Follow-ups

## Deferred to v3.2+

- same-name spell references in spell detail

## Post-Freeze Technical Follow-ups

- tests for JSON schema-validation/summary branches
- tests for normalization parity (storage load vs JSON import)
- tests for effective-level derivation and summary helpers
- JSON IO for non-prepared book kinds (or hide controls per kind)

---

# 9. v3.1 Exit Criteria Checklist

- [x] Prepared JSON export/import round-trip behavior implemented with deterministic normalization
- [x] Schema mismatch import fails clearly and avoids partial apply
- [x] Spreadsheet copy flows implemented via TSV (simple + advanced)
- [x] ZH i18n covers prepared workflow UI surfaces
- [x] Prepared-entry expressiveness implemented (state/override/metamagic/level control)
- [x] Collection/prepared refactor shipped without intended v3.0 workflow regressions
- [x] Local-first architecture preserved (no backend persistence dependency)

---

# 10. Conclusion

v3.1 is frozen as a prepared workflow enhancement release that improves portability, spreadsheet interoperability, bilingual usability, and per-entry modeling while consolidating collection/prepared architecture for subsequent iterations.
