# v1.2.1 Freeze

## Status

**v1.2.1 FROZEN**

This document records the final canonical documentation state for the v1.2.1
handoff.

## Canonical Source Order

When v1.2.1 documents conflict, treat this freeze document as authoritative
over earlier v1.2.1 planning wording.

Use this precedence order for v1.2.1:

1. `docs/releases/v1.2.1/FREEZE.md`
2. `docs/features.md`
3. `docs/operations/import-workflow.md` and
   `docs/operations/db-content-workflow.md`
4. current module and workspace docs
5. `docs/releases/v1.2.1/full-text-search-plan.md`
6. `docs/releases/v1.2.1/README.md`

## Frozen Deliverables

1. Rebuildable content DB FTS5 spell-document index and maintained rebuild
   command.
2. Explicit name/full search API contract with stable validation, ranking,
   de-duplication, pagination, and structured-filter behavior.
3. Search-page and global-search controls for deliberate full-text queries
   without changing name search as the default.
4. Production backend and content DB activation with matching local/remote
   artifact evidence.

## Final As-Built Summary

### 1. Content Search Index And Backend Contract

Shipped behavior:

- Omitted search mode remains canonical name search; full-text search requires
  explicit `mode=full`.
- The content DB owns a trigram FTS5 document index generated from canonical
  and localized spell names, descriptions, summaries, aliases, and normalized
  mechanics text.
- `npm run -w data-tools content:search:rebuild` is the maintained index
  rebuild boundary. Its `--dry-run` path validates migrations and source rows
  without replacing the configured DB.
- Full-text queries require at least one whitespace-delimited token with three
  Unicode code points. Short connector words are ignored when a longer token
  remains; requests with no searchable token receive
  `FULL_TEXT_QUERY_TOO_SHORT`.
- Existing rulebook, class, domain, level, taxonomy, component, and mechanics
  filters apply before ranking and spell-level de-duplication.
- Multi-language and multi-variant document matches collapse to one result per
  spell before totals and pagination. Equal scores use deterministic name and
  ID ordering.
- Full-text mode fails closed with `FULL_TEXT_SEARCH_UNAVAILABLE` when the
  active read source or index is incompatible; it does not silently fall back
  to name search.

Accepted evidence:

- PR #75 merged the contract, FTS migration, data tooling, backend query path,
  regression tests, and operational workflow updates.
- Local FTS dry-run read 5,097 spells, 3,235 localized spell texts, 6,572
  summaries, and 37,228 mechanics rows, producing 11,845 documents.
- The activated index records schema version 1 and 11,845 documents.
- Focused backend coverage includes validation and unavailable errors,
  ranking, localized documents, filter combinations, de-duplication, and
  pagination.

Frozen clarification:

- Search snippets, highlighting, and field-specific match badges are not part
  of v1.2.1.
- v1.2.1 does not add an external search service or an offline/static search
  artifact.

### 2. Frontend Search Consumer

Shipped behavior:

- Search exposes a compact Name / Full text mode control and shareable
  `mode=full` URL state.
- Enter and the primary Search action remain name search. The attached Full
  text action deliberately submits the current query in full-text mode.
- Search preserves rulebook scope and all existing structured filters across
  both modes.
- Frontend validation mirrors the three-code-point token rule and preserves
  query/filter state when full-text search is too short or unavailable.
- The unavailable state offers an explicit return to name search rather than
  silently changing modes.

Accepted evidence:

- PR #76 merged the frontend consumer, English and Chinese copy, URL and API
  helpers, and focused tests.
- PR #76 Portable validation and the Cloudflare Workers production build both
  passed.
- Production SPA deep links for `/search?...&mode=full` and `/about` return
  HTTP 200.

Frozen clarification:

- This release does not redesign Search, filters, spell cards, or the
  sitewide visual system.
- Name search remains the default after v1.2.1.

### 3. Production Activation

Shipped behavior:

- The production backend at `https://api.d20spellcodex.com` runs merged
  `main@2b56438` and reads from the activated content DB.
- The activated content DB contains the v1.2.1 FTS migration and rebuilt search
  index.
- Frontend production is served by Cloudflare Workers and uses the production
  API origin.

Accepted evidence:

- Public app status reports backend commit
  `2b564381a00ef0daf3c8acf86cd9aede01d33b0c`, deployed at
  `2026-07-17T04:01:25Z`, with content status `ok` and read source `content`.
- Public content status reports generator `rules-content-normalizer-v7`, build
  time `2026-07-17T03:52:00.569Z`, 5,097 spells, and 3,560 review issues.
- Operator DB status reports `content.sqlite`, a present content DB, a matching
  compatibility alias, parent commit `2b56438`, data commit `fbdcc78`, and the
  same spell/issue counts.
- Local and remote content DB SHA-256 both equal
  `b326c449ea2c95970633fc5d6d1be222caa3544d3bc038967aa849162fbdc215`.
- Remote FTS state reports schema version 1, rebuild time
  `2026-07-17 03:52:09`, and 11,845 documents; `spellbook-api` is active.
- Production name search reports `mode=name`; representative English and
  Chinese full-text requests report `mode=full`; a short full-text query
  returns HTTP 400 with `FULL_TEXT_QUERY_TOO_SHORT`.
- Production `/`, full-text Search, and `/about` deep links return HTTP 200.

## Validation Evidence

| Check | Result | Notes |
| ----- | ------ | ----- |
| PR #75 | Pass | Backend/data full-text implementation; Portable validation and Workers build passed |
| PR #76 | Pass | Frontend full-text consumer; Portable validation and Workers build passed |
| `npm run ci:portable` | Pass | 18 server files / 92 tests; 17 data-tool harness checks; 32 web files / 136 tests; contracts, Prisma generation, runtime check, typechecks, and web build passed |
| `npm run i18n:check` | Pass | 16 namespaces; extraction made no changes |
| `npm run -w data-tools content:search:rebuild -- --dry-run` | Pass | 5,097 spells and 11,845 generated documents |
| Local/remote DB SHA-256 | Pass | Both equal `b326c449...bdc215` |
| Operator DB status | Pass | Content source, build provenance, alias, and counts match the activated artifact |
| Production API smoke | Pass | Default name mode, English/Chinese full mode, representative rulebook scope, and stable short-query error |
| Production routes | Pass | `/`, full-text Search deep link, and `/about` returned 200 |

## Known Deferred Work

- v1.2.2 is the accepted next internal quality-maintenance direction. Its plan
  should define agent-workflow hardening first and code/test QA second without
  adding user-facing scope.
- Search snippets, highlighting, and field-specific match badges remain v1.3
  Search UX candidates.
- Offline/static search artifacts remain part of a later delivery track.
- Full spell-body, spell-name, and short-description translation/proofreading
  QA remains a later release.
- Content DB upload remains operator-owned rather than part of automatic CD.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Create new v1.2.2 planning documents under `docs/releases/v1.2.2/`; do not
  add new active scope to this frozen folder.
- Use `docs/operations/db-content-workflow.md` and
  `docs/operations/import-workflow.md` for future content/FTS rebuilds.
- Do not treat older v1.2.1 plan wording as newer than this snapshot.
