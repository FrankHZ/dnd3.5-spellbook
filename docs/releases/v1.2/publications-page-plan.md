# v1.2 Publications Page Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: accepted. Slice 1 data/API metadata contract is accepted; the frontend
Publications page and Settings boundary slices were accepted and merged in PR
#65. The follow-up publication metadata refresh has been imported into the local
content DB for operator-owned deployment.

## Purpose

Add a dedicated Publications page for browsing and managing publication or
rulebook scope, backed by the minimum metadata needed to avoid frontend-only
heuristic grouping. Settings should retain general preferences rather than act
as the primary publication-management surface.

## Ownership

- Owning version: v1.2
- Owning domain: frontend-design plus DB/data support
- Primary implementation branch or specialist: frontend-design specialist, with
  DB/data specialist for metadata contract changes
- Related feature/module docs: `docs/features.md`, `docs/design.md`,
  `docs/modules/web.md`, `docs/modules/server.md`,
  `docs/operations/rules-db-notes.md`
- Upstream dependency plans: v1.1 rulebook-backed content state
- Downstream consumer plans: v1.3 sitewide UX redesign

## Agent Context

- Main gate outcome: users manage publication/rulebook scope from a dedicated
  Publications page, and grouping uses accepted metadata instead of heuristic
  labels.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2/README.md`, `docs/features.md`, `docs/design.md`,
  `docs/modules/web.md`, `docs/modules/server.md`.
- Expected edit surface: rulebook/publication API contract, minimum DB/content
  metadata, web route/components/state, tests, and this plan.
- Nearby code/tests: server rulebook/content services, contracts DTOs, Settings
  preferences, frontend scope state, Browse/Search rulebook scope summaries.
- Validation or acceptance evidence: server/API tests, web tests/build, i18n
  checks if copy changes, and manual route smoke.
- Non-goals and follow-up parking: do not redesign all settings, filters, spell
  cards, or the broader design system.
- Handoff owner: main gate after frontend-design and DB/data review.

## Problem

Rulebook scope currently lives primarily inside Settings, and frontend grouping
still depends on display heuristics. The expanded corpus needs a clearer user
surface and a small, explicit publication metadata contract.

## Goals

- Add a Publications page for browsing publications/rulebooks and managing
  scope.
- Move primary publication-scope management out of Settings while preserving
  general settings.
- Add minimum DB/API metadata for robust grouping: category, family or setting,
  source kind, display abbreviation, ordering, and review status when accepted.
- Preserve existing Browse/Search/Detail scope behavior.

## Non-Goals

- Do not implement the complete v1.3 sitewide redesign.
- Do not perform a broad publication schema review beyond page needs.
- Do not remove existing rulebook scope behavior before the Publications page
  has accepted parity.

## Current Facts

- v1.1 accepted Settings rulebook tabs and rulebook scope links.
- v1.1 freeze deferred formal publication/rulebook metadata to v1.2.
- Local content DB import has accepted the Slice 1 rulebook metadata contract:
  `RulebookContent` has 151 rows, including 111 accepted rows with publication
  year/date details from maintained local metadata.
- Production DB upload remains operator-owned and outside automatic CD.

## Plan

### Slice 1: Minimum Metadata Contract

- Deliverable: accepted metadata fields and API/DTO shape for publication
  grouping.
- Expected files: DB/content metadata handling, contracts, server tests, and
  docs.
- Validation: server/API tests and data-tool checks relevant to metadata.
- Implementation notes: `RulebookContent` now carries
  `publicationCategory`, `publicationFamily`, `publicationSourceKind`,
  `publicationDisplayOrder`, `publicationYear`, `publicationDate`,
  `publicationUrl`, `publicationImage`, and `publicationReviewStatus`.
  Data-tools consumes the maintained local publication metadata JSONL at
  `data/rulebook-publications/publications.jsonl`; `rulebooks:publications:seed`
  creates a review-starting seed from rules-clean publication fields and CHM
  labels. Review rows may keep seed year/date/URL/image values for QA, but
  generated content only exposes those detail fields after a row is marked
  `accepted`. `/api/rulebooks` exposes the metadata so frontend consumers do not
  need publication grouping heuristics. `publicationDisplayOrder` is not
  publication chronology; the current seed derives it from the category bucket
  plus the rules-clean legacy id, so it should be treated as a manual/fallback
  ordering field rather than the primary sort key.
- Enrichment notes: 111 rows now have accepted publication year/date output and
  source provenance in local data fields (`isbn10`, `isbn13`,
  `metadataSources`). The remaining rows are still `review` or `deferred`;
  Dragon Magazine issue rows and web-only source metadata should use
  issue-specific or page-specific sources instead of the book ISBN workflow.
- Acceptance evidence: local `CONTENT_DATABASE_URL` was migrated/imported by the
  DB handoff, and read-only verification on 2026-07-11 showed
  `RulebookContent` has 151 rows, 111 `accepted` rows, and 111 rows with
  `publicationDate`.

### Slice 2: Publications Page

- Deliverable: dedicated route and user flow for publication/rulebook browsing
  and scope management.
- Expected files: web route/components/state/tests and i18n copy.
- Validation: targeted web tests, `npm run i18n:check`, and manual desktop/
  mobile smoke.
- Implementation notes: `codex/web-publications-page` adds `/publications`,
  metadata-first publication grouping, visible-scope select/clear actions,
  browser-local rulebook selection updates, EN/ZH UI copy, and desktop/mobile
  smoke coverage. The reader-facing catalog keeps curated display abbreviations
  beside localized titles, falls back to source abbreviations only when needed,
  and reserves its supporting line for publication date and source URL. A page
  control sorts rows within each category/family by accepted publication date or
  display abbreviation without changing the category/family hierarchy. Date
  sorting uses `publicationDate`, then `publicationYear`, puts undated rows last,
  and falls back to display abbreviation/id. `publicationDisplayOrder` remains a
  grouping/manual fallback rather than row chronology. Review status and source
  kind remain available to data/API workflows but are not rendered as row
  badges.

### Slice 3: Settings Boundary And Existing Consumers

- Deliverable: Settings keeps general preferences, and Browse/Search/Detail
  scope links point to the correct publication-management surface.
- Expected files: Settings route updates, scope summary links, feature docs.
- Validation: Browse/Search/Detail route smoke and regression tests.
- Implementation notes: `codex/web-publications-page` removes the legacy
  Settings rulebook tab, entry card, selector, selector tests, and rulebook
  display toggle. Publications is the only rulebook-scope management page;
  Browse/Search scope summaries link there directly.

## Acceptance Criteria

- Publications page is the primary place to inspect and manage publication or
  rulebook scope.
- Settings contains no rulebook tabs, entries, selectors, or display controls.
- Supported grouping uses accepted metadata rather than frontend-only
  heuristics.
- Existing rulebook scope behavior in Browse/Search/Detail remains intact.
- Tests and manual smoke cover English/Chinese UI and desktop/mobile layout for
  the changed surfaces.

## Doc Updates

- Update this plan when Publications page slices are accepted.
- Update `docs/features.md` after the user-visible page ships.
- Update `docs/design.md` only for durable page/layout guidance.
- Update `docs/operations/rules-db-notes.md` or import docs if metadata changes
  data workflow.
- Update `docs/roadmap.md` only when v1.2 ordering changes.
- Do not update `integrated-plan.md` unless cross-track sequencing changes.

## Open Questions

- Which remaining publication rows need curated display-abbreviation or
  category/family overrides after the accepted frontend grouping model ships?
- Which Dragon Magazine issue dates and Web-source metadata, if any, should be
  accepted after issue-specific source review?

## Follow-Up Candidates

- Broader publication schema review after the Publications page validates the
  first metadata contract.
- Internet Archive item/resource layer for reviewed rulebooks: keep
  `publicationUrl` reserved for official or archived-official product pages and
  `metadataSources` reserved for publication-date provenance, but consider a
  separate reviewed resource JSONL/DB contract for Archive item pages, readable
  scans, PDFs, OCR, and ARK identifiers.
- Sitewide filter and scope UI redesign in v1.3.

## Completion Notes

Use this section only after implementation review.

- Slice 1 DB/data/API contract accepted on 2026-07-10. Parent repo commits:
  `f78b752`, `ce6fd69`, `1281148`. Nested data repo commits: `0e1b8e2`,
  `2ba201a`.
- Validation evidence includes `rules:content:generate`, data-tools portable
  tests/typecheck, contracts build/check, server build/tests, and local content
  DB verification showing 151 `RulebookContent` rows with 37 accepted
  publication-date rows.
- Frontend Slices 2 and 3 were accepted and merged on 2026-07-11 in PR #65. The
  final page uses metadata-first grouping, compact reader-facing rows,
  curated display abbreviations with source fallback, date/source supporting
  metadata, browser-local scope controls, date/abbreviation row sorting within
  stable groups, no Settings rulebook surface, and the accepted Browse/Search
  links.
- Frontend validation includes `npm run i18n:check`, `npm run typecheck:web`,
  `npm run -w web build`, 127 passing web tests, focused publication grouping
  tests, `git diff --check`, and EN/ZH desktop/mobile browser smoke without raw
  i18n keys or horizontal overflow.
- Publication metadata refresh accepted on 2026-07-11. Nested data repo commits:
  `500e17b`, `faeac25`; parent repo commit: `b64cc4f`. Validation:
  `npm run -w data-tools test:portable`,
  `npm run -w data-tools rules:content:generate`,
  `npm run -w data-tools rules:content:import -- --dry-run`,
  `npm run -w data-tools rules:content:import`,
  `npm run -w data-tools rules:content:parity`,
  `npm run -w data-tools rules:content:meta`, and
  `npm run -w server test -- --run tests/rulebooks.test.ts`. Local content DB
  meta reports 5097 `SpellContent` rows, 151 `RulebookContent` rows, 111
  accepted publication rows, 111 publication-date rows, 66 image rows, and 46
  URL rows. The follow-up source-data pass replaces obsolete direct Wizards
  product URLs with fixed Wayback archived-official URLs while keeping Open
  Library links as publication-date provenance.
