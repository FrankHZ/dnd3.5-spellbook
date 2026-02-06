# v2.1 Plan — Navigation, Normalization, and Browse Ergonomics

## Status

**v2.1 PLANNED**

v2.1 is an incremental release built on top of the frozen **v2.0 Chinese MVP**.
Its purpose is to improve **navigation correctness**, **browse ergonomics**, and **data normalization groundwork** without expanding parser scope or localization completeness.

---

## 1. v2.1 Goals (Frozen)

v2.1 aims to:

- Make browse state fully URL-driven for correct navigation history
- Improve domain and level browsing ergonomics
- Prepare normalized structures needed for future i18n work
- Improve Chinese description readability by removing duplicated mechanics text
- Add cross-book same-name spell references for better rules comparison

v2.1 does **not** aim to expand Chinese coverage or parser capability.

---

## 2. Scope Guardrails (Frozen)

### Explicitly in scope

- Browse page state refactor (URL as source of truth)
- Backend support for multi-level queries
- CHM post-processing for zh description cleanup
- Same-name spell reference support
- Normalized mechanics storage **structure only**

### Explicitly out of scope

- Chinese full-text search
- Partial / low-confidence translations
- Structured mechanics localization
- Side-by-side bilingual UI
- Parser matching improvements
- Manual override UI

---

## 3. Deliverables

---

## 3.1 Frontend: URL-Driven Browse State

### Goal

Ensure browse state is:

- shareable
- refresh-safe
- compatible with browser back/forward navigation

### Tasks

- [ ] Refactor browse page to derive state from URL query params:
  - `level`
  - `classIds`
  - `domainIds`
  - `rulebookIds`
  - `page`, `pageSize`

- [ ] Persisted storage may be used **only** as default when URL is empty
- [ ] Update navigation actions to push URL changes instead of mutating local state directly

### Definition of Done

- Refresh preserves browse state
- Back/forward navigation works correctly
- Copy-paste URL reproduces identical results

---

## 3.2 Backend: By-Level Query Supports “All Levels”

### Goal

Support domain-centric browsing where spells may exist at only one level.

### API Change

Extend:

```
GET /api/spells/by-level
```

### Behavior

- Allow:
  - `level=all` OR omitted `level`

- Still require:
  - at least one of `classIds` or `domainIds`

### Response Shape (Frozen)

Flat list with explicit level on each item:

```ts
{
  items: [
    {
      spell: SpellItem,
      level: number,
      matchedClassLevels: [...],
      matchedDomainLevels: [...]
    }
  ]
}
```

(No grouped response in v2.1.)

### Definition of Done

- Domain browse can fetch all levels in one request
- Existing single-level queries continue to work unchanged
- Pagination behavior is clearly defined and documented

---

## 3.3 Backend: Same-Name Spell References

### Goal

Provide rulebook comparison without variant resolution.

### Behavior

- Given a spell detail request, return:
  - all other spells with **exact same normalized English name**
  - different `spellId`

- No fuzzy matching
- No inference about equivalence

### Implementation

Either:

- inline field in spell detail:
  - `sameNameRefs: SpellRef[]`
    or

- separate endpoint:
  - `GET /api/spells/:id/same-name`

### Definition of Done

- Spell detail page can show other books with same spell name
- Each reference links to its own spell detail page
- No performance regression on detail load

---

## 3.4 Backend + Parser: CHM Entry Post-Processor

### Goal

Remove duplicated mechanics/stat-block lines from Chinese descriptions.

### Tasks

- [ ] Implement a **post-processing step** after CHM parsing:
  - pattern-based removal of obvious mechanics lines
  - no attempt at full mechanics parsing

- [ ] Keep removal rules conservative (avoid false positives)

### Definition of Done

- zhDescription focuses on narrative rules text
- Mechanics duplication with English fields is reduced
- No structured data is extracted in this step

---

## 3.5 Backend: Normalized Mechanics Tables (Structure Only)

### Goal

Lay groundwork for future mechanics localization without using it yet.

### Tasks

- [ ] Define normalized mechanics tables in app DB:
  - casting time
  - range
  - duration
  - target / area / effect
  - saving throw
  - spell resistance

- [ ] Tables may remain empty in v2.1
- [ ] No frontend usage required in v2.1

### Definition of Done

- Schema exists and is documented
- No runtime dependency on these tables
- No regression to v2.0 behavior

---

## 4. Acceptance Criteria (Release Gate)

### Frontend

- Browse state fully driven by URL
- Domain browsing supports all levels
- Same-name references render correctly
- No regression in EN/ZH toggle behavior

### Backend

- `/api/spells/by-level` supports all-level queries
- Same-name reference lookup is stable and deterministic
- zh description post-processing does not break rendering

---

## 5. Relationship to v2.0

v2.1:

- builds directly on **v2.0-FREEZE.md**
- does not change any v2.0 guarantees
- introduces no new localization promises

v2.0 remains the authoritative **Chinese MVP baseline**.

---

## 6. Post-v2.1 (Not Started)

Potential future work (v2.2+):

- structured mechanics localization
- Chinese search improvements
- manual override tooling
- richer bilingual layouts

These are intentionally deferred.

---

## Final Declaration

**v2.1 is a focused ergonomics and normalization release.**

Any feature not listed above is **out of scope by definition** and must be versioned beyond v2.1.
