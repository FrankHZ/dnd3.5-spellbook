# v1.0 About And Status Plan

Status: planned.

## Purpose

Promote the current About / Version surface into a formal About / Status page
for the split Cloudflare Pages frontend and API-domain backend topology.

The page should let a user or operator answer: which frontend build is loaded,
which API origin it is calling, which backend version responded, which content
DB state is active, and when those pieces were updated.

## Ownership

- Owning release: v1.0
- Owning domain: web / server / contracts / delivery
- Primary implementation branch or specialist: frontend or delivery specialist
- Related docs: `docs/features.md`, `docs/frontend-map.md`,
  `docs/modules/web.md`, `docs/modules/server.md`,
  `docs/modules/contracts.md`, `docs/modules/delivery.md`,
  `docs/operations/deployment.md`
- Upstream dependency plans: `domain-and-deployment-plan.md`
- Downstream consumer plans: v1.0 release acceptance and freeze

## Problem

The current About / Version page was built for the MVP topology. After the
frontend moves to Cloudflare Pages and the API moves behind
`api.d20spellcodex.com`, the page needs to report a split system clearly
without exposing private DB provenance.

## Goals

- Show frontend build information from the Pages build:
  - version label
  - commit SHA / short SHA
  - ref or branch
  - build/deploy time
  - hosting surface, `Cloudflare Pages`
- Show the API origin the frontend is configured to call.
- Show backend public version/status from `GET /api/status/app`.
- Show public content DB status from the redacted status payload:
  - active read source
  - content DB file role or public label if already exposed safely
  - latest content build timestamp or equivalent update time
  - spell/content counts that are already public-safe
- Keep private DB provenance, hashes, local paths, and operator-only details on
  `GET /api/status/db`, still gated in production.
- Make failure states explicit: API unreachable, stale/unknown frontend
  metadata, unavailable content status, or mismatched API origin.

## Non-Goals

- Do not make `GET /api/status/db` public by default.
- Do not expose local DB paths, hashes, or operator tokens.
- Do not add user accounts or admin controls.
- Do not make About / Status a full observability dashboard.
- Do not couple the page to Cloudflare APIs at runtime.

## Current Facts

- Web builds already support `VITE_SPELLBOOK_*` metadata from GitHub deploys.
- Backend deploys already support `SPELLBOOK_BACKEND_*` metadata.
- `GET /api/status/app` is public and includes redacted app/content status for
  About / Version.
- `GET /api/status/db` is private by default in production and intended for
  operator verification.
- The frontend currently expects same-origin `/api`; v1.0 should make the API
  origin explicit through `VITE_API_BASE_URL`.

## Plan

### Slice 1: Status Contract Review

- Deliverable: confirm the public `GET /api/status/app` payload contains every
  field needed for the split topology without leaking private DB provenance.
- Expected files: contracts DTOs, server status service/tests, this plan if
  scope changes.
- Validation:
  - targeted server tests for public status shape
  - production-mode test that private DB provenance remains gated

### Slice 2: Frontend Build And API Origin Display

- Deliverable: About / Status shows frontend build metadata and configured API
  origin.
- Expected files: About route/components, build metadata helpers, locale JSON,
  web tests.
- Validation:
  - targeted web tests for metadata display and fallback states
  - production-like build with Pages environment values

### Slice 3: Backend And Content Status Display

- Deliverable: About / Status renders backend version/status and redacted
  content DB state from the public API status response.
- Expected files: API client helpers, About route/components, locale JSON,
  tests.
- Validation:
  - targeted web tests for success, stale/unknown, and API-error states
  - browser smoke against local dev and production API origin

### Slice 4: Release Acceptance Surface

- Deliverable: About / Status becomes part of v1.0 production acceptance.
- Expected files: `docs/operations/deployment.md`,
  `docs/modules/delivery.md`, release freeze checklist or `FREEZE.md`.
- Validation:
  - `https://d20spellcodex.com/about` loads through Pages
  - About / Status calls `https://api.d20spellcodex.com`
  - frontend build info matches the Pages deployment
  - backend status matches the expected deployed backend commit/version
  - public content status matches the accepted DB update state

## Acceptance Criteria

- About / Status clearly identifies the Cloudflare Pages frontend.
- The page shows the API origin the browser is using.
- The page displays backend version/status from the public API.
- The page displays public-safe content DB status and update time.
- The page handles API failure and missing metadata without misleading users.
- `GET /api/status/db` remains private by default in production.
- English and Chinese UI text pass the existing i18n workflow.
- Desktop and mobile layouts fit the final v3.10 UI/UX cohesion baseline.

## Doc Updates

- Update this plan when About / Status release scope changes.
- Update `docs/features.md` and `docs/frontend-map.md` for the final user-facing
  page behavior.
- Update `docs/modules/web.md`, `docs/modules/server.md`, and
  `docs/modules/contracts.md` when ownership or DTO contracts change.
- Update `docs/operations/deployment.md` and `docs/modules/delivery.md` for
  release acceptance and metadata ownership.
- Update `docs/roadmap.md` only after v3.10 freeze promotes v1.0 to active.

## Open Questions

- Should the page display a Cloudflare Pages deployment id if it is available
  through build-time environment variables, or keep commit/ref/build time as the
  stable public identifiers?
- Should public content status display exact counts or a smaller "content DB
  active / updated at" summary?
- Should an API-origin mismatch warning be visible to ordinary users or only in
  a compact diagnostic row?

## Follow-Up Candidates

- Operator-only status dashboard remains out of v1.0 unless a direct release
  blocker appears.
- External uptime monitoring can be planned after the public topology is live.

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or release freeze snapshots instead of pasting
logs.
