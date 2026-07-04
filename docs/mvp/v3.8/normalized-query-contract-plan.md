# v3.8 Normalized Query Contract Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Define the backend and shared-contract vocabulary for normalized spell queries
before the frontend adds more filter controls.

## Ownership

- Owning version: v3.8
- Owning domain: server / contracts / db
- Primary implementation branch or specialist: backend normalized-query agent
- Related feature/module docs: `docs/features.md`, `docs/modules/server.md`,
  `docs/modules/contracts.md`, `docs/operations/data-setup.md`
- Upstream dependency plans: v3.5 rules-content normalization, v3.6 normalized
  rules review
- Downstream consumer plans:
  `docs/mvp/v3.8/frontend-filter-consumer-plan.md`

## Problem

v3.5 exposed school, subschool, and descriptor filters. v3.6 reviewed the
broader normalized content facets and identified base component flags as the
safest next contract candidate, while casting time, range, Tome of Battle
discipline handling, and several mechanics families still need fallback or
source-kind decisions.

If the frontend adds controls before the backend contract is explicit, it will
either parse legacy strings or accidentally expose review-only dirty values.

## Goals

- Publish an explicit list of public normalized query fields.
- Define fallback behavior for ambiguous, missing, or review-only normalized
  values.
- Keep review-only mechanics out of public query vocabulary.
- Preserve raw source text for detail display and QA without making it filter
  vocabulary.
- Update contracts and server tests before frontend consumer work.

## Non-Goals

- Do not normalize every dirty mechanics family in v3.8.
- Do not add frontend controls in this plan.
- Do not change local DB artifact delivery or migration ownership.
- Do not add remaining source-backed English spells from `data/spells-full`.
- Do not treat Tome of Battle maneuvers as ordinary spell-school UI grouping
  without an accepted source-kind/category boundary.

## Current Facts

- Existing public taxonomy filters: school, subschool, descriptor.
- Ready candidate from v3.6: base component flags.
- Needs fallback semantics before public exposure: casting time and range.
- Needs source-kind/category decision before UI grouping: Tome of Battle
  disciplines and maneuver categories.
- Review-only for now: target/effect/area, duration, saving throw, spell
  resistance, extra component text, and high-volume dirty mechanics.
- Inventory command:

```bash
npm run -w data-tools rules:content:review
```

## Contract Classifications To Decide

Public query vocabulary:

- existing `schoolIds`
- existing `subschoolIds`
- existing `descriptorIds`
- candidate base component flags, with stable IDs/keys and no raw text parsing

Fallback/query semantics:

- whether casting time can expose accepted buckets while review rows collapse to
  `other` or stay unfilterable
- whether range can expose accepted buckets while review rows collapse to
  `other` or stay unfilterable
- how detail responses represent raw normalized mechanics when no public filter
  category exists

Review-only:

- high-volume target/effect/area text
- duration, saving throw, and spell resistance until consumer semantics are
  explicit
- extra component text beyond base component flags
- Tome of Battle grouping until source-kind/category is explicit

## Plan

### Slice 1: Contract Inventory And Classification

- Deliverable: final public/fallback/review-only classification for v3.8.
- Expected files: this plan, distilled review notes, maybe
  `docs/modules/server.md` if ownership language changes.
- Validation: rerun `npm run -w data-tools rules:content:review` and compare
  with the v3.6 review snapshot.

### Slice 2: Shared DTO And API Shape

- Deliverable: contract changes for filter vocabulary and query params,
  including stable ids/keys and fallback notes.
- Expected files: `contracts/src/dto/*`, server meta/filter DTOs, server query
  request parsing, API helper tests.
- Validation:
  - `npm run build:contracts`
  - `npm run check:contracts`
  - targeted server tests for meta vocabulary and spell query params

### Slice 3: Server Query Implementation

- Deliverable: backend query behavior for accepted normalized filters.
- Expected files: `server/src/services/spells/`, `server/src/services/meta*`,
  server tests, fixtures if needed.
- Validation:
  - `npm run -w server db:generate`
  - `npm run test:server`
  - `npm run build:server`

### Slice 4: Documentation Handoff To Frontend

- Deliverable: frontend-ready contract summary and consumer constraints.
- Expected files: this plan, `docs/features.md`, `docs/modules/web.md`, and
  `docs/mvp/v3.8/frontend-filter-consumer-plan.md`.
- Validation: docs review before frontend implementation starts.

## Acceptance Criteria

- Public filter fields are listed by name and backed by shared DTOs.
- Fallback behavior is documented for missing, ambiguous, and review-only
  normalized data.
- Server tests cover accepted filter params and at least one fallback case.
- Frontend consumer plan can proceed without parsing legacy string columns.
- Review-only facets remain hidden from public query controls.

## Doc Updates

- Update this plan when public vocabulary or fallback semantics change.
- Update `docs/roadmap.md` only when v3.8 ordering changes.
- Update `docs/features.md`, `docs/modules/server.md`, and
  `docs/modules/contracts.md` after behavior ships.
- Do not update `integrated-plan.md` unless this plan conflicts with another
  v3.8 workstream.

## Open Questions

- Should component filters use component ids, stable keys, or both in public
  query params?
- Should accepted casting-time and range buckets ship in v3.8, or should v3.8
  stop at base component flags?
- What is the smallest source-kind/category boundary that prevents Tome of
  Battle disciplines from looking like ordinary spell schools?

## Completion Notes

Use this section only after implementation review.
