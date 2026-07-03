# Harness Strategy

This document records the current validation surface and the preferred order for
improving it.

The goal is not to add a large testing framework all at once. The goal is to
turn current documented behavior into executable checks, starting with the
cheapest and most stable seams.

## Current Baseline

The repository currently has:

- shared DTO compilation in `contracts`
- runtime import smoke for the built `@dnd/contracts` package
- data-tooling TypeScript checks in `data-tools`
- backend API tests with Vitest and Supertest
- frontend type generation and TypeScript checks
- current feature behavior described by `docs/features.md`
- frozen stage snapshots under `docs/mvp/` for historical regression checks

Useful commands:

```bash
npm run verify
npm run ci:portable
npm run -w data-tools test:portable
```

`npm run ci:portable` is the clean-checkout subset used by GitHub Actions. The
backend API tests use synthetic disposable SQLite fixtures, so they do not read
ignored local runtime databases.

Or run the pieces individually:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
```

For frontend packaging checks:

```bash
npm run -w web build
```

## Harness Guardrails

### Generated Test Output

The server build writes compiled tests under `server/dist/tests/`.

Vitest is configured to run only source tests under `server/tests/` and exclude
`server/dist/`. Generated output must not become a source of truth for test
discovery.

The server production build intentionally excludes local data import scripts
under `server/scripts/`. Those scripts run through dedicated `tsx` npm commands
and may depend on local-only source data that is not present on the deployment
host.

### Frontend-Backend Batch Limit

Backend spell-name resolve currently rejects more than 200 names per request.
The frontend resolver chunks requests at the same limit. Keep focused tests
around this boundary before changing either side.

### Browser Coverage

There is no dedicated browser smoke harness yet, and the repo does not currently
include a Playwright or Puppeteer setup. Add browser smoke after the API and pure
logic harnesses are stable and after choosing a browser runner intentionally.

## Recommended Build-Out

### 1. Stabilize Existing Tests

First make sure the existing test runner only executes source tests.

Target:

- `server/vitest.config.ts`

Expected result:

- `npm run -w server test -- --run` reports only the source test files under
  `server/tests/`
- generated `server/dist/` output cannot affect test discovery

### 2. API Contract Tests

Use the current feature map, current API behavior, and relevant frozen stage
snapshots as the source material for API contracts. Do not treat a past freeze
as the automatic baseline for later active development.

Good first targets:

- `GET /health`
- `GET /api/rulebooks`
- `GET /api/classes`
- `GET /api/domains`
- `GET /api/meta`
- `GET /api/spells/search`
- `GET /api/spells/by-level`
- `GET /api/spells/:id`
- `POST /api/spells/batch`
- `POST /api/spells/resolve`

Prefer shape and invariant checks over brittle full snapshots. Examples:

- response has required top-level fields
- ids are positive integers
- pagination fields are coherent
- missing ids stay missing
- localized requests preserve valid response shape
- invalid requests return the documented status and message shape

Current coverage includes shape invariants for spell search, spell detail,
by-level results, rule metadata lists, and common API error payloads.

### 3. Data-Tooling Checks

The root `verify` command includes `npm run typecheck:data-tools` and
`npm run test:data-tools` so data tooling stays covered by the standard
validation path without requiring local source data.

The portable data-tools unit command is:

```bash
npm run -w data-tools test:portable
```

It is fixture-only and covers pure helpers for source-label mapping, English
name normalization, normalized summary row validation, and structured spell
patch JSONL/schema validation. Root `npm run test:data-tools` delegates to this
command. It must remain independent of ignored CHM/raw source data, the nested
`data/` repo, and SQLite databases.

The portable harness also validates `server/db/fixtures.manifest.json`. In a
clean checkout it verifies that every mapped portable fixture path exists. In a
local workspace where the nested `data/` repo exists, it additionally scans the
manifest's maintained data roots and fails when a real data JSONL input has no
corresponding server DB portable fixture mapping. This is a coverage-mirror
check only; it does not require dummy fixture rows to match real data rows.

Do not treat every script under `data-tools` as equally worth testing. Use three
lifecycles:

- maintained commands: durable import, validation, manifest, parser, generator,
  and acceptance commands that future agents are expected to reuse
- local acceptance commands: durable commands that require local ignored data or
  local SQLite files, so they stay explicit rather than entering CI
- dormant local commands: source-consumed workflows kept for reruns when source
  data or parser logic changes, but not part of active acceptance
- one-time or ad hoc scripts: historical migration, investigation, or backfill
  helpers that are kept only for auditability or possible reuse

Put harness effort into maintained commands and their extracted pure helpers.
For dormant local commands, keep command compatibility and typecheck coverage,
but avoid new harness work unless the workflow is active again. For one-time
scripts, prefer a short note, a generated report, or a commit message explaining
the run. Do not add portable tests for one-time code unless the workflow is
promoted into a maintained command.

The root `verify` command also imports the built `@dnd/contracts` package with
Node after `build:contracts`. This catches ESM package output that typechecks
but cannot be resolved by runtime tools such as the web dev server.

The local v3.4 data acceptance bundle is:

```bash
npm run -w data-tools acceptance:local
```

It currently runs:

```bash
npm run -w data-tools typecheck
npm run -w data-tools rules:manifest:verify
npm run -w data-tools summaries:qa
npm run -w data-tools summaries:import -- --dry-run
```

Data-tool commands that depend on local-only source data, local SQLite files,
or temporary database copies remain explicit acceptance checks rather than
always-on unit tests:

- `npm run -w data-tools zh:parse`
- `npm run -w data-tools zh:qa`
- `npm run -w data-tools zh:backcheck`
- `npm run -w data-tools zh:summaries:extract`
- `npm run -w data-tools summaries:qa`
- `npm run -w data-tools summaries:import -- --dry-run`
- `npm run -w data-tools rules:manifest:verify`
- `npm run -w data-tools rules:sql:dry-run -- <patch.sql>`
- `npm run -w data-tools rules:index:rebuild -- --dry-run`
- `npm run -w data-tools spells-full:inspect -- known-misses`

Structured spell patch `validate` / `apply -- --dry-run` commands are most
useful before a patch has been applied. Once a patch is already present in the
configured rules DB, rerunning those commands against the same insert patch is
expected to fail on duplicate spell ids or existing `name + rulebook` rows.

### 4. Pure Frontend Logic Tests

Add tests around logic that does not need a browser.

Good first targets:

- spell-id JSON import/export normalization
- prepared JSON import/export normalization
- collection selectors and local storage migration behavior
- search validation
- API helper URL parameter behavior

These tests should be fast and should not depend on the local SQLite data.

Current coverage includes:

- search validation
- collection selectors
- collection storage normalization
- user preferences storage
- i18n storage fallback
- spell-id JSON import/export
- prepared JSON import/export
- prepared bulk-paste row mapping
- prepared level derivation
- prepared TSV copy helpers
- prepared entry summaries
- spell API wrapper URL building, normalization, and chunking
- API helper i18n parameter behavior.

### 5. Browser Smoke Tests

Add a small smoke suite once the app can run reliably in development or from a
production build.

Good first flows:

- browse page loads and shows filter controls
- search page accepts a query and renders results
- spell detail page loads for a known spell id
- spellbooks page can create or display local collections
- language switch keeps the app usable

Keep smoke tests shallow. Their job is to catch blank screens, broken routing,
and obvious integration failures.

### 6. End-To-End Workflows

Only add broader workflows after the cheaper harness layers are stable.

Candidate workflows:

- create a spell-id book, add spells, export JSON, reimport JSON
- create a prepared book, bulk paste spell names, edit prepared entries
- switch language and verify spell detail still renders localized overlays

## What Not To Test First

Avoid starting with:

- full visual snapshots
- brittle exact text snapshots of spell descriptions
- tests that require rebuilding local data from raw sources
- large end-to-end flows that fail for many unrelated reasons

Those can come later if the project needs them.

## Local Data Assumption

Backend API tests currently depend on the local SQLite databases configured by
`server/.env`. That is acceptable for this personal project, but it means these
tests are not yet portable CI tests.

If CI becomes a goal, first decide whether to provide a small fixture database,
mock the repo layer, or split portable contract tests from local data smoke
tests.
