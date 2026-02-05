# Backend v2.0 Doc — D&D 3.5 Spellbook API (Express + Prisma + SQLite)

This document describes the **backend v2.0** implementation status and conventions for the frontend to integrate against.

---

## 1. Scope

v2.0 focuses on:

- Serving **D&D 3.5 rules data** (read-only) from the rules SQLite DB (via Prisma)
- Serving **ZH i18n overlays** from a separate app DB
- Keeping endpoints **backward-compatible** (no breaking changes to existing spell/class responses)
- Adding a **meta i18n map endpoint** to help frontend translate “lookup entities”

Out of scope for v2.0 (deferred):

- Pagination DTO refactors / generic paged types (target v2.1+)
- Per-endpoint overlays for every nested lookup object (instead handled via meta i18n maps)
- ZH collation-aware sorting (we keep EN sort order)

---

## 2. Databases

### Rules DB (read-only)

- SQLite
- Contains canonical D&D content (spells, rulebooks, classes/domains, schools, descriptors, etc.)
- Queried via Prisma (`rulesPrisma`)

### App DB (overlay / user-owned)

- Stores i18n overlay tables (ZH) and other app-owned data
- Queried via Prisma (`appPrisma`)
- v2.0 uses app DB primarily for:
  - spell i18n (name + description overlays)
  - class/domain/school/subschool/descriptor/rulebook translation tables (via meta endpoint)

---

## 3. i18n request handling

### Request context

- A global middleware parses query params and attaches a weak `req.i18n`.
- Controllers narrow/normalize it using `getI18nContext(req)` to produce:

```ts
type I18nContext = {
  lang: "en" | "zh";
  variant?: string;
};
```

### Overlay principle

- **Base responses remain English.**
- When `lang=zh`, responses may include an `i18n` overlay field (optional) for the entity being returned (mostly spell detail).
- We intentionally keep overlay fields optional (exactOptionalPropertyTypes is enabled).

---

## 4. API overview

### Rulebooks / Editions

- `GET /api/rulebooks?edition=core-35`
- `GET /api/rulebooks/editions`

### Classes / Domains

- `GET /api/classes?includePrestige=true&rulebookIds=...`
- `GET /api/domains?rulebookIds=...`

These endpoints are filtered through index tables so results reflect actual spell availability in the current rulebook scope.

When `lang=zh`, adds i18n overlay for bootstrap without using meta.

### Spells

#### A) Name search

- `GET /api/spells/search?q=...&rulebookIds=...&page=1&pageSize=20&lang=en|zh`

Behavior:

- Always searches **English spell names** (rules DB).
- Additionally searches **ZH i18n spell names** (app DB) when `lang=zh`.
- Candidates from both sources are unioned + deduped.
- Fetches base spell rows from rules DB, sorts and paginates.

Validation:

- In lang=zh mode, search results may include spells matched by English name only, Chinese name only, or both.

- Query length rules are handled in controller:
  - for CJK input: `minLen = 1`
  - otherwise: `minLen = 2`

- For too-short queries, endpoint returns `200` with an empty response shape.

Pagination & sorting:

- Sort: `spell.name ASC, spell.id ASC` (EN sort)
- Pagination is applied after sort.
- `total` is **best-effort capped** (based on candidate cap), not a full DB count for very broad queries.

#### B) Browse by class/domain level

- v1.1 introduced index-backed browsing; v2.0 keeps this stable.
- Endpoint returns one row per spell with matched indexes, using idx tables to avoid heavy joins.

#### C) Spell detail

- `GET /api/spells/:id?lang=en|zh`
- Returns full spell detail (including description in EN).
- When `lang=zh`, adds i18n overlay for spell fields (name/description) if present.

#### D) Batch

- `POST /api/spells/batch` (or your existing route)
- Used by collections/favorites pages to fetch spell items by ids.
- Can attach i18n overlays depending on `lang` if implemented similarly to list endpoints.

---

## 5. Meta i18n endpoint (v2.0 addition)

To avoid breaking changes and reduce payload growth, v2.0 introduces a meta endpoint that returns translation maps for “lookup entities” used throughout spell UI.

### Endpoint

- `GET /api/meta/i18n?lang=zh`
- For `lang=en`, returns empty maps.

### Response shape

Maps are keyed by numeric id for O(1) frontend lookup.

```ts
type MetaI18nResponse = {
  i18n: { lang: "en" | "zh"; variant?: string };

  rulebooks: Record<number, { name?: string }>;
  classes: Record<number, { name?: string }>;
  domains: Record<number, { name?: string }>;
  schools: Record<number, { name?: string }>;
  subschools: Record<number, { name?: string }>;
  descriptors: Record<number, { name?: string }>;
};
```

### Caching

- Cached forever in-process for MVP/v2.0 (data is effectively static).
- Cache is cleared on promise rejection to allow retry.
- Otherwise cache invalidation currently requires server restart or redeploy.

---

## 6. Implementation layering

Current convention (kept consistent across features):

- **controller**
  - request parsing + validation
  - uses `getI18nContext(req)`
  - calls service

- **service**
  - orchestration / defaulting / caching
  - combining rules + app overlays
  - returns full response objects (not raw arrays)

- **repo**
  - Used in Spell and Meta services
  - Prisma queries and raw SQL helpers
  - no DTO merging logic

- **mapper**
  - Used in Spell service
  - maps Prisma payloads → contract DTOs
  - handles overlay objects and `null -> undefined` normalization

---

## 7. Key design decisions

### A) No breaking DTO changes in v2.0

- We keep current spell and class response shapes stable.
- “Lookup entity” i18n is handled via `/api/meta/i18n` instead of injecting overlays everywhere.

### B) Exact optional property types

- `exactOptionalPropertyTypes: true`
- Optional fields in contracts use `field?: T | undefined` where needed.
- DTO creation avoids `{ field: undefined }`; missing means “not provided”.

### C) Search semantics for zh

- `lang=zh` enables zh name search overlay; `lang=en` does not.
- ZH UI can still search English because EN search always runs.

---

## 8. Testing

Minimum suite includes:

- happy-path endpoint tests (supertest)
- meta endpoint test (lang=en returns empty maps; lang=zh returns maps)
- spell search tests (basic behavior + paging)

Since v2.0 caches meta results forever, tests should be written so they don’t depend on cache order; if needed, expose a test-only cache reset.

---

## 9. Notes for frontend integration

- On app boot and on language switch to `zh`, fetch:
  - `GET /api/meta/i18n?lang=zh`
  - store maps in frontend cache/store

- When rendering spell objects:
  - base English fields exist in response
  - optional spell overlays may exist (`spell.i18n?.name`, etc.) depending on endpoint
  - use meta maps for nested lookup entity display (school/subschool/descriptor/class/domain/rulebook)

---

## 10. Deferred to v2.1+

Planned follow-ups:

- Pagination DTO normalization (`PagedResponse<T>`)
- Decide whether to replace nested objects with ids + client-side lookup consistently
- ZH sorting/collation strategy
- True total counts for combined EN/ZH name search
- Variants (`variant` semantics) and multi-source overlays
