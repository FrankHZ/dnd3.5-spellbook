# v1.0 Release Plan

Status: active plan.

v1.0 is the first formal post-MVP public release line. It should move the app
from the MVP single-origin deployment shape to a clearer production topology:
Cloudflare Workers Static Assets for the frontend, a dedicated API domain for
the backend, and the existing server focused on Express, SQLite/content DB, DB
updates, and API reverse proxying.

## Release Boundary

Frontend:

- `https://www.d20spellcodex.com`
- Cloudflare Workers Static Assets owns frontend serving.
- Cloudflare Workers Builds should own Git-based frontend build and deployment.
- Manual Wrangler deploy remains an operator tool, not the normal production
  CD path.
- The apex domain `d20spellcodex.com` is intentionally left unassigned for
  v1.0 until a redirect or canonical-domain policy is accepted.

API:

- `https://api.d20spellcodex.com`
- Cloudflare proxied DNS routes browser API traffic to the existing server.
- Production CORS should explicitly allow `https://www.d20spellcodex.com`.

Server:

- Keep Express/API, SQLite/content DB, DB update scripts, and Nginx API reverse
  proxying.
- Stop treating the server as the canonical static frontend host.
- Keep DB upload/update operator-owned until a separate content artifact and
  rollback model is accepted.

About / Status:

- Maintain the formal About / Status page that explains frontend build state,
  API origin, backend version, content DB state, source credits, and update
  times.

## Track Order

1. **Domain and deployment topology**

   Landed. This owns Cloudflare Workers frontend deployment, API
   domain/proxy/TLS/CORS, web API base URL configuration, GitHub workflow
   changes, and operations docs.

2. **About and status surface**

   Landed. This owns the user-facing status page,
   frontend/backend/content version display, source credits, and the stable
   public status contract for the split frontend/API topology.

3. **Release Ready Doc Sweep**

   Current. This owns the final cross-doc quality gate. It verifies that
   current canonical docs no longer describe the MVP-era deployment topology as
   current truth and that release docs, operations docs, module docs, and
   navigation agree before freeze.

4. **Release acceptance and freeze**

   Next. This owns production smoke tests, Cloudflare/remote verification,
   final docs, and the v1.0 release freeze snapshot after release acceptance
   completes.

Do not create an integrated plan unless these tracks start conflicting on
delivery sequence, ownership, or accepted release scope.

## Non-Goals

- Do not reopen v3.10 MVP UI/i18n acceptance.
- Do not add static/offline artifact generation.
- Do not add full content artifact/versioned DB release automation.
- Do not add large-scale Chinese/English translation or proofreading QA.
- Do not promote `target` / `effect` / `area` backend normalization.
- Do not migrate away from the existing Express/SQLite backend solely for v1.0.
- Do not make manual Wrangler deploy the frontend deployment model unless
  Workers Builds Git integration is rejected by a specific blocking constraint.

## Plans

- [domain-and-deployment-plan.md](./domain-and-deployment-plan.md)
- [about-and-status-plan.md](./about-and-status-plan.md)
- [release-ready-doc-sweep-plan.md](./release-ready-doc-sweep-plan.md)

## Release Acceptance

v1.0 release acceptance should include:

- Cloudflare Workers production build for `https://www.d20spellcodex.com`.
- Workers custom domain or route attached through Cloudflare, not only a
  hand-edited DNS record.
- SPA deep-link refresh works for representative app routes.
- Frontend API client uses `https://api.d20spellcodex.com` in production and
  still uses local `/api` or dev proxy behavior in local development.
- Cross-origin API fetch succeeds from allowed production frontend origins.
- CORS rejects unallowed browser origins in production.
- API domain is reachable over HTTPS through Cloudflare proxying.
- Origin TLS is configured for Cloudflare Full (strict) or an explicitly
  accepted equivalent.
- Existing backend deploy and DB update scripts still work for the API server.
- GitHub deploy workflow no longer treats web-to-origin static deploy as the
  normal production frontend path.
- About / Status reports frontend build, API origin, backend version, public
  content DB status, source credits, and relevant update times.
- Release-ready doc sweep confirms root README, docs index, roadmap,
  AGENTS.md, feature docs, design docs, operations docs, module docs, and this
  release README agree before freeze.

## External Platform Assumptions

These assumptions should be verified during implementation against current
Cloudflare docs:

- Workers Builds Git integration supports automatic deployments from the Git
  repository.
- Workers Static Assets uses `wrangler.jsonc` for the asset directory and SPA
  fallback behavior.
- Workers custom domains can attach the `www` frontend hostname to the Worker.
- The apex hostname can stay unassigned until a redirect policy is accepted.
- Workers Builds supports monorepo build configuration, including install,
  build, deploy commands, and environment variables.
- Workers SPA routing should be validated with direct refreshes for app routes.
- Cloudflare proxied DNS should be used for the API domain.
- Full (strict) requires a valid origin certificate, such as Cloudflare Origin
  CA or a publicly trusted certificate, and HTTPS reachability to the origin.

Reference docs for implementation review:

- Cloudflare Workers Static Assets:
  <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare Workers SPA routing:
  <https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/>
- Cloudflare Workers Builds:
  <https://developers.cloudflare.com/workers/ci-cd/builds/>
- Cloudflare Workers Builds configuration:
  <https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>
- Cloudflare Workers custom domains:
  <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- Cloudflare DNS proxy status:
  <https://developers.cloudflare.com/dns/proxy-status/>
- Cloudflare SSL/TLS Full (strict):
  <https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/>
- Cloudflare Origin CA:
  <https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/>

## Expected Documentation Updates

- `web/README.md`: document `VITE_API_BASE_URL`, local default `/api`, and
  Workers production value.
- `docs/operations/deployment.md`: split frontend Workers deployment from
  backend remote deployment.
- `docs/modules/delivery.md`: update delivery ownership and workflow boundary.
- `.github/workflows/deploy.yml`: remove or downgrade web-to-origin static
  deploy as the production frontend path; preserve backend deploy.
- `docs/README.md`: keep release-plan navigation discoverable.
- `AGENTS.md`: keep MVP-vs-release planning roles explicit.
- Final release-ready doc sweep: verify root README, docs index, roadmap,
  AGENTS.md, `docs/features.md`, `docs/design.md`, `docs/operations/*`,
  `docs/modules/*`, and this release README do not retain MVP-era deployment
  topology as current truth.

## Handoff Rule

v3.10 is frozen. v1.0 is now the active release track in `docs/roadmap.md`.
Keep this release line focused on public release readiness and do not reopen
v3.10 MVP UI/i18n acceptance.
