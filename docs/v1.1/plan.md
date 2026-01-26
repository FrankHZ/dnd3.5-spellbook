# v1.1 Plan — Backend Indexing + API Ergonomics + Frontend Polish

## 0) Objective

v1.1 upgrades the MVP into a smoother and more scalable product by:

- adding **explicit mapping/indexes** derived from legacy spell data (classes + domains)
- applying **rulebook scoping/filtering consistently** via these mappings
- adding a missing **domains endpoint**
- adding **batch spell lookup** to remove N+1 detail calls
- polishing frontend browse and collections to leverage the new backend capabilities

**Chinese support is NOT part of v1.1**; v1.1 exists to make Chinese support clean and fast in v2.0.

---

## 1) Scope Guardrails (Frozen for v1.1)

### In scope

- Class↔spell mapping/index
- Domain↔spell mapping/index
- Book filtering using mapping
- Domains bootstrapping endpoint(s)
- Batch spell lookup endpoint
- Frontend browse + collections polish using new endpoints

### Explicitly out of scope

- Chinese parsing/import/storage
- Full-text search / SQLite FTS
- Combined advanced filters beyond MVP semantics
- Rules engine or legality checks
- Backend persistence for favorites/spellbooks/prepared (unless already planned separately)

---

## 2) Deliverables Checklist

### 2.1 Backend: Derived Index / Mapping Layer

#### A) Spell–Class Mapping (explicit)

**Goal**
Enable fast queries like:

- “Which classes have spells in these rulebooks?”
- “Which spells match classIds + level within a rulebook scope?”
- “Which rulebooks have spells for this class?”

**Tasks**

- [ ] Define the mapping representation (table/view/materialized table) as **derived from legacy rules DB**
- [ ] Support scoping by:
  - rulebookIds
  - edition (via rulebooks in edition)

- [ ] Ensure mapping supports level association (needed by by-class-level)

**Definition of Done**

- [ ] Mapping is deterministic and consistent with legacy data
- [ ] Mapping can drive class scoping without scanning spell text tables
- [ ] Document: `/docs/v1.1-mapping.md` describing what is derived and how

---

#### B) Spell–Domain Mapping (explicit)

**Goal**
Enable:

- domain browsing/filtering later
- domain scoping by rulebooks/edition
- stable domain selectors for frontend and future Chinese mapping

**Tasks**

- [ ] Define mapping representation (same approach as class mapping)
- [ ] Mapping supports domain level entries where present

**Definition of Done**

- [ ] Domain mapping can answer: “domains that have spells in selected rulebooks”
- [ ] Mapping and results match spell detail semantics (no missing/phantom domains)

---

### 2.2 Backend: Apply Rulebook Filtering Using Mapping

#### A) Existing endpoint: Name Search

`GET /api/spells/search`

**Goal**
Keep semantics unchanged, but ensure filtering behavior is consistent and driven by mapping/index.

**Tasks**

- [ ] Continue default rulebook scope (edition `core-35`)
- [ ] When rulebookIds are supplied, enforce them consistently
- [ ] Ensure stable sorting and stable pagination remain intact

**Definition of Done**

- [ ] Same results as MVP for identical inputs
- [ ] Error contract unchanged (`{ message, error }`)

---

#### B) Existing endpoint: Class + Level browsing

`GET /api/spells/by-class-level`

**Goal**
Keep semantics unchanged, but rely on mapping for correctness and efficiency.

**Tasks**

- [ ] Enforce rulebook scope via mapping
- [ ] Preserve deduplication semantics (one row per spell)
- [ ] Preserve `matchedClassLevels` behavior

**Definition of Done**

- [ ] Same results as MVP for identical inputs
- [ ] No “empty list due to hidden scoping mismatch” surprises

---

#### C) Classes endpoint: scoped classes by rulebooks (new capability)

Existing:
`GET /api/classes?includePrestige=false`

**Add (recommended)**

- optional `rulebookIds` (CSV), default = core-35 rulebooks
- return only classes that have spells in that scope

**Tasks**

- [ ] Add scoped filtering using class mapping
- [ ] Preserve includePrestige semantics

**Definition of Done**

- [ ] When rulebookIds are set, returned classes all have spell presence in scope
- [ ] When rulebookIds omitted, behavior matches MVP defaults

> If you want to avoid changing existing behavior, create a new endpoint instead:
> `GET /api/classes/scoped?...`

---

### 2.3 Backend: Domains Endpoint (New)

**Endpoint**

- [ ] `GET /api/domains`
  - optional: `rulebookIds` (CSV) to return only domains present in scope (recommended)

- [ ] optional: `GET /api/domains/:id` (nice-to-have)

**Definition of Done**

- [ ] Returns domain list sufficient for UI selectors and display
- [ ] Supports scoping via domain mapping (if rulebookIds present)
- [ ] Error response format consistent

---

### 2.4 Backend: Batch Spell Lookup (New)

**Goal**
Allow frontend collections pages to render with one request.

**Endpoint (recommended)**

- [ ] `POST /api/spells/batch`
  - body: `{ ids: number[] }`
  - optional: `include?: 'list' | 'detail'` (MVP of v1.1: list shape is enough)

**Tasks**

- [ ] Add request validation (empty ids, too many ids, invalid ids)
- [ ] Return stable ordering matching input ids (recommended)
- [ ] Return `missingIds` optionally (recommended)

**Definition of Done**

- [ ] Frontend can render favorites/spellbooks/prepared without N detail calls
- [ ] Endpoint has safe limits (e.g., max 200 ids/request)

---

## 3) Frontend Deliverables (v1.1 Polish)

### 3.1 Browse Improvements (use scoped selectors)

**Tasks**

- [ ] Update browse page to:
  - [ ] apply rulebook scope consistently (using backend scoping)
  - [ ] load scoped class list when rulebookIds change (if supported)

- [ ] Improve empty-state messaging:
  - [ ] “No spells in this scope for selected classes/level” vs “invalid input”

**Definition of Done**

- [ ] Class selector does not offer classes with zero spells in current scope (if scoped endpoint used)
- [ ] Browse results are stable and consistent with backend semantics

---

### 3.2 Collections Pages: use batch lookup

**Tasks**

- [ ] Favorites page loads spells via batch endpoint
- [ ] Spellbook detail page loads spells via batch endpoint
- [ ] Prepared set page loads spells via batch endpoint
- [ ] Keep localStorage format unchanged unless migration is necessary

**Definition of Done**

- [ ] Collections pages do not fire N spell detail requests
- [ ] Load time and network chatter noticeably reduced

---

## 4) Documentation Updates (Required)

- [ ] `/docs/v1.1-mapping.md`
  - What is class mapping?
  - What is domain mapping?
  - How rulebook scope is applied
  - Why mappings are derived (legacy DB remains authoritative)

- [ ] Update `/docs/MVP-SUMMARY.md` with a short “Superseded by v1.1” note (optional)

- [ ] Update API docs (or create `/docs/v1.1-api.md`) to reflect:
  - new endpoints (domains, batch)
  - new scoping behavior in classes endpoint (if added)

---

## 5) Acceptance Tests (Release Gate)

### Backend

- [ ] Name search returns identical results vs MVP for same inputs (core cases)
- [ ] By-class-level returns identical results vs MVP for same inputs
- [ ] Classes scoped by rulebookIds returns only “present” classes
- [ ] Domains endpoint returns consistent list; scoped mode returns only present domains
- [ ] Batch lookup:
  - [ ] preserves input order
  - [ ] handles missing ids gracefully
  - [ ] enforces max ids

### Frontend

- [ ] Browse: changing rulebooks updates available classes (if scoped endpoint)
- [ ] Browse: Wizard level 3 in default scope works
- [ ] Collections pages load via batch endpoint only (no N details)
- [ ] No regressions in routing/search/browse separation

---

## 6) v2.0 (Next Phase) — Chinese Support Preparation

Once v1.1 ships, Chinese support becomes the main goal.

v2.0 will focus on:

- Chinese import pipeline (CHM/HTML → normalized zh fields)
- storage strategy (overlay keyed by spellId)
- UI language toggle + fallback rules
- optional Chinese search (name first)

**v1.1 is considered successful if it makes v2.0 straightforward.**
