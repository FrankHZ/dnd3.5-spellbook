# Delivery Module

## Role

Delivery covers validation, CI, deployment wrappers, and release-oriented
operational boundaries.

It should keep quality gates and deployment entry points explicit without
turning GitHub Actions into a parallel deployment implementation.

## Validation Spine

Root commands:

```bash
npm run verify
npm run ci:portable
```

`npm run verify` is the local broad validation command. `npm run ci:portable` is
the clean-checkout CI subset and includes backend API tests against disposable
fixtures.

Local data acceptance remains explicit:

```bash
npm run -w data-tools acceptance:local
```

Do not wire ignored local data or local SQLite DB fingerprints into portable CI.

## CI

The CI workflow lives at:

- `.github/workflows/ci.yml`

It runs on pull requests and pushes to `main`, installs dependencies with
`npm ci`, and runs `npm run ci:portable`.

Browser E2E is intentionally deferred until the lower-cost unit/API/typecheck
spine stops catching the majority of regressions.

## Deployment

Canonical deployment behavior lives in:

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`

The manual deploy workflow lives at:

- `.github/workflows/deploy.yml`

That workflow is a thin wrapper. Backend and DB targets invoke the tracked
remote script copies. The web target builds and uploads static assets, then
invokes the tracked remote web deploy script.

If deployment behavior changes, change the tracked scripts and
`docs/deployment.md` first. The workflow should stay a trigger/orchestration
surface.

## Related Docs

- [../harness.md](../harness.md)
- [../deployment.md](../deployment.md)
- [../mvp/v3.5/ci-cd-and-module-docs-plan.md](../mvp/v3.5/ci-cd-and-module-docs-plan.md)
- [./server.md](./server.md)
- [./web.md](./web.md)
