# v3.8 Frontend Filter Consumer Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: ready after backend normalized query contract review.

## Purpose

Update Browse/Search filters to consume the v3.8 normalized query contract and
make a small, bounded UI/UX pass around the filter experience.

## Ownership

- Owning version: v3.8
- Owning domain: web / design
- Primary implementation branch or specialist: frontend-design agent or focused
  frontend agent
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/modules/web.md`, `docs/design.md`
- Upstream dependency plans:
  `docs/mvp/v3.8/normalized-query-contract-plan.md`
- Downstream consumer plans: none

## Problem

Browse/Search already share class, domain, level, taxonomy, and rulebook scope,
but the next useful filters depend on normalized backend vocabulary. If the
frontend moves first, it risks hardcoding dirty values or creating controls that
the server cannot support consistently.

## Goals

- Consume only stable normalized vocabulary exposed by the server contract.
- Keep Browse filter-first and Search name-first with shared structured scope.
- Improve filter discoverability, clear/reset behavior, and compact scope
  summaries where needed.
- Allow small spell-card polish and styling candidates.
- Keep the work review-sized.

## Non-Goals

- Do not invent frontend-only normalized filter vocabulary.
- Do not parse legacy DB strings in the browser.
- Do not make a broad redesign refresh.
- Do not change backend query semantics.
- Do not add new browser-local preferences unless the feature plan explicitly
  accepts them.

## Current Facts

- Browse/Search already consume existing school, subschool, descriptor, class,
  domain, level, and rulebook filters.
- Backend v3.8 contract adds `componentKeys` as the first new normalized filter
  field. Accepted keys are `verbal`, `somatic`, `material`, `arcane_focus`,
  `divine_focus`, `xp`, `metabreath`, `truename`, and `corrupt`.
- Component filters use `all` semantics: selected component keys are all
  required.
- `GET /api/meta/filters` exposes `components.base` vocabulary with
  `queryParam: "componentKeys"` and `mode: "all"`.
- `GET /api/meta/filters` also marks taxonomy vocabulary with `sourceKind` and
  `category`, so Tome of Battle disciplines and maneuver categories can be
  grouped without frontend key parsing.
- Combined legacy school/subschool labels are split by the backend and should
  not be rendered as standalone filter options.
- Legacy descriptor noise such as `see text...` is collapsed by the backend into
  the `Other` descriptor option (`queryParam: "descriptorBuckets"`,
  `queryValue: "other"`, `key: "other"`); frontend controls should not render
  raw `see-text` values or send it through `descriptorIds`.
- v3.6 display settings and spell-card density work are frozen.
- Summary spell cards are scan-only; actions live in full-detail card mode.
- `docs/design.md` remains the durable design direction.

## Plan

### Slice 1: Consumer Contract Wiring

- Deliverable: frontend API helpers and state shape consume the accepted v3.8
  normalized vocabulary.
- Expected files: `web/app/api/`, filter state helpers, typed DTO consumers,
  web tests.
- Validation:
  - `npm run build:contracts`
  - `npm run test:web`
  - `npm run typecheck:web`

### Slice 2: Filter UX Pass

- Deliverable: Browse/Search controls for accepted normalized filters, with
  predictable clear/reset and compact active-scope display.
- Expected files: Browse/Search feature components, shared filter UI, locale
  JSON if copy changes.
- Validation:
  - `npm run test:web`
  - `npm run typecheck:web`
  - `npm run i18n:check` if copy changes
  - browser smoke for Browse/Search

### Slice 3: Small Spell Card And Styling Polish

- Deliverable: review-sized polish to spell card scanability or styling
  candidates that directly support the new filter workflow.
- Expected files: spell card/list components, `docs/design.md` only if durable
  visual guidance changes.
- Validation:
  - `npm run test:web`
  - `npm run -w web build`
  - browser smoke on desktop and mobile widths

## Acceptance Criteria

- Frontend filters use only server-provided normalized vocabulary.
- Existing Browse/Search scope behavior remains intact.
- Clear/reset and active-scope display remain understandable on desktop and
  mobile.
- Spell card polish is bounded and does not become a new design refresh.
- Web tests, typecheck, build, and relevant i18n checks pass.

## Doc Updates

- Update this plan when frontend slice scope changes.
- Update `docs/features.md`, `docs/frontend-map.md`, and `docs/modules/web.md`
  after the consumer behavior ships.
- Update `docs/roadmap.md` only when v3.8 ordering changes.
- Do not update `integrated-plan.md` unless frontend work changes the version
  delivery sequence.

## Open Questions

- Which accepted normalized filters deserve first-class controls versus compact
  advanced filters? Current accepted backend vocabulary is base component flags.
- How should taxonomy controls visually separate `sourceKind: "maneuver"` items
  from ordinary spell taxonomy without changing query semantics?
- Should Search show every Browse-equivalent filter by default, or hide some
  newly accepted filters behind an advanced section?
- Which spell-card polish candidates directly help filter-result scanning?

## Completion Notes

Use this section only after implementation review.
