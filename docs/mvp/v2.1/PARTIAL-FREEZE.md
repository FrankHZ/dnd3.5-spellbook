# v2.1 Partial Freeze — Navigation & Browse Ergonomics

## Status

**v2.1 PARTIALLY SHIPPED (FROZEN)** ✅

v2.1 was planned as a multi-item ergonomics and normalization release.
In practice, only the **highest-impact browse and navigation improvements** were completed.

This document freezes **what v2.1 includes** and **explicitly defers the rest**.

---

## 1. v2.1 Original Intent (Recap)

v2.1 was scoped to improve:

- browse/navigation correctness
- level-based browsing ergonomics
- groundwork for future i18n and data normalization

During implementation, it became clear that **3.1 and 3.2 deliver the majority of user value**, while later items offer diminishing returns relative to upcoming v3.0 goals.

---

## 2. Shipped in v2.1 (Frozen)

### 2.1 URL-Driven Browse State (3.1)

**Status:** ✅ Shipped
**Doc:** `3.1.md`

**Key decisions (frozen):**

- URL is the source of truth for:
  - `level`
  - `classIds`
  - `domainIds`
  - `page`

- Persisted storage is used **only as defaults** when URL params are missing
- Rulebook scope is intentionally **persisted-only**, not URL-encoded
- Page size is fixed (`PAGE_SIZE = 25`), not URL-encoded

**Outcome:**

- Browse state is refresh-safe
- Back/forward navigation works correctly
- URLs are shareable and stable for MVP use
- Campaign-level configuration (rulebooks) is insulated from navigation history

---

### 2.2 Browse by Level: “All Levels” & Grouped View (3.2)

**Status:** ✅ Shipped
**Doc:** `3.2.md`

**Key decisions (frozen):**

- `/api/spells/by-level` supports:
  - `level = 0..9`
  - `level = all`

- Single endpoint and single response shape
- Results are always grouped by level in the response
- Frontend supports:
  - flat vs grouped presentation
  - persistent presentation preferences

- Grouping is a presentation concern only (does not affect query semantics)

**Outcome:**

- Domain browsing works naturally across all levels
- Multi-level results are easier to read and reason about
- No regression to URL-driven navigation from 3.1

---

## 3. Explicitly Deferred from v2.1

The following items were **planned** for v2.1 but **intentionally deferred** due to lower immediate impact:

### 3.3 Same-Name Spell References

- Cross-book references for spells with identical English names
- Useful for rules comparison, but not required for core browsing or play

### 3.4 CHM Entry Post-Processing (zh Description Cleanup)

- Removal of duplicated mechanics/stat-block lines from Chinese descriptions
- Valuable for polish, but current zh output is already usable

### 3.5 Normalized Spell Mechanics Tables (Schema Only)

- Structural groundwork for future mechanics localization
- No immediate user-facing value without localization or UI integration

**Deferred rationale:**

- These items do not materially improve day-to-day usage compared to upcoming v3.0 collection features
- Deferring them avoids delaying higher-impact work

Deferred items may be revisited in **v2.2** or later if needed.

---

## 4. Relationship to v2.0

- v2.1 builds directly on **v2.0-FREEZE.md**
- No v2.0 guarantees are modified
- No parser scope or localization promises are expanded
- v2.0 remains the authoritative **Chinese Support MVP**

---

## 5. v2.1 Final Assessment

v2.1 successfully delivered:

- correct, URL-driven browse navigation
- significantly improved level/domain browsing
- cleaner separation between navigation state and user preferences

While not all planned items shipped, **the core goals of v2.1 were achieved**.

v2.1 is therefore considered **complete and frozen** in its partial form.

---

## 6. Forward Direction

With v2.1 closed, development focus shifts to:

> **v3.0 — Collections & Prepared Spell Workflow**

Deferred v2.1 items remain valid backlog candidates but are not blocking for v3.0.

---

## Final Declaration

**v2.1 is partially shipped and frozen.**
No further work should be added under v2.1.

All new development must be versioned beyond v2.1.
