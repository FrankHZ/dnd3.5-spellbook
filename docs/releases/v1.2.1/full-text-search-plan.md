# v1.2.1 Full-Text Search Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implementation active; backend/data slices complete, frontend consumer pending.

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

## Agent Context

- Main gate outcome: after v1.2 freeze, deliver one focused content-backed
  full-text Search mode while preserving name search as the default. Backend
  and data ownership land first; the frontend consumes the accepted contract
  afterward.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2.1/README.md`, `docs/features.md`,
  `docs/operations/db-content-workflow.md`,
  `docs/operations/import-workflow.md`, `docs/modules/server.md`,
  `docs/modules/data-tools.md`, `docs/modules/web.md`, and the workspace
  READMEs for every edited workspace.
- Expected edit surface: shared spell-search DTOs; content DB migrations;
  server Search controller/service/repository code; the maintained data-tool
  search-index command and manifest; Search URL/API/page code; focused tests,
  locale resources, and owning operations/topic docs.
- Nearby code/tests: `contracts/src/dto/spell.ts`,
  `server/src/controllers/spells.controller.ts`,
  `server/src/services/spells/`,
  `server/tests/spells.search.test.ts`, `web/app/api/spells.ts`,
  `web/app/features/search/`, `web/app/api/spells.test.ts`, and
  `data-tools/src/db/`.
- Validation or acceptance evidence: contract build/runtime check, focused
  server API tests, data-tools typecheck and portable helper tests, local DB
  dry-run/rebuild acceptance, focused Search URL/API/page tests, web typecheck,
  i18n check, and manual English/Chinese plus remote production smoke.
- Non-goals and follow-up parking: do not add snippets, highlighting, external
  search infrastructure, offline search artifacts, full-body translation QA,
  or broader Search/UI redesign. Park those in this plan's follow-up section or
  the owning later release.
- Handoff owner: backend/data specialist hands the stable contract and local DB
  evidence to the focused frontend specialist; both return to the main gate for
  acceptance. Librarian owns the final cross-doc/freeze sweep after
  implementation is accepted.

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
- Do not add result snippets, highlighting, or field-specific match badges;
  defer those to the v1.3 Search/UX pass.
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
  terms as body text. v1.2.1 therefore requires at least three Unicode code
  points for every `mode=full` query; existing name-mode validation remains
  unchanged.

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
- Require at least three Unicode code points after trimming for `mode=full`.
  Keep the existing language-aware name-search minimums for `mode=name`.
- Return a stable `FULL_TEXT_QUERY_TOO_SHORT` validation error for direct API
  requests below the full-text minimum. The frontend should apply the same
  validation before requesting results.
- Rename shared and internal search symbols from the name-only vocabulary to
  neutral search vocabulary as part of the contract change:
  `SpellSearchQuery`, `SpellSearchResponse`, and `searchSpells`. Keep
  `GET /api/spells/search` unchanged. Do not retain parallel
  `SpellNameSearch*` aliases after all in-repo consumers have migrated.
- Keep the v1.2.1 response card-oriented. Do not add match snippets or
  highlighting payloads.

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
- A spell may have multiple matching language/variant documents. Apply
  structured filter eligibility, then collapse matches by `spellId` and retain
  only that spell's best weighted document score. Do not add scores across
  documents, because spells with more locale/variant rows must not gain an
  artificial ranking advantage.
- Compute `total` from the distinct eligible `spellId` set and paginate only
  after de-duplication. A spell must not appear twice in one page or recur on a
  later page for the same stable query.
- Sort by best weighted score descending, then canonical spell name ascending
  with case-insensitive comparison, then spell ID ascending. This tie-break
  order is the stable pagination contract.
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
- When a full-text query contains fewer than three Unicode code points, keep
  `mode`, `q`, and every selected filter in the URL, do not issue the full-text
  request, and prompt the user to enter a longer term or switch to name mode.
- Preserve current Search sidebar filters, scope summary, pagination, density,
  and spell-card display behavior.

## Acceptance Criteria

- Existing name search works unchanged when `mode` is omitted.
- Full-text search returns body/summary/mechanics matches that name search
  would not find.
- Full-text search honors rulebook scope and all existing structured Search
  filters.
- Full-text mode requires at least three Unicode code points after trimming.
  Short CJK and non-CJK queries preserve URL/filter state, show the longer-term
  or name-mode prompt, and are rejected by the API with
  `FULL_TEXT_QUERY_TOO_SHORT` if requested directly.
- Search result ordering is stable and gives higher priority to name/alias
  matches than lower-signal body matches.
- Multi-language or multi-variant document matches collapse to one result per
  `spellId` using the best weighted score before `total` and pagination are
  calculated. Equal scores sort by canonical spell name and then spell ID, so
  cards cannot duplicate within or across pages.
- v1.2.1 does not expose snippets, highlighting, or match-detail payloads.
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

- None for specialist handoff. Short-query behavior, snippets, result
  de-duplication, pagination, and stable tie-breaking are resolved above.

## Follow-Up Candidates

- Snippet highlighting and field-specific match badges for the v1.3 Search UX
  pass.
- Offline/static search index artifacts for a future static/offline delivery
  track.
- Full translated body search after large-scale translation QA is accepted.

## Completion Notes

- Backend/data implementation is split across contract (`892bdba`), DB/tooling
  (`a672efe`), and server query (`3474581`) commits for focused review.
- The content DB now owns a trigram FTS5 document index plus explicit rebuild
  state; `content:search:rebuild` is the maintained dry-run/write boundary.
- API coverage includes default name mode, stable full-mode validation and
  unavailable errors, weighted multi-variant de-duplication, deterministic
  pagination, localized text, and the complete existing structured filter set.
- Local acceptance applied all 11 content migrations, dry-ran and rebuilt
  11,845 documents from 5,097 spells, and smoked compiled `mode=name` and
  `mode=full` requests against the real local content DB.
- Slice 4 remains with the frontend specialist. Do not treat backend URL access
  to `mode=full` as completion of the reader-facing mode control.
