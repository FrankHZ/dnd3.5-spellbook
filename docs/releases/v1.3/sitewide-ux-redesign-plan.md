# v1.3 Sitewide UX / Style Redesign Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Create a coherent, durable interface language across the existing spellbook
without changing the product into a different kind of application. The result
should feel like one bilingual tabletop reference tool across lookup, reading,
scope management, and local spell organization.

## Ownership

- Owning release: v1.3
- Owning domain: `frontend-design`
- Primary specialist: frontend-design agent
- Related docs: `docs/design.md`, `docs/features.md`,
  `docs/frontend-map.md`, and `docs/i18n.md`
- Parallel prerequisite: `platform-deploy-prerequisite-plan.md`
- Handoff owner: main gate

## Agent Context

- Main gate outcome: deliver a bounded sitewide cohesion pass over existing
  features; preserve accepted product and query behavior.
- Required reading: `AGENTS.md`, `.agents/roles/frontend-design.md`, this plan,
  `docs/design.md`, `docs/features.md`, `docs/frontend-map.md`,
  `docs/i18n.md`, and the v1.2.2 freeze.
- Expected edit surface: `web/app/`, focused web tests and locale resources,
  this plan, `docs/design.md`, `docs/features.md`, and `docs/frontend-map.md`
  when accepted behavior or ownership changes.
- Nearby code/tests: shared shell and layout, `PageHeader`, `SpellCard`, filter
  sidebar and scope-summary components, local UI wrappers, route tests, and
  existing display-preference tests.
- Validation: focused web tests, `npm run i18n:check`, `npm run typecheck:web`,
  `npm run -w web build`, and English/Chinese desktop/mobile browser smoke.
- Non-goals and follow-up parking: backend/data contract changes, full content
  translation, broad dependency or framework migration, and unrelated feature
  work stay outside this plan; useful discoveries go in Follow-Up Candidates.
- Delegation: bounded child delegation is allowed only when the context packet
  names a disjoint component or acceptance surface. Recursive fan-out remains
  disabled.
- Handoff: return changed surfaces, design decisions, tests/build evidence,
  browser-smoke evidence, known residual issues, and doc updates to main gate.

## Problem

The app has mature individual workflows and a durable design inventory, but
those surfaces accumulated across multiple focused releases. Shared layout,
control hierarchy, state feedback, card density, responsive behavior, and
reading rhythm now need one deliberate review so users do not have to relearn
the interface from route to route.

## Goals

- Define the small shared vocabulary that should govern page width, side
  columns, headers, controls, cards, feedback states, spacing, typography, and
  responsive stacking.
- Apply that vocabulary consistently across the scoped routes while reusing
  current local wrappers and feature components.
- Improve repeated lookup and reading ergonomics without reducing information
  density or hiding important state.
- Keep Chinese and English equally usable at desktop and mobile widths.

## Non-Goals

- No new site architecture, landing page, theme engine, or full visual brand
  replacement.
- No backend filter vocabulary, Search semantics, spell schema, or publication
  metadata changes.
- No rewrite solely to maximize component reuse; extract or consolidate only
  where the accepted design creates meaningful shared behavior.
- No new user-facing feature bucket beyond small interaction or presentation
  adjustments needed to complete cohesion.

## Current Facts

- `docs/design.md` already defines the reference-first, bilingual,
  quietly-polished direction and the current layout/component vocabulary.
- Browse and Search share filter, scope-summary, spell-card, and density
  concepts, while Spell Detail is a reading surface with a fixed metadata
  column.
- Publications, collections, prepared spells, Settings, and About / Status are
  accepted product surfaces, not redesign candidates to remove or replace.
- Display settings and summary/full-detail controls are browser-local behavior
  that must survive visual changes.
- Summary spell cards are scan-only. Favorite and prepare actions belong to
  full-detail card mode under the accepted Browse/Search behavior.
- v1.2.2 accepted the current query, URL, persisted-state, i18n, and
  accessibility behavior; the redesign must not regress it.

## Plan

### Slice 1: Design Audit And Decisions

- Inventory repeated shell, page-header, sidebar, filter, scope-summary,
  spell-card, form, feedback, and responsive patterns in the live app.
- Compare each route against `docs/design.md`; classify gaps as shared-system,
  route-specific, or intentionally different.
- Record a bounded implementation order and the shared tokens/components that
  actually need adjustment. Resolve major visual or interaction choices before
  broad page edits.
- Capture representative before-state screenshots for desktop and mobile
  acceptance, without committing disposable artifacts unless they become a
  maintained harness input.

### Slice 2: Shared Interface Vocabulary

- Normalize the accepted layout widths, spacing, typography hierarchy, color
  roles, borders, focus/disabled states, and responsive breakpoints in existing
  theme and layout surfaces.
- Align TopBar, `PageHeader`, side-column cards, filter disclosure, scope
  summaries, result-state feedback, and common controls.
- Keep familiar icon controls, tooltips, stable dimensions, and accessible
  labels; do not replace clear controls with decorative elements.
- Add focused regressions for shared behavior that can fail across routes.

### Slice 3: Lookup And Reading Surfaces

- Align Browse and Search filter hierarchy, active-scope visibility, reset
  behavior, result spacing, pagination, empty/error states, and mobile
  disclosure while preserving their distinct search semantics.
- Refine `SpellCard` summary/full-detail presentation, metadata hierarchy, and
  density behavior without changing the underlying spell or local-preference
  contracts.
- Preserve the summary-card scan-only contract: summary mode does not show
  favorite or prepare actions. Reopening that behavior requires a separate,
  explicitly confirmed product decision rather than a styling adjustment.
- Refine Spell Detail's header, rule-text reading flow, metadata sidebar,
  actions, supported mechanics notes, and responsive ordering.
- Verify long English labels, Chinese copy, long spell names, and dense
  metadata do not overflow or shift controls.

### Slice 4: Management And Utility Surfaces

- Align Publications, spellbooks/favorites, prepared spells, Settings, and
  About / Status with the accepted page header, card/list, form, feedback, and
  mobile vocabulary.
- Preserve efficient repeated actions and visible local-state boundaries;
  avoid decorative card nesting or marketing-style composition.
- Close route-specific inconsistencies discovered by the audit only when they
  fit the accepted shared vocabulary.

### Slice 5: Cohesion Acceptance

- Run focused automated checks and production build.
- Smoke all scoped routes in English and Chinese at representative desktop and
  mobile widths, including loading, populated, empty, validation/error, and
  relevant collapsed/expanded states.
- Review screenshots as a set for cross-page consistency and check horizontal
  overflow, content occlusion, keyboard focus, and stable control dimensions.
- Update durable design and feature docs with accepted behavior, then hand the
  result to main gate. Platform deployment acceptance remains independently
  owned and must also close before release freeze.

## Acceptance Criteria

- Scoped routes use one coherent page, control, state-feedback, and responsive
  vocabulary while retaining intentional differences between discovery,
  reading, management, and settings surfaces.
- Browse/Search filters, name/full-text Search, scope summaries, rulebook
  selection, pagination, local collections, prepared spells, and display
  preferences retain accepted behavior.
- Spell cards and Spell Detail have a clear metadata and action hierarchy in
  summary/full-detail and desktop/mobile states.
- Summary spell cards remain scan-only, with favorite/prepare actions available
  only in full-detail card mode unless a separately approved product decision
  changes that contract.
- English and Chinese content fit without incoherent overlap, clipping, or
  hidden required actions.
- No page introduces nested decorative cards, oversized marketing composition,
  or an unrelated visual system.
- Focused web tests, i18n validation, typecheck, production build, and the
  documented browser matrix pass.
- `docs/design.md`, `docs/features.md`, and `docs/frontend-map.md` reflect the
  accepted system and route boundaries rather than implementation aspirations.

## Doc Updates

- Update this plan for accepted slices, validation evidence, and bounded
  follow-up candidates.
- Update `docs/design.md` for durable interface rules and intentional route
  differences.
- Update `docs/features.md` only when visible behavior changes.
- Update `docs/frontend-map.md` when shared component or route ownership moves.
- Update `docs/i18n.md` only if the redesign changes copy or locale workflow.
- Update `docs/roadmap.md` only if active ordering or release scope changes.
- Do not update an integrated plan unless a real cross-track conflict appears.

## Open Questions

- Which current visual inconsistencies are durable route-specific differences,
  and which should become shared components or tokens?
- Does the accepted filter vocabulary need one presentation model at all
  densities, or a deliberate desktop/mobile disclosure difference?
- Which SpellCard details should remain user-selectable rather than becoming a
  fixed sitewide presentation decision?

## Follow-Up Candidates

Use this section during implementation for useful, non-blocking discoveries.
Do not park a release acceptance blocker here.
