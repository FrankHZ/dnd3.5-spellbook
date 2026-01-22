# MVP Spell Search – Backend Semantics

This document defines the **MVP backend search APIs** for the D&D 3.5 spellbook SPA.

The MVP intentionally supports **two separate search modes**:

1. **Global name search** (no class / level constraints)
2. **Class + level spell browsing** (structured spell lists)

These are modeled as **two endpoints with different contracts**, to avoid ambiguous behavior.

---

## 1. Global Name Search (MVP)

### Purpose
Quick lookup by spell name (e.g. user types “fireball”).
This search is **not constrained by class or level**.

### Endpoint
```

GET /api/spells/search

```

### Inputs

**Required**
- `q: string`
  - trimmed
  - minimum length: **2**

**Optional**
- `rulebookIds: number[]`
  - default: **all rulebooks in edition “3.5”**
- Pagination:
  - `page` (default `1`)
  - `pageSize` (default `20`, server may clamp)

---

### Eligibility Rules

A spell is eligible if:

1. `spell.rulebook_id ∈ rulebookIds`
2. `spell.name` contains `q` (case-insensitive substring match)

No class, level, or domain constraints apply.

---

### Sorting & Pagination

- Sort order:
```

spell.name ASC,
spell.id ASC

```
- Pagination:
```

skip = (page - 1) * pageSize
take = pageSize

````
- `total` counts **spells**, not related rows

---

### Output Shape (List View DTO)

```ts
SpellNameSearchResponse {
page: number;
pageSize: number;
total: number;
q: string;
rulebookIds?: number[];
items: SpellNameSearchItem[];
}

SpellNameSearchItem {
id: number;
slug: string;
name: string;

rulebook: {
  id: number;
  abbr: string;
};

page: number | null;

school: {
  id: number;
  name: string;
  slug: string;
} | null;

subSchool: {
  id: number;
  name: string;
  slug: string;
} | null;

descriptors: {
  id: number;
  name: string;
  slug: string;
}[];
}
````

> MVP note: class levels are **not returned** in name search results to keep payload size small.

---

### Validation Errors

* Missing or invalid `q` → **400**

```json
{ "message": "Invalid request", "error": "q must be at least 2 characters" }
```

---

## 2. Class + Level Spell List (MVP)

### Purpose

Structured browsing such as:

> “Show me all Wizard level 3 spells.”

This is the **primary spell list view** for preparation, spellbooks, etc.

---

### Endpoint

```
GET /api/spells/by-class-level
```

### Inputs

**Required**

* `classIds: number[]`

  * non-empty
* `level: number`

  * integer `0–9`

**Optional**

* `rulebookIds: number[]`

  * default: **all rulebooks in edition “3.5”**
* Pagination:

  * `page` (default `1`)
  * `pageSize` (default `20`)

---

### Eligibility Rules (Mandatory)

A spell is eligible only if **all** are true:

1. `spell.rulebook_id ∈ rulebookIds`
2. The spell has **at least one** row in `dnd_spellclasslevel` where:

   * `character_class_id ∈ classIds`
   * `level = level`

(OR semantics across classes: matching any selected class at the given level qualifies.)

---

### Deduplication Rule

* The result list contains **one row per spell**
* If a spell matches multiple selected classes at the same level:

  * it appears **once**
  * `matchedClassLevels[]` contains multiple entries

---

### Sorting & Pagination

Because `level` is fixed:

* Sort order:

  ```
  spell.name ASC,
  spell.id ASC
  ```
* Pagination:

  ```
  skip = (page - 1) * pageSize
  take = pageSize
  ```
* `total` counts **spells**, not class-level mappings

---

### Output Shape (List View DTO)

```ts
SpellByClassLevelResponse {
  page: number;
  pageSize: number;
  total: number;
  level: number;
  classIds: number[];
  rulebookIds?: number[];
  items: SpellByClassLevelItem[];
}

SpellByClassLevelItem {
  id: number;
  slug: string;
  name: string;

  rulebook: {
    id: number;
    abbr: string;
  };

  page: number | null;

  school: {
    id: number;
    name: string;
    slug: string;
  } | null;

  subSchool: {
    id: number;
    name: string;
    slug: string;
  } | null;

  descriptors: {
    id: number;
    name: string;
    slug: string;
  }[];

  matchedClassLevels: {
    classId: number;
    classSlug: string;
    className: string;
    prestige: boolean;
    level: number;   // always equals request.level in MVP
    extra: string | null;
  }[];
}
```

---

### Validation Errors

* Missing / empty `classIds` → **400**
* Missing / invalid `level` → **400**

```json
{ "message": "Invalid request", "error": "classIds and level are required" }
```

---

## Explicitly Out of Scope for MVP

These features are intentionally deferred:

* School / subschool filtering
* Descriptor filtering
* Components filtering
* Saving throw / spell resistance text search
* Cross-level grouping or sorting
* Domain spell levels
* Full-text description search

---

## MVP Design Rationale

* Separate endpoints avoid ambiguous semantics
* Name search stays fast and lightweight
* Class+level list mirrors real D&D spell list usage
* DTOs are stable and frontend-friendly
* No extra DB calls required for list rendering

---

## Next Steps (Post-MVP)

* Unified advanced filter search
* `/api/spells/:id` detail endpoint
* Cursor-based pagination
* Full-text indexing

