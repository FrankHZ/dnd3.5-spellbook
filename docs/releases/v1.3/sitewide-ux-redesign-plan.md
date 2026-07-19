# v1.3 Sitewide UX / Style Redesign Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: Slices 1 through 3 implemented and reviewed; management and utility
route cohesion remains active.

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

Audit result: complete. The current interface already has a viable neutral,
reference-first base. The release should tighten a small shared vocabulary
rather than rebuild every page around one composition. The accepted direction
adds a recognizable modern-rulebook identity through editorial hierarchy,
paper/ink contrast, fine rules, source treatment, and one restrained binding
accent while keeping controls contemporary and predictable.

### Slice 2: Shared Interface Vocabulary

- Normalize the accepted layout widths, spacing, typography hierarchy, color
  roles, borders, focus/disabled states, and responsive breakpoints in existing
  theme and layout surfaces.
- Align TopBar, `PageHeader`, side-column cards, filter disclosure, scope
  summaries, result-state feedback, and common controls.
- Keep familiar icon controls, tooltips, stable dimensions, and accessible
  labels; do not replace clear controls with decorative elements.
- Add focused regressions for shared behavior that can fail across routes.

Implementation result:

- Shared CSS roles now govern page action wrapping, flat control sections,
  side-card sections, scope and status surfaces, compact rows, and index group
  headers without adding a parallel component system.
- Browse and Search use the same index and scope vocabulary. Class/domain and
  advanced-filter pickers no longer add decorative frames inside their owning
  side card or sheet.
- Prepared reuses the same side-card section hierarchy and responsive action
  rail while preserving its specialized mode and copy controls.
- `npm run typecheck:web`, `npm run test:web` (38 files, 158 tests), and
  `npm run -w web build` passed. Browse, populated Search, Advanced filters,
  and Prepared were smoked in English and Chinese at `1440 x 900` and
  `390 x 844`; mobile side controls remained default-collapsed and no checked
  state showed horizontal document overflow or clipped controls.

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

Implementation result:

- Browse and Search now share quiet top and bottom index toolbars. Browse level
  groups align with row content and read as index sections instead of centered
  display headings.
- Full-detail spell rows use a restrained metadata rule while preserving the
  summary scan-only contract and existing preference/action behavior.
- Spell Detail loading uses the resolved responsive grid. The title action row
  wraps predictably, sidebar labels share one hierarchy, and mechanics use flat
  definition rows rather than a bordered panel nested inside the metadata card.
- Related spell variants reuse compact index rows behind their own secondary
  section boundary; matching and sort behavior are unchanged.
- `npm run typecheck:web`, `npm run test:web` (38 files, 158 tests), and
  `npm run -w web build` passed. Populated grouped Browse, populated Search in
  summary and full-detail modes, long-name Spell Detail, and a related-variant
  Detail were smoked in English and Chinese at `1440 x 900` and `390 x 844`;
  checked states showed no horizontal overflow, clipped controls, or duplicate
  page titles.

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

## Slice 1 Audit Record

### Before-State Evidence

The live local app was reviewed at a `1440 x 900` desktop viewport and a
`390 x 844` mobile viewport in both English and Chinese. The review covered
Browse, populated Search, Spell Detail, Publications, the spellbook index,
Favorites, Prepared, Settings, and About / Status. Disposable screenshots were
reviewed during the audit and were not committed.

- Browse and Search already share a recognizable side-control, scope-summary,
  result-card, and responsive-disclosure model. Mobile filters default closed
  and results remain immediately reachable.
- Spell Detail already has the strongest reading hierarchy: a fixed desktop
  metadata column, a wider rule-text surface, and metadata-first mobile
  stacking. The responsive title currently renders two semantic `h1` elements
  and hides one with CSS; implementation should retain one semantic title.
- Publications is a deliberately dense management list. Its grouped rows,
  two-column desktop layout, one-column mobile layout, and publication controls
  fit without horizontal overflow.
- Prepared is a deliberately specialized workflow with its own side selector
  and action surface. Its mobile selector defaults closed, but its header and
  toolbar actions need the same priority and wrapping rules as other pages.
- Settings and About / Status contain the clearest excess framing: repeated
  bordered cards are nested inside outer cards, making section and field
  hierarchy less clear, especially on mobile.
- No scoped route showed incoherent overlap or horizontal document overflow in
  the audited states. English creates the greatest control-width pressure;
  Chinese makes excessive framing and weak heading distinctions more visible.

### Classification And Decisions

Shared-system gaps:

- Page headers need one responsive action rail with stable title/description
  rhythm, predictable wrapping, and explicit neutral, primary, and destructive
  action priority. Import/export and destructive collection actions are the
  main acceptance cases.
- Side-control cards need one section vocabulary for headings, helper text,
  dividers, disclosure, and reset actions. Class/domain selectors and Settings
  subsections should not read as decorative cards nested inside cards.
- Framed surfaces need one density scale for compact controls, ordinary
  content, and reading content. `StatusCard` remains the shared feedback base;
  empty pages should not gain decorative filler.
- Buttons, segmented controls, chips, labels, and disabled/focus states need
  shared semantic roles rather than route-local visual emphasis. Destructive
  color must describe a destructive command, not a commonly used import
  action.
- Responsive layout should change presentation without duplicating semantic
  headings or required actions in the DOM. Long English labels are the sizing
  baseline; Chinese copy must retain an equally clear hierarchy.

Route-specific gaps:

- Spell Detail should consolidate its responsive title structure and align its
  action row with the shared header vocabulary while preserving the reading
  layout and metadata-first mobile order.
- Publications should align its control surface, group headers, and row rhythm
  with shared tokens without becoming a generic card grid or losing density.
- Collections and Prepared need clearer action grouping and mobile wrapping;
  Prepared keeps its specialized mode and copy tools.
- Settings should replace its nested visual panels with labeled sections or
  field groups. About / Status should use the same section rhythm while keeping
  its tabbed status/credits structure and dense metadata values.

Intentional differences to preserve:

- Browse remains filter-first and Search remains name-first with an explicit
  full-text mode. Their current URL, reset, scope-summary, and collapsed mobile
  filter behavior remain product contracts.
- Browse and Search do not need a decorative page title before their working
  controls. Spell Detail keeps a stronger title scale than utility pages.
- The existing single-column, side-column, and wide page widths remain useful
  domain-specific layouts; cohesion does not require one universal max width.
- Spell Detail remains a reading surface, Publications remains a dense
  selection surface, and Prepared remains a specialized repeated-action
  surface. They should share primitives without being forced into one page
  template.
- Result pagination, local display preferences, scan-only summary cards, and
  all accepted backend/query/i18n contracts remain behaviorally unchanged.

### Shared Vocabulary To Implement

Prefer extending the current layout helpers and local UI wrappers over adding
a parallel component system. The implementation should converge on:

- page rhythm: existing page-width classes plus shared header, content-gap,
  and responsive action-rail rules;
- side controls: the existing side-card shell plus a flatter section/fieldset
  treatment for grouped controls;
- surfaces: compact control, ordinary content, and reading density roles with
  consistent border, padding, heading, and muted-text treatment;
- actions: shared button grouping and priority rules for page headers,
  toolbars, destructive commands, and narrow-screen wrapping;
- states: `StatusCard` for loading, empty, validation, and error feedback, with
  route copy and actions remaining specific;
- typography: utility-page title, spell title, section heading, field label,
  body, metadata, and muted-source roles, without introducing a novelty font;
- visual identity: near-neutral paper and ink roles, fine rule lines, and one
  restrained binding accent used for navigation, section orientation, and
  source context rather than broad page washes or decorative chrome.

### Accepted Visual Direction

Use a modern rules index as the visual model. Search and Browse should read
like an index, Spell Detail like a clean reference page, and Publications like
a compact contents/catalog surface. Their controls remain part of the existing
modern UI system; identity comes from hierarchy, alignment, separators, and
content metadata rather than faux parchment or fantasy ornament.

The first implementation pass is a representative style spike over shared
tokens plus Search, Spell Detail, and Publications. Accept it in English and
Chinese at desktop and mobile widths before extending the treatment to the
remaining routes.

Implementation result:

- `web/app/app.css` now owns near-neutral paper, raised surface, ink, fine-rule,
  and restrained binding-accent roles. The root shell, brand, shared page
  header, and source badges consume those roles without replacing local UI
  wrappers.
- Search uses an index boundary and quiet source gutter treatment; Spell Detail
  uses one semantic title in a responsive grid plus a distinct reading surface;
  Publications uses the shared page hierarchy and compact directory grouping.
- The first color review rejected warm-tinted ordinary borders and paper. Final
  tokens keep regular surfaces neutral and reserve the binding accent for
  brand, selected state, source context, and major structural rules.
- `npm run typecheck:web`, `npm run test:web`, and `npm run -w web build`
  passed. Search, Spell Detail, and Publications were smoked in English and
  Chinese at `1440 x 900` and `390 x 844`; all retained expected content and
  showed no horizontal document overflow.

### Bounded Implementation Order

1. Shared shell and semantics: normalize page rhythm, `PageHeader`, action
   grouping, side-card sections, common surface densities, and focus/disabled
   roles; add cross-route regressions and remove Spell Detail's duplicate `h1`.
2. Lookup and reading: apply the vocabulary to Browse, Search, `SpellCard`,
   scope/status/pagination surfaces, and Spell Detail while preserving search,
   filter, card-mode, and preference contracts.
3. Management and utility: apply it to Publications, spellbooks/Favorites,
   Prepared, Settings, and About / Status, retaining their intentional workflow
   differences and flattening decorative nesting.
4. Cohesion acceptance: run the full automated and browser matrix, compare the
   route set as a whole, then promote only implemented durable rules into
   `docs/design.md` and update route/component docs where ownership changed.

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

- No design-choice blocker remains before Slice 2. Desktop side controls and
  mobile default-closed disclosure are an intentional responsive difference.
- Any proposal to change which SpellCard details are user-selectable remains a
  separate product decision; the cohesion pass should style the accepted
  preferences rather than replace them.

## Follow-Up Candidates

Use this section during implementation for useful, non-blocking discoveries.
Do not park a release acceptance blocker here.

- Spell Detail currently exposes a raw source-locator string above some rule
  text. Review whether that provenance belongs in the public reading surface
  as a separate content/display decision; do not hide or reinterpret it as part
  of the styling pass.
