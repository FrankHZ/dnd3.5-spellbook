# MVP – D&D 3.5 Spellbook SPA

## 1. Goal

Build a modern, fast D&D 3.5 spellbook SPA for querying spells and managing simple personal spell collections (favorites, spellbook, prepared spells).

This MVP focuses on **spell discovery and reference**, not rules automation.

---

## 2. Data Sources

### Rules Data

* Source: `dnd.sqlite` (legacy dndtool database)
* Treated as **authoritative and read-only**
* Contains:

  * spells
  * classes
  * domains
  * descriptors
  * schools / subschools
  * rulebooks
  * editions

### App Data

* Separate app DB (SQLite or MongoDB)
* Stores **user-owned data only**:

  * favorites
  * spell notes
  * spellbook entries
  * prepared spells

No canonical spell data is duplicated into the app DB.

---

## 3. Edition Scope

* MVP targets **D&D 3.5 only**
* Edition is determined by `dnd_dndedition`
* Default filter: edition = 3.5

---

## 4. Canonical Spell Model (MVP)

A spell is represented conceptually as:

### Identity & Source

* `id`, `slug`, `name`
* `rulebook` (id, abbr, name)
* `page`

### Classification

* `school`
* `subschool` (optional)
* `descriptors[]`

### Levels

* `levels.byClass[]` → class + level (+ optional extra text)
* `levels.byDomain[]` → domain + level (+ optional extra text)

### Components

* Boolean flags:

  * V, S, M, AF, DF, XP
  * metabreath, truename, corrupt
* `extraComponentsText` (display only)
* `corruptLevel` (if applicable)

### Mechanics (string-based in MVP)

* casting time
* range
* target / effect / area
* duration
* saving throw
* spell resistance

### Text

* `descriptionHtml`
* `descriptionText`

**Guarantee:** text fields are always UTF-8 strings.
If legacy rows contain BLOBs, they are decoded at read time.

---

## 5. Filtering Model (Core MVP Decision)

The MVP supports **two distinct search modes**, each with its own filtering rules.
This separation is intentional and avoids ambiguous semantics.

---

### A. Global Name Search (MVP)

**Purpose:** quick spell lookup by name (e.g. search bar).

#### Required

* **Name (`q`)**

  * Case-insensitive substring match
  * Minimum length enforced (e.g. 2 characters)

#### Optional

* **Rulebooks**

  * Multi-select
  * Default: **all 3.5 rulebooks**

> Class, level, and advanced filters are **not applicable** in name search for MVP.

---

### B. Class + Level Spell Browsing (MVP)

**Purpose:** structured spell list browsing (e.g. “Wizard level 3 spells”).

#### Top-level scope (required)

1. **Rulebooks**

   * Multi-select
   * Default: **all 3.5 rulebooks**
   * Some books (e.g. setting-specific) may be excluded later

2. **Classes**

   * Multi-select
   * **Required**
   * Prestige classes included by default (toggle may be added later)

3. **Spell Level**

   * **Required**
   * Integer `0–9`

> In MVP, **class-level browsing always requires a fixed spell level**.
> Cross-level grouping is explicitly deferred.

---

### Advanced filters (post-MVP)

The following filters are **disabled in MVP** and will be enabled only after
the core search behavior is stable:

* School / Subschool
* Descriptors
* Components
* Saving throw
* Spell resistance
* Combined name + class filtering

---

## 6. Result Semantics

### A. Name Search Results

A spell is included if:

* it belongs to one of the selected rulebooks
* AND its name contains the query string (case-insensitive)

Result list characteristics:

* One row per spell
* No class-level data included
* Sorted by:

  ```
  spell.name ASC, spell.id ASC
  ```

---

### B. Class + Level List Results

A spell is included if:

* it belongs to one of the selected rulebooks
* AND it has **at least one** class-level entry where:

  * `class ∈ selected classes`
  * `level = selected level`

Result list characteristics:

* One row per spell (deduplicated)
* If a spell matches multiple selected classes at the same level:

  * it appears once
  * with multiple entries in `matchedClassLevels`
* Sorting:

  ```
  spell.name ASC, spell.id ASC
  ```
* Pagination operates on **spells**, not class-level rows

---

### Explicit MVP Constraints

* Descriptor and component filters are **not active** in MVP
* No cross-level grouping or minimum-level inference
* Domain spell levels are excluded from list results
* Full-text search over descriptions is out of scope

---

## 7. Spellbook Features (MVP)

* Favorite spells
* Personal notes per spell
* Simple spellbook list
* Prepared spell sets (spell + level + notes)

All spell references use `dnd_spell.id`.

---

## 8. Explicit Non-Goals (MVP)

* No rules engine
* No metamagic automation
* No material / XP cost parsing
* No errata or version tracking
* No homebrew editing
* No character sheet integration

---

## 9. Future (Out of MVP)

* Chinese spell text import
* Rulebook categorization (core / setting / magazine)
* Descriptor normalization
* Performance tuning (indexes, caching)
* Multi-edition support

