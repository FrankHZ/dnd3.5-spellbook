# v3.9 Frontend Normalized Mechanics Consumer Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Update Browse/Search to consume accepted normalized mechanics filters from the
v3.9 backend contract, while keeping the filter experience dense, predictable,
and server-driven.

## Ownership

- Owning version: v3.9
- Owning domain: web / design / i18n
- Primary implementation branch or specialist: frontend normalized mechanics
  specialist
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/modules/web.md`, `docs/design.md`, `docs/i18n.md`
- Upstream dependency plans:
  `docs/mvp/v3.9/normalized-mechanics-contract-plan.md`
- Downstream consumer plans: none

## Problem

Browse/Search already consume normalized taxonomy and base component filters.
The next useful controls should expose accepted mechanics filters, but only
after the backend publishes stable vocabulary and fallback behavior. If the
frontend moves first, it will hardcode buckets, parse legacy text, or create
URL state the server cannot support.

## Goals

- Consume only server-provided normalized mechanics vocabulary.
- Add Browse/Search advanced mechanics controls without changing their primary
  product shape: Browse remains filter-first and Search remains name-first.
- Preserve shareable URL state and API helper coverage for promoted mechanics
  params.
- Keep active scope summaries understandable as mechanics filters are added.
- Keep mobile/sidebar density usable without starting a broad filter redesign.
- Add Spell Detail normalized display fallback only for fields explicitly
  supported by the promoted contract.

## Non-Goals

- Do not invent frontend-only mechanics buckets.
- Do not parse legacy mechanics strings in the browser.
- Do not promote `target` / `effect` / `area` or `spellResistance` controls
  unless the backend contract accepts them.
- Do not make this a broad visual redesign or new settings system.
- Do not change backend query semantics in this plan.

## Current Facts

- Browse/Search currently share class, domain, level, taxonomy, component, and
  rulebook scope.
- v3.8 component filters use server-provided `componentKeys` with `all`
  semantics.
- Taxonomy controls group source/category metadata from the server instead of
  parsing frontend strings.
- v3.9 backend work promotes `castingTimeKeys`, `rangeKeys`, and
  `durationKeys`, plus `savingThrowKeys`; exact public bucket keys, labels,
  and fallback semantics come from the contract plan and
  `GET /api/meta/filters`.
- Existing frontend helper tests cover URL/query normalization and API helper
  behavior for normalized filters.
- New user-facing labels must go through the existing i18n workflow.

## Plan

### Slice 1: API And URL Helper Wiring

- Deliverable: typed frontend API helpers, URL parse/canonicalization helpers,
  and search/browse request builders consume accepted mechanics params.
- Expected files: `web/app/api/`, Search/Browse URL helpers, filter state
  helpers, web tests.
- Validation:
  - `npm run test:web` or targeted web URL/API helper tests
  - `npm run typecheck:web`

### Slice 2: Browse/Search Advanced Mechanics Controls

- Deliverable: server-driven mechanics controls in Browse and Search sidebars,
  preserving Browse filter-first and Search name-first workflows.
- Expected files: Search/Browse feature components, shared filter UI,
  locale JSON if copy changes.
- Validation:
  - targeted web component tests
  - `npm run i18n:check` if labels change
  - browser smoke for Browse/Search desktop and mobile

### Slice 3: Scope Summary And Density

- Deliverable: compact active-scope summaries include mechanics counts or
  labels without overwhelming class/domain/level/taxonomy/component scope.
- Expected files: shared scope summary components and tests, `docs/design.md`
  only if durable UI guidance changes.
- Validation:
  - targeted web tests
  - `npm run typecheck:web`
  - browser smoke at desktop and mobile widths

### Slice 4: Spell Detail Supported Fallback

- Deliverable: Spell Detail displays normalized mechanics fallback only where
  the backend contract explicitly supports display semantics; unsupported
  fields continue to show raw source text or remain unchanged.
- Expected files: Spell Detail components and locale JSON only as needed.
- Validation:
  - targeted web tests
  - `npm run i18n:check` if labels change
  - browser smoke on representative spell details

## Acceptance Criteria

- Browse/Search mechanics controls use only server-provided vocabulary.
- URL state round-trips accepted mechanics filters and drops unknown values
  consistently.
- API helpers send only accepted query params and preserve existing scope.
- Active scope summaries remain compact on desktop and mobile.
- Spell Detail normalized display appears only for supported promoted fields.
- Web tests, typecheck, build, i18n checks for new labels, and browser smoke
  pass before frontend handoff.

## Doc Updates

- Update this plan when frontend mechanics consumer scope changes.
- Update `docs/features.md`, `docs/frontend-map.md`, `docs/modules/web.md`,
  `docs/design.md`, and `docs/i18n.md` after behavior or durable workflow
  changes ship.
- Update `docs/roadmap.md` only when v3.9 ordering changes.
- Do not update `integrated-plan.md` unless frontend work changes the version
  delivery sequence or conflicts with backend contract ownership.

## Open Questions

- How should mechanics filters be grouped relative to taxonomy and component
  filters once the promoted vocabulary is known?
- Should active scope display count mechanics as one advanced category or list
  compact labels for the first few selected buckets?
- Which, if any, promoted mechanics fields have enough display semantics for
  Spell Detail fallback in v3.9?

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
