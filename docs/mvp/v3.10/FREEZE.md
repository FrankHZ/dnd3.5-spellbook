# v3.10 Freeze Snapshot

Status: frozen.

v3.10 is the final MVP closeout snapshot. It freezes the user-visible
completion pass for localized filter vocabulary, UI/UX cohesion, and MVP
acceptance before the project moves to the formal v1.0 release track.

## Canonical Source Order

When documents overlap, read them in this order:

1. This `FREEZE.md` for the as-built v3.10 handoff state.
2. Current durable topic docs for ongoing behavior and workflow:
   `docs/features.md`, `docs/design.md`, `docs/i18n.md`,
   `docs/frontend-map.md`, `docs/modules/`, and `docs/operations/`.
3. Focused v3.10 child plans for implementation rationale and follow-up
   context:
   - `docs/mvp/v3.10/filter-i18n-plan.md`
   - `docs/mvp/v3.10/ui-ux-cohesion-plan.md`

Do not treat older MVP plans as newer than this snapshot.

## Frozen Deliverables

1. **Filter i18n completion**

   Frontend display adapters now localize stable taxonomy, component, and
   mechanics filter keys while preserving server labels as fallback display
   text for unknown or future vocabulary.

2. **UI/UX cohesion pass**

   Primary MVP pages now share a more consistent interface grammar for page
   headers, sidebars, filter panels, result cards, status states, spell detail
   metadata, collection workflows, prepared-spell workflows, settings, and
   about/status surfaces.

3. **MVP closeout handoff**

   v3.10 closes the MVP stage. Formal post-MVP release planning now continues
   under `docs/releases/v1.0/`.

## As-Built Summary

### Filter i18n

- Localized display adapters cover taxonomy, component, and mechanics
  vocabulary used by Browse, Search, Advanced filters, active-scope summaries,
  and Spell Detail supported-mechanics notes.
- Server-provided labels remain the fallback when a localized frontend label is
  missing.
- Filter query params, URL state, API helper behavior, and server-owned
  vocabulary semantics remain unchanged.
- Landed in PR #44, merge commit `f2868e0`.

Deferred follow-up:

- Confirm whether casting-time vocabulary should distinguish `full-round
  action` from `1 round`. That is a rules taxonomy question, not a v3.10
  localization blocker.

### UI/UX Cohesion

- Shared `PageHeader`, `StatusCard`, side-column CSS helpers, collapsible
  sidebar patterns, and `SpellMetaBadge` now align repeated page structure and
  metadata presentation.
- Browse/Search sidebars, Advanced filters actions, display toggles, and scope
  summaries were tightened without changing Browse's filter-first role or
  Search's name-first role.
- Spell Detail now keeps the header focused on identity/actions while source,
  taxonomy, descriptor, and mechanics metadata live in a tighter sidebar
  overview.
- Collections, prepared spells, settings, and about/status surfaces now use
  more consistent page headers, card rhythm, status states, actions, and
  mobile stacking.
- `docs/design.md` and `docs/frontend-map.md` record the durable UI patterns
  accepted by this pass.
- Landed in PR #45, merge commit `27b1168`.

Deferred follow-ups:

- A fuller design-system catalog for badges, pills, buttons, headers, and
  dense workflow rows remains outside MVP closeout.
- A visual-regression screenshot gallery for primary pages would be useful
  later but is not part of v3.10 acceptance.

## Validation Evidence

Local freeze validation from `codex/docs-v3-10-freeze`:

- `npm run ci:portable` passed.
  - Server tests: 18 files, 80 tests passed.
  - Data-tools portable checks: 9 passed.
  - Web tests: 30 files, 118 tests passed.
  - Web typecheck and build passed.
  - Build emitted React Router v8 future-flag warnings and existing sourcemap
    warnings for selected UI wrapper files; these were warnings only.
- `npm run i18n:check` passed.
  - No i18n files were changed by extraction.
  - The i18n audit passed for 14 namespaces.

Accepted branch evidence:

- PR #44: filter vocabulary localization branch merged.
- PR #45: UI/UX cohesion branch merged with browser smoke covering Browse,
  Search, Spell Detail, collections, prepared spells, settings, and
  about/status on desktop and mobile widths.

## Known Deferred Work

These remain outside the frozen v3.10 MVP scope:

- v1.0 production topology and release readiness under `docs/releases/v1.0/`.
- Content artifact / versioned DB release automation.
- Static/offline HTML artifact generation.
- Large-scale Chinese/English translation and proofreading QA.
- `target`, `effect`, and `area` backend normalization.
- Full design-system documentation and visual-regression automation.
- Broader dependency, security, deploy, DB, and module-boundary work unless
  promoted by a later release plan.

## Handoff

Use `docs/roadmap.md` for current work ordering after this freeze. v1.0 is the
next active release track and should not reopen v3.10 MVP UI/i18n acceptance.
