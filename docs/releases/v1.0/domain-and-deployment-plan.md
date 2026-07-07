# v1.0 Domain And Deployment Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implementation branch in progress: `codex/infra-deployment-topology`.

## Purpose

Define the first formal production deployment topology:

- Cloudflare Pages serves the frontend.
- `api.d20spellcodex.com` reaches the existing Express API through Cloudflare
  DNS/proxy and the current server.
- The origin server stops being responsible for hosting the production static
  frontend.

## Ownership

- Owning release: v1.0
- Owning domain: delivery / web / server / operations
- Primary implementation branch or specialist: deployment specialist
- Related docs: `web/README.md`, `docs/operations/deployment.md`,
  `docs/modules/delivery.md`, `docs/modules/web.md`,
  `docs/modules/server.md`, `.github/workflows/deploy.yml`
- Upstream dependency plans: `docs/mvp/v3.10/README.md`
- Downstream consumer plans: `about-and-status-plan.md`

## Problem

The MVP deployment model serves the static frontend from the same origin server
that runs the Express API. That was acceptable for MVP, but it blurs ownership:
frontend CD, API deploys, Nginx static hosting, and backend runtime all live in
one operational path.

v1.0 should split the public topology without replacing the backend stack:
Cloudflare Pages owns frontend delivery, while the existing server remains the
API/content host.

## Goals

- Configure the frontend for Cloudflare Pages Git integration.
- Set production frontend domain to `https://d20spellcodex.com`.
- Set production API origin to `https://api.d20spellcodex.com`.
- Add real `VITE_API_BASE_URL` support in the web API client:
  - local default remains `/api`
  - Pages production value is `https://api.d20spellcodex.com`
- Keep local development behavior working without requiring Cloudflare.
- Update backend production CORS for exact allowed frontend origins.
- Update Nginx so production public API traffic proxies to Express while static
  frontend hosting is no longer the main production path.
- Keep DB update scripts and backend deploy scripts operator-owned and usable.
- Remove or downgrade GitHub web-to-origin static deployment from the normal
  production path.

## Non-Goals

- Do not move the Express API to Cloudflare Workers.
- Do not replace SQLite/content DB storage.
- Do not add DB CD or content artifact automation.
- Do not change spell query semantics.
- Do not require Wrangler Direct Upload for frontend production deploys.
- Do not make v1.0 responsible for every stable-backlog security item.

## Pre-v1.0 Baseline Facts

- Before this branch, frontend requests used relative `/api/...` paths and
  assumed the browser-facing host exposes `/api`.
- Before this branch, the GitHub deploy workflow had `backend`, `web`, and
  `backend-and-web` targets.
- Before this branch, the Nginx config served `/var/www/spellbook` and proxied
  `/api/*` to `http://127.0.0.1:3000`.
- Production CORS is explicit through `SPELLBOOK_CORS_ORIGINS`.
- DB deployment remains manual through `update-db.sh`.
- Backend status/version metadata already exists through `GET /api/status/app`
  and operator DB provenance through `GET /api/status/db`.

## External Platform Constraints

- Use Cloudflare Pages Git integration for the frontend project. It matches the
  desired ownership model: Cloudflare runs frontend builds from repository
  changes.
- Avoid creating the Pages project as Direct Upload unless Git integration is
  rejected by a specific blocker. Cloudflare documents Direct Upload and Git
  integration as one-way project choices.
- Attach `d20spellcodex.com` through the Pages custom domain flow. Do not rely
  on only hand-writing DNS records.
- Configure Pages for this monorepo with explicit root/build/output settings
  and `VITE_API_BASE_URL`.
- Use Cloudflare proxied DNS for `api.d20spellcodex.com`.
- Production TLS should use Cloudflare Full (strict) with a valid origin
  certificate, either Cloudflare Origin CA or a publicly trusted certificate.

## Plan

### Slice 1: Web API Base URL

- Deliverable: frontend API client respects `VITE_API_BASE_URL` while keeping
  local `/api` default behavior.
- Expected files: `web/app/api/`, web tests, `web/README.md`.
- Validation:
  - targeted API helper tests
  - `npm run typecheck:web`
  - local dev smoke with default `/api`
  - production-like build with `VITE_API_BASE_URL=https://api.d20spellcodex.com`

### Slice 2: Cloudflare Pages Frontend Deployment

- Deliverable: documented Pages Git integration setup for the monorepo.
- Expected settings:
  - project connected to the Git repository
  - build command runs the web production build from the monorepo context
  - output directory points at the React Router client build
  - `VITE_API_BASE_URL=https://api.d20spellcodex.com`
  - frontend build metadata variables mapped or documented
- Expected files: `docs/operations/deployment.md`,
  `docs/modules/delivery.md`, optionally `web/README.md`.
- Validation:
  - Pages production deployment succeeds
  - `https://d20spellcodex.com` serves the app
  - direct refresh of representative SPA routes works

### Slice 3: API Domain, TLS, Nginx, And CORS

- Deliverable: API domain reaches Express through Cloudflare proxy and Nginx.
- Expected server behavior:
  - Express remains bound to `127.0.0.1:3000`
  - Nginx handles public API reverse proxying
  - origin HTTPS is configured for Cloudflare Full (strict)
  - CORS allowlist includes `https://d20spellcodex.com` and optional
    `https://www.d20spellcodex.com`
- Expected files: deployment docs, Nginx helper/scripts if topology changes,
  server CORS tests if behavior changes.
- Validation:
  - `https://api.d20spellcodex.com/api/status/app` succeeds
  - allowed frontend origin receives successful CORS response
  - unallowed browser origin does not receive permissive CORS headers
  - API TLS mode and certificate are verified

### Slice 4: GitHub Deploy Workflow Split

- Deliverable: GitHub deploy workflow no longer treats web-to-origin static
  deploy as the normal production frontend path.
- Expected behavior:
  - backend deploy remains available
  - DB upload remains out of CD
  - old web deploy path is removed, renamed as legacy/manual, or clearly
    documented as non-production fallback
  - Cloudflare Pages owns frontend CD
- Expected files: `.github/workflows/deploy.yml`,
  `docs/operations/deployment.md`, `docs/modules/delivery.md`.
- Validation:
  - backend deploy workflow still works
  - workflow docs and choices no longer imply remote static hosting is the
    normal v1.0 frontend path

## Acceptance Criteria

- Local web development still works with relative `/api`.
- Pages production build uses `https://api.d20spellcodex.com`.
- `https://d20spellcodex.com` serves the production frontend.
- SPA deep-link refresh works for Browse, Search, Spell Detail, collections,
  prepared spells, settings, and About / Status.
- Cross-origin API requests from the allowed frontend domain work.
- Browser requests from unallowed origins do not receive permissive CORS.
- `https://api.d20spellcodex.com/api/status/app` works through Cloudflare
  proxying and origin TLS.
- Backend deploy and DB update scripts remain usable for API/content updates.
- GitHub deploy workflow preserves backend deploy and removes or demotes normal
  web-to-origin deploy.
- Deployment docs describe both Cloudflare Pages frontend CD and remote backend
  deployment.

## Doc Updates

- Update this plan when deployment topology decisions change.
- Update `web/README.md` for `VITE_API_BASE_URL`.
- Update `docs/operations/deployment.md` for Pages frontend and backend-only
  origin deploy.
- Update `docs/modules/delivery.md` for the new delivery boundary.
- Update `docs/modules/web.md` and `docs/modules/server.md` only if module
  ownership changes.
- Update `docs/roadmap.md` only when v1.0 active work ordering changes.

## Open Questions

- Should `www.d20spellcodex.com` be enabled as a Pages custom domain, redirect
  to apex, or remain out of v1.0?
- Should the old same-origin web deploy target be deleted immediately or kept
  as a documented emergency legacy path until the first Pages release is
  accepted?
- Which origin certificate path is preferred for the server: Cloudflare Origin
  CA or a public CA certificate?

## Follow-Up Candidates

- Content artifact/versioned DB release automation remains a later delivery
  track.
- Rollback playbook remains a later operations track unless v1.0 acceptance
  finds a direct blocker.
- HSTS should wait until HTTPS and origin TLS behavior are accepted.

## Completion Notes

Implementation branch `codex/infra-deployment-topology` owns the first v1.0
deployment topology slice:

- web API helpers support `VITE_API_BASE_URL` while keeping local relative
  `/api` behavior as the default.
- GitHub deploy workflow is backend-API only; Cloudflare Pages owns normal
  frontend production deployment.
- Nginx apply helper defaults to API-only mode for `api.d20spellcodex.com` and
  keeps the old static frontend config as an explicit `single-origin` fallback.
- deployment/module/workspace docs describe Cloudflare Pages build settings,
  API CORS origins, backend-only origin responsibilities, and legacy web deploy
  boundaries.
