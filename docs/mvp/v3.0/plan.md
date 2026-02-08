# v3.0 Plan — Local Prepared Workflow (CSV + Bulk Paste)

## Status

**v3.0 PLANNED**

v3.0 introduces a **local-first prepared spell workflow** focused on real table usage.
There are **no backend user features**, **no accounts**, and **no cloud sync**.

All data is managed locally by the user via **files and bulk paste**.

---

## 1. v3.0 Goals (Frozen)

v3.0 aims to:

- Let users manage prepared spells for a play session/day
- Support fast migration from existing spreadsheets or text lists
- Enable easy external editing (Excel / Sheets / text editor)
- Remain simple, deterministic, and local-only

v3.0 is an MVP for **playability**, not completeness.

---

## 2. Core Design Principles (Frozen)

### 2.1 File-centric, not app-centric

- One file = one collection
- The app edits **one active collection at a time**
- Managing multiple collections happens **outside the app** (filesystem)

### 2.2 Two distinct import workflows

Import methods have **different intent and behavior**:

| Method          | Purpose                      | Effect                                |
| --------------- | ---------------------------- | ------------------------------------- |
| CSV file import | Load a full collection       | **Replaces** current collection       |
| Bulk paste      | Quick migration / add spells | **Adds** spells to current collection |

These two workflows are intentionally separate.

### 2.3 Precision over cleverness

- Never silently guess spell identity
- Ambiguity must be resolved by **explicit priority rules**
- Unresolved rows are preferable to wrong imports

---

## 3. Scope Definition

---

## 3.1 Prepared Spell Workflow (Core Feature)

### Features

- Prepared table grouped by spell level (0–9)
- Each row tracks:
  - spell
  - prepared count
  - used count
  - optional notes

- Actions:
  - add spell
  - remove spell
  - increment / decrement prepared
  - mark used
  - reset used counts

### Explicit non-goals

- Slot legality enforcement
- Class-specific rules (domains, specialists, etc.)
- Automatic spell-known validation

The prepared table is a **tracking tool**, not a rules engine.

---

## 3.2 Import / Export

---

### A) CSV File Import (Set Import)

**Purpose:** Load a full prepared collection

**Behavior**

- User selects a `.csv` file
- Import **replaces the entire active collection**
- Deterministic and repeatable

**CSV Schema**

Required:

- `name` — spell name (English or Chinese)

Optional:

- `spellId` — authoritative if present
- `level` — 0–9
- `prepared` — integer (default = 1)
- `used` — integer (default = 0)
- `notes` — free text

Rules:

- Column order does not matter
- Unknown columns are ignored
- Missing optional fields get defaults

---

### B) Bulk Paste (Incremental Add)

**Purpose:** Fast migration from existing spreadsheets or text lists

**Behavior**

- User pastes text into a textarea
- Parsed input **adds spells to the current active collection**
- Existing spells are incremented (not duplicated)

---

#### Bulk Paste Format (Frozen)

**Only supported format:**
**Tab-separated spell names (TSV)**

Example:

```
Magic Missile	Shield	Fireball
Bless	Cure Light Wounds
```

Rules:

- Tabs (`\t`) are the **only delimiter**
- Spaces and commas are treated as part of the spell name
- Line breaks separate rows
- Each cell is treated as **one spell name**
- No counts, levels, or metadata in bulk paste

Rationale:

- English spell names contain spaces
- English and Chinese spell names may contain commas
- TSV is the only safe clipboard format

---

#### Bulk Paste Spell Resolution

For each pasted spell name:

1. Find exact English name match
2. Else find exact Chinese name match
3. If multiple matches exist:
   - Apply **rulebook priority**
   - Then apply **class priority**

4. If ambiguity remains → mark unresolved

Unresolved entries:

- Do not block the import
- Are shown to the user for manual resolution

---

### Resolution Priorities (v3.0)

Users configure:

- **Rulebook priority**: ordered list (highest → lowest)
- **Class priority**: ordered list (highest → lowest)

Resolution algorithm:

1. Filter by exact name
2. Prefer higher-priority rulebooks
3. Prefer higher-priority classes (lowest level match if needed)
4. If still ambiguous → unresolved

This is deterministic and user-controlled.

---

## 4. Export

- Export **current active collection only**
- Output format: CSV
- One export = one file

Exported CSV:

- Always includes header row
- Includes all prepared table rows
- Uses stable column names

Users manage versions by renaming files externally.

---

## 5. Metamagic (v3.0 Handling)

### Status

Not a primary v3.0 feature.

### v3.0 approach

- Metamagic recorded as **free-text notes**
- No structured modeling
- No slot adjustment or legality enforcement

This keeps metamagic usable without complexity.

---

## 6. UX Constraints (Frozen)

- No collection manager UI
- No add/rename/delete sets
- No backend persistence
- No accounts or sync
- Import/export is explicit and user-driven

---

## 7. Acceptance Criteria (Release Gate)

v3.0 is complete when:

- A user can:
  - import a CSV to load a full prepared set
  - bulk paste spell names to add spells quickly
  - track prepared and used spells during play
  - export the updated collection to CSV

- Bulk paste from Excel/Sheets works via tab-separated copy
- Ambiguous spell names are never silently mis-mapped
- No backend user data is required

---

## 8. Explicitly Out of Scope (v3.0)

- Multi-collection management in-app
- Merge strategies
- JSON-based collection workflows
- Cloud sync or accounts
- Full metamagic rule enforcement
- Slot legality validation

---

## Final Declaration

**v3.0 is a local, CSV-driven prepared workflow MVP.**

It prioritizes:

- speed
- correctness
- editability
- low operational complexity

Anything beyond this scope must be versioned after v3.0.
