# v1.2.1 Full-Text Search Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

- Add a content-backed full-text search mode for spells.
- Preserve existing Search as name-first and filter-compatible.
- Keep search implementation inside the current SQLite/content DB architecture
  instead of introducing a separate search service.

## Ownership

- Owning version: v1.2.1.
- Owning domain: backend/data with a small frontend Search consumer.
- Primary implementation branch or specialist: backend/data specialist first;
  frontend consumer branch after API shape is stable.
- Related feature/module docs: `docs/features.md`, `docs/modules/server.md`,
  `docs/modules/data-tools.md`, `docs/modules/web.md`.
- Upstream dependency plans: v1.2 freeze and the accepted content DB workflow.
- Downstream consumer plans: v1.3 sitewide UX/style redesign.

## Problem

Search currently searches spell names and localized names, then applies the same
structured filters as Browse. That is still the right default for quick spell
lookup, but the current corpus is large enough that users also need a deliberate
way to search spell body text, summaries, aliases, and indexed mechanics text.

A full-text feature should not become a parallel search product. It should reuse
the current Search page, URL model, response shape, rulebook scope, and
normalized filters wherever possible.

## Goals

- Add an explicit Search mode, for example `mode=name|full`, with `name` as the
  default.
- Query prepared content DB text through SQLite FTS5 instead of runtime source
  files or an external search service.
- Keep rulebook scope and existing Search filters active in full-text mode.
- Rank name and alias matches above summary, mechanics/header, and body-text
  matches.
- Add enough data-tooling support that the index is rebuildable with the
  content DB workflow.
- Keep runtime capability failure explicit: full-text mode must be unavailable,
  rather than silently becoming name search, when the active DB cannot serve
  the index.
- Add focused API, data-tooling, URL helper, and frontend tests for the changed
  behavior.

## Non-Goals

- Do not replace name search.
- Do not introduce Meilisearch, Typesense, Elastic, or another external search
  dependency.
- Do not add offline/static search artifacts in this release.
- Do not search ignored raw source data at request time.
- Do not make spell translation QA or body translation part of the full-text
  acceptance gate.
- Do not redesign the Search page beyond the minimal mode control and result
  status copy needed for the feature.

## Current Facts

- `GET /api/spells/search` is the current Search endpoint.
- Search already supports rulebook, class, domain, level, taxonomy, component,
  and mechanics filters.
- `SPELL_READ_SOURCE=content` is the default runtime path; the legacy `rules`
  read source remains a rollback path.
- Normalized spell text, summaries, localized text, rulebook metadata, taxonomy
  facets, component facets, and mechanics facets are already content DB data.
- SQLite in the current `better-sqlite3` runtime supports FTS5. Local probing
  also confirmed `tokenize='trigram'` table creation succeeds.
- SQLite FTS5 trigram tokenization does not match one- or two-character CJK
  terms as body text. Short CJK query behavior needs an intentional fallback.

## Plan

### Slice 1: Search Contract

- Deliverable: define the API and DTO changes for full-text mode.
- Expected files:
  - `contracts/src/dto/spell.ts`
  - `server/src/controllers/spells.controller.ts`
  - `server/src/services/spells/spells.service.ts`
  - `web/app/api/spells.ts`
  - `web/app/features/search/search-url.ts`
- Validation:
  - contract build
  - focused server API tests
  - focused Search URL helper tests

Contract direction:

- Add `mode=name|full` to Search query and response.
- Default omitted `mode` to `name`.
- Keep `q` as the user query string.
- Rename shared and internal search symbols from the name-only vocabulary to
  neutral search vocabulary as part of the contract change:
  `SpellSearchQuery`, `SpellSearchResponse`, and `searchSpells`. Keep
  `GET /api/spells/search` unchanged. Do not retain parallel
  `SpellNameSearch*` aliases after all in-repo consumers have migrated.
- Consider an optional result match payload only if the frontend needs visible
  match context in v1.2.1; otherwise keep the first implementation card-only.

### Slice 2: Content Search Index

- Deliverable: add a content DB full-text index that can be rebuilt from
  content DB source tables.
- Expected files:
  - `server/db/content/migrations/*`
  - `server/prisma-content/schema.prisma` only for non-FTS metadata models if
    needed
  - `data-tools/src/db/*`
  - `data-tools/package.json`
  - `data-tools/scripts.manifest.json`
  - `docs/operations/import-workflow.md`
  - `docs/operations/db-content-workflow.md`
- Validation:
  - data-tools typecheck
  - data-tools portable helper tests for indexed-document generation
  - local acceptance only if ignored local DB/data files are touched

Index direction:

- Use raw SQL migration for the FTS5 virtual table. Prisma does not need to
  model the virtual table.
- Prefer an FTS table keyed by spell/language/variant search documents, for
  example canonical English, localized Chinese, and summary variants.
- Build indexed text from accepted prepared content: spell name, localized name,
  aliases if available, summary text, spell body text, and stable mechanics/raw
  header text.
- Add `npm run -w data-tools content:search:rebuild` as the single maintained
  operator boundary. It belongs under `data-tools/src/db/`, is classified in
  `data-tools/scripts.manifest.json` as `maintained-local`, requires SQLite, and
  is write-capable unless `--dry-run` is supplied.
- The dry-run path validates migration/table availability, source-row
  readability, and generated document counts without changing the DB.
- Run the rebuild command after all normal content imports so the index reflects
  Chinese/English body text, summaries, aliases, and normalized mechanics from
  the final artifact. Document that position in
  `docs/operations/import-workflow.md`; keep
  `docs/operations/db-content-workflow.md` as the durable routing entry.
- Do not treat FTS shadow tables as portable fixture source-of-truth files.

### Slice 3: Backend Query Path

- Deliverable: implement full-text query execution against the content DB and
  preserve default name search behavior.
- Expected files:
  - `server/src/services/spells/spells.repo.normalized-content.ts`
  - `server/src/services/spells/spells.repo.read.ts`
  - `server/src/services/spells/spells.service.ts`
  - `server/tests/spells.search.test.ts`
- Validation:
  - `npm run test:server`
  - representative tests for name mode, full mode, filters, pagination, and
    short-query behavior

Backend direction:

- `mode=name` keeps the current name-search behavior.
- `mode=full` is content-backed. If the legacy `rules` read source is active or
  the content DB lacks the compatible FTS schema/index, return HTTP 503 with a
  stable `FULL_TEXT_SEARCH_UNAVAILABLE` error code. Do not silently degrade to
  name search.
- Preserve filter semantics by applying rulebook and normalized filter clauses
  around the FTS result set.
- Preserve rank order for full-text results instead of re-sorting everything by
  spell name.
- Cap expensive candidate expansion deliberately and document the cap in tests
  if needed.

### Slice 4: Frontend Search Consumer

- Deliverable: expose a compact mode toggle on the Search page.
- Expected files:
  - `web/app/features/search/SearchSpellsPage.tsx`
  - `web/app/features/search/search-url.ts`
  - `web/public/locales/en/spell-search.json`
  - `web/public/locales/zh/spell-search.json`
  - focused Search tests
- Validation:
  - `npm run test:web`
  - `npm run typecheck:web`
  - `npm run i18n:check`
  - manual Search smoke for English and Chinese UI

Frontend direction:

- Add a small segmented control for Name versus Full text.
- Keep Search URL state canonical and shareable through `mode`.
- Header search from Browse should continue to land in name mode unless the
  user is already on Search with `mode=full` and submits another query there.
- If the API reports `FULL_TEXT_SEARCH_UNAVAILABLE`, preserve the query and
  filters, show a concise unavailable state, and let the user switch back to
  name mode.
- Preserve current Search sidebar filters, scope summary, pagination, density,
  and spell-card display behavior.

## Acceptance Criteria

- Existing name search works unchanged when `mode` is omitted.
- Full-text search returns body/summary/mechanics matches that name search
  would not find.
- Full-text search honors rulebook scope and all existing structured Search
  filters.
- Short-query behavior is deliberate and tested for both CJK and non-CJK
  queries.
- Search result ordering is stable and gives higher priority to name/alias
  matches than lower-signal body matches.
- Shared DTOs, frontend API helpers, controller/service entry points, and tests
  use the neutral `SpellSearch*` / `searchSpells` vocabulary; the HTTP endpoint
  remains `/api/spells/search`.
- `content:search:rebuild -- --dry-run` validates the index input without
  mutation, and `content:search:rebuild` reconstructs it through a maintained,
  manifest-classified data-tool command.
- A normal content DB rebuild runs the search-index step after content imports,
  and the operations docs name the command owner and order.
- Missing/incompatible FTS schema and legacy rules-source behavior return the
  stable unavailable response and are covered by API and frontend tests.
- Before freeze, a content DB generated from the merged release commits is
  manually activated remotely. `/api/status/db` provenance matches the local
  artifact, and production smoke covers representative name and full-text
  queries without making DB upload part of CD.
- Focused server, data-tools, web, contract, and i18n validation pass.

## Doc Updates

- Update this plan when API shape, index fields, query-mode behavior, or
  validation strategy changes.
- Update `docs/roadmap.md` only when v1.2.1 becomes active, frozen, or changes
  the official release sequence.
- Update `docs/features.md` after implementation is accepted.
- Update `docs/operations/import-workflow.md` with the maintained
  `content:search:rebuild` command and its exact rebuild position.
- Update `docs/operations/db-content-workflow.md` with the search-index routing
  and manual remote activation gate.
- Update `docs/operations/deployment.md` only if the existing manual DB upload,
  activation, or verification sequence changes.
- Do not update old MVP plans or frozen release docs.

## Open Questions

- Should v1.2.1 expose match snippets, or keep result cards unchanged and
  defer snippets until the broader v1.3 Search/UX pass?
- Should one- and two-character CJK full-text queries search only names and
  summaries, or should the UI ask for a longer term before body search runs?

## Follow-Up Candidates

- Snippet highlighting and field-specific match badges for the v1.3 Search UX
  pass.
- Offline/static search index artifacts for a future static/offline delivery
  track.
- Full translated body search after large-scale translation QA is accepted.

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
