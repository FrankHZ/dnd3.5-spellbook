# v1.0 Freeze

## Status

**v1.0 FROZEN**

This document records the final canonical documentation state for the v1.0
formal public release handoff.

## Canonical Source Order

When v1.0 documents conflict, treat this freeze document as authoritative over
earlier v1.0 planning documents.

Use this precedence order for v1.0:

1. `docs/releases/v1.0/FREEZE.md`
2. current focused topic docs changed by v1.0
3. current operational docs changed by v1.0
4. focused v1.0 plan documents

## Frozen Deliverables

1. Cloudflare Workers Static Assets frontend at `https://www.d20spellcodex.com`.
2. Backend API domain at `https://api.d20spellcodex.com`.
3. Backend-only origin server responsibility for Express/API, SQLite/content
   DBs, DB update scripts, and Nginx API reverse proxying.
4. About / Status page for frontend build metadata, API origin, backend
   version, public content DB status, and source credits.
5. Release-ready documentation sweep across root, docs index, roadmap,
   AGENTS.md, feature docs, module docs, operations docs, and release docs.

## Final As-Built Summary

### 1. Public Frontend Delivery

Shipped behavior:

- `https://www.d20spellcodex.com` is the canonical production frontend host.
- Cloudflare Workers Builds deploys the React Router static client from
  `web/build/client` using root `wrangler.jsonc`.
- Direct refresh returns the SPA shell for representative routes: `/`,
  `/browse`, `/search`, `/spells/1`, `/spellbooks`, `/settings`, and `/about`.
- The apex domain `d20spellcodex.com` is intentionally unassigned in v1.0.

Accepted evidence:

- Final production Workers build:
  `d72db3fd-b5cd-4f98-999b-e74a1907c218`, commit
  `96c84b76cee5025284fd3bd7d27e810680c778d8`, outcome `success`.
- The About frontend bundle contains `v1.0`, `main`, and commit `96c84b7`.

Frozen clarification:

- Manual Wrangler deploy remains an operator tool, not the normal frontend CD
  path.
- Legacy same-origin static hosting remains documented only as an emergency
  fallback.

### 2. Backend API And Origin Role

Shipped behavior:

- `https://api.d20spellcodex.com` is the public API domain.
- Cloudflare proxied DNS reaches the existing server, where Nginx proxies API
  traffic to Express on `127.0.0.1:3000`.
- Production CORS is explicit for `https://www.d20spellcodex.com`; arbitrary
  origins do not receive permissive CORS headers.
- Backend deploy remains a manual GitHub workflow and tracked-script path.

Accepted evidence:

- Backend deploy workflow run `28906821504` completed successfully on commit
  `96c84b76cee5025284fd3bd7d27e810680c778d8`.
- `GET https://api.d20spellcodex.com/api/status/app` reports backend
  `versionLabel: v1.0`, `source: deploy`, `shortSha: 96c84b7`, `ref: main`.
- `GET https://api.d20spellcodex.com/api/status/app` reports public content
  status `ok`, active read source `content`, `spellCount: 4926`, and
  `issueCount: 3523`.
- `GET https://api.d20spellcodex.com/api/status/db` without an operator token
  returns `404`.

Frozen clarification:

- DB upload/update stays operator-owned. v1.0 does not add DB CD or content
  artifact automation.

### 3. About / Status

Shipped behavior:

- `/about` separates Status and Credits.
- Status reports frontend build metadata, configured API origin, backend
  version metadata, and public content DB status.
- Credits include compact source acknowledgements for IMarvinTPA, D&D Tools,
  and the Chinese CHM translation source.

Accepted evidence:

- `/about` returns `200` through Cloudflare Workers.
- Frontend metadata is injected by Workers Builds through
  `VITE_SPELLBOOK_*` values derived from `WORKERS_CI_*` and git fallbacks.
- Backend metadata is refreshed by the backend deploy workflow.

Frozen clarification:

- `/api/status/db` remains operator-facing and is not required for the public
  About / Status page.

### 4. Documentation And Release Surface

Shipped behavior:

- `docs/releases/` is the formal public release planning surface.
- `docs/mvp/` remains historical MVP/pre-release stage history.
- Current deployment truth lives in `docs/operations/deployment.md`.
- Feature and module docs describe the v1.0 split frontend/API topology,
  About / Status behavior, and backend-only origin role.

Accepted evidence:

- PRs #48, #49, #50, #51, and #52 are merged.
- Each PR reported successful Portable validation and Workers Builds checks.
- Release-ready docs sweep found no need to migrate canonical docs to GitHub
  Wiki or another external surface.

Frozen clarification:

- Repository docs remain canonical for release planning, PR review, CI,
  freeze snapshots, and agent workflows.

## Validation Evidence

| Check | Result | Notes |
| ----- | ------ | ----- |
| PR #48 Portable validation | Pass | Domain/deployment topology |
| PR #48 Workers Builds | Pass | `a0770e75-70af-49e1-a339-513117ebe678` |
| PR #49 Portable validation | Pass | About / Status surface |
| PR #49 Workers Builds | Pass | `c2a0a8fc-1054-479a-80b1-efb17050568b` |
| PR #50 Portable validation | Pass | Release docs sweep |
| PR #50 Workers Builds | Pass | `2fb4817e-b6eb-48ca-970e-96ef902e9715` |
| PR #51 Portable validation | Pass | Workers metadata docs |
| PR #51 Workers Builds | Pass | `a4c0b24e-529f-49f4-bbd7-e317c28a5151` |
| PR #52 Portable validation | Pass | Workers build command docs |
| PR #52 Workers Builds | Pass | `3f2873f1-b4dd-4a65-9c3e-48f30af2096d` |
| Backend deploy workflow | Pass | Run `28906821504`, commit `96c84b7` |
| Production SPA route smoke | Pass | `/`, `/browse`, `/search`, `/spells/1`, `/spellbooks`, `/settings`, `/about` returned `200` |
| Production API status | Pass | `versionLabel: v1.0`, `shortSha: 96c84b7`, content status `ok` |
| Production CORS allowed origin | Pass | `Origin: https://www.d20spellcodex.com` receives matching `Access-Control-Allow-Origin` |
| Production CORS unallowed origin | Pass | `Origin: https://evil.example` receives no permissive CORS header |
| Production DB provenance privacy | Pass | `/api/status/db` without token returns `404` |
| About frontend metadata bundle | Pass | Contains `v1.0`, `main`, and `96c84b7` |

## Known Deferred Work

- Apex-domain redirect/canonical-domain policy remains deferred.
- Automated DB/content artifact CD remains deferred.
- Static/offline artifact generation remains deferred.
- Large-scale Chinese/English translation and proofreading QA remains
  deferred.
- Full content artifact/versioned DB release automation remains deferred.
- Broader backend normalization for `target`, `effect`, and `area` remains
  deferred.
- Security hardening beyond the current CORS/header/TLS baseline remains a
  stable-track operations item.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Do not treat older v1.0 plan documents as newer than this snapshot.
- Use `docs/operations/deployment.md` for the current deployment workflow.
- Use `docs/stable-backlog.md` for deferred stable-version candidates.
