# v3.7 Security Review

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Create or update an
> integrated plan only if v3.7 grows into multiple conflicting workstreams.

Status: review complete; v3.7 security hardening slices implemented on
`codex/server-security-hardening` pending review.

Review date: 2026-07-03.

## Purpose

Identify practical security risks introduced or made more visible by the recent
content DB, deployment, and DB status API work, then define small v3.7 hardening
slices.

## Scope

Reviewed surfaces:

- Express API setup, route exposure, parsing, and error handling
- DB status API contract and deployment documentation
- deployment scripts, GitHub Actions deploy workflow, and Nginx bootstrap notes
- frontend rendered spell HTML and browser-local state
- dependency audit output
- existing stable-version security backlog

Out of scope for this review branch:

- user accounts, login, permissions, or server-owned user data
- automatic DB release artifacts and rollback automation
- large deployment redesign
- bulk content moderation or copyright review

## Commands And Evidence

Commands run from the plan worktree:

```bash
npm audit --workspaces --omit=dev
npm audit --workspaces
rg -n "cors\(|helmet|rate|sanitize|dangerouslySetInnerHTML|innerHTML|eval\(|new Function|child_process|exec\(|spawn\(|process\.env|DATABASE_URL|SECRET|TOKEN|PASSWORD|api/status|/health|http://|ssh |scp |curl " server web contracts docs .github -g "*.ts" -g "*.tsx" -g "*.md" -g "*.yml" -g "*.yaml" -g "*.sh" -g "*.ps1"
```

Manual review focused on:

- `server/src/app.ts`
- `server/src/middlewares/error.middleware.ts`
- `server/src/controllers/spells.controller.ts`
- `server/src/services/db-status.service.ts`
- `web/app/features/spells/DescriptionSection.tsx`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docs/deployment-scripts/*.sh`
- `docs/operations/bootstrap-remote.md`

## Current Security Posture

Positive controls already present:

- Runtime SQLite files, raw source data, parser outputs, and local data repo
  contents are excluded from the public parent repo.
- Server DB access goes through Prisma or constrained fixture loaders rather
  than ad hoc SQL built from request strings.
- Spell list and resolve endpoints cap page size, batch ids, and resolve names.
- Frontend spell description HTML is sanitized with DOMPurify before
  `dangerouslySetInnerHTML`.
- Portable CI runs a clean-checkout validation spine on PRs and pushes to
  `main`.
- Deployment scripts are tracked under `docs/deployment-scripts/` and use
  `set -euo pipefail` where they handle backend or DB updates.

Threat assumptions for this review:

- The deployed app is a public, mostly read-only reference tool.
- There are no server-side user accounts or authentication flows today.
- Browser-local spellbooks and prepared spell data are user convenience state,
  not secrets.
- DB upload and activation remain manual operator workflows.

## Findings

### P0

No P0 issue was found in this pass.

### P1: Gate Or Redact Operator Status API

`GET /api/status/db` is intentionally read-only, but deployment docs proxy all
`/api/*` traffic through Nginx. In a public deployment, the endpoint can reveal
sanitized database file names, database existence, active read source, content
build commit ids, hashes, and table counts.

This is useful for operators, but more than ordinary public readers need.

Recommended fix:

- Gate `/api/status/db` behind an explicit production control, such as an
  operations token, loopback-only Nginx rule, or `ENABLE_DB_STATUS_PUBLIC=false`
  default.
- Keep `/health` public.
- Keep local development behavior easy to use.
- Document the chosen operator check in `docs/operations/deployment.md`.

Acceptance:

- Public production requests cannot read DB provenance unless the operator
  intentionally enables it.
- Local operator workflow can still compare the endpoint with
  `rules:content:meta`.

Accepted Slice 1 implementation:

- Keep local/test behavior open.
- In production, keep the endpoint private by default.
- Allow production access with `SPELLBOOK_DB_STATUS_TOKEN` sent as
  `Authorization: Bearer ...` or `X-Spellbook-Operations-Token`.
- Allow intentional public exposure with `ENABLE_DB_STATUS_PUBLIC=true`.
- Keep public About / Version display working through the redacted content
  summary on `GET /api/status/app`.

### P1: Stop Returning Internal 500 Error Messages

`server/src/middlewares/error.middleware.ts` logs full errors, which is good,
but also returns `err.message` in generic 500 responses. Prisma and filesystem
errors can include schema names, table names, paths, or connection details.

Recommended fix:

- Return a generic `error` value for non-`ApiError` failures in production.
- Keep full details in logs.
- Optionally retain verbose errors in local development and tests.

Acceptance:

- Production 500 JSON does not expose internal exception text.
- API tests cover production and development behavior if both modes are kept.

Accepted Slice 1 implementation:

- Preserve `ApiError` payloads.
- Return generic non-`ApiError` details in production.
- Keep verbose fallback details outside production for local/test debugging.

### P1: Add HTTP Security Header And TLS Plan

The bootstrap Nginx example listens on plain HTTP and does not document security
headers. Express also does not use `helmet`.

Recommended fix:

- Choose whether security headers live in Nginx, Express, or both.
- Add a documented header baseline: `X-Content-Type-Options`, frame blocking,
  referrer policy, and a CSP compatible with the React build.
- Promote HTTPS/TLS from stable backlog into an accepted operations plan before
  public production is treated as hardened.
- Add HSTS only after TLS is confirmed.

Acceptance:

- Deployment docs provide a clear API header baseline and Nginx proxy guidance.
- Local dev remains unaffected.

Accepted Slice 2 implementation:

- Own the API security header baseline in Express middleware.
- Keep Nginx responsible for proxying and eventual TLS termination.
- Document `X-Content-Type-Options`, frame blocking, referrer policy,
  cross-origin resource policy, and API-only CSP.
- Keep TLS/HSTS as an operations follow-up; add HSTS only after HTTPS is
  configured and verified.

### P2: Restrict CORS And Add Low-Cost Abuse Controls

`server/src/app.ts` uses open `cors()`. Current APIs are read-only or local
browser-state oriented, so this is not urgent by itself. Combined with public
status/meta/search endpoints, it is still a low-cost hardening target.

Recommended fix:

- Add an allowed-origin environment variable for production.
- Keep permissive CORS for local development if no origin is configured.
- Consider rate limiting for search, resolve, batch, and status endpoints.

Acceptance:

- Production CORS policy is explicit.
- Abuse controls do not break local dev or the static web/API split.

Accepted Slice 2 implementation:

- Add `SPELLBOOK_CORS_ORIGINS` as a comma-separated production browser
  allowlist.
- Keep local/test CORS permissive when no origin allowlist is configured.
- Keep same-origin static web/API deployments working without CORS.
- Defer rate limiting until traffic or write endpoints make the extra moving
  parts worthwhile.

### P2: Track Prisma CLI Audit Finding Without Force Downgrade

`npm audit --workspaces` and `npm audit --workspaces --omit=dev` reported a
moderate advisory through Prisma CLI's `@prisma/dev` dependency on
`@hono/node-server <1.19.13`:

- advisory: middleware bypass via repeated slashes in `serveStatic`
- reported fix: `npm audit fix --force`
- side effect: downgrades Prisma to `6.19.3`, a breaking change for this repo

The app does not use Hono `serveStatic` at runtime, but deploy scripts currently
install the full workspace on the host to build/generate. Track this as a
dependency policy item rather than forcing a downgrade. General major
dependency sequencing belongs in `dependency-upgrade-plan.md`; this finding only
owns the security/audit decision.

Recommended fix:

- Re-run audit when Prisma publishes a compatible fix.
- Consider whether production deploy should install build-time dev dependencies
  on the host or build artifacts elsewhere.
- Do not force-downgrade Prisma without a focused compatibility review.

Acceptance:

- Audit result is either resolved by compatible upgrades or documented as a
  reviewed build-time exposure.

### P2: Tighten Deploy Workflow Defaults

`.github/workflows/deploy.yml` allows manual deploys with portable validation
disabled. It also relies on default GitHub token permissions.

Status: addressed for v3.7. The deploy workflow has explicit
`permissions: contents: read`. Portable validation remains enabled by default;
the skip input is documented and warned as emergency rollback only.

Recommended fix:

- Add explicit workflow `permissions: contents: read`.
- Consider removing the ability to skip portable validation for production
  deploys, or rename it as an emergency-only option with a documented reason.
- Keep DB upload out of CD until DB artifact ownership and rollback are solved.

Acceptance:

- Deploy workflow is least-privilege by default.
- Normal production deploys cannot silently skip validation.

Accepted Slice 3 implementation:

- Keep the skip input for operator escape hatch rather than removing it during
  MVP deployment work.
- Emit a GitHub Actions warning when portable validation is skipped.
- Keep DB upload out of CD until DB artifact ownership and rollback are solved.

### P2: Improve SSH Host Trust And Backup Hygiene

The GitHub deploy workflow uses `ssh-keyscan` at runtime, which is convenient
but trust-on-first-use. DB update scripts keep timestamped backups but do not
document retention.

Recommended fix:

- Prefer a pinned host key secret or documented host-key bootstrap check for
  GitHub deploy.
- Add backup retention guidance for DB backups under `/opt/spellbook/data`.

Acceptance:

- Remote deploy docs distinguish convenience bootstrap from hardened operation.
- Backup growth has an operator policy.

Accepted Slice 4 implementation:

- Prefer `DEPLOY_SSH_KNOWN_HOSTS` as a pinned host-key secret in GitHub deploy.
- Keep `ssh-keyscan` as a warning-emitting fallback for current convenience.
- Document manual DB backup retention and pruning expectations.

## Recommended v3.7 Slices

### Slice 1: Operator Endpoint And Error Response Hardening

- Deliverable: status endpoint exposure decision plus production-safe generic
  error responses.
- Expected files: server middleware/tests, status route/config if needed,
  deployment docs, this review doc.
- Implementation branch: `codex/server-security-hardening`.
- Validation: `npm run test:server`, `npm run -w server build`.

### Slice 2: HTTP Headers, CORS, And TLS Documentation

- Deliverable: accepted header/CORS/TLS baseline for public deployment.
- Expected files: `server/src/app.ts` or Nginx docs/scripts, deployment docs,
  module docs if ownership changes.
- Validation: server tests for CORS/header behavior if implemented in Express;
  docs review if Nginx-only.
- Status: implemented on `codex/server-security-hardening`.

### Slice 3: Dependency And Deploy Policy

- Deliverable: decision on Prisma audit handling, deploy permissions, and
  validation-skip policy.
- Expected files: package/deps PR if upgrading, `.github/workflows/deploy.yml`,
  `docs/operations/deployment.md`.
- Validation: `npm audit --workspaces`, `npm run ci:portable`.
- Status: deploy policy implemented on `codex/server-security-hardening`;
  broader dependency upgrade decisions stay in `dependency-upgrade-plan.md`.

### Slice 4: SSH And Backup Operations Notes

- Deliverable: host-key and backup-retention guidance.
- Expected files: `docs/operations/deployment.md`,
  `docs/operations/bootstrap-remote.md`.
- Validation: docs review.
- Status: implemented on `codex/server-security-hardening`.

## Acceptance Criteria

- P1 findings have accepted implementation owners or explicit deferral notes.
- The first hardening PR does not add auth/user-state scope.
- Dependency audit handling avoids breaking Prisma downgrade paths.
- Deployment docs distinguish local convenience, current manual operation, and
  hardened production expectations.

## Doc Updates

- Update this review when finding status, priority, or accepted slice ownership
  changes.
- Update `docs/roadmap.md` when security hardening changes active work order.
- Update `docs/operations/deployment.md`,
  `docs/operations/bootstrap-remote.md`, and `docs/modules/delivery.md` when
  deployment/security behavior changes.
- Do not create `integrated-plan.md` unless v3.7 gains multiple major
  workstreams beyond security review.

## Open Questions

- Should production deploy install dev dependencies on-host, or should backend
  artifacts be built before upload in a future delivery pass?
