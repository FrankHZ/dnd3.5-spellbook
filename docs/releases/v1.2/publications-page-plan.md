# v1.2 Publications Page Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Add a dedicated Publications page for browsing and managing publication or
rulebook scope, backed by the minimum metadata needed to avoid frontend-only
heuristic grouping. Settings should retain general preferences rather than act
as the primary publication-management surface.

## Ownership

- Owning version: v1.2
- Owning domain: frontend-design plus DB/data support
- Primary implementation branch or specialist: frontend-design specialist, with
  DB/data specialist for metadata contract changes
- Related feature/module docs: `docs/features.md`, `docs/design.md`,
  `docs/modules/web.md`, `docs/modules/server.md`,
  `docs/operations/rules-db-notes.md`
- Upstream dependency plans: v1.1 rulebook-backed content state
- Downstream consumer plans: v1.3 sitewide UX redesign

## Agent Context

- Main gate outcome: users manage publication/rulebook scope from a dedicated
  Publications page, and grouping uses accepted metadata instead of heuristic
  labels.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2/README.md`, `docs/features.md`, `docs/design.md`,
  `docs/modules/web.md`, `docs/modules/server.md`.
- Expected edit surface: rulebook/publication API contract, minimum DB/content
  metadata, web route/components/state, tests, and this plan.
- Nearby code/tests: server rulebook/content services, contracts DTOs, Settings
  rulebook tabs, frontend scope state, Browse/Search rulebook scope summaries.
- Validation or acceptance evidence: server/API tests, web tests/build, i18n
  checks if copy changes, and manual route smoke.
- Non-goals and follow-up parking: do not redesign all settings, filters, spell
  cards, or the broader design system.
- Handoff owner: main gate after frontend-design and DB/data review.

## Problem

Rulebook scope currently lives primarily inside Settings, and frontend grouping
still depends on display heuristics. The expanded corpus needs a clearer user
surface and a small, explicit publication metadata contract.

## Goals

- Add a Publications page for browsing publications/rulebooks and managing
  scope.
- Move primary publication-scope management out of Settings while preserving
  general settings.
- Add minimum DB/API metadata for robust grouping: category, family or setting,
  source kind, display abbreviation, ordering, and review status when accepted.
- Preserve existing Browse/Search/Detail scope behavior.

## Non-Goals

- Do not implement the complete v1.3 sitewide redesign.
- Do not perform a broad publication schema review beyond page needs.
- Do not remove existing rulebook scope behavior before the Publications page
  has accepted parity.

## Current Facts

- v1.1 accepted Settings rulebook tabs and rulebook scope links.
- v1.1 freeze deferred formal publication/rulebook metadata to v1.2.
- Production DB upload remains operator-owned and outside automatic CD.

## Plan

### Slice 1: Minimum Metadata Contract

- Deliverable: accepted metadata fields and API/DTO shape for publication
  grouping.
- Expected files: DB/content metadata handling, contracts, server tests, and
  docs.
- Validation: server/API tests and data-tool checks relevant to metadata.

### Slice 2: Publications Page

- Deliverable: dedicated route and user flow for publication/rulebook browsing
  and scope management.
- Expected files: web route/components/state/tests and i18n copy.
- Validation: targeted web tests, `npm run i18n:check`, and manual desktop/
  mobile smoke.

### Slice 3: Settings Boundary And Existing Consumers

- Deliverable: Settings keeps general preferences, and Browse/Search/Detail
  scope links point to the correct publication-management surface.
- Expected files: Settings route updates, scope summary links, feature docs.
- Validation: Browse/Search/Detail route smoke and regression tests.

## Acceptance Criteria

- Publications page is the primary place to inspect and manage publication or
  rulebook scope.
- Settings no longer serves as the primary publication-management surface.
- Supported grouping uses accepted metadata rather than frontend-only
  heuristics.
- Existing rulebook scope behavior in Browse/Search/Detail remains intact.
- Tests and manual smoke cover English/Chinese UI and desktop/mobile layout for
  the changed surfaces.

## Doc Updates

- Update this plan when Publications page slices are accepted.
- Update `docs/features.md` after the user-visible page ships.
- Update `docs/design.md` only for durable page/layout guidance.
- Update `docs/operations/rules-db-notes.md` or import docs if metadata changes
  data workflow.
- Update `docs/roadmap.md` only when v1.2 ordering changes.
- Do not update `integrated-plan.md` unless cross-track sequencing changes.

## Open Questions

- Which metadata fields are required for v1.2 acceptance versus broader future
  publication schema cleanup?

## Follow-Up Candidates

- Broader publication schema review after the Publications page validates the
  first metadata contract.
- Sitewide filter and scope UI redesign in v1.3.

## Completion Notes

Use this section only after implementation review.
