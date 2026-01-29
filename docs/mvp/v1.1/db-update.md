# v1.1 – Database Update (Derived Mapping Layer)

## Overview

v1.1 introduces a **derived index / mapping layer** to improve query performance and simplify backend logic for class- and domain-scoped spell queries.

These changes are applied to **`rules_clean.sqlite` only**.
The original legacy database (`dnd.sqlite`) remains **untouched** and authoritative.

---

## Goals

- Enable fast queries such as:
  - “Which classes have spells in selected rulebooks?”
  - “Which spells match classIds + level within a rulebook scope?”
  - “Which domains are available in selected rulebooks?”

- Avoid repeated joins across large legacy tables
- Keep derived data deterministic and rebuildable

---

## Design Principles

- Derived tables contain **no new information**
- All data is derived from existing legacy tables
- Tables can be **dropped and rebuilt at any time**
- No triggers or runtime mutation logic
- ORM (Prisma) is used for **read access only**

---

## New Derived Tables

### 1) `idx_spell_class_level`

Explicit mapping between spells and character classes, including level and scope.

**Columns**

- `spell_id`
- `class_id`
- `level`
- `rulebook_id`
- `edition_id`
- `extra` (annotation from legacy data)

**Purpose**

- Drive class-based scoping
- Enable “available classes” queries under rulebook/edition scope
- Speed up spell search by class + level

---

### 2) `idx_spell_domain_level`

Explicit mapping between spells and domains, including level and scope.

**Columns**

- `spell_id`
- `domain_id`
- `level`
- `rulebook_id`
- `edition_id`
- `extra` (annotation from legacy data)

**Purpose**

- Enable domain browsing/filtering
- Provide stable domain selectors for frontend
- Support future localization (e.g. Chinese mapping)

---

## Rebuild Strategy

Derived tables are rebuilt using batch SQL:

- `DELETE FROM idx_*`
- `INSERT INTO idx_* SELECT … FROM legacy tables`

Rebuild is:

- deterministic
- idempotent
- safe to run multiple times

Rebuild scripts are stored separately and are **not executed via Prisma migrations**.

---

## Prisma Usage

- Prisma schemas exist for both derived tables
- Prisma is used **only for querying**, not for rebuilding
- No writes are performed through Prisma Client

---

## What Did NOT Change

- No legacy tables were modified
- No columns were added to legacy tables
- No application data tables were affected

---

## Future Notes

- Additional derived mappings (e.g. spell–rulebook facets, domain summaries) can follow the same pattern
- If rules data is refreshed, derived tables should be rebuilt immediately after

---

**Status:** Implemented
**Applies to:** `rules_clean.sqlite` only
**Version:** v1.1
