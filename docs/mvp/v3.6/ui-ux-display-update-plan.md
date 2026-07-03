# v3.6 UI/UX Display Update Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Improve the daily reading and scanning experience after v3.5 added more
metadata and filters. This work owns display settings, spell card/list
presentation, filter summary density, and styling polish.

## Ownership

- Owning version: v3.6
- Owning domain: frontend design / web
- Primary implementation branch or specialist: `frontend-design`
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/design.md`, `docs/modules/web.md`, `docs/i18n.md`
- Upstream dependency plans: v3.5 taxonomy filters and rulebook display labels
- Downstream consumer plans: normalized rules review if new mechanics display
  is needed

## Problem

Browse/Search now have richer scope, rulebook labels, short descriptions, and
taxonomy filters. The app still works, but card density, display preference
controls, and styling consistency need a deliberate pass so more metadata does
not make the reference workflow noisy.

## Goals

- Add display settings that let users choose how much spell-list information to
  show.
- Update spell card/list presentation for compact scanning and richer detail
  when enabled.
- Improve filter summary density for longer class/domain/rulebook/taxonomy
  selections.
- Continue the restrained reference-tool styling direction from `docs/design.md`.
- Keep mobile text fit and repeated-use ergonomics central.

## Non-Goals

- Do not build a landing page or broad visual rebrand.
- Do not move browser-local display settings into the app-state DB.
- Do not add broad new filter contracts as part of card styling.
- Do not make raw QA/provenance data part of ordinary spell reading.

## Current Facts

- User preferences already live in browser-local settings storage.
- Spell list/detail surfaces already consume short descriptions and rulebook
  display helpers.
- Browse/Search share a compact scope summary.
- UI copy changes must follow `docs/i18n.md` and `npm run i18n:check`.

## Plan

### Slice 1: Display Settings Contract

- Deliverable: browser-local display preferences and Settings controls.
- Candidate settings:
  - spell list density: compact / comfortable
  - short description visibility in spell cards
  - rulebook/source display style where useful
  - metadata visibility for taxonomy chips or secondary rows
- Validation: storage helper tests and i18n audit.

### Slice 2: Spell Card Update

- Deliverable: updated spell card/list item layout for Browse, Search, and
  collection contexts where the shared component applies.
- Expected behavior:
  - stable dimensions across loading/hover/dynamic text states
  - clear name, level/source, short description, and action affordances
  - compact mobile layout without text overlap
  - no new backend dependency unless already available through existing DTOs
- Validation: web tests, typecheck, build, manual browser smoke.

### Slice 3: Filter Summary And Sidebar Density

- Deliverable: improved selected-filter summaries and sidebar display when
  many filters or long labels are active.
- Expected behavior:
  - avoid overlong chip rows
  - preserve Browse as filter-first and Search as name-first
  - keep clear filter/reset affordances discoverable
- Validation: focused tests for summary helpers plus manual Browse/Search smoke.

### Slice 4: Styling Polish

- Deliverable: restrained styling update aligned with `docs/design.md`.
- Expected behavior:
  - improved spacing, typography hierarchy, and card/list consistency
  - no one-note palette drift
  - no nested-card visual clutter
  - mobile and desktop text fit checks
- Validation: web build and manual screenshots/smoke where useful.

## Acceptance Criteria

- Display settings are browser-local and documented as user-facing behavior.
- Spell cards remain readable in compact and comfortable modes.
- Browse/Search filter summaries remain compact with multiple filters.
- UI copy is covered by i18n sync/check.
- `npm run test:web`, `npm run typecheck:web`, `npm run -w web build`, and
  `npm run i18n:check` pass for the implementation branch.

## Doc Updates

- Update this plan when display setting scope changes.
- Update `docs/features.md` for shipped settings and card behavior.
- Update `docs/design.md` only when durable design direction changes.
- Update `docs/frontend-map.md` if feature entry points move.
- Do not update `integrated-plan.md` unless UI/UX scope expands into new
  backend contracts or app-state persistence.

## Open Questions

- Which display settings should ship first versus stay design backlog?
- Should spell card density apply to collection/prepared views immediately or
  only Browse/Search first?
- Should rulebook display style be a user preference or a fixed locale-driven
  behavior?
