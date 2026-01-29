# MVP Spell Search – Backend Semantics (Updated)

This document defines the **MVP backend search APIs** for the D&D 3.5 spellbook SPA.

The MVP supports **two separate search modes**:

1. **Global name search** (no class / level constraints)
2. **Class + level spell browsing** (structured spell lists)

A spell **detail** endpoint is also included for the SPA to render a spell page.

---

## Shared Concepts

### Default rulebook scope

If `rulebookIds` is not provided, the backend uses a default edition scope:

- Default edition slug: `core-35`
- Default rulebooks: all rulebooks in edition `core-35` (implementation may optionally exclude books with zero spells)

### Pagination

- `page` default `1`, must be >= 1
- `pageSize` default `20`, clamped to a safe max (e.g. 100)

Pagination operates on **spells**, not mapping rows.

### Sorting (stable)

To ensure stable pagination:

- Primary sort: `spell.name ASC`
- Tie-breaker: `spell.id ASC`

---

## 1) Global Name Search (MVP)

### Purpose

Quick lookup by spell name (search bar UX).
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
  - case-insensitive substring match

**Optional**

- `rulebookIds: number[]` (CSV)
  - default: rulebooks in edition `core-35`
- `page`, `pageSize`

---

### Eligibility Rules

A spell is eligible if:

1. `spell.rulebook_id ∈ rulebookIds`
2. AND `spell.name` contains `q` (case-insensitive substring match)

---

### SQLite Case-Insensitive Implementation Note (MVP)

SQLite + Prisma does not reliably support Prisma’s `mode: 'insensitive'` without schema collation changes (e.g. `COLLATE NOCASE`).
For MVP, name search uses **raw SQL** with:

- `LOWER(spell.name) LIKE '%<lower(q)>%'`

Implementation pattern:

1. Raw SQL COUNT for total
2. Raw SQL query for ordered page of spell IDs
3. Prisma `findMany` by IDs to fetch relations
4. Reorder results to match the ordered ID list

This avoids requiring DB migrations during MVP.

---

### Output Shape (List View DTO)

```ts
SpellNameSearchResponse {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  rulebookIds: number[];
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
```

> MVP note: class levels are **not returned** in name search results to keep payload size small.

---

### Validation Errors

- Missing/invalid `q` (or `q.length < 2`) → **400**

```json
{ "message": "Invalid request", "error": "q must be at least 2 characters" }
```

---

## 2) Class + Level Spell List (MVP)

### Purpose

Structured browsing such as:

> “Show me all Wizard level 3 spells.”

This supports the main spell list experience used for preparation/spellbooks.

### Endpoint

```
GET /api/spells/by-class-level
```

### Inputs

**Required**

- `classIds: number[]` (CSV)
  - non-empty

- `level: number`
  - integer `0–9`

**Optional**

- `rulebookIds: number[]` (CSV)
  - default: rulebooks in edition `core-35`

- `page`, `pageSize`

---

### Eligibility Rules (Mandatory)

A spell is eligible only if **all** are true:

1. `spell.rulebook_id ∈ rulebookIds`
2. The spell has **at least one** row in `dnd_spellclasslevel` where:
   - `character_class_id ∈ classIds`
   - `level = level`

(OR semantics across classes: matching any selected class at the given level qualifies.)

---

### Deduplication Rule

- Result list contains **one row per spell**
- If a spell matches multiple selected classes at the same level:
  - it appears once
  - `matchedClassLevels[]` contains multiple entries

---

### Output Shape (List View DTO)

```ts
SpellByClassLevelResponse {
  page: number;
  pageSize: number;
  total: number;
  level: number;
  classIds: number[];
  rulebookIds: number[];
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
    level: number;   // equals request.level in MVP
    extra: string;
  }[];
}
```

---

### Validation Errors

- Missing / empty `classIds` → **400**
- Missing / invalid `level` → **400**

```json
{ "message": "Invalid request", "error": "classIds and level are required" }
```

---

## 3) Spell Detail (MVP)

### Purpose

Fetch everything needed to render a spell page.

### Endpoint

```
GET /api/spells/:id
```

### Inputs

- `id: number` (path param, positive integer)

### Output Shape (Detail DTO)

The detail payload includes:

- core spell info (rulebook/school/subschool)
- descriptors
- components flags + extra component text
- casting stats (casting time, range, target/effect/area, duration, saving throw, SR)
- text + html descriptions
- all class levels (with class info)
- all domain levels (with domain info)
- verification fields

(Exact DTO fields should match implementation; MVP assumes a single detail call is sufficient to render the spell view.)

### Errors

- invalid `id` → **400**
- not found → **404**

```json
{ "message": "Not found", "error": "Spell <id> not found" }
```

---

## Related Bootstrapping Endpoints (MVP)

These are required by the SPA to populate selectors.

### Rulebooks

- `GET /api/rulebooks`
  - returns all rulebooks (implementation may filter to only those with spells)

- `GET /api/rulebooks/editions`
  - returns all editions

### Classes

- `GET /api/classes?includePrestige=false`
  - default: exclude prestige classes unless `includePrestige=true`

---

## Explicitly Out of Scope for MVP

These features are intentionally deferred:

- School/subschool filtering in search
- Descriptor filtering (AND semantics)
- Components filtering
- Saving throw / spell resistance text search
- Combined multi-field advanced search endpoint
- Full-text search over descriptions (SQLite FTS)
- Cursor-based pagination

---

## Post-MVP Notes

Planned improvements:

- Add optional DB migration for `COLLATE NOCASE` or implement FTS for performant search
- Add advanced filters incrementally
- Consider shrinking list payloads by returning IDs + lookup tables
