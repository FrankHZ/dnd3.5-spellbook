# v3.1 Implementation Notes: Prepared Entry Enhancements (3.4)

## Scope

This document records the implemented behavior for v3.1 prepared entry enhancements from plan section `3.4`.

It is intentionally implementation-first and may differ from wording in `plan.md` where product decisions changed during build.

## Goals

- Improve per-entry expressiveness without duplicating spells.
- Keep grouping deterministic and derived from entry + spell data.
- Avoid legality/rules enforcement.

## Implemented Data Model

`PreparedEntry` currently includes:

- `entryId: string`
- `spellId: number`
- `state: "ok" | "used" | "reserved"`
- `displayNameOverride?: string`
- `metamagic?: { key: string; name?: string; levelAdj?: number }[]`
- `levelOverride?: number`
- `notes?: string`

File:

- `web/app/storage/collections.type.ts`

## 1. Entry State (`ok | used | reserved`)

Implemented behaviors:

- default entry state is `ok` when created
- row styling reflects state
- normal-mode click toggles `ok <-> used`
- `reserved` is lock-protected from normal-mode toggling
- edit mode provides explicit lock/unlock action:
  - `ok/used -> reserved`
  - `reserved -> ok`

Files:

- `web/app/state/collections-state.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`

## 2. Name Override

Implemented behaviors:

- entry can store `displayNameOverride`
- table cell shows effective display name:
  - override if present
  - base localized spell name otherwise
- hover card shows base name when an override is active

Files:

- `web/app/features/collections/prepared/PreparedEntryEditDialog.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`

## 3. Metamagic Modeling

Implemented behaviors:

- supports common metamagic quick-toggle tags
- supports custom metamagic add/remove:
  - custom name
  - optional non-negative level adjustment
- displays metamagic presence in row via icon
- hover card shows metamagic summary and total adjustment

Notes:

- this is metadata modeling only; no legality enforcement

Files:

- `web/app/features/collections/prepared/PreparedEntryEditDialog.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`

## 4. Level Behavior (Implemented Decision)

Implemented decision differs from original `levelAdjustment` wording:

- `levelOverride` is used instead of `levelAdjustment`
- effective grouping level is derived as:
  - if `levelOverride` is set: use it
  - else: `derivedBaseLevel + sum(metamagic.levelAdj)`
- result is clamped through prepared-level clamp logic before grouping

File:

- `web/app/features/collections/prepared/prepared-derivation.ts`

## 5. Edit Dialog Ownership

Entry-edit UI is extracted into a dedicated component:

- `PreparedEntryEditDialog`

This dialog owns editing for:

- display name override
- level override
- metamagic (common + custom)
- notes

Files:

- `web/app/features/collections/prepared/PreparedEntryEditDialog.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`

## 6. Additional Enhancements and Fixes

Beyond baseline `3.4`, the following low-risk foundational improvements were implemented:

- Shared entry summary helper extracted:
  - `summarizePreparedEntry(entry, baseName)`
  - centralizes effective display name, metamagic summary, metamagic total adj, and field-presence flags
  - reduces duplication/drift between row rendering and hover details
- Effective level helper extracted:
  - `getEffectivePreparedLevel(...)` exported from derivation module
  - keeps a single public API for future consumers (copy/export/list summary)
- Derivation precedence fix:
  - selected class + selected domain levels are now evaluated symmetrically
  - uses minimum across combined selected levels (instead of class-first precedence)
- Lightweight runtime normalization guards on load:
  - sanitize prepared entry shape in `collections.ts`
  - map legacy `used: boolean` to `state`
  - fallback invalid/missing state to `ok`
  - sanitize `metamagic`, `levelOverride`, and id arrays
  - keeps MVP migration simple while reducing breakage from stale/local data

Files:

- `web/app/features/collections/prepared/prepared-entry-summary.ts`
- `web/app/features/collections/prepared/prepared-derivation.ts`
- `web/app/storage/collections.ts`

## Non-Goals (Still True)

- no spell-slot legality engine
- no prohibition logic for unusual metamagic/level combinations
- no backend persistence
- no additional automated unit tests in this enhancement pass (deferred for MVP)

## Manual Validation Snapshot

Manual validation performed during implementation:

- edit dialog updates all fields and persists to entry patch
- reserved lock blocks normal-mode used toggle until unlocked
- effective display name renders immediately in table row
- metamagic icon/hover details appear when metamagic exists
- grouping changes when metamagic/level override changes
- `npm run typecheck` passes in `web/`

## Follow-up

- Align `plan.md` terminology (`levelAdjustment`) with implemented `levelOverride` decision when documentation is next updated.
- Confirm JSON import/export schema mapping for legacy `used: boolean` migration in the import pipeline.
- Add focused unit tests for:
  - entry summary serialization
  - effective level derivation (override + metamagic + clamp)
  - normalization guards in `collections.ts`
