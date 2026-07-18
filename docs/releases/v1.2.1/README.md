# v1.2.1 Release Plan

Status: frozen. See [FREEZE.md](./FREEZE.md) for the canonical as-built
snapshot.

v1.2.1 is a focused post-v1.2 release for content-backed spell full-text
search. It adds a deliberate full-text search mode without reopening the
v1.2 mechanics-localization scope or starting the broader v1.3 sitewide design
release.

## Release Boundary

v1.2.1 shipped one acceptance track:

1. **Content-backed full-text spell search**

   Add a full-text mode to Search that can query spell body text and supporting
   indexed text from the prepared content DB while preserving the existing
   name-search behavior as the default. Full-text results must continue to
   honor selected rulebooks and the same structured class, domain, level,
   taxonomy, component, and mechanics filters that Search already supports.

The release remained intentionally small and was delivered through a focused
backend/data branch followed by a small frontend consumer branch.

## Track Order

1. **Plan and contract review**

   Use [full-text-search-plan.md](./full-text-search-plan.md) as the owning
   plan. Confirm API shape, indexed fields, query-mode semantics, and validation
   expectations before implementation starts.

2. **Backend/data implementation**

   Add the content DB search-index migration and maintained
   `content:search:rebuild` command, then wire the API/service layer so
   `mode=full` queries the content-backed index without changing default
   `mode=name` behavior.

3. **Frontend Search consumer**

   Add a compact Search-page mode control and URL state for name versus
   full-text search. Preserve existing Browse/Search scope behavior.

4. **Acceptance and freeze**

   After implementation is accepted, manually activate a compatible content DB
   on the remote host, run production Search smoke checks, and freeze v1.2.1
   with focused API, data-tooling, frontend, deployment, and documentation
   evidence.

## Non-Goals

- Do not change the default Search mode away from name search.
- Do not add an external search service.
- Do not add offline/static search index artifacts.
- Do not add snippets, highlighting, or field-specific match badges.
- Do not make full spell-body translation or translation proofreading part of
  this release.
- Do not redesign the Search page, filter sidebar, spell cards, or sitewide UI.
- Do not add automatic content DB upload to CD.

Manual content DB activation was part of release acceptance because the
runtime feature depends on the v1.2.1 FTS migration and rebuilt index.

## Plans

- [FREEZE.md](./FREEZE.md)
- [full-text-search-plan.md](./full-text-search-plan.md)

## Release Acceptance

v1.2.1 release acceptance required:

- Existing name search remains the default and preserves current URL/filter
  behavior.
- Full-text search uses content-backed indexed text and honors rulebook,
  class/domain/level, taxonomy, component, and mechanics filters.
- Full-text mode requires at least one whitespace-delimited token with three
  Unicode code points. Shorter tokens are ignored; queries with no searchable
  token preserve Search URL/filter state and prompt for a longer term or name
  mode, while direct API requests receive a stable validation error.
- Result ordering is deterministic and gives name/alias matches higher weight
  than summary or body-text matches.
- Multi-language or multi-variant index matches collapse to one result per
  spell before `total` and pagination. Equal scores sort by canonical spell
  name and spell ID.
- Data tooling exposes the maintained, manifest-classified
  `npm run -w data-tools content:search:rebuild` command, including a dry-run
  validation path, and the normal content DB rebuild workflow runs it after
  content imports.
- `mode=full` fails closed with a stable unavailable response when the active
  read source is not `content` or the compatible FTS schema/index is absent;
  it does not return a server error or silently run name search.
- A content DB generated from the merged release commits is manually activated
  on the remote host before freeze. Remote acceptance compares
  `/api/status/db` provenance with the local artifact and smokes representative
  `mode=name` and `mode=full` requests.
- Focused backend, data-tooling, contract, frontend, and i18n validation pass
  for changed surfaces.
- User-facing docs describe Search as name-first with an optional full-text
  mode.

## Expected Documentation Updates

- `docs/features.md`: update Search behavior after implementation is accepted.
- `docs/operations/import-workflow.md`: own the maintained local search-index
  rebuild command and its position in the normal content DB rebuild sequence.
- `docs/operations/db-content-workflow.md`: route DB/content maintainers to the
  search-index step and preserve the remote activation boundary.
- `docs/operations/deployment.md`: update only if the manual activation or
  remote verification sequence changes.
- `docs/modules/server.md`, `docs/modules/data-tools.md`, or
  `docs/modules/web.md`: update only if module boundaries change.
- `docs/roadmap.md`: update when v1.2.1 becomes active, frozen, or changes the
  official release order.

## Handoff Rule

v1.2.1 is frozen. Use [FREEZE.md](./FREEZE.md) for shipped behavior and
`docs/roadmap.md` for current ordering. New work belongs in a newer release or
durable topic document; do not add active scope to this folder.
