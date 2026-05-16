# Harness Strategy

This document records the current validation surface and the preferred order for
improving it.

The goal is not to add a large testing framework all at once. The goal is to
turn the frozen v3.2 behavior into executable checks, starting with the cheapest
and most stable seams.

## Current Baseline

The repository currently has:

- shared DTO compilation in `contracts`
- backend API tests with Vitest and Supertest
- frontend type generation and TypeScript checks
- release behavior described by `docs/mvp/v3.2/FREEZE.md`

Useful commands:

```bash
npm run verify
```

Or run the pieces individually:

```bash
npm run build:contracts
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

### Frontend-Backend Batch Limit

Backend spell-name resolve currently rejects more than 200 names per request.
The frontend resolver chunks requests at the same limit. Keep focused tests
around this boundary before changing either side.

### Browser Coverage

There is no dedicated browser smoke harness yet. Add it after the API and pure
logic harnesses are stable.

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

Use the frozen v3.2 behavior as the source of truth for API contracts.

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

### 3. Pure Frontend Logic Tests

Add tests around logic that does not need a browser.

Good first targets:

- spell-id JSON import/export normalization
- prepared JSON import/export normalization
- collection selectors and local storage migration behavior
- search validation
- API helper URL parameter behavior

These tests should be fast and should not depend on the local SQLite data.

### 4. Browser Smoke Tests

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

### 5. End-To-End Workflows

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
