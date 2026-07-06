# v3.9 Frontend Normalized Mechanics Consumer Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: frozen in v3.9 after landing in PR #39. Backend handoff was reviewed
after PRs #32-#37; URL/API helper foundation, public Browse/Search controls,
compact scope summaries, and limited Spell Detail display fallback are
implemented. Follow-up UI/i18n polish candidates are recorded below and are not
v3.9 freeze blockers.

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
- Do not promote `target` / `effect` / `area` controls unless the backend
  contract accepts them.
- Do not make this a broad visual redesign or new settings system.
- Do not change backend query semantics in this plan.

## Current Facts

- Browse/Search currently share class, domain, level, taxonomy, component, and
  rulebook scope.
- v3.8 component filters use server-provided `componentKeys` with `all`
  semantics.
- Taxonomy controls group source/category metadata from the server instead of
  parsing frontend strings.
- v3.9 backend work promotes `castingTimeKeys`, `rangeKeys`, `durationKeys`,
  `savingThrowKeys`, and `spellResistanceKeys`; exact public bucket keys,
  labels, and fallback semantics come from the contract plan and
  `GET /api/meta/filters`.
- Frontend URL/API helper foundations cover promoted mechanics params:
  - `web/app/features/spells/taxonomy-filter-state.ts` parses, normalizes,
    serializes, detects, and counts the five mechanics filter families.
  - `web/app/api/spells.ts` request builders pass the unified normalized
    filter scope through Search and Browse.
  - Web helper tests cover mechanics URL/query normalization and API helper
    behavior.
- Browse/Search expose secondary taxonomy, component, and mechanics controls
  through a shared Advanced filters panel. The panel drafts edits locally and
  applies them together, so long filter lists do not navigate after every
  selection.
- Browse/Search scope summaries include compact mechanics counts.
- Content-backed Spell Detail can include accepted detail-only mechanics flags
  under `casting.mechanics`: duration `dismissible` / `discharge`, saving
  throw `partial` / `negates` / `harmless` / `object`, and spell resistance
  `harmless` / `object`. Legacy detail responses must not infer these flags
  from raw source strings.
- New user-facing labels must go through the existing i18n workflow.

## Plan

### Slice 1: API And URL Helper Wiring

- Deliverable: review and complete typed frontend API helpers, URL
  parse/canonicalization helpers, and search/browse request builders for
  accepted mechanics params.
- Starting state: backend contract PRs already added the five promoted
  mechanics families to the shared frontend normalized filter state and
  helper tests. The frontend implementation branch should reuse those helpers,
  add only missing coverage found during UI integration, and avoid creating a
  second query-param normalization path.
- Expected files: `web/app/api/`, Search/Browse URL helpers, filter state
  helpers, web tests.
- Validation:
  - `npm run test:web` or targeted web URL/API helper tests
  - `npm run typecheck:web`

### Slice 2: Browse/Search Advanced Mechanics Controls

- Deliverable: server-driven mechanics controls in Browse and Search sidebars,
  preserving Browse filter-first and Search name-first workflows.
- UI boundary: controls should read bucket labels and mode from
  `GET /api/meta/filters`; frontend code may use contract key unions only for
  validation/canonicalization, not for user-visible vocabulary.
- Expected files: Search/Browse feature components, shared filter UI,
  locale JSON if copy changes.
- Validation:
  - targeted web component tests
  - `npm run i18n:check` if labels change
  - browser smoke for Browse/Search desktop and mobile

### Slice 3: Scope Summary And Density

- Deliverable: compact active-scope summaries include mechanics counts or
  labels without overwhelming class/domain/level/taxonomy/component scope.
- Starting state: summary currently counts primary class/domain/level scope,
  taxonomy filters, component filters, and rulebook scope; mechanics counts
  need to be added deliberately so the summary stays compact in English and
  Chinese.
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
- Supported v3.9 metadata: duration `dismissible` / `discharge`, saving throw
  `partial` / `negates` / `harmless` / `object`, and spell resistance
  `harmless` / `object`.
- Boundary: casting time and range remain raw text display in this slice;
  target, effect, and area are deferred and must not gain normalized UI badges
  without a later accepted contract.
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
- Spell Detail normalized display appears only for supported duration, saving
  throw, and spell resistance metadata fields.
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

## Resolved Decisions

- Secondary taxonomy, component, and mechanics filters live together in the
  shared Advanced filters panel. Primary Browse/Search controls remain in the
  sidebar surface.
- Active scope display counts mechanics as one compact category instead of
  listing individual bucket labels.
- Spell Detail renders supported mechanics flags as secondary text notes on
  duration, saving throw, and spell resistance fields, not as filter chips.

## Follow-Up Candidates

These are intentionally outside the v3.9 frontend consumer acceptance gate:

- Localize mechanics bucket labels. Concrete bucket names such as `Standard
  action`, `Close`, `Instantaneous`, and `Will` currently come from the
  server-provided vocabulary labels. A small frontend i18n map by mechanics
  key is the likely short-term path; backend-provided localized display labels
  can be considered if the vocabulary grows.
- Polish the Advanced filters sheet as part of a later filter UI/design-system
  pass. Current behavior is intentionally usable and compact, not a final
  filter redesign.
- Consolidate duplicated query-param normalization between
  `web/app/api/spells.ts` and
  `web/app/features/spells/taxonomy-filter-state.ts` when touching those
  helpers again, preserving the current tested semantics.
- Revisit `target` / `effect` / `area` only after a later backend contract
  accepts public buckets and fallback behavior for those high-volume fields.

## Completion Notes

Frontend consumer branch landed in PR #39:

- Browse/Search expose server-provided taxonomy, component, and mechanics
  vocabulary through a shared Advanced filters panel with local draft state.
- The panel writes URL state only on Apply, avoiding repeated navigation while
  users edit secondary filters.
- Browse/Search summaries include one compact mechanics filter count.
- Spell Detail renders supported `casting.mechanics` flags as secondary text
  notes for duration, saving throw, and spell resistance without parsing raw
  source strings.
- Validation: targeted web helper/model tests,
  `npm run -w web test -- --run`, `npm run typecheck:web`,
  `npm run i18n:check`, `npm run -w web build`, `git diff --check`, and
  browser smoke for Browse/Search desktop plus Search mobile.
