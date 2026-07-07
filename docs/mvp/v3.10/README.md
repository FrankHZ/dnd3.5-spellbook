# v3.10

Status: frozen.

v3.10 is the final MVP closeout version. It should make the existing app feel
complete and consistent to users without pulling deferred stable-track
engineering back into MVP scope.

The frozen shipped snapshot is `docs/mvp/v3.10/FREEZE.md`.

## Committed Scope

1. Complete filter-facing i18n for stable server-provided vocabulary by adding
   frontend display adapters keyed by accepted filter keys, with server labels
   as fallback.
2. Run a UI/UX cohesion pass across the existing user-facing app surfaces so
   pages feel like one product without a broad redesign or new design system.
3. Close MVP with an end-to-end acceptance sweep across primary pages,
   languages, and desktop/mobile layouts.

## Track Order

1. **Filter i18n complete pass**

   The i18n specialist owns localized display for taxonomy, component, and
   mechanics filter vocabulary, Browse/Search scope summaries, and supported
   Spell Detail mechanics notes.

2. **UI/UX cohesion pass**

   The frontend-design specialist owns layout density, button placement,
   state display, and mobile stacking consistency across TopBar, Browse/Search,
   Advanced filters, result lists, Spell Detail, collections, prepared spells,
   settings, and about/status surfaces.

3. **MVP closeout acceptance and freeze**

   The librarian owns final acceptance evidence, navigation cleanup, and the
   v3.10 freeze sweep after implementation branches are accepted.

Do not create `integrated-plan.md` unless these child plans start conflicting
on scope, delivery sequence, or ownership.

## Non-Goals

- Do not add content artifact or versioned DB release automation.
- Do not add static/offline HTML artifact generation.
- Do not start large-scale Chinese/English translation or proofreading QA.
- Do not promote `target` / `effect` / `area` backend normalization.
- Do not create a complete design-system documentation project.
- Do not force broad dependency, security, deploy, DB, or module-boundary work
  into v3.10 unless it directly blocks MVP acceptance.

## Plans

- [FREEZE.md](./FREEZE.md)
- [filter-i18n-plan.md](./filter-i18n-plan.md)
- [ui-ux-cohesion-plan.md](./ui-ux-cohesion-plan.md)

## MVP Closeout Acceptance

Freeze acceptance covered the app as a user-facing MVP, not only the two
implementation branches:

- English and Chinese UI smoke for Browse, Search, Spell Detail, collections,
  prepared spells, settings, and about/status pages.
- Desktop and mobile smoke for Browse/Search filters, Advanced filters,
  result-list density, Spell Detail, collection/prepared workflows, and
  settings/about layout.
- Regression check that Browse remains filter-first, Search remains name-first,
  and filter state remains shareable through URL/query helpers.
- Confirmation that server-provided vocabulary still has safe fallback labels
  when a frontend localized label is missing.
- Validation command evidence from the accepted implementation branches plus a
  final closeout pass recorded in `FREEZE.md`.

## Validation

Final validation evidence is recorded in [FREEZE.md](./FREEZE.md).

## Working Rule

Use `filter-i18n-plan.md` as the v3.10 source of truth for localized filter and
mechanics display. Use `ui-ux-cohesion-plan.md` for interface consistency and
closeout polish.

v3.10 is frozen. Future implementation branches should update current topic
docs or active release plans rather than adding new scope to this MVP folder.
