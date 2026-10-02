# Server Module

## Responsibility

`server/` owns the Express API, backend request validation, Prisma runtime
clients, and the mapping from rules/content data into shared DTOs. It should
serve application behavior; parser, source-data inspection, and rules patch
work belong in `data-tools/`.

## Main Boundaries

- API registration starts in `server/src/app.ts`.
- HTTP route modules live under `server/src/routes/`.
- Controllers translate HTTP concerns into service calls under
  `server/src/controllers/`.
- Spell behavior is split under `server/src/services/spells/`:
  - `spells.service*.ts` files own feature behavior.
  - `*.repo.rules.ts` reads legacy rules-side data.
  - `spells.repo.content.ts` reads localized names, text, and summary overlays.
  - `spells.repo.normalized-content.ts` reads normalized runtime content.
  - `spells.repo.read.ts` selects normalized content by default or the explicit
    `SPELL_READ_SOURCE=rules` legacy path.
  - `*.mapper.ts` shapes records into contract DTOs.
- Meta, class, domain, and rulebook APIs have narrower service modules under
  `server/src/services/`.
- The status API lives under `/api/status/*`:
  - `/api/status/app` reports backend deploy metadata from explicit environment
    variables with local-development fallback values and a public content DB
    summary for the About / Status page.
  - `/api/status/db` reports read-only runtime DB role/provenance state and
    must not upload, migrate, or activate artifacts. In production it is
    operator-facing by default.
- Prisma client wrappers live in `server/src/lib/`.

## Module Imports

Server source uses Node package imports owned by `server/package.json`:

- `#server/*` maps to `server/src/*`.
- `#prisma-rules-clean/*` maps to the rules-clean Prisma schema/client tree.
- `#prisma-content/*` maps to the content Prisma schema/client tree.
- `#prisma-app-state/*` maps to the app-state Prisma schema/client tree.

Do not add new `~` imports or TypeScript-only `paths` aliases in the server
package. The production build runs plain `tsc`, so runtime-resolvable import
specifiers are part of the module boundary.

`server/package.json` uses a custom `source` condition for local TS execution
and a default condition for built runtime execution:

- `npm run -w server dev` and npm-managed `tsx` maintenance scripts set
  `NODE_OPTIONS=--conditions=source` and resolve package imports to `.ts`
  source.
- `npm run -w server test` uses `server/vitest.config.ts`
  `resolve.conditions: ["source"]` so Vitest resolves package imports to
  `.ts` source without sending source resolution through raw Node loading.
- `npm run -w server start` and `npm run -w server check:runtime` do not set
  the source condition and resolve package imports to `dist/`.

Do not run server maintenance scripts that import server code with bare `tsx`
unless you explicitly pass the source condition.

## Data Ownership

The current runtime reads three SQLite connection roles:

- `RULES_DATABASE_URL`: legacy rules-side content input.
- `CONTENT_DATABASE_URL`: generated normalized runtime content and overlays
  such as i18n names, descriptions, and summaries. `APP_DATABASE_URL` is a compatibility
  fallback for this same content DB.
- `APP_STATE_DATABASE_URL`: future user/app-state data such as server-owned
  users, notes, synced collections, or preferences.

Do not add server-owned user state to the content DB. Runtime SQLite files are
operator-owned local inputs; inspecting this boundary does not authorize writes.

Rulebook publication metadata is content-overlay data. The rules DB remains the
source for base rulebook identity and edition membership, while
`RulebookContent` supplies display labels plus `publicationCategory`,
`publicationFamily`, `publicationSourceKind`, `publicationDisplayOrder`, and
`publicationReviewStatus` for `/api/rulebooks`; it can also carry publication
year/date, URL, and cover-image path when the local data source has them. Do not
make frontend consumers regroup rulebooks from raw abbreviations or edition
labels when these fields are present.

`GET /api/status/db` is the operator-facing runtime check for this boundary. It
reports sanitized file role state, the active spell read source, the latest
`RulesContentBuild`, and normalized content table counts without exposing raw
source data or full filesystem paths.

Public UI surfaces should use the redacted content summary in
`GET /api/status/app` instead of depending on `/api/status/db`.

In the split frontend/API topology, production browser access to the API
is cross-origin. Keep `SPELLBOOK_CORS_ORIGINS` explicit for the accepted
Cloudflare Workers frontend origins; do not make production CORS permissive.

All three database roles must be configured before startup. The rules client
rejects a missing `RULES_DATABASE_URL` during module import, before the HTTP
listener starts, matching the existing content and app-state client boundary.

## Contracts

Server responses should use DTOs exported from `@dnd/contracts`. If a response
shape changes, update `contracts/` first, rebuild it, and then validate both
server and web consumers.

`ApiErrorResponse.code` carries optional stable machine-readable error codes.
`GET /api/spells/search` defaults to `mode=name`. `mode=full` requires at least
one whitespace-delimited term with three Unicode code points; shorter terms
are ignored. It reuses the name-search filters but requires a compatible
content FTS index. A legacy read source or missing/incompatible index returns
`FULL_TEXT_SEARCH_UNAVAILABLE`, never a silent name-search fallback.

`POST /api/spells/resolve` takes names and rulebook ids in its JSON body. Its
`lang` and `variant` come from the standard spell query context and the selected
variant is used for both exact localized-name matching and returned overlays.

Browse/Search normalized filter contracts are owned by the server plus
contracts boundary. The current public normalized filter vocabulary is:

- taxonomy ids: `schoolIds`, `subschoolIds`, `descriptorIds`
- descriptor buckets: `descriptorBuckets` for public descriptor options that are
  not legacy descriptor ids
- base component keys: `componentKeys`
- accepted mechanics buckets: `castingTimeKeys`, `rangeKeys`, and
  `durationKeys`, plus `savingThrowKeys` and `spellResistanceKeys`

`componentKeys` accepts stable normalized keys only and uses `all` semantics:
every selected component must be present. `castingTimeKeys`, `rangeKeys`, and
`durationKeys`, plus `savingThrowKeys` and `spellResistanceKeys`, use `any`
semantics within each family and `all` semantics across selected families.
Extra component text, unaccepted mechanics facets, and separate Tome of Battle
query params remain review-only until an explicit feature scope accepts them.
Content-backed Spell Detail includes structured normalized facets under
`casting.mechanics` for casting time, range, target, effect, area, duration,
saving throw, and spell resistance. Each facet exposes `category`, `amount`,
`unit`, `flags`, `normalizedText`, and `displayCoverage`. Existing accepted
duration, saving throw, and spell resistance note flags remain available on
their facet objects. The legacy rules read source does not infer structured
mechanics or coverage from raw strings.

Taxonomy vocabulary items include `sourceKind` and `category` metadata. Tome of
Battle disciplines and maneuver categories are marked as `sourceKind:
"maneuver"` so frontend grouping does not need to parse raw names or keys.
Legacy combined school/subschool labels are not public vocabulary; generated
content splits them into base taxonomy facets, and server fallback query logic
expands single base ids across old combined legacy ids.
Legacy descriptor noise such as `see text...` is exposed through the descriptor
bucket `descriptorBuckets=see-text` / `key: "see-text"`; server fallback query
logic expands that bucket across the old legacy descriptor ids, and spell DTOs
may include descriptor `rawText` / `note` so detail views can explain the
source note.

`GET /api/meta/filters` is the vocabulary source for frontend consumers. Do not
make the frontend derive component or mechanics filters from raw spell fields.

## Validation

Run the affected API tests first (for example,
`npm run -w server test -- --run tests/spells.search.test.ts` for search).
`npm run test:server` runs the full API suite against disposable synthetic
SQLite fixtures, without touching operator-owned runtime databases.

Rebuild and check contracts when shared exports change. Regenerate Prisma
clients after schema changes. Build the server and check compiled imports when
module resolution or runtime packaging changes; commands live in the
[server README](../../server/README.md#setup-and-commands).
Local data acceptance belongs to data-tools only when source data, import
behavior, or DB fingerprints are affected. Documentation-only edits need link,
command, and diff checks. Remote PR CI remains the merge gate.

## Related Docs

- [../features.md](../features.md)
- [../operations/data-setup.md](../operations/data-setup.md)
- [../operations/deployment.md](../operations/deployment.md)
- [../../server/README.md](../../server/README.md)

### Explicit effective spell overlay

`lang=zh&variant=effective` reads the stored effective overlay on detail,
list/batch, by-level and resolve endpoints in both content and rules read modes.
`i18n.lang=zh` is the request namespace; `nameProvenance.language` and
`bodyProvenance.language` describe the actual field language, including English
fallback. Lists and resolve return name provenance; detail also returns body
provenance. Each typed field metadata contains `schemaVersion`,
`acceptedRevision` and an origin (`native`, `independent`, `chm`, or `english`).
Native/CHM origins carry their source key; independent/English keys are null.
An amended body additionally exposes `amendment` with kind
`accepted-body-amendment`, current/prior accepted revisions and accepted status.
Its `origin` describes the original owner, not an assertion that the current
body is unchanged native content. Names cannot carry body amendments.
Private evidence locators, source pages and review notes are never returned.
Effective detail omits a row source key because fields may have different origins.

Effective fields require valid stored writer envelopes matching the spell,
rulebook, field, language, revision format and source locator shape. Invalid or
missing provenance returns HTTP 500 with `INVALID_EFFECTIVE_PROVENANCE` and a
sanitized message. Runtime checks storage integrity; source quality and acceptance
remain the import workflow's responsibility. Legacy CHM rows may have null
provenance and retain their existing responses.
Amendment validation binds active input/evidence to current authority and the
original input/evidence to the prior row's target, book, field and owner. The
entire prior row, source passages and private paths remain internal.

Explicit effective requests reuse `zh/chm` summaries with their original variant
and source key. Missing effective rows keep canonical English fields and only
any existing CHM summary overlay; localized resolve matching stays variant-specific
and retains its existing exact English fallback. Omitted variants still select
CHM. English requests keep the existing English summary path. This explicit
consumer contract does not activate effective content or change default overlay
selection. Full-text effective searches select `zh/effective` and canonical
`en/default` documents. Other requests exclude effective documents and keep
their existing search variants; effective names do not enter old aliases.
Localized name search, like resolve, matches the requested variant (`chm`
when omitted) before returning its overlay.
