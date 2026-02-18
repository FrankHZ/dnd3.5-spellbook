# v3.1 Plan — Prepared Workflow Enhancements

## Status

**v3.1 PLANNED**

v3.1 builds on the frozen v3.0 prepared workflow. The goal is to improve **portability**, **usability**, and **prepared-entry expressiveness** (metamagic / overrides), without introducing backend user persistence or multi-collection management UI.

---

## 1. v3.1 Goals (Frozen)

v3.1 delivers:

1. **JSON import/export (per collection)**
2. **Copy-friendly table view** (for manual spreadsheet workflows)
3. **ZH i18n for prepared workflow components**
4. **Prepared entry enhancements**: name override, metamagic modeling, level adjustment
5. **Refactor collection-related fields** as identified in v3.0 freeze doc (cleanup + consistency)

**Deferred to v3.2**

- Same-name spell references in spell detail

---

## 2. Scope Guardrails (Frozen)

### In scope

- Local-only data (no accounts, no backend persistence)
- One active collection at a time
- Prepared workflow UI + data model changes
- JSON I/O + copy export

### Out of scope

- CSV import/export workflow
- Slot legality enforcement / rules engine
- Multi-collection manager UI
- Sync / cloud storage
- Same-name references (explicitly deferred)

---

## 3. Deliverables

---

## 3.1 JSON Import/Export (Per Collection)

### Intent

Enable deterministic backup/restore and easy device transfer.

### Export

- Export **current active collection only**
- Format: JSON
- Must include:
  - `schemaVersion`
  - `exportedAt`
  - `collectionMeta` (optional display info)
  - `preparedEntries[]`
  - `resolutionPrefs` (priority tables used for level derivation)

### Import

- Import JSON **replaces current collection**
- Validate `schemaVersion`
- Show summary:
  - imported entries count
  - invalid entries count (skipped)
  - missing spellIds (if any)

### Definition of Done

- Export → clear local state → import → identical prepared list behavior
- Version mismatch produces clear error (no partial import)

---

## 3.2 Copy-Friendly Table View

### Intent

Allow users to manually copy the prepared list into their own sheet without maintaining CSV parsing.

### Behavior

- Provide a table view of the active collection
- Must support copying as **TSV** (tab-separated) cleanly:
  - either via a “Copy table” button, or
  - select-all + copy works correctly

### Recommended columns

- `SpellId`
- `Name (EN)`
- `Name (ZH)` (if present)
- `Level` (derived under current prefs)
- `PreparedCount`
- `UsedCount`
- `DisplayName` (effective display, if overridden)
- `Metamagic` (summary string)
- `LevelAdj`
- `Notes`

### Definition of Done

- Paste into Google Sheets / Excel produces properly separated columns
- Copy output is stable and deterministic

---

## 3.3 ZH i18n for Prepared Workflow Components

### Intent

Make prepared workflow fully usable in ZH UI mode.

### Coverage (minimum)

- Prepared table UI labels
- Bulk paste UI labels and messages
- Conflict resolution modal text
- Import/export dialogs text
- Error messages and statuses

### Definition of Done

- Switching EN/ZH toggles all prepared-workflow UI strings
- No missing translation keys in prepared workflow screens

---

## 3.4 Prepared Entry Enhancements

### 3.4.1 State Model Upgrade

Replace boolean `used` with:

```ts
state: "ok" | "used" | "reserved";
```

Definitions:

- `ok`: prepared and available
- `used`: consumed during play
- `reserved`: allocated in advance (e.g., daily buff)

Behavior:

- Default state = `"ok"`
- UI must allow cycling or selecting state
- State affects display styling but not grouping

Backward compatibility:

- During JSON import:
  - `used: true` → `state = "used"`
  - `used: false` → `state = "ok"`

### 3.4.2 Name Override

Allow per-entry display override.

- Add `displayNameOverride?: string`
- Effective display name:
  - override if present, else base spell name

### 3.4.3 Metamagic Modeling

Lightweight structure, not rules enforcement.

- Add `metamagic?: { key: string; name?: string; levelAdj?: number }[]`
- Provide minimal UI to:
  - add/remove common metamagic tags
  - show a compact summary in the row

### 3.4.4 Level Adjustment

Support explicit adjustments independent of metamagic list (for flexibility).

- Add `levelAdjustment?: number` (can be 0 / positive; allow negative only if you already support it)
- Used for display grouping:
  - effectiveLevel = derivedLevel + levelAdjustment
  - clamp to 0–9 for grouping (frozen rule)

### Definition of Done

- Users can create “Fireball — Empowered” without duplicating spells
- Level grouping responds deterministically to adjustments
- No legality enforcement (no “you can’t do that” logic)

---

## 3.5 Refactoring Collection-Related Fields (from v3.0 freeze)

### Intent

Clean up any v3.0 technical debt around collection/prepared state so v3.1 features don’t stack on messy structures.

### Tasks (examples—use what your freeze doc called out)

- Normalize naming and ownership of:
  - `PreparedEntry` vs derived grouped rows
  - resolved/ambiguous/not_found import models
  - preference objects for class/domain selection and priority ordering

- Ensure “single source of truth” per concern:
  - prepared entries are authoritative
  - level grouping is derived
  - preferences drive derivation

### Definition of Done

- State structures are simpler and more stable than v3.0
- No behavior regression in v3.0 features

---

## 4. Acceptance Criteria (Release Gate)

v3.1 is complete when:

- JSON export/import round-trip works and is deterministic
- Copy table pastes correctly into spreadsheets (TSV columns)
- ZH UI mode covers prepared workflow screens fully
- Name override + metamagic + level adjustment works end-to-end:
  - stored, rendered, exported, imported

- Refactors do not break v3.0 workflow (bulk paste + conflict resolution + add selected)

---

## 5. Deferred

### v3.2 Candidates

- Same-name spell references on spell detail

---

## Final Declaration

**v3.1 is a prepared workflow enhancement release** focused on portability (JSON), manual spreadsheet friendliness (copy table), bilingual UI completeness, and per-entry expressiveness (override/metamagic/level adj), plus structural cleanup.
