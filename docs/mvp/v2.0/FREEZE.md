This is written to _lock decisions_, prevent scope creep, and make future v2.1+ planning much easier.

---

# v2.0 Freeze — Chinese Support MVP

## Status

**v2.0 COMPLETE (MVP FROZEN)** ✅

This document freezes the scope, architecture, and guarantees of **v2.0 Chinese support** for the D&D 3.5 Spellbook project.

v2.0 is explicitly an **MVP release**, focused on replacing legacy Chinese CHM usage with a usable, maintainable in-app experience.

Deployment: v2.0 code frozen; deployment fixes applied without feature changes.

---

## 1. v2.0 Goal (Frozen)

Enable **practical Chinese spell reading** in the application by providing:

- Chinese spell names (best-effort)
- Chinese spell descriptions (primary value)
- Seamless fallback to English when Chinese data is missing
- A simple language toggle UX

The goal is **usability**, not completeness or perfect localization.

---

## 2. Core Design Principle (Frozen)

> **Chinese is an overlay, not a fork.**

- English data remains the authoritative source for:
  - spell identity
  - mechanics
  - structured fields (casting time, components, levels, etc.)

- Chinese data is stored and served as a **language overlay**, keyed by `spellId`
- No Chinese data modifies or duplicates the legacy rules database

This principle applies consistently across backend, database schema, and frontend UX.

---

## 3. Data Scope (v2.0)

### 3.1 Included Chinese Data

- Spell Chinese name (`zhName`)
- Spell Chinese description (`zhDescription`)
- Spell related Entity names
  - Rulebooks
  - Character Classes
  - Domains
  - Spell School/Subschool
  - Spell Descriptors
- Metadata:
  - source pack
  - import timestamp

### 3.2 Explicitly Excluded from v2.0

- Chinese localization of:
  - components
  - casting time
  - range / duration / target
  - class or domain levels

- Chinese full-text search
- Sorting or collation by Chinese text
- Legal/rules correctness validation

All excluded items are **post-v2.0 by definition**.

---

## 4. Parser MVP Guarantees

The Chinese parser is intentionally scoped and imperfect by design.

### 4.1 Parser Responsibilities

- Extract Chinese spell name and description from messy CHM-derived HTML
- Normalize and sanitize output
- Match extracted records to canonical `spellId` using layered strategies
- Emit confidence and provenance metadata
- Support safe re-import and iteration

### 4.2 Parser Non-Guarantees

- 100% spell coverage
- Perfect name matching
- Consistent formatting across all spells

**Precision is prioritized over recall**:

> A missing Chinese entry is preferable to an incorrect one.

---

## 5. Backend v2.0 (Frozen)

### 5.1 Storage

- Chinese overlay stored in a **separate application database**
- Legacy rules DB remains immutable
- No cross-database foreign key enforcement
- Supports multiple language variants (`lang + variant`)

### 5.2 Serving Strategy

- English spell endpoints remain unchanged
- Chinese data is served as:
  - part of spell detail responses (overlay object), and/or
  - via language-aware query parameters

- Dictionary-style translations (books, classes, domains, schools, descriptors) served via:
  - `GET /api/meta/i18n`

### 5.3 Caching

- Meta i18n data is cached in-process
- Cache invalidation currently requires server restart or redeploy (acceptable for v2.0 MVP)

---

## 6. Frontend v2.0 (Frozen)

### 6.1 Language UX

- Global language toggle (EN / ZH)
- One-language-at-a-time rendering (no split view)
- Clear fallback behavior:
  - if Chinese data missing → English content shown with indicator

### 6.2 Rendering Guarantees

- Chinese description rendered safely (sanitized HTML or text)
- No transient “English flash” when switching to Chinese
- All existing browse/search flows remain functional in both languages

### 6.3 Explicit Non-Goals (Frontend)

- Side-by-side bilingual layout
- Chinese-only navigation mode
- Chinese mechanics localization
- Advanced typography or editorial polish

---

## 7. Canonical Data Clarifications

### 7.1 rules_clean Corrections

All documented corrections in `rules_clean.sqlite` (encoding fixes, name fixes, etc.) are:

> **Part of the canonical data contract starting in v2.0**

They are required for reproducible parser matching and must be preserved in future rebuilds.

---

## 8. What “Done” Means for v2.0

v2.0 is considered successful if:

- Users can read Chinese spell descriptions in-app
- Users no longer need to open legacy CHM files during play
- Missing or partial Chinese data does not break UX
- The system can safely improve Chinese coverage over time

v2.0 does **not** aim to be “complete” or “perfect”.

---

## 9. Post-v2.0 Direction (Not Started)

Likely v2.1+ areas (not commitments):

- Improved parser matching & overrides
- Chinese name search
- Manual correction workflows
- Side-by-side bilingual view
- Chinese full-text search (FTS)
- Structured field localization

Any of these require explicit re-scoping.

---

## 10. Final Declaration

**v2.0 Chinese Support is frozen as an MVP.**

Further work must be versioned beyond v2.0 and justified by clear user value.
