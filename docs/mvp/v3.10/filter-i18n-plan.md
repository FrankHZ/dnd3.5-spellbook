# v3.10 Filter i18n Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implementation branch ready for review.

## Purpose

Complete the user-visible i18n gap left by v3.9 normalized filter vocabulary.
The frontend should localize stable accepted keys for filter controls,
summaries, and supported mechanics notes while keeping server labels as safe
fallbacks.

## Ownership

- Owning version: v3.10
- Owning domain: web / i18n
- Primary implementation branch or specialist: i18n specialist
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/i18n.md`, `docs/modules/web.md`
- Upstream dependency plans:
  `docs/mvp/v3.9/normalized-mechanics-contract-plan.md`,
  `docs/mvp/v3.9/frontend-normalized-mechanics-consumer-plan.md`
- Downstream consumer plans:
  `docs/mvp/v3.10/ui-ux-cohesion-plan.md`

## Problem

v3.9 promoted normalized mechanics filters, but concrete bucket labels still
mostly come from server-provided English vocabulary. That is acceptable as a
fallback, but it makes the Chinese UI feel incomplete in the most visible
filter surfaces.

For MVP closeout, the frontend should not wait for backend multilingual
vocabulary. The stable server keys are enough for a localized display adapter.

## Goals

- Add frontend i18n display adapters keyed by stable taxonomy, component, and
  mechanics keys.
- Keep server-provided labels as fallback when a frontend localized label is
  missing.
- Localize filter option labels in Browse/Search and Advanced filters.
- Localize compact scope summaries for selected taxonomy, component, and
  mechanics filters.
- Localize supported Spell Detail mechanics notes for duration, saving throw,
  and spell resistance metadata.
- Preserve existing URL/query state and server-owned vocabulary semantics.

## Non-Goals

- Do not make the backend return localized labels in v3.10.
- Do not localize raw spell source text or imported content fields.
- Do not change filter query params, bucket keys, or fallback semantics.
- Do not promote `target`, `effect`, or `area` filters.
- Do not replace the existing i18next workflow.

## Current Facts

- v3.9 public mechanics keys are `castingTimeKeys`, `rangeKeys`,
  `durationKeys`, `savingThrowKeys`, and `spellResistanceKeys`.
- v3.8/v3.9 Browse/Search filters consume server-provided vocabulary for
  taxonomy, components, and mechanics.
- The frontend already has i18next namespaces and checks through
  `npm run i18n:sync` and `npm run i18n:check`.
- Rulebook display labels already use a frontend display helper pattern; reuse
  that shape where it fits instead of inventing parallel label logic.
- Unknown or future server vocabulary must remain displayable through server
  fallback labels.

## Plan

### Slice 1: Vocabulary Surface Inventory

- Deliverable: confirm every user-visible filter vocabulary surface and stable
  key family that needs localized display.
- Expected files: this plan, nearby web feature tests or helper notes as needed.
- Validation: review Browse/Search, Advanced filters, scope summaries, and
  Spell Detail supported mechanics notes in both languages.

### Slice 2: Frontend Display Adapter

- Deliverable: a shared display helper that accepts server vocabulary entries
  and returns localized labels by stable key, falling back to the server label.
- Expected files: `web/app/features/spells/`, `web/app/i18n/` or existing
  locale asset locations, targeted helper tests.
- Validation: targeted web tests for known localized keys, unknown fallback
  labels, and stable sort/order preservation.

### Slice 3: Filter And Summary Wiring

- Deliverable: Browse/Search filter controls, Advanced filters, and compact
  scope summaries use the display adapter for taxonomy, component, and
  mechanics vocabulary.
- Expected files: Browse/Search filter components, summary helpers, locale JSON,
  targeted tests.
- Validation:
  - `npm run i18n:sync`
  - `npm run i18n:check`
  - targeted web tests for filter summaries and URL/query preservation

### Slice 4: Spell Detail Mechanics Notes

- Deliverable: supported `casting.mechanics` notes render localized secondary
  text for duration, saving throw, and spell resistance flags.
- Expected files: Spell Detail components, locale JSON, targeted tests.
- Validation: targeted web tests and browser smoke on representative content
  backed details.

## Acceptance Criteria

- Taxonomy, component, and mechanics filter labels are localized in English and
  Chinese where stable keys are known.
- Unknown or future server vocabulary still displays through server label
  fallback.
- Browse/Search scope summaries stay compact and localized.
- Supported Spell Detail mechanics notes are localized and are not inferred
  from raw legacy strings.
- URL state, API helper behavior, and filter semantics remain unchanged.
- `npm run i18n:sync`, `npm run i18n:check`, targeted web tests,
  `npm run typecheck:web`, and `npm run -w web build` pass before handoff.

## Doc Updates

- Update this plan when localized filter display scope changes.
- Update `docs/i18n.md` when the display-adapter workflow becomes durable.
- Update `docs/features.md` and `docs/frontend-map.md` if user-visible behavior
  or feature entry points change.
- Update `docs/roadmap.md` only when v3.10 ordering changes.
- Do not update `integrated-plan.md` unless this plan conflicts with another
  v3.10 workstream.

## Open Questions

- None for planning. Implementation should preserve server fallback labels and
  only raise blockers if a supposedly stable key lacks a clear display meaning.

## Follow-Up Candidates

Use this section near implementation closeout for useful, explicitly
non-blocking work discovered during the branch. Keep each item short, explain
why it is outside the current acceptance gate, and move any real release
blocker back into `Acceptance Criteria` instead.

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
