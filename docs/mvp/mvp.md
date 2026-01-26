# MVP – D&D 3.5 Spellbook SPA

## 1. Goal

Build a modern, fast D&D 3.5 spellbook SPA for querying spells and managing simple personal spell collections (favorites, spellbook, prepared spells).

This MVP focuses on **spell discovery and reference**, not rules automation.

---

## 2. Data Sources

### Rules Data (Read-only)

- Source: `dnd.sqlite` (legacy dndtool database)
- Treated as **authoritative and immutable**
- Contains:
  - spells
  - classes
  - domains
  - descriptors
  - schools / subschools
  - rulebooks
  - editions

No canonical spell data is modified or duplicated.

### App Data (Out of scope for backend MVP)

- Separate app database (SQLite or MongoDB)
- Stores **user-owned data only**:
  - favorites
  - spell notes
  - spellbook entries
  - prepared spells

All spell references use `dnd_spell.id`.

---

## 3. Edition Scope (MVP)

- MVP targets **D&D 3.5 only**
- Edition is identified by `Edition.slug`
- Default edition slug: **`core-35`**

Unless explicitly overridden, backend queries default to all rulebooks
belonging to edition `core-35`.

---

## 4. Canonical Spell Model (MVP)

A spell is represented conceptually as:

### Identity & Source

- `id`, `slug`, `name`
- `rulebook` (id, abbr, name, slug)
- `page`

### Classification

- `school`
- `subschool` (optional)
- `descriptors[]`

### Levels

- `levels.byClass[]` → class + level (+ optional extra text)
- `levels.byDomain[]` → domain + level (+ optional extra text)

### Components

- Boolean flags:
  - V, S, M, AF, DF, XP
  - metabreath, truename, corrupt
- `extraComponentsText`
- `corruptLevel` (if applicable)

### Mechanics (string-based in MVP)

- casting time
- range
- target / effect / area
- duration
- saving throw
- spell resistance

### Text

- `descriptionHtml`
- `descriptionText`

**Guarantee:**  
All text fields are returned as UTF-8 strings.  
Legacy BLOBs are decoded at read time.

---

## 5. Search Model (Core MVP Decision)

The MVP intentionally supports **two separate search modes**.
They are implemented as **distinct endpoints** with different semantics.

This avoids ambiguous combinations and keeps behavior predictable.

---

### A. Global Name Search (MVP)

**Purpose:** quick spell lookup by name (search bar UX).

#### Endpoint

```

GET /api/spells/search

```

#### Required

- **Name (`q`)**
  - Case-insensitive substring match
  - Minimum length enforced (≥ 2 characters)

#### Optional

- **Rulebooks**
  - `rulebookIds` (CSV)
  - Default: all rulebooks in edition `core-35`
- Pagination (`page`, `pageSize`)

> Class, level, and advanced filters are **not applicable** in name search for MVP.

#### Eligibility Rules

A spell is included if:

- it belongs to one of the selected rulebooks
- AND its name contains the query string (case-insensitive)

#### Result Semantics

- One row per spell
- No class-level data included
- Sorting:

```

spell.name ASC, spell.id ASC

```

---

### SQLite Case-Insensitive Note (MVP)

SQLite + Prisma does not reliably support
`mode: 'insensitive'` without schema collation changes.

For MVP, name search is implemented using **raw SQL**:

```

LOWER(spell.name) LIKE '%<lower(q)>%'

```

Implementation pattern:

1. Raw SQL `COUNT(*)`
2. Raw SQL query for ordered spell IDs
3. Prisma `findMany` by IDs (relations included)
4. Reordering to preserve SQL order

This avoids schema migrations during MVP.

---

### B. Class + Level Spell Browsing (MVP)

**Purpose:** structured browsing such as

> “Show me all Wizard level 3 spells”.

#### Endpoint

```

GET /api/spells/by-class-level

```

#### Required

1. **Classes**
   - `classIds` (CSV)
   - Non-empty
2. **Spell Level**
   - Integer `0–9`

#### Optional

- **Rulebooks**
  - `rulebookIds` (CSV)
  - Default: all rulebooks in edition `core-35`
- Pagination (`page`, `pageSize`)

> In MVP, class-level browsing **always requires a fixed level**.
> Cross-level grouping is explicitly deferred.

#### Eligibility Rules

A spell is included if:

- it belongs to one of the selected rulebooks
- AND it has **at least one** class-level entry where:
  - `class ∈ selected classes`
  - `level = selected level`

(OR semantics across classes.)

#### Deduplication

- One row per spell
- If multiple classes match:
  - the spell appears once
  - with multiple entries in `matchedClassLevels`

#### Sorting

```

spell.name ASC, spell.id ASC

```

Pagination operates on **spells**, not class-level rows.

---

## 6. Spell Detail (MVP)

### Purpose

Fetch all information required to render a spell page.

### Endpoint

```

GET /api/spells/:id

```

### Behavior

Returns:

- core spell info
- rulebook + edition
- school / subschool
- descriptors
- all components
- mechanics fields
- description (text + HTML)
- all class levels
- all domain levels
- verification metadata

Errors:

- invalid id → **400**
- not found → **404**

---

## 7. Bootstrapping Endpoints (MVP)

These endpoints support initial UI rendering.

### Rulebooks

```

GET /api/rulebooks

```

- Returns all rulebooks (optionally filtered to those containing spells)

```

GET /api/rulebooks/editions

```

- Returns all editions

### Classes

```

GET /api/classes?includePrestige=false

```

- Default: exclude prestige classes

---

## 8. Spellbook Features (Frontend MVP)

- Favorite spells
- Personal notes per spell
- Simple spellbook list
- Prepared spell sets (spell + level + notes)

Backend storage is **out of scope** for search MVP.

---

## 9. Explicit Non-Goals (MVP)

- No rules engine
- No metamagic automation
- No material / XP cost parsing
- No errata or version tracking
- No homebrew editing
- No character sheet integration
- No advanced combined filters

---

## 10. Post-MVP (Future)

- Advanced filters (school, descriptors, components)
- Full-text search (SQLite FTS or migration)
- Rulebook categorization (core / setting / magazine)
- Payload slimming via lookup tables
- Multi-edition support
- Chinese spell text import

```

```
