# v3.10 UI/UX Cohesion Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: ready for review in `codex/design-ui-ux-cohesion`.

## Purpose

Make the existing app feel like one coherent MVP across its primary pages. This
is a product cohesion pass, not a restyle or design-system rewrite.

## Ownership

- Owning version: v3.10
- Owning domain: web / design
- Primary implementation branch or specialist: frontend-design specialist
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/design.md`, `docs/modules/web.md`
- Upstream dependency plans: `docs/mvp/v3.10/filter-i18n-plan.md`
- Downstream consumer plans: final v3.10 librarian freeze sweep

## Problem

The app now has the main MVP behavior, but several pages grew through separate
feature passes. Filters, result lists, detail pages, collection workflows,
settings, and status/about surfaces can still feel assembled from adjacent
iterations rather than one product.

v3.10 should close that gap by aligning interface grammar after filter i18n is
in place, so the UI pass does not have to redo label/layout work.

## Goals

- Align layout density and spacing across TopBar, Browse/Search sidebars,
  Advanced filters, scope summaries, result lists, Spell Detail, collections,
  prepared spells, settings, and about/status pages.
- Normalize button placement, reset/apply actions, empty/loading/error states,
  and secondary metadata display.
- Keep Browse filter-first and Search name-first.
- Keep the Advanced filters panel usable and compact without turning it into a
  full filter redesign.
- Verify desktop and mobile stacking for the primary MVP pages.
- Update durable design docs only when a rule should guide future work.

## Non-Goals

- Do not redesign the brand, navigation model, or visual identity.
- Do not create a complete component library or design-system documentation
  project.
- Do not add new product features or settings unless required to fix an
  accepted inconsistency.
- Do not change backend contracts, data imports, or query semantics.
- Do not broaden into stable-track artifact generation, translation QA, or
  content pipeline work.

## Current Facts

- v3.6 added browser-local display settings and summary/full-detail spell card
  modes.
- v3.8 and v3.9 added shared normalized filter controls and Advanced filters.
- Summary spell cards are scan-only; favorite/prepare actions live in
  full-detail card mode.
- `docs/design.md` is the durable UI direction document.
- Local UI wrappers live in `web/app/components/ui/`; prefer existing wrappers
  and feature components over parallel UI structures.
- Filter i18n should land first because label length and localized summaries
  affect layout density.

## Plan

### Slice 1: Cohesion Audit

- Deliverable: focused inventory of inconsistent spacing, actions, states, and
  responsive stacking across the MVP pages.
- Expected files: this plan completion notes or a short implementation checklist
  inside the branch.
- Validation: manual desktop/mobile review before edits begin.

### Slice 2: Browse/Search And Filter Surfaces

- Deliverable: aligned sidebar density, Advanced filters actions, scope summary
  placement, reset/apply affordances, and empty/loading/error states.
- Expected files: Browse/Search feature components, shared filter components,
  tests where behavior changes.
- Validation: targeted web tests, desktop/mobile browser smoke for Browse and
  Search.

### Slice 3: Cards, Detail, And Workflow Pages

- Deliverable: consistent result-list/card density, Spell Detail metadata
  hierarchy, collections/prepared workflow actions, and settings/about/status
  layout treatment.
- Expected files: SpellCard/result components, Spell Detail components,
  collections/prepared/settings/about routes, locale JSON only if copy changes.
- Validation: targeted web tests where behavior changes, browser smoke for
  Spell Detail, collections, prepared spells, settings, and about/status.

### Slice 4: Closeout Polish And Docs

- Deliverable: final pass for mobile stacking, text fit, button consistency,
  and durable design guidance.
- Expected files: `docs/design.md`, `docs/features.md`, `docs/frontend-map.md`
  only when durable behavior or entry points change.
- Validation:
  - `npm run test:web`
  - `npm run typecheck:web`
  - `npm run -w web build`
  - `npm run i18n:check` if copy changes

## Acceptance Criteria

- Primary pages feel consistent in layout density, action placement, status
  display, and mobile stacking.
- Browse remains filter-first and Search remains name-first.
- Advanced filters remain compact and usable after filter i18n labels land.
- Summary/full-detail spell card behavior remains intact.
- No new backend, data, deployment, or stable-track scope is introduced.
- Targeted tests, web tests, typecheck, build, and required i18n checks pass
  before handoff.
- Manual browser smoke covers English and Chinese UI on desktop and mobile for
  Browse, Search, Spell Detail, collections, prepared spells, settings, and
  about/status.

## Doc Updates

- Update this plan when the UI/UX cohesion scope changes.
- Update `docs/design.md` only for durable UI principles or accepted patterns.
- Update `docs/features.md` and `docs/frontend-map.md` only when user-visible
  behavior or feature entry points change.
- Update `docs/roadmap.md` only when v3.10 ordering changes.
- Do not update `integrated-plan.md` unless this plan conflicts with another
  v3.10 workstream.

## Open Questions

- None for planning. Treat proposed new features discovered during audit as
  follow-up candidates unless they block MVP closeout consistency.

## Follow-Up Candidates

Use this section near implementation closeout for useful, explicitly
non-blocking work discovered during the branch. Keep each item short, explain
why it is outside the current acceptance gate, and move any real release
blocker back into `Acceptance Criteria` instead.

- Full component-library extraction remains out of scope. This pass may add
  small shared app components when they remove visible inconsistency, but it
  should not turn into a design-system documentation project.
- A fuller design-system catalog for badges, pills, buttons, headers, and
  dense workflow rows should be a later design-system task. The current branch
  only normalizes repeated visible inconsistencies.
- A visual-regression screenshot gallery for Browse, Search, Spell Detail,
  collections, prepared spells, settings, and about/status would be useful
  after v3.10, but it is outside this manual smoke-test closeout.

## Completion Notes

Implementation branch:

- Added `PageHeader` for simple page titles, descriptions, and actions across
  settings, collections, and about/status surfaces.
- Aligned Spell Detail loading with the same `.page-side` shell as the loaded
  detail page.
- Tightened Advanced filters footer layout into a reset-left/actions-right
  action bar that still stacks on mobile.
- Made Browse/Search display toggles more resistant to longer localized labels.
- Moved the Advanced filters sheet to open from the left, matching its sidebar
  trigger location, and replaced the Browse/Search filter card with a shared
  left drawer. The drawer is open by default on desktop, collapses to a narrow
  rail when hidden, and opens over the results on mobile so Browse/Search keep
  one consistent sidebar model.
- Added a shared `StatusCard` for empty, loading, validation, and error states
  across Browse, Search, Spell Detail, and collection workflows.
- Made spellbook index cards whole-card links with consistent hover and focus
  affordances.
- Normalized spellbook/prepared page-header actions to small buttons instead of
  extra-small controls, keeping compact buttons for dense toolbars and rows.
- Added `SpellMetaBadge` for source, taxonomy, descriptor, and active-scope
  metadata so Browse/Search cards, scope summaries, and Spell Detail share one
  badge vocabulary alongside the existing component badge.
- Moved Spell Detail source, taxonomy, and descriptor metadata into a sidebar
  overview section so the detail header stays focused on the spell name,
  summary, and actions.
- Tightened Spell Detail mechanics metadata rows so field labels and values
  align cleanly in the 320px sidebar and mobile stacked layout.
- Tightened prepared-spell class/domain sidebar card headers, dense row
  actions, and class/domain type pills so the prepared workflow matches the
  shared compact card rhythm.
- Aligned About/Version card headers and content spacing with the shared
  settings/status card rhythm.
- Updated `docs/design.md` and `docs/frontend-map.md` with the small shared
  page-header, status-card, and spell metadata badge patterns.

Validation:

- `npm run typecheck:web`
- `npm run i18n:check`
- `npm run -w web test -- --run`
- `npm run -w web build`
- `git diff --check`
- Browser smoke on Browse, Search, Spell Detail, collections, prepared spells,
  settings, and about/status at desktop and mobile widths; Advanced filters
  opened on desktop and mobile without horizontal overflow.
