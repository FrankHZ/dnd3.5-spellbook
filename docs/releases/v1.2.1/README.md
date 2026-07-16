# v1.2.1 Release Plan

Status: planned. Start after v1.2 mechanics localization is accepted and v1.2
is frozen.

v1.2.1 is a focused post-v1.2 release for content-backed spell full-text
search. It should add a deliberate full-text search mode without reopening the
v1.2 mechanics-localization scope or starting the broader v1.3 sitewide design
release.

## Release Boundary

v1.2.1 owns one acceptance track:

1. **Content-backed full-text spell search**

   Add a full-text mode to Search that can query spell body text and supporting
   indexed text from the prepared content DB while preserving the existing
   name-search behavior as the default. Full-text results must continue to
   honor selected rulebooks and the same structured class, domain, level,
   taxonomy, component, and mechanics filters that Search already supports.

The release is intentionally small. It should be safe to hand to a focused
backend/data specialist plus a small frontend consumer branch after the plan is
accepted.

## Track Order

1. **Plan and contract review**

   Use [full-text-search-plan.md](./full-text-search-plan.md) as the owning
   plan. Confirm API shape, indexed fields, query-mode semantics, and validation
   expectations before implementation starts.

2. **Backend/data implementation**

   Add the content DB search-index migration and rebuild path, then wire the
   API/service layer so `mode=full` queries the content-backed index without
   changing default `mode=name` behavior.

3. **Frontend Search consumer**

   Add a compact Search-page mode control and URL state for name versus
   full-text search. Preserve existing Browse/Search scope behavior.

4. **Acceptance and freeze**

   After implementation is accepted, freeze v1.2.1 with focused API,
   data-tooling, frontend, and documentation evidence.

## Non-Goals

- Do not change the default Search mode away from name search.
- Do not add an external search service.
- Do not add offline/static search index artifacts.
- Do not make full spell-body translation or translation proofreading part of
  this release.
- Do not redesign the Search page, filter sidebar, spell cards, or sitewide UI.
- Do not add automatic content DB upload to CD.

## Plans

- [full-text-search-plan.md](./full-text-search-plan.md)

## Release Acceptance

v1.2.1 release acceptance should include:

- Existing name search remains the default and preserves current URL/filter
  behavior.
- Full-text search uses content-backed indexed text and honors rulebook,
  class/domain/level, taxonomy, component, and mechanics filters.
- Query validation handles short CJK and non-CJK terms deliberately without
  broad unindexed body scans.
- Result ordering is deterministic and gives name/alias matches higher weight
  than summary or body-text matches.
- Data tooling can rebuild or refresh the search index as part of the content
  DB workflow.
- Focused backend, data-tooling, contract, frontend, and i18n validation pass
  for changed surfaces.
- User-facing docs describe Search as name-first with an optional full-text
  mode.

## Expected Documentation Updates

- `docs/features.md`: update Search behavior after implementation is accepted.
- `docs/operations/import-workflow.md` or
  `docs/operations/db-content-workflow.md`: update if the content DB rebuild
  workflow gains a maintained search-index step.
- `docs/modules/server.md`, `docs/modules/data-tools.md`, or
  `docs/modules/web.md`: update only if module boundaries change.
- `docs/roadmap.md`: update when v1.2.1 becomes active, frozen, or changes the
  official release order.

## Handoff Rule

v1.2.1 is planned scope, not active implementation while v1.2 mechanics
localization remains open. Implementation branches should update the owning
child plan, affected topic/operations docs, and `docs/roadmap.md` only if the
active work order changes.
