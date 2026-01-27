# Backend v1.1 – API Reference (for Frontend)

This document freezes the backend behavior for v1.1 so frontend can integrate against stable semantics.

Backend stack:

- Express + TypeScript
- Prisma + SQLite
- Legacy rules DB is read-only
- Derived index tables are used for scope-based endpoints

Timezone: America/New_York

---

## 0. Global Conventions

### Response envelope

- Most list/search endpoints return an object with:
  - effective scope inputs (e.g. `rulebookIds`, `includePrestige`, `level`, etc.)
  - pagination (`page`, `pageSize`, `total`) where applicable
  - `items: [...]`

### Error format (MVP rule)

All errors use:

```json
{ "message": "Invalid request", "error": "..." }
```

### Default rulebook scope

Most endpoints accept optional `rulebookIds` (CSV). If missing or empty:

- controller resolves default via:
  - `getDefaultRulebookIds()` (edition slug `core-35`)

Controllers implement this pattern:

```ts
let rulebookIds = parseCsvNumberList(req.query.rulebookIds);
if (rulebookIds.length === 0) rulebookIds = await getDefaultRulebookIds();
```

### Sorting

Stable sort where applicable:

- `spell.name ASC, spell.id ASC`
- Classes/domains: `prestige ASC, name ASC, id ASC` (classes), `name ASC, id ASC` (domains)

### Spell list vs spell detail

- **List items** include everything needed for list/card rendering
- **Descriptions are excluded from list/batch/search items**
- **Descriptions are only returned by detail endpoint**

---

## 1. Rulebooks & Editions

### GET `/api/rulebooks`

Returns list of rulebooks (frontend uses for book filtering / defaults).

Query:

- (optional) `edition` may exist, but frontend can treat this endpoint as “all rulebooks” unless specified otherwise.

Response:

```ts
{ items: Rulebook[] }
```

### GET `/api/rulebooks/editions`

Returns supported editions.

Response:

```ts
{ items: Edition[] }
```

---

## 2. Classes (Scoped by spells via index table)

Uses derived index table `idx_spell_class_level` to return only classes that have spells in scope.

### GET `/api/classes`

Query:

- `includePrestige` (boolean, default false)
- `rulebookIds` (CSV, optional; defaults to core-35 rulebooks)

Response:

```ts
ClassListResponse {
  includePrestige: boolean;
  rulebookIds: number[];
  items: Class[];
}
```

Semantics:

- If `includePrestige=false`, only base classes are returned.
- Only classes with at least one spell in the given rulebook scope are returned.

---

## 3. Domains (Scoped by spells via index table)

Uses derived index table `idx_spell_domain_level`.

### GET `/api/domains`

Query:

- `rulebookIds` (CSV, optional; defaults to core-35 rulebooks)

Response:

```ts
DomainListResponse {
  rulebookIds: number[];
  items: Domain[];
}
```

Semantics:

- Only domains with at least one spell in the given scope are returned.

---

## 4. Spells – Name Search (global, no class/domain constraints)

### GET `/api/spells/search`

Purpose: quick name lookup (search bar).

Query:

- `q` (string, required, min length >= 2)
- `rulebookIds` (CSV, optional; defaults to core-35 rulebooks)
- `page` (default 1)
- `pageSize` (default 20)

Response:

```ts
SpellNameSearchResponse {
  q: string;
  rulebookIds: number[];
  page: number;
  pageSize: number;
  total: number;
  items: SpellItem[];
}
```

Implementation notes:

- SQLite case-insensitive behavior uses raw SQL with `LOWER(name) LIKE ...`
- Pagination and sorting are stable.

---

## 5. Spells – Browse by Level (Class and/or Domain)

This is the v1.1 browse endpoint (replacing/expanding the MVP “by-class-level” behavior).

### GET `/api/spells/by-level`

Purpose:

- “Wizard level 3 spells”
- “Fire domain level 3 spells”
- (OR semantics) “Wizard level 3 OR Fire domain level 3”

Query (required):

- `level` (0–9, required)
- At least one of:
  - `classIds` (CSV)
  - `domainIds` (CSV)

Query (optional):

- `rulebookIds` (CSV, optional; defaults to core-35 rulebooks)
- `page` (default 1)
- `pageSize` (default 20)

Response:

```ts
SpellByLevelResponse {
  rulebookIds: number[];
  level: number;
  classIds: number[];
  domainIds: number[];
  page: number;
  pageSize: number;
  total: number;
  items: SpellItemByLevel[];
}
```

Semantics:

- Eligible spells are those that match:
  - (classIds + level) within scope
  - OR (domainIds + level) within scope

- Result list is deduped by spell (one row per spell).
- Sorting:

  ```
  spell.name ASC, spell.id ASC
  ```

- Each returned spell includes:
  - `matchedClassLevels[]` filtered to selected classes + level
  - `matchedDomainLevels[]` filtered to selected domains + level

Implementation notes:

- Uses raw SQL `UNION` over `idx_spell_class_level` and `idx_spell_domain_level` for IDs-first paging.

---

## 6. Spells – Batch lookup (collections)

### POST `/api/spells/batch`

Purpose:

- Fetch list items by IDs (favorites/spellbook/prepared pages)
- Avoid N+1 calls

Body:

```json
{ "ids": [1, 2, 3] }
```

Response:

```ts
SpellBatchResponse {
  ids: number[];
  items: SpellItem[];
  missingIds: number[];
}
```

Semantics:

- Output order follows input `ids`
- `missingIds` contains IDs not found
- No rulebook scoping is applied (collections can reference any spell)

---

## 7. Spells – Detail (includes descriptions)

### GET `/api/spells/:id`

Purpose:

- Spell page rendering.

Params:

- `id` (number)

Response:

```ts
SpellDetail;
```

Semantics:

- Returns full spell detail including:
  - `descriptionText` and/or `descriptionHtml`
  - mechanics fields
  - full class levels and domain levels (may be filtered in mapper depending on contract)

- 404 if not found.

---

## 8. Freeze Rules (v1.1)

We treat this backend as **frozen** until frontend MVP integration finishes.

Allowed changes before freeze is lifted:

- Bug fixes (no contract break)
- Missing field fixes if frontend cannot render without them
- Performance tweaks (no semantic changes)

Not allowed during freeze:

- Renaming routes
- Renaming response fields
- Changing search/browse semantics
- Removing fields from responses

When frontend is done, tag a release (e.g. `v1.1-backend-freeze`) and only patch via `v1.1.1` if needed.

---
