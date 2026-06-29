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

The frontend currently keeps runtime configuration intentionally minimal.

Current behavior:

- API requests are made against relative `/api/...` paths
- the app expects the browser-facing host to expose the backend under `/api`
- there is no current required frontend runtime environment variable for API base URL

In development, the app code uses `import.meta.env.DEV` for development-only behavior such as i18n debug mode.

For deployment and reverse-proxy expectations, use:

- [../docs/deployment.md](../docs/deployment.md)

## Notes

- The frontend depends on `@dnd/contracts` for shared DTOs and types.
- UI behavior should follow the current feature map and the design inventory in
  [../docs/design.md](../docs/design.md).
- The production build output is written under `build/`.
- Deployment workflow and remote activation steps are documented in [../docs/deployment.md](../docs/deployment.md).
- For current release-level behavior, start with [../docs/mvp/v3.3/FREEZE.md](../docs/mvp/v3.3/FREEZE.md).

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
- [../docs/deployment.md](../docs/deployment.md)
- [../docs/data-setup.md](../docs/data-setup.md)
- [../docs/design.md](../docs/design.md)
- [../docs/frontend-map.md](../docs/frontend-map.md)
- [../docs/i18n.md](../docs/i18n.md)
- [../docs/mvp/v3.4/i18next-conventions-plan.md](../docs/mvp/v3.4/i18next-conventions-plan.md)
