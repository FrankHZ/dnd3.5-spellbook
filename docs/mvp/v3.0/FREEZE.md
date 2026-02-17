# D&D 3.5 Spellbook — v3.0 Freeze Document

## Version: 3.0

## Status: Feature Complete — Freeze Ready

---

# 1. Scope Summary

## Core Goal

Implement a **local-first prepared spell workflow** with deterministic name resolution and class/domain-based level grouping.

---

## In Scope (v3.0)

### Prepared Spell Workflow

- One active collection at a time
- Local-only state (no backend persistence)
- Prepared entries are per-instance objects (no count aggregation)
- Per-entry:
  - `spellId`
  - `used`
  - `notes`

### Bulk Paste (TSV Only)

- Input format: spell names only
- Delimiters: **Tab or newline only**
- Spaces and commas are NOT delimiters
- No CSV parsing
- No JSON workflows

### Deterministic Conflict Resolution

- Backend returns:
  - `resolved`
  - `ambiguous`
  - `not_found`

- No silent resolution
- Ambiguous entries:
  - Default pick determined by **rulebookId priority (higher id wins)**
  - User can override via Pick button

- User must confirm via **Add Selected**

### Class/Domain-Based Level Grouping

- Sidebar allows selecting class/domain ids
- Spell level determination:
  1. Lowest level among selected classes
  2. Else lowest among selected domains
  3. Else lowest available level

- Sidebar candidates sorted by occurrence count

---

## Explicitly Out of Scope (v3.0)

- Backend user accounts
- Sync/persistence
- Multi-collection management UI
- JSON-based collection workflows
- Slot legality enforcement
- Structured metamagic modeling
- Parser/localization expansion
- Import/export (temporarily suspended to v3.1)

---

# 2. Backend Changes

## New Endpoint

### `POST /api/spells/resolve`

### Request

```json
{
  "names": ["Magic Missile", "Shield"],
  "rulebookIds": [1,2,3],
  "lang": "en" | "zh"
}
```

### Behavior

- Exact match only
- zh matching only when `lang=zh`
- Scoped to rulebookIds (default rulebooks if omitted)
- Preserves input order

### Response

```ts
{
  results: Array<
    | { status: "resolved"; input: string; spellId: number }
    | { status: "not_found"; input: string }
    | {
        status: "ambiguous";
        input: string;
        candidates: SpellItemView[];
      }
  >;
  conflictRulebooks: number[];
}
```

---

# 3. Frontend Architecture

---

# 3.1 Collections State (v2 model)

Prepared entry:

```ts
type PreparedEntry = {
  entryId: string;
  spellId: number;
  used: boolean;
  notes?: string;
};
```

Prepared book:

```ts
type PreparedBook = {
  id: string;
  kind: "prepared";
  entries: PreparedEntry[];
  selectedClassIds: number[];
  selectedDomainIds: number[];
};
```

Local-first only.

---

# 3.2 Prepared Book Detail

## Layout

```
[ Sidebar ]  [ PreparedTable ]
```

### Sidebar

- Unified Selected (class/domain)
- Unified Candidates (class/domain)
- Candidates:
  - Only spells not matching selected ids
  - Sorted by occurrence count DESC

- Add/Remove unified handlers

---

# 3.3 Level Determination

```ts
getLowestLevel(spell, selectedClassIds, selectedDomainIds);
```

Priority:

1. Selected classes
2. Selected domains
3. Fallback to lowest available

Level clamped to 0–9.

---

# 3.4 Prepared Table

- 10 fixed columns (0–9)
- Column header shows:

  ```
  Level X - N slot(s)
  ```

- Each column grows vertically
- No SpellCard
- Custom `PreparedTableCell`

---

# 3.5 Prepared Table Cell

## Normal Mode

- Entire cell toggles `used`
- Hover-only ExternalLink icon
- Notes shown via HoverCard
- Used = red
- Unused = light green

## Edit Mode

- Remove button
- Hover-only Note dialog (shadcn Dialog)

---

# 4. Bulk Paste Dialog (Final Behavior)

## Flow

1. Paste TSV
2. Click Resolve
3. Review:
   - Summary:

     ```
     X resolved · Y conflicts · Z not found
     ```

4. Conflicts:
   - All candidates listed
   - Each shows:
     - Spell name
     - Rulebook name

   - Default pick:
     - Highest rulebookId

   - User can override

5. Click Add Selected
6. Entries added incrementally

No auto-add during resolve.

---

## TSV Parsing Rules

```ts
.split(/[\t\n]/g)
```

- No splitting on space
- No splitting on comma
- Empty cells filtered
- Duplicate spell names allowed

---

# 5. Deterministic Rulebook Priority

Ambiguous candidates sorted by:

```ts
b.rulebookId - a.rulebookId || b.id - a.id;
```

Default pick = first candidate after sort.

Conflict always shown to user.

---

# 6. UX Improvements Included

- Hover-only external link/note editing
- Conflict preview before commit
- Add Selected button separated from Resolve
- Summary counts block
- Clear Input / Clear Prepared actions
- Stable column borders and layout
- Sticky sidebar

---

# 7. Suspended Features (Moved to v3.1)

- CSV import/export
- JSON workflows
- Level header browse links
- Metamagic modeling
- Display name customization (Fireball - Empowered)
- Level modifiers (+/-)
- Daily buff highlighting
- Refactor collections-state complexity

---

# 8. Technical Debt Identified (Acceptable for v3.0)

- collections-state context is large
- resolve re-builds row state each time
- No persistence versioning
- Rulebook priority derived from id ordering assumption
- No drag-drop for sidebar ordering

All acceptable within v3.0 scope.

---

# 9. v3.0 Exit Criteria Checklist

- [x] Local-first prepared workflow works
- [x] TSV bulk paste only
- [x] No silent ambiguity resolution
- [x] Deterministic default rulebook selection
- [x] Class/domain grouping functional
- [x] One active collection
- [x] No JSON import/export
- [x] No slot legality logic
- [x] UI stable and consistent

---

# 10. Conclusion

v3.0 delivers:

- Deterministic spell resolution
- Structured prepared spell management
- Conflict-safe bulk import
- Class/domain-based organization
- Clean, spreadsheet-style prepared table

Import/export and advanced modeling deferred to v3.1.
