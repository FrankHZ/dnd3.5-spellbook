# Web Workspace

This workspace contains the frontend application.

It is a React Router app that provides the user-facing spellbook experience: browsing, search, spell detail, favorites, collections, prepared spell management, and i18n.

## Key Directories

- `app/`: routes, features, components, state, API client code
- `public/`: static assets and locale JSON files
- `scripts/`: local maintenance scripts such as i18n sync helpers
- `build/`: generated production output

## Main Commands

Run the frontend in development:

```bash
npm run -w web dev
```

Build the frontend:

```bash
npm run -w web build
```

Run the built app locally:

```bash
npm run -w web start
```

Run type generation and type checks:

```bash
npm run -w web typecheck
```

Sync extracted i18n namespaces back into checked-in locale files:

```bash
npm run -w web i18next:sync
```

Run the sync check without leaving extracted changes behind:

```bash
npm run -w web i18next:sync:check
```

## Configuration

The frontend supports one API base URL build variable:

```bash
VITE_API_BASE_URL=https://api.d20spellcodex.com
```

Current behavior:

- when `VITE_API_BASE_URL` is unset, API requests use relative `/api/...` paths
- local development keeps using the Vite dev proxy for `/api`
- Cloudflare Workers production should set
  `VITE_API_BASE_URL=https://api.d20spellcodex.com`
- the value is treated as the API origin/base host, so app code still calls
  `/api/...` helpers internally

In development, the app code also uses `import.meta.env.DEV` for development-only behavior such as i18n debug mode.

Suggested Cloudflare Workers Builds settings:

- Root directory: repository root
- Install command: `npm ci`
- Build command:
  ```bash
  sh -lc 'commit="${WORKERS_CI_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"; ref="${WORKERS_CI_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"; export VITE_SPELLBOOK_VERSION_LABEL=v1.0 VITE_SPELLBOOK_FRONTEND_COMMIT_SHA="$commit" VITE_SPELLBOOK_FRONTEND_REF="$ref" VITE_SPELLBOOK_FRONTEND_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; npm run build:contracts && npm run -w web build'
  ```
- Deploy command: `npx wrangler deploy`
- Static asset config: root `wrangler.jsonc`
- Environment variables:
  - `NODE_VERSION=24`
  - `VITE_API_BASE_URL=https://api.d20spellcodex.com`
- The build command exports Workers Builds `WORKERS_CI_*` metadata into
  `VITE_SPELLBOOK_*` values before running `npm run -w web build`.

For deployment and reverse-proxy expectations, use:

- [../docs/operations/deployment.md](../docs/operations/deployment.md)

## Notes

- The frontend depends on `@dnd/contracts` for shared DTOs and types.
- UI behavior should follow the current feature map and the design inventory in
  [../docs/design.md](../docs/design.md).
- Early v3.4 frontend styling work should follow
  [../docs/mvp/v3.4/design-refresh-plan.md](../docs/mvp/v3.4/design-refresh-plan.md).
- The production build output is written under `build/`; root `wrangler.jsonc`
  publishes `web/build/client` as Workers Static Assets.
- Deployment workflow and remote activation steps are documented in [../docs/operations/deployment.md](../docs/operations/deployment.md).
- For current release-level behavior, start with [../docs/releases/v1.0/README.md](../docs/releases/v1.0/README.md).

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
- [../docs/operations/deployment.md](../docs/operations/deployment.md)
- [../docs/operations/data-setup.md](../docs/operations/data-setup.md)
- [../docs/design.md](../docs/design.md)
- [../docs/frontend-map.md](../docs/frontend-map.md)
- [../docs/i18n.md](../docs/i18n.md)
- [../docs/mvp/v3.4/design-refresh-plan.md](../docs/mvp/v3.4/design-refresh-plan.md)
- [../docs/mvp/v3.4/i18next-conventions-plan.md](../docs/mvp/v3.4/i18next-conventions-plan.md)
