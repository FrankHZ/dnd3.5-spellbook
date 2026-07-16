# v1.2 Freeze

## Status

**v1.2 FROZEN**

Frozen on 2026-07-16.

This document records the final canonical documentation state for the v1.2
formal public release handoff.

## Canonical Source Order

When v1.2 documents conflict, treat this freeze document as authoritative over
earlier v1.2 planning documents.

Use this precedence order for v1.2:

1. `docs/releases/v1.2/FREEZE.md`
2. current focused topic docs changed by v1.2
3. current operational docs changed by v1.2
4. focused v1.2 plan documents

## Frozen Deliverables

1. Full-spell v6.01 source inventory and v6.00 parsed-source quality review.
2. Evidence-backed full-corpus correction apply plus durable DB/content
   workflow and fixture-manifest coverage.
3. Explicit mechanics display coverage, normalized English display, Chinese
   mechanics localization, and raw-text fallback.
4. Publication metadata contract and dedicated Publications page for
   publication/rulebook scope management.
5. Production backend and content DB activation with matching local/remote
   provenance.

## Final As-Built Summary

### 1. Full-Spell Source Review And Corrections

Shipped behavior:

- `spells-full:inspect -- source-package` inventories the ignored local v6.01
  package without mutating SQLite.
- The committed source review separates package inventory, parsed-source
  defects, blocked direct imports, and bounded follow-up queues.
- The historical v6.00 parsed JSON is not treated as a clean direct-import
  source.
- The accepted full-corpus correction patch applies only 34 reviewed,
  source-located operations: 26 raw component-token corrections and 10 paired
  description/HTML corrections, with two overlapping rows.
- The correction patch, review ledger, and deferred ledger are covered by the
  portable fixture manifest while real content remains in the nested `data/`
  repo.

Accepted evidence:

- PR #68 merged the full-spell source review.
- PR #70 merged the correction handoff and local DB/content apply evidence.
- The v6.01 package inventory reports 6 files, 7,400 source-index rows, 7,285
  sourced rows, and 115 redirects.
- The v6.00 parsed source contains 5,411 rows and 120 high-confidence
  body/table-name parser artifacts.
- `corpus-inventory` reports zero ready patch rows.
- All 171 previously accepted full-corpus rows have an audit disposition:
  134 no material drift, 1 already-correct editorial row, 34 material
  corrections, and 2 malformed-source deferrals.
- `rules:manifest:verify` passes with 223/223 spell operations and 41/41
  rulebook operations.
- Focused checks over all 34 correction operations report zero failures.

Frozen clarification:

- The two malformed-source rows remain deferred for source-specific review.
- No broad v6.01 import or full-corpus reparse is part of v1.2.

### 2. Mechanics Localization And Display Safety

Shipped behavior:

- Mechanics parser/review status is separate from display coverage.
- `complete` mechanics facets may use deterministic normalized display;
  `partial`, `review`, and unsupported non-empty facets preserve authoritative
  raw text.
- Complete mechanics values use the maintained
  `spell-mechanic-vocabulary` locale namespace in Chinese.
- Spell Detail exposes normalized mechanics metadata from content-backed reads
  while legacy rules-source responses remain compatible without that metadata.
- The portable i18n audit covers filter, detail, and normalized-display keys.

Accepted evidence:

- PR #72 merged mechanics normalization, API metadata, locale resources,
  frontend consumption, and tests.
- The current content artifact contains 40,776 mechanics facets:
  - 18,097 `complete`
  - 4,726 `partial`
  - 3,548 `review`
  - 14,405 `empty`
- `rules:content:review` reports zero taxonomy review rows, 6 component review
  rows, and 3,548 mechanic review rows.
- `npm run i18n:check` passes for 16 namespaces.
- Mechanics audit coverage includes 25 filter keys, 16 detail keys, and 40
  normalized display keys.
- Production `Fiery Assault` detail returns the Chinese name `烈焰诀`, eight
  mechanics facets, and complete coverage for casting time and range while
  review/empty facets retain the fallback contract.

Frozen clarification:

- Target, effect, and area remain conservative raw-display fields unless later
  corpus work proves complete structured coverage.
- Full spell-body, spell-name, and short-description translation QA remains
  outside v1.2.

### 3. Publications And Scope Management

Shipped behavior:

- `RulebookContent` carries publication category, family, source kind, display
  order, year/date, URL/image, display labels, and review status.
- Accepted publication metadata is maintained in the nested data repo and
  generated into the content DB.
- `/publications` is the primary publication/rulebook browsing and scope
  management surface.
- Settings no longer contains the legacy rulebook-management UI.
- Browse/Search scope links route to Publications.
- Publications groups rows by accepted metadata and supports stable
  date/abbreviation sorting inside category/family groups.

Accepted evidence:

- PR #64 merged the publication metadata contract.
- PR #65 merged the Publications page and Settings boundary.
- PR #66 merged publication metadata refresh and row sorting.
- The content DB contains 151 `RulebookContent` rows.
- Maintained metadata/import acceptance records 111 accepted publication rows
  with publication dates.
- Production `/api/rulebooks` exposes 104 spell-bearing runtime publications:
  69 accepted/date-bearing rows and 35 review rows, grouped as 2 core, 42
  supplement, 25 setting, and 35 magazine rows.
- Production `/publications` returns HTTP 200 through SPA deep-link fallback.

Frozen clarification:

- `publicationDisplayOrder` remains a grouping/manual fallback, not canonical
  publication chronology.
- Remaining review/deferred publication metadata and a possible reviewed
  archive-resource layer are follow-up work.

### 4. DB/Content Workflow And Artifact

Shipped behavior:

- `docs/operations/db-content-workflow.md` is the durable DB/content handoff
  entry point.
- `docs/operations/import-workflow.md` owns local patch/import/rebuild commands;
  `docs/operations/deployment.md` owns manual remote activation.
- Real source/review/patch data stays in the nested `data/` repo; schemas,
  validators, synthetic fixtures, and harnesses stay in the parent repo.
- Content DB regeneration records parent/data commits, dirty flags, rules
  manifest and DB hashes, migration-set hash, generator version, and counts.
- DB upload remains operator-owned and is not part of automatic CD.

Accepted evidence:

- PR #71 merged fixture-manifest coverage and durable workflow routing.
- `npm run -w data-tools acceptance:local` passes.
- Local content DB SHA-256:
  `77da7a68d77362244fcc0741ed8cc8ec7690c57648b663d38afc024d4eb8d6e0`.
- Current build metadata:
  - generator: `rules-content-normalizer-v7`
  - parent repo: `2d98ed43e78cfbcdfbe4707838bb55dfcb788235`
  - data repo: `fbdcc780ff4f229e4bc3416a5a5d2a1a11b30a28`
  - generated: `2026-07-16T12:58:07.771Z`
  - parent/data dirty flags: `false` / `false`
- Current content counts:

| Table | Rows |
| ----- | ---: |
| `SpellContent` | 5,097 |
| `RulebookContent` | 151 |
| `SpellTaxonomyFacet` | 8,971 |
| `SpellComponent` | 46,039 |
| `SpellMechanicFacet` | 40,776 |
| `RulesContentIssue` | 3,560 |

Frozen clarification:

- Release plans record acceptance history; current DB/content work should start
  from the operations docs.
- Local databases, generated reports, and nested data files remain excluded
  from the parent repo.

### 5. Production Activation

Shipped behavior:

- The backend at `https://api.d20spellcodex.com` runs the merged `main` branch.
- Production spell reads use the activated content DB.
- Detailed DB provenance remains operator-token protected; public About/Status
  uses the redacted app-status response.

Accepted evidence:

- Backend status reports commit
  `e244a0227052114faed5cfae1b40aec73d77aef6`, ref `main`, deployed at
  `2026-07-16T18:19:10Z`.
- Public app status reports content `ok`, active read source `content`, 5,097
  spells, 3,560 issues, and generator v7.
- Operator DB status matches the local build parent/data commits and all table
  counts above; `content.sqlite` exists and the compatibility alias matches it.
- The DB artifact is correctly attributed to the last content-affecting commit
  `2d98ed4`; the deployed backend includes later docs-only PR #73 at
  `e244a02`.
- Production routes `/`, `/publications`, `/search`, and `/about` return HTTP
  200.
- CORS allows `https://www.d20spellcodex.com` and does not allow
  `https://evil.example`.
- Unauthenticated `GET /api/status/db` returns 404.

## Validation Evidence

| Check | Result | Notes |
| ----- | ------ | ----- |
| PR #64 | Pass | Publication metadata contract |
| PR #65 | Pass | Publications page and Settings boundary |
| PR #66 | Pass | Publication metadata refresh and row sorting |
| PR #68 | Pass | Full-spell source review |
| PR #70 | Pass | Full-corpus correction handoff and local apply evidence |
| PR #71 | Pass | DB/content workflow and fixture-manifest hardening |
| PR #72 | Pass | Mechanics normalization, localization, and frontend consumer |
| `npm run ci:portable` | Pass | 18 server files / 80 tests; 16 data-tool harness checks; 32 web files / 132 tests; contracts, typechecks, runtime check, and web build passed |
| `npm run -w data-tools acceptance:local` | Pass | 223 spell ops, 41 rulebook ops, 5,097-spell parity, zero import blockers |
| `npm run -w data-tools rules:content:review` | Pass | 18,097 complete mechanics rows; 3,548 review rows |
| `npm run -w data-tools rules:content:meta` | Pass | Local build metadata matches production provenance |
| `npm run i18n:check` | Pass | 16 namespaces |
| Short-description import dry-run | Pass | 6,572 unchanged rows; zero inserts or updates |
| Production backend status | Pass | `e244a02`, `main`, content status `ok` |
| Operator DB status | Pass | Content build and counts match local metadata |
| Production routes | Pass | `/`, `/publications`, `/search`, `/about` returned 200 |
| Production CORS | Pass | Allowed origin accepted; unapproved origin omitted |
| Public DB status privacy | Pass | Unauthenticated `/api/status/db` returned 404 |
| Representative mechanics smoke | Pass | `Fiery Assault` / `烈焰诀` exposes expected display coverage |

## Known Deferred Work

- v1.2.1 content-backed full-text spell search is the next active release.
- Result snippets/highlighting and broader Search UX remain v1.3 work.
- Full spell-body, spell-name, and short-description translation/proofreading QA
  remains a later release.
- The 61 reviewed parsed names missing from the v6.01 index, 56 v6.01
  index-only names, and two malformed correction rows remain bounded source QA.
- Remaining publication metadata review and archive-resource modeling remain
  follow-up work.
- Broader sitewide UX/style redesign remains v1.3.
- Automatic DB deployment remains deferred; activation stays operator-owned.

## Handoff Notes

- Use `docs/roadmap.md` for work ordering after this freeze.
- Start v1.2.1 implementation from
  `docs/releases/v1.2.1/full-text-search-plan.md`.
- Use `docs/operations/db-content-workflow.md` for future DB/content handoffs.
- Do not treat older v1.2 plan wording as newer than this snapshot.
