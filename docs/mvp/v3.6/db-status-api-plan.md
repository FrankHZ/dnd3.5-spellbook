# v3.6 DB Status API Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implemented first slice.

## Purpose

Make remote content DB activation verifiable through the server itself instead
of requiring manual SSH and SQLite inspection.

## Ownership

- Owning version: v3.6
- Owning domain: server / deployment
- Primary implementation branch or specialist: main agent or focused server
  branch
- Related feature/module docs: `docs/data-setup.md`, `docs/deployment.md`,
  `docs/modules/server.md`, `docs/modules/delivery.md`
- Upstream dependency plans: v3.5 content DB and deployment freeze
- Downstream consumer plans: deployment smoke checks, future DB artifact
  release automation

## Problem

v3.5 made normalized content DB reads the default, but DB upload remains manual.
Operators currently verify remote activation by comparing `RulesContentBuild`
metadata and hashes out of band. That is acceptable for v3.5, but fragile for
future releases and hard for agents to confirm without SSH access.

## Goals

- Add a read-only status endpoint for active DB/read-source state.
- Report enough provenance to compare local `rules:content:meta` with the
  remote runtime artifact.
- Keep the endpoint safe: no raw source text, no data mutation, no upload or
  migration behavior.
- Document how operators use it after manual DB activation.

## Non-Goals

- Do not add DB upload to CD.
- Do not expose a full admin console.
- Do not make the endpoint a content QA report.
- Do not remove `rules:content:meta`; local provenance reports remain useful.

## Current Facts

- Content DB provenance lives in `RulesContentBuild`.
- Local meta reports are produced by `npm run -w data-tools rules:content:meta`.
- Deployment docs currently require manual comparison after upload.
- Runtime read source is controlled by `SPELL_READ_SOURCE`.

## Plan

### Slice 1: Define Contract

- Status: accepted.
- Deliverable: route and DTO for DB status.
- Expected fields:
  - active spell read source
  - rules/content/app-state database file roles when safely available
  - latest `RulesContentBuild` row
  - content DB row counts for key tables
  - relevant migration/schema hash if available
- Validation: contract/type tests.

### Slice 2: Implement Server Endpoint

- Status: accepted.
- Deliverable: read-only server service and route under `/api/status/db`.
- Expected files: server route, controller/service, tests, contracts if shared
  DTOs are needed.
- Validation: server API tests against disposable fixtures.

### Slice 3: Document Operator Workflow

- Status: accepted.
- Deliverable: deployment docs explain how to compare local meta and remote API
  status after manual DB upload.
- Expected files: `docs/deployment.md`, `docs/data-setup.md`,
  `docs/modules/server.md` as needed.
- Validation: docs examples use the current remote placeholder style.

## Accepted Contract

`GET /api/status/db` returns:

- `activeSpellReadSource`: `content` unless `SPELL_READ_SOURCE=rules` is set.
- `databases`: sanitized role status for `rules`, `content`, `contentAlias`,
  and `appState`. File-backed roles report only basename-level file names,
  configuration state, existence, and whether `APP_DATABASE_URL` matches the
  active content DB.
- `content.latestBuild`: latest `RulesContentBuild` metadata, including
  parent/data commit ids and rules/content hash fields.
- `content.tableCounts`: minimal normalized content row counts for rulebooks,
  spells, taxonomy facets, components, mechanic facets, and content issues.

The endpoint is read-only. It does not upload DB files, activate artifacts, run
migrations, expose raw source text, or replace `rules:content:meta`.

## Acceptance Criteria

- [x] Endpoint is read-only and returns a stable response from a clean fixture
  DB.
- [x] Missing content DB metadata is reported clearly rather than crashing.
- [x] Remote activation can be checked by comparing endpoint output with local
  `rules:content:meta`.
- [x] No data-bearing SQLite files are committed.
- [x] `npm run test:server` and relevant type checks pass.

## Doc Updates

- Update this plan when endpoint fields or route ownership changes.
- Update `docs/roadmap.md` only when DB status is no longer the next v3.6 slice
  or when DB release automation is promoted.
- Update deployment/data setup docs when operator commands change.
- Do not update `integrated-plan.md` unless DB status scope grows into artifact
  upload/activation.

## Open Questions

- Route decision: use `/api/status/db`.
- Path redaction decision: show basename-level file names only.
- Frontend decision: API/operator docs are enough for the first v3.6 slice.
