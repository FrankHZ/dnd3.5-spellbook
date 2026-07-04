# v3.8 Normalized Query Contract Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: backend contract implemented, pending final review.

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
- Public component filter contract: `componentKeys`, backed by base component
  flags only.
- Needs fallback semantics before public exposure: casting time and range.
- Tome of Battle source-kind/category boundary is exposed in filter vocabulary
  metadata without changing taxonomy query params.
- Combined legacy school/subschool labels are normalized into individual base
  taxonomy facets. Combined labels such as `Conjuration/Evocation` and
  `Creation or Calling` are not public vocabulary.
- Legacy descriptor noise values such as `see text...` are normalized into the
  descriptor bucket `key: "other"`, `queryParam: "descriptorBuckets"`,
  `queryValue: "other"` and are not public vocabulary individually.
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
- `descriptorBuckets` for descriptor buckets that are not legacy descriptor ids
- `componentKeys` with stable normalized keys:
  - `verbal`
  - `somatic`
  - `material`
  - `arcane_focus`
  - `divine_focus`
  - `xp`
  - `metabreath`
  - `truename`
  - `corrupt`
- taxonomy vocabulary metadata:
  - `sourceKind: "spell"` with categories `spell_school`,
    `spell_subschool`, and `spell_descriptor`
  - `sourceKind: "maneuver"` with categories `maneuver_discipline` and
    `maneuver_category`
- combined legacy taxonomy values are split into their base ids:
  - school examples: `Conjuration/Evocation` becomes `Conjuration` and
    `Evocation`
  - subschool examples: `Creation or Calling` becomes `Creation` and `Calling`
- descriptor noise values are collapsed into a synthetic other bucket:
  - query param/key: `descriptorBuckets=other`, `key: "other"`
  - source examples: `see text`, `see text for summon monster I`

Fallback/query semantics:

- `schoolIds`, `subschoolIds`, and `descriptorIds` query behavior is unchanged.
  Tome of Battle disciplines/categories remain queryable through their existing
  taxonomy ids, but clients can group or label them from metadata instead of
  treating them as ordinary spell schools/subschools.
- `schoolIds` and `subschoolIds` also match legacy combined rows through server
  fallback expansion when the active read source has not been regenerated yet.
- `descriptorBuckets=other` matches descriptor rows normalized to `Other` and
  also expands to legacy `see text...` descriptor ids for rollback or stale
  read sources. `descriptorIds` remains reserved for positive legacy descriptor
  ids.
- `componentKeys` uses `all` semantics: a spell must have every selected base
  component present.
- Unknown component keys are ignored during request parsing, matching existing
  id-filter sanitization behavior.
- Casting time and range remain unfilterable in v3.8. They can be promoted later
  only after accepted buckets and review-row fallback behavior are explicit.
- Detail responses continue to expose raw component/mechanic text through the
  existing spell DTO fields; raw text is not public filter vocabulary.

Review-only:

- high-volume target/effect/area text
- duration, saving throw, and spell resistance until consumer semantics are
  explicit
- extra component text beyond base component flags
- Tome of Battle grouping beyond metadata display; no separate maneuver query
  params are introduced in this slice

## Plan

### Slice 1: Contract Inventory And Classification

- Status: complete.
- Deliverable: final public/fallback/review-only classification for v3.8.
- Expected files: this plan, distilled review notes, maybe
  `docs/modules/server.md` if ownership language changes.
- Validation: rerun `npm run -w data-tools rules:content:review` and compare
  with the v3.6 review snapshot.

### Slice 2: Shared DTO And API Shape

- Status: complete.
- Deliverable: contract changes for filter vocabulary and query params,
  including stable ids/keys and fallback notes.
- Expected files: `contracts/src/dto/*`, server meta/filter DTOs, server query
  request parsing, API helper tests.
- Validation:
  - `npm run build:contracts`
  - `npm run check:contracts`
  - targeted server tests for meta vocabulary and spell query params

### Slice 3: Server Query Implementation

- Status: complete.
- Deliverable: backend query behavior for accepted normalized filters.
- Expected files: `server/src/services/spells/`, `server/src/services/meta*`,
  server tests, fixtures if needed.
- Validation:
  - `npm run -w server db:generate`
  - `npm run test:server`
  - `npm run build:server`

### Slice 4: Documentation Handoff To Frontend

- Status: complete for backend handoff.
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
  query params? Answer: stable keys only for v3.8 because base components do not
  have legacy numeric ids in the content DB.
- Should accepted casting-time and range buckets ship in v3.8, or should v3.8
  stop at base component flags? Answer: stop at base component flags.
- What is the smallest source-kind/category boundary that prevents Tome of
  Battle disciplines from looking like ordinary spell schools? Answer: expose
  `sourceKind` and `category` on taxonomy vocabulary items; do not add separate
  query params in this slice.

## Completion Notes

- Added `componentKeys` to shared spell query/response DTOs.
- Added `components.base` vocabulary metadata to `GET /api/meta/filters` with
  `queryParam: "componentKeys"` and `mode: "all"`.
- Added taxonomy item metadata to `GET /api/meta/filters` so Tome of Battle
  disciplines and maneuver categories are marked as `sourceKind: "maneuver"`.
- Updated rules-content normalization to split combined school/subschool rows
  into base taxonomy facets and hide legacy combined ids from filter vocabulary.
- Updated descriptor normalization so `see text...` source descriptors collapse
  into the public `Other` descriptor bucket instead of reaching frontend
  vocabulary as separate filter options.
- Server parses `componentKeys` for Search and Browse/by-level endpoints,
  applies it to both content-backed reads and legacy rules rollback reads, and
  echoes sanitized keys in responses.
- Portable server fixtures cover material-component filtering in both rules and
  content DB paths.
- Validation evidence:
  - `npm run build:contracts`
  - `npm run check:contracts`
  - `npm run build:server`
  - `npm run -w server test -- --run tests/spells.taxonomy-filters.test.ts`
  - `npm run -w data-tools rules:content:review`
  - `npm run ci:portable`
