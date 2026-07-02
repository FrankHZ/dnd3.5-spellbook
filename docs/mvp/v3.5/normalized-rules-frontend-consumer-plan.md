# Normalized Rules Frontend Consumer Plan

Status: planned v3.5 frontend consumer work.

## Problem

`rules-content-normalization-plan.md` defines the backend/content direction:
move dirty legacy rules strings into a project-owned normalized content model
and expose finer query facets. That is necessary, but it does not by itself
define how the frontend should consume those facets.

Without a separate consumer plan, the likely failure mode is predictable:
backend exposes many new fields, then Browse/Search sidebars accumulate controls
opportunistically. The result would be harder to scan, harder to test, and
harder to keep aligned between URL state, API DTOs, metadata, and UI copy.

## Goals

- Define how normalized rules facets appear in Browse, Search, Spell Detail,
  Prepared Spells, and Settings.
- Keep Browse/Search aligned while preserving their different jobs:
  filter-first discovery versus name-first lookup.
- Make new filter state URL-driven, shareable, and testable.
- Introduce controls in small slices after backend contracts and metadata are
  stable.
- Keep dense reference-tool ergonomics from `docs/design.md`.
- Keep English and Chinese UI/content modes equally usable.

## Non-Goals

- Do not design every possible filter control before the normalized content API
  is stable.
- Do not add browser E2E as the first validation layer.
- Do not turn Spell Detail into a filter UI.
- Do not replace existing class/domain/level/rulebook workflows.
- Do not duplicate normalized parsing logic in frontend code.

## Consumer Surfaces

### Browse

Browse remains the primary filter-first discovery surface.

Initial normalized facets should be added only when they clearly improve lookup:

- school and subschool
- descriptor
- component flags
- spell resistance category
- saving throw category

Later facets can include:

- casting-time category
- range category
- duration category
- list variants or source notes

Controls should live in the existing sidebar pattern and should not displace
class/domain/level, which remain the main Browse workflow. Add collapsible or
grouped sections only when the number of controls would otherwise crowd the
sidebar.

### Search

Search remains name-first. It should accept the same structured scope as Browse,
but the page should keep the search field and result list visually dominant.

Search URL state should continue to preserve active scope when users search
from Browse or Search headers. New facet params should follow the same URL
helper path as existing class/domain/level filters.

### Spell Detail

Spell Detail should use normalized facets for orientation and clarity, not for
editing or query controls.

Expected consumers:

- display normalized taxonomy alongside raw/source text when useful
- show component details in a more structured way while preserving raw text
- keep mechanics display readable even when raw values remain the authoritative
  prose
- expose review/provenance hints only in developer or future QA surfaces, not
  ordinary reading flow

### Prepared Spells

Prepared Spells should not become a broad search surface. Normalized data can
improve:

- per-entry badges or compact mechanics display
- copy/export text
- optional local filtering inside prepared lists if users need it later

Do not add heavy filter panels to prepared books in the initial consumer pass.

### Settings

Settings should own persistent preferences for broad defaults only:

- rulebook scope
- language/content mode
- possible future default visibility for advanced filters

Do not store ordinary Browse/Search facet selections in Settings. Those belong
in URL state.

## URL And API Contract

New filters should be represented as explicit URL params and typed API inputs.

Candidate params:

- `schoolIds`
- `subschoolIds`
- `descriptorIds`
- `components`
- `savingThrow`
- `spellResistance`
- `castingTime`
- `range`
- `duration`

Rules:

- use comma-separated ids for id-list filters, matching current class/domain
  conventions
- use stable semantic keys for enum-like facets
- keep unknown or unsupported values out of API requests after parsing
- preserve existing `q`, `classIds`, `domainIds`, `level`, `rulebookIds`,
  `page`, and `pageSize` semantics
- reset `page` when filters change

Contracts should expose both normalized facet ids/keys and display labels. The
frontend should not infer labels from raw DB strings.

## Metadata Loading

Bootstrap/meta endpoints should provide filter vocabularies before UI controls
ship:

- schools
- subschools
- descriptors
- component categories
- saving throw categories
- spell resistance categories
- casting/range/duration categories when they are accepted

Localized display names should use the existing i18n/meta overlay path where
available. If a vocabulary is generated from normalized content, document
whether it is source-derived, curated, or both.

## UI Shape

Use existing layout and component vocabulary:

- Browse/Search keep `page-side` with the 320px sidebar pattern.
- Result lists keep the shared scope summary above results.
- Controls use existing checkbox, combobox, select, toggle, and field wrappers.
- Advanced sections may be collapsed, but active filters must remain visible in
  the scope summary.
- Mobile should stack controls and results without duplicate hidden flows.

The scope summary should evolve from class/domain/level/rulebook only to a
compact summary of all active structured filters. It should avoid long prose and
prefer grouped labels.

## Rollout Slices

### Backend Handoff Notes

The first normalized rules content slice exposes generated rows with these
backend-facing categories:

- taxonomy facets: `school`, `subschool`, `descriptor`
- list entries: `class` and `domain`, preserving raw `extra`, variant labels, and
  review notes
- components: boolean component rows plus raw `extra_components` as reviewable
  `other` rows
- mechanics facets: `casting_time`, `range`, `target`, `effect`, `area`,
  `duration`, `saving_throw`, and `spell_resistance`

Frontend controls should wait for typed API DTOs and metadata endpoints. Initial
consumer work should prefer taxonomy and conservative mechanics categories that
have low review counts in `rules:content:audit`; rows with
`reviewStatus: "review"` should remain display/provenance material, not filter
vocabulary, until backend acceptance promotes them.

### Slice 1: Contract And URL Foundation

- Add typed DTO fields for normalized filters.
- Extend Search URL helpers and tests.
- Add API helper URL-building tests.
- Keep UI controls hidden or behind minimal wiring until backend data exists.

### Slice 2: Taxonomy Filters

- Add school, subschool, and descriptor filters to Browse.
- Add the same filters to Search scope.
- Update scope summary and metadata loading.
- Add pure frontend tests for URL parsing/building and scope derivation.

### Slice 3: Mechanics Filters

- Add component, saving throw, and spell resistance facets.
- Add casting/range/duration only after the backend QA reports show stable
  categories.
- Keep advanced mechanics grouped separately from core class/domain/level
  controls.

### Slice 4: Detail Display

- Improve component and mechanics display using normalized fields.
- Preserve raw source strings as fallback display.
- Add tests around DTO normalization and rendering helpers where practical.

## Validation

Prefer fast, deterministic checks:

- contracts build and runtime import check
- web typecheck
- pure frontend tests for URL helpers, scope summary derivation, API helper URL
  construction, and display normalization
- backend API contract tests for new query params
- manual browser smoke for Browse/Search sidebars and Spell Detail readability

Browser E2E remains deferred unless the normalized consumer work creates enough
cross-page risk to justify it.

## Acceptance Criteria

- Frontend consumer ownership is documented separately from backend rules
  normalization.
- New normalized filters have typed contract fields, URL semantics, and API
  helper coverage.
- Browse and Search expose the same structured scope without making Search stop
  feeling name-first.
- Spell Detail uses normalized fields for clearer display while preserving raw
  source fallback.
- Scope summaries show active normalized filters compactly.
- The first shipped consumer slice includes pure frontend tests and backend API
  contract coverage.
