Perfect — v3.2 is your **pre-public stabilization release**, so the plan should be structured, bounded, and deliberately conservative.

Below is a **full v3.2 plan document** you can copy into:

```
docs/v3.2-plan.md
```

It includes:

- Same-name & pattern-based spell references
- Favorites JSON import/export
- UI stabilization + shadcn adoption
- Toast system
- Public-readiness guardrails

---

# v3.2 Plan — Public Release Stabilization

## Status

**v3.2 PLANNED**

v3.2 is the final feature + UI stabilization release before public availability.

It focuses on:

1. Spell reference completeness (same-name + pattern variants)
2. Favorites portability (JSON import/export)
3. UI consistency and polish (shadcn adoption + toast system)

No structural backend or data-model changes beyond what is necessary.

---

# 1. Goals (Frozen)

v3.2 aims to:

- Make spell detail pages reference-complete
- Make favorites portable and deterministic
- Standardize UI components and feedback patterns
- Eliminate unstable Tailwind-only fragments
- Prepare the application for public usability

---

# 2. Scope Guardrails

## In Scope

- Same-name and pattern-based spell references
- Favorites JSON import/export
- shadcn component adoption
- Toast-based notification system
- Minor UI polish (layout consistency, empty states)

## Explicitly Out of Scope

- Backend user accounts or persistence
- Rules engine / legality modeling
- Slot validation
- Multi-collection management redesign
- Large-scale search refactors
- Chinese parser changes

---

# 3. Deliverables

---

# 3.1 Same-Name & Pattern-Based Spell References

## 3.1.1 Objective

Enhance spell detail pages to display related spells that:

1. Have identical normalized names
2. Match structured naming patterns such as:
   - `X, Greater`
   - `Summon X I / II / III / IV ...`

This is a **reference feature only**, not a variant resolution engine.

---

## 3.1.2 Matching Strategy (Frozen)

### A) Exact Normalized Name Match

Normalize:

- Trim whitespace
- Case-insensitive
- Collapse repeated spaces

Match:

- All spells with identical normalized English names
- Exclude current spellId

Sort order:

1. Rulebook priority (same as v3.x deterministic ordering)
2. Page number (if available)
3. spellId

---

### B) Pattern-Based Variant Matching

Supported patterns (v3.2):

1. `Base, Greater / Lesser / Mass`
2. `Base I / II / III ...`

Implementation approach:

- Parse base token and modifier token
- Normalize Roman numerals
- Match only within supported pattern families
- Do not attempt fuzzy NLP matching

Example:

- “Summon Monster III”
  → Show all “Summon Monster I–IX”
- “Fireball”
  → Show “Fireball, Greater” if exists

---

## 3.1.3 UI Rules

- Display section: **Related Spells**
- Subsections:
  - Same Name
  - Variant Forms

- Deterministic ordering
- Compact list (no full descriptions)
- Click navigates to detail

---

# 3.2 Favorites JSON Import/Export

## 3.2.1 Objective

Allow favorites to be backed up and transferred deterministically.

---

## 3.2.2 Export Format

JSON only.

Example:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-xx-xxTxx:xx:xxZ",
  "favoriteSpellIds": [123, 456, 789]
}
```

No nested data.

---

## 3.2.3 Import Behavior

- Accept JSON only
- Validate `schemaVersion`
- Default behavior: **Merge**
  - Add new IDs
  - Ignore duplicates

- Optional toggle: Replace (if simple to implement)

Post-import summary:

- Added N
- Already existed M
- Missing K (invalid spellId)

No partial corruption.

---

# 3.3 UI Stabilization — shadcn Adoption

## 3.3.1 Objective

Standardize interactive components and eliminate inconsistent Tailwind-only fragments.

---

## 3.3.2 Adoption Scope (Frozen)

Must migrate:

- Button
- Input
- Select
- Dropdown
- Dialog
- Tabs
- Toast
- Card
- Table

Not required:

- Rewriting every layout `<div>`
- Rebuilding entire page structure

Layout Tailwind may remain, but spacing and typography should follow a consistent scale.

---

# 3.4 Toast Notification System

## 3.4.1 Objective

Replace inline notification banners with a consistent toast-based feedback system.

---

## 3.4.2 Behavior Rules

Use toast for:

- JSON export success
- JSON import success/failure
- Favorites import summary
- Major collection operations
- Error notifications

Do NOT use toast for:

- Minor inline validation
- Routine state toggles (e.g., marking spell used)

Toast characteristics:

- Top-right placement
- Auto-dismiss
- Error vs success visual distinction
- Accessible (aria-live region)

---

# 3.5 UI Polish & Public Readiness

## Required before public:

- Consistent empty states
- No raw `<button>` / `<input>` without shadcn wrapper
- No debug text visible
- No console errors
- Mobile sanity check:
  - Browse
  - Detail
  - Prepared
  - Favorites

---

# 4. Acceptance Criteria (Release Gate)

v3.2 is complete when:

- Spell detail page shows:
  - exact-name matches
  - supported pattern variants

- Favorites export/import round-trip works deterministically
- Toast system replaces previous banners
- All major interactive elements use shadcn components
- No regression in v3.0 or v3.1 functionality
- UI feels consistent and stable across main pages

---

# 5. Deferred Beyond v3.2

- Advanced spell graph relationships
- Cross-reference between domains and variant forms
- Full design system overhaul
- Multi-user support
- Rules legality modeling

---

# Final Declaration

**v3.2 is the final stabilization and reference-completeness release before public availability.**

It does not introduce structural complexity.
It focuses on completeness, portability, and UI stability.

---

If you want next, I can:

- Create a **v3.2 Codex starter prompt** like the previous ones
- Or design the **pattern matching algorithm spec** in more formal detail (especially for Roman numeral handling and base-token parsing)
