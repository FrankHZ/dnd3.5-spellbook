# v3.6 UI/UX Display Update Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implemented and accepted. Display settings, spell card updates, filter
summary density, and restrained list styling polish landed through
`codex/web-display-settings`.

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
- Add Chinese-mode display controls so bilingual comparison can be enabled only
  where it helps the current workflow.
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
- `SpellItemView` already includes parsed spell components, so compact list-card
  component markers can use existing DTO data.
- Browse/Search share a compact scope summary.
- UI copy changes must follow `docs/i18n.md` and `npm run i18n:check`.

## Plan

### Slice 1: Display Settings Contract

Status: implemented for compact/comfortable spell-list density and
browser-local summary/full-detail spell cards, with the full-detail toggle
surfaced in Browse/Search sidebars.

- Deliverable: browser-local display preferences plus controls at the surfaces
  where the preference is used.
- Candidate settings:
  - spell list density: compact / comfortable
  - summary/full-detail spell cards: controlled from Browse/Search sidebars for
    the current scanning context
  - short description visibility in spell cards
  - rulebook/source display style where useful
  - metadata visibility for taxonomy chips or secondary rows
- Validation: storage helper tests and i18n audit.

### Slice 1b: Chinese Display Controls

Status: implemented for spell names, class/domain labels, other filter labels,
and rulebook abbreviation style.

- Deliverable: Chinese-mode-only display preferences for bilingual comparison
  and optional localized source labels.
- Candidate settings:
  - spell names: show Chinese only, or Chinese plus English comparison
  - class/domain labels: show Chinese only, or Chinese plus English comparison
  - other filter facet labels: independently control English comparison for
    schools, subschools, descriptors, and future filter groups
  - rulebook short labels: default to English source/display abbreviations, with
    an opt-in localized Chinese short-label mode
- Expected behavior:
  - English UI remains unaffected by Chinese-only settings
  - settings stay browser-local and do not introduce app-state DB persistence
  - comparison text remains compact and should not make filter chips overflow
  - fallback stays deterministic when a Chinese or English label is unavailable
- Validation: storage helper tests, display helper tests, i18n audit, and
  EN/ZH browser smoke for Browse, Search, Spell Detail, collections, and
  Settings.

### Slice 2: Spell Card Update

Status: implemented for the shared `SpellCard` used by Browse, Search, and
spell-id collections, including compact special-component markers. Prepared
spell table display remains unchanged.

- Deliverable: updated spell card/list item layout for Browse, Search, and
  collection contexts where the shared component applies.
- Expected behavior:
  - stable dimensions across loading/hover/dynamic text states
  - clear name, level/source, and short description in summary cards, with
    favorite/prepare action affordances shown in full-detail card mode
  - compact special-component markers, inspired by SRD-style list pages such as
    `https://www.d20srd.org/srd/spellLists/sorcererWizardSpells.htm`, can show
    notable components like `M`, `F`, `DF`, `XP`, or repo-specific component
    flags next to the spell name without turning every card into a detail view
  - compact mobile layout without text overlap
  - no new backend dependency unless already available through existing DTOs
- Validation: web tests, typecheck, build, manual browser smoke.

### Slice 3: Filter Summary And Sidebar Density

Status: implemented for current multi-select chip overflow and shared
Browse/Search scope summary density. Broader sidebar redesign remains deferred
to later display polish.

- Deliverable: improved selected-filter summaries and sidebar display when
  many filters or long labels are active.
- Expected behavior:
  - avoid overlong chip rows
  - preserve Browse as filter-first and Search as name-first
  - keep clear filter/reset affordances discoverable
  - show class, domain, level, taxonomy, and rulebook scope as compact,
    independently wrapping summary items
- Validation: focused tests for summary helpers plus manual Browse/Search smoke.

### Slice 4: Styling Polish

Status: implemented for shared spell-list reading surfaces; broader visual
redesign remains deferred. Durable field-hierarchy guidance was added to
`docs/design.md`.

- Deliverable: restrained styling update aligned with `docs/design.md`.
- Expected behavior:
  - improved spacing, typography hierarchy, and card/list consistency
  - no one-note palette drift
  - no nested-card visual clutter
  - mobile and desktop text fit checks
  - shared spell cards keep a reference-index feel with compact source badges,
    clear title hierarchy, and stable metadata spacing
  - source labels stay visually quiet, special component markers carry stronger
    emphasis, and short descriptions remain secondary recognition text
- Validation: web build and manual screenshots/smoke where useful.

## Validation Notes

- Focused web tests, `npm run i18n:check`, `npm run typecheck:web`, and
  `npm run -w web build` passed during implementation.
- EN Browse/Search summary smoke confirmed compact wrapping and no horizontal
  overflow before the final source/component marker polish.
- Final freeze validation re-ran web tests, typecheck, i18n audit, and
  production build. No further v3.6 UI slice is promoted.

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
- Should Chinese rulebook short labels be curated data, generated from existing
  localized names, or limited to English source abbreviations until a label
  review accepts Chinese abbreviations?
