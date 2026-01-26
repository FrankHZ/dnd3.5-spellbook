# MVP Summary — D&D 3.5 Spellbook SPA

## Status

**MVP COMPLETE** ✅
Both backend and frontend MVPs are finished and aligned.

This document freezes the MVP scope, architecture decisions, and guarantees provided by the system at the end of the MVP phase.

---

## 1. MVP Goal (Frozen)

Deliver a **fast, usable D&D 3.5 spellbook web application** focused on:

- spell discovery
- spell reference
- simple personal spell organization

The MVP explicitly prioritizes **clarity, predictability, and table usability** over completeness or automation.

---

## 2. Edition & Data Scope

- Supported edition: **D&D 3.5 only**
- Default edition slug: `core-35`
- Rulebook scope:
  - Defaults to all rulebooks belonging to `core-35`
  - Rulebooks are treated as authoritative metadata

- Source of rules data:
  - Legacy `dnd.sqlite`
  - **Read-only**
  - No spell data is modified, duplicated, or normalized at write-time

---

## 3. Backend MVP (Frozen)

### 3.1 Search Model (Intentional Split)

The backend MVP supports **two and only two** spell list entry points:

1. **Global Name Search**
   - Purpose: quick lookup
   - Endpoint: `/api/spells/search`
   - Semantics:
     - case-insensitive substring match on spell name
     - minimum query length enforced
     - no class, level, or advanced filters

2. **Class + Level Browsing**
   - Purpose: structured spell lists (preparation / study)
   - Endpoint: `/api/spells/by-class-level`
   - Semantics:
     - requires classIds + level
     - OR semantics across selected classes
     - one row per spell, with matched class-levels attached

> Combined or advanced search is **explicitly out of scope for MVP**.

### 3.2 Spell Detail

- Endpoint: `/api/spells/:id`
- One request returns all data needed to render a spell page:
  - classification
  - components
  - mechanics
  - text + HTML description
  - all class levels
  - all domain levels

### 3.3 Bootstrapping Endpoints

- `/api/rulebooks`
- `/api/rulebooks/editions`
- `/api/classes?includePrestige=false`

These endpoints exist solely to support frontend selectors and initial UI state.

---

## 4. Frontend MVP (Frozen)

### 4.1 Core User Flows

The frontend MVP supports:

- Browse spells by **Class + Level**
- Search spells by **Name**
- View a full **Spell Detail** page
- Maintain **personal spell collections**, stored locally:
  - Favorites
  - Spellbooks
  - Prepared spell sets

### 4.2 State & Persistence

- All personal data is **frontend-only**
- Persistence via `localStorage`
- Backend does not manage users or collections in MVP

### 4.3 UX Guarantees

- Stable pagination (backend-defined sorting)
- Clear separation between:
  - “Search” (name-based)
  - “Browse” (class + level)

- Single-call spell detail rendering
- No implicit rule enforcement or validation

---

## 5. Explicit Non-Goals (Frozen)

The following are **intentionally excluded from MVP**:

- Combined / advanced search
- Full-text search (FTS)
- Rules engine or spell legality checks
- Metamagic automation
- Character sheets
- Errata / version tracking
- Homebrew content
- Multi-edition support
- Backend persistence for spellbooks or notes
- Chinese spell text import (design deferred)

Any feature in this list is **post-MVP by definition**.

---

## 6. Architectural Decisions (Frozen)

- Monorepo with separate:
  - backend
  - frontend
  - shared contracts package

- Shared DTO types via a contracts package
- Backend APIs treated as stable contracts for frontend MVP
- Legacy rules DB remains immutable
- Class–rulebook relationships are **implicit via spells**
  - Classes are considered “present” in a scope only if spells exist for them

---

## 7. What “Done” Means

The MVP is considered complete because:

- Frontend can be built entirely against stable backend contracts
- Core spell discovery and reference workflows work end-to-end
- Scope is clearly bounded and documented
- Future work can proceed incrementally without reworking MVP decisions

---

## 8. Next Phase (Not Started)

Anything beyond this document is **post-MVP** and must be explicitly re-scoped.

Likely candidates (not commitments):

- batch spell lookup by IDs
- backend persistence for collections
- notes support
- Chinese text import pipeline
- advanced filters / FTS

---

**MVP Phase Closed.**
