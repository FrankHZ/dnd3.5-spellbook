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

### Top-level scope (required)

1. **Rulebooks**

   * Multi-select
   * Default: **all 3.5 rulebooks**
   * Some books (e.g. setting-specific) may be excluded later

2. **Classes**

   * Multi-select
   * Default: none
   * Optional toggle: exclude prestige classes (default ON)

> Advanced filters are disabled until **at least one rulebook and one class** are selected.

### Optional but recommended

* Spell level (0–9), enabled once class is selected

### Advanced filters (enabled after scope)

* School / Subschool
* Descriptors
* Components
* Saving throw
* Spell resistance
* Name search

---

## 6. Result Semantics

A spell is included if:

* it belongs to one of the selected rulebooks
* AND it has at least one class-level entry matching selected class(es)
* AND (if level is selected) the level matches

Descriptor and component filters use **AND semantics**.

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

