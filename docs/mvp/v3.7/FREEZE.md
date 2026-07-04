# v3.7 Freeze

## Status

**v3.7 FROZEN**

This document records the final canonical documentation state for the v3.7
handoff.

## Canonical Source Order

When v3.7 documents conflict, treat this freeze document as authoritative over
earlier v3.7 planning documents.

Use this precedence order for v3.7:

1. `docs/mvp/v3.7/FREEZE.md`
2. current focused topic docs changed by v3.7
3. current operational docs changed by v3.7
4. focused v3.7 plan documents

## Frozen Deliverables

1. About / Version status page with frontend, backend, and public content DB
   status.
2. Server security hardening for operator DB status, production error output,
   security headers, CORS defaults, and deploy policy.
3. Dependency and TypeScript module-boundary maintenance, including React
   Router/Vite/i18n major upgrades and server NodeNext/CommonJS cleanup.
4. Deployment robustness fixes for Nginx script sync, remote build heap, and
   Prisma 7 generated-client runtime compatibility.

## Final As-Built Summary

### 1. About / Version Status

Shipped behavior:

- `/about` is linked from desktop and mobile navigation.
- The page shows frontend build metadata from Vite build-time values.
- `GET /api/status/app` returns backend deploy metadata and a redacted content
  status summary.
- Detailed `GET /api/status/db` provenance remains operator-facing in
  production.

Accepted evidence:

- PR `#19` shipped the page, contracts, backend endpoint, frontend route, and
  deploy metadata wiring.
- Production smoke after deploy run `28708398468` showed backend version
  `476c93d`, active content read source, content status `ok`, spell count
  `4,926`, and issue count `3,523`.

### 2. Security And Operator Exposure

Shipped behavior:

- Production `GET /api/status/db` is private by default.
- Operators can access DB status with `SPELLBOOK_DB_STATUS_TOKEN` or
  intentionally expose it with `ENABLE_DB_STATUS_PUBLIC=true`.
- Public status uses `GET /api/status/app` instead of detailed DB provenance.
- Production non-`ApiError` 500 responses no longer expose internal exception
  text.
- Express owns API security headers and production CORS can be constrained with
  `SPELLBOOK_CORS_ORIGINS`.
- GitHub deploy has explicit read-only content permissions and warns when
  portable validation is skipped.
- Deployment docs prefer pinned `DEPLOY_SSH_KNOWN_HOSTS` while keeping the
  current `ssh-keyscan` fallback as a warning-emitting convenience path.

Accepted evidence:

- PR `#21` shipped the server security defaults and deployment docs.
- Server tests cover DB status access, error response behavior, CORS, and
  security headers.
- Remote smoke showed unauthenticated `GET /api/status/db` returned `404`.

### 3. Dependency And Module Boundary Maintenance

Shipped behavior:

- React Router, Vite, i18next, react-i18next, lucide-react, shadcn, Node types,
  and related frontend/tooling dependencies were upgraded on the v3.7
  dependency branch.
- `vite-tsconfig-paths` was removed in favor of explicit Vite/Vitest aliases.
- The server keeps its package/runtime boundary as CommonJS while TypeScript
  compiles and resolves with `NodeNext`.
- `server/prisma-*` generators now set `moduleFormat = "cjs"` so Prisma 7
  generated clients match the current CommonJS runtime.
- `npm run -w server check:runtime` imports the compiled server app and is part
  of `npm run ci:portable`.

Accepted evidence:

- PR `#22` shipped the dependency upgrade set.
- PR `#24` fixed the Prisma generated-client runtime mismatch and added the
  portable runtime import smoke.
- `npm run ci:portable` passed locally after the runtime fix with server tests
  `18` files / `71` tests, data-tools portable tests `9` checks, web tests `25`
  files / `92` tests, web typecheck, and web build.
- GitHub `Portable validation` passed on PR `#24`, run `28708360177`.

Frozen clarification:

- `npm audit fix --force` remains rejected because the reported fix downgrades
  Prisma away from the accepted Prisma 7 line.
- The full server ESM migration remains deferred; the accepted v3.7 boundary is
  CommonJS runtime plus NodeNext compile/resolve.

### 4. Deployment Robustness

Shipped behavior:

- Tracked deployment scripts include `apply-nginx-site.sh` so the local script
  set can sync and apply the accepted Nginx site config remotely.
- `sync-remote-scripts.ps1` syncs backend, web, DB update, and Nginx helper
  scripts to the configured remote alias.
- `deploy-backend.sh` defaults remote build heap to `384MB` through
  `SPELLBOOK_NODE_MAX_OLD_SPACE_SIZE` and keeps it operator-overridable.
- Backend deployment now builds successfully on the remote host and starts the
  service with Prisma 7 clients.

Accepted evidence:

- PR `#23` raised the backend deploy heap and documented the override.
- `bash -n docs/deployment-scripts/deploy-backend.sh` passed before merge.
- `docs/deployment-scripts/sync-remote-scripts.ps1 -WhatIf` showed all tracked
  deployment scripts, including `apply-nginx-site.sh`, syncing to `awsTokyo`.
- Deploy run `28708398468` completed successfully for backend and web on
  commit `476c93d`.
- Remote smoke after deploy:
  - `spellbook-api` service: `active`
  - `GET /api/rulebooks`: `200 application/json`
  - `GET /locales/en/about.json`: `200 application/json`
  - `GET /locales/en-US/about.json`: `404`
  - remote repo head: `476c93d`

## Validation Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `npm run ci:portable` | Passed | Local final pass after runtime fix; server `18` files / `71` tests, data-tools `9` checks, web `25` files / `92` tests, web typecheck/build passed. |
| GitHub `Portable validation` | Passed | PR `#24`, run `28708360177`, head `42180ce`. |
| GitHub `Deploy` | Passed | Run `28708398468`, head `476c93d`, backend and web completed. |
| Remote smoke on `awsTokyo` | Passed | Service active; About/backend status reports v3.7 deploy metadata; API and locale paths behave as expected. |
| `npm outdated --workspaces --json` | Non-blocking finding | Reports `tsc-alias` `1.8.17 -> 1.9.0`; not part of the frozen v3.7 deliverable. |
| `npm audit --workspaces --omit=dev --json` | Reviewed residual risk | `3` moderate advisories through Prisma dev-chain / Hono; forced fix remains rejected. |

## Known Deferred Work

- Update `tsc-alias` from `1.8.17` to `1.9.0` in a later dependency
  maintenance pass.
- Revisit the Prisma dev-chain / Hono audit advisory when a Prisma 7-compatible
  fix or a different deploy dependency ownership model is available.
- Set `DEPLOY_SSH_KNOWN_HOSTS` in GitHub secrets to replace the current
  trust-on-first-use fallback warning.
- HTTPS/TLS, HSTS, host hardening, rollback automation, and DB artifact CD
  remain stable-backlog operations work.
- A future full server ESM migration should include a focused server import
  specifier cleanup rather than expanding `~` server aliases.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Do not treat older v3.7 plan documents as newer than this snapshot.
- v3.7 closed the focused security/deploy/dependency maintenance pass; no v3.8
  plan has been opened yet.
