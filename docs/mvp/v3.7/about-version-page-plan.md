# v3.7 About / Version Page Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implementation complete on `codex/infra-about-version`; contracts,
backend endpoint, frontend page, deploy metadata injection, and local validation
are complete pending review.

## Purpose

Add a small About / Version page that shows what code, web build, backend build,
and content DB artifact are currently deployed.

This is a lightweight operator and user-support surface before v3.7 security
hardening begins. It should make deploy verification easier without turning the
app into an admin console.

## Ownership

- Owning version: v3.7
- Owning domain: infra / web / server status
- Primary implementation branch or specialist: focused implementation agent
  branch, recommended name `codex/infra-about-version`
- Related feature/module docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/operations/deployment.md`, `docs/modules/server.md`,
  `docs/modules/web.md`, `docs/modules/delivery.md`
- Upstream dependency plans:
  `docs/mvp/v3.6/db-status-api-plan.md`,
  `docs/mvp/v3.7/security-review.md`
- Downstream consumer plans: v3.7 operator endpoint hardening

## Problem

After v3.5 and v3.6, code/web deploys and DB activation are intentionally
separate. The DB side now has `GET /api/status/db`, but there is no simple app
page that says which frontend build, backend build, and DB build are currently
being viewed.

GitHub deploy runs already know the commit and run metadata. That metadata
should be injected at deploy/build time rather than manually edited into source
files.

## Goals

- Add a user-facing About / Version page with compact build and data status.
- Refresh frontend version metadata every GitHub web deploy.
- Refresh backend version metadata every GitHub backend deploy.
- Reuse `GET /api/status/db` for content DB state instead of duplicating DB
  provenance logic.
- Keep the page useful when DB status is unavailable or later gated by the
  v3.7 security slice.
- Keep the implementation small enough for one focused PR.

## Non-Goals

- Do not build an admin dashboard.
- Do not add authentication or user accounts.
- Do not store version metadata in SQLite.
- Do not make DB upload part of CD.
- Do not expose more DB provenance than `GET /api/status/db` already exposes.
- Do not solve `/api/status/db` gating in this branch; that belongs to the
  v3.7 security hardening slice.

## Current Facts

- `GET /api/status/db` reports active spell read source, sanitized DB role
  state, latest `RulesContentBuild`, and normalized content table counts.
- The GitHub deploy workflow builds web assets locally, then uploads
  `web/build/client/`.
- Backend deploy currently SSHes to the remote host and runs
  `~/deploy-backend.sh`; the remote script pulls `main`, installs, generates
  Prisma clients, builds contracts/server, syncs to `/opt/spellbook`, and
  restarts `spellbook-api`.
- The backend runtime environment is managed by
  `/etc/default/spellbook-api`.
- Existing v3.7 security review marks public DB provenance as a P1 hardening
  topic. The About / Version page must tolerate future redaction or gating.

## Plan

### Slice 1: Status Metadata Contract

Status: implemented.

- Deliverable: shared DTO for application/deploy metadata.
- Expected shape:
  - frontend build metadata: version label, commit SHA, short SHA, ref, build
    time, GitHub run id/attempt when available.
  - backend runtime metadata: version label, commit SHA, short SHA, ref, deploy
    time, GitHub run id/attempt when available.
  - optional package/app version if sourced from package metadata.
- Expected files:
  - `contracts/src/dto/*`
  - `contracts/src/index.ts`
- Validation:
  - `npm run build:contracts`
  - `npm run check:contracts`

### Slice 2: Backend Status Endpoint

Status: implemented as `GET /api/status/app`.

- Deliverable: read-only backend version/status endpoint under the existing
  status route, recommended `GET /api/status/app`.
- Expected behavior:
  - Returns backend deploy metadata from environment variables.
  - Falls back to clear local-development values when deploy metadata is
    missing.
  - Does not read or mutate local Git state at request time.
  - Does not include secrets, filesystem paths, or full environment dumps.
- Expected files:
  - `server/src/routes/status.routes.ts`
  - `server/src/controllers/status.controller.ts`
  - a small status/version service if needed
  - server API tests
- Validation:
  - `npm run test:server`
  - `npm run build:server`

### Slice 3: Frontend About / Version Page

Status: implemented as `/about` with desktop and mobile navigation links.

- Deliverable: page route, recommended `/about`, linked from desktop and mobile
  navigation.
- Expected behavior:
  - Shows frontend build metadata from Vite build-time environment variables.
  - Shows backend metadata from `GET /api/status/app`.
  - Shows content DB status by calling `GET /api/status/db`.
  - Handles DB status failure, redaction, or future authorization failure
    gracefully with a compact unavailable state.
  - Keeps visual style consistent with the existing reference-tool UI; no hero
    or marketing page.
- Expected files:
  - `web/app/routes.ts`
  - `web/app/routes/about.tsx`
  - `web/app/features/about/` or another existing feature-style location
  - `web/app/api/`
  - `web/app/layout/TopBar.tsx`
  - i18n locale files
- Validation:
  - `npm run test:web`
  - `npm run typecheck:web`
  - `npm run -w web build`
  - `npm run i18n:check`

### Slice 4: Deploy-Time Metadata Injection

Status: implemented for GitHub web/backend deploy metadata and backend runtime
environment updates.

- Deliverable: GitHub deploy workflow and tracked deploy scripts refresh version
  metadata on every deploy without manual source edits.
- Expected behavior:
  - Web deploy passes `VITE_*` build metadata to `npm run -w web build`.
  - Backend deploy passes metadata to the remote script so the backend runtime
    can expose the latest deployed backend commit/run.
  - Local/manual deploy docs explain optional metadata environment variables
    and safe fallback behavior.
- Expected files:
  - `.github/workflows/deploy.yml`
  - `docs/deployment-scripts/deploy-backend.sh`
  - `docs/deployment-scripts/spellbook-api.env.example`
  - `docs/operations/deployment.md`
  - `docs/modules/delivery.md` if delivery ownership changes
- Validation:
  - `npm run ci:portable`
  - docs review of deploy examples

## Acceptance Criteria

- `/about` or the accepted route displays frontend, backend, and DB status
  sections.
- Frontend build metadata changes when GitHub web deploy builds a new artifact.
- Backend deploy metadata changes when GitHub backend deploy runs.
- The page continues to render when DB status is unavailable or later gated.
- No DB files, generated logs, or local data are committed.
- Contracts, server tests, web tests/typecheck/build, and i18n check pass.
- Deployment docs explain what metadata is automatic through GitHub deploy and
  what fallback appears for local/manual runs.

## Validation Notes

- `npm run build:contracts` and `npm run check:contracts` passed.
- Focused server tests for `/api/status/app` and `/api/status/db` passed.
- Focused web API tests for status helpers passed.
- `npm run test:server`, `npm run test:web`, `npm run i18n:check`,
  `npm run build:server`, `npm run typecheck:web`, and
  `npm run -w web build` passed.
- Git for Windows `bash -n docs/deployment-scripts/deploy-backend.sh` passed.
- Local smoke passed for `http://127.0.0.1:3000/health`,
  `http://127.0.0.1:3000/api/status/app`, and
  `http://127.0.0.1:5173/about`.
- Browser smoke passed for `/about` in Chinese mobile-width state and English
  desktop-width state; frontend, backend, Content DB sections rendered and
  console error count was zero.

## Doc Updates

- Update this plan when route path, endpoint path, metadata field names, or
  deployment metadata ownership changes.
- Update `docs/roadmap.md` only when this page becomes or stops being the active
  next work item.
- Update `docs/features.md` and `docs/frontend-map.md` when the page ships.
- Update `docs/operations/deployment.md` and `docs/modules/delivery.md` when
  deploy metadata injection ships.
- Do not update `integrated-plan.md` unless v3.7 grows into conflicting
  workstreams that need cross-plan sequencing.

## Open Questions

- Route naming is settled for this slice: route `/about`, nav label `About`,
  page title `Version`.
- Backend deploy metadata is written into the existing runtime environment file
  `/etc/default/spellbook-api` by the tracked deploy script before restart.
- If the v3.7 security slice gates `/api/status/db`, should About show a
  public summary endpoint later, or should DB details become operator-only?
