# Web Workspace

React Router frontend for browsing, search, spell detail, favorites,
collections, prepared spells, and bilingual display.

## Setup And Commands

Install dependencies from the repository root and run `npm run build:contracts`
on a fresh checkout or after shared-contract changes. Start the backend for
local API access. Run workspace commands from the repository root;
[package.json](./package.json) owns their executable definitions.

| Task | Command |
| --- | --- |
| Develop | `npm run -w web dev` |
| Build | `npm run -w web build` |
| Run the built app locally | `npm run -w web start` |
| Generate route types and typecheck | `npm run typecheck:web` |
| Run frontend tests once | `npm run test:web` |

For UI copy, use the [i18n workflow](../docs/i18n.md#changing-ui-copy), including
its root `i18n:sync` and `i18n:check` commands. Behavior or layout changes need
the affected tests/build and a browser smoke of the affected page.
Documentation-only edits need link, command, and diff checks.

## Configuration And Files

- `app/`: routes, features, components, browser state, and API helpers.
- `public/`: static assets and maintained locale JSON.
- `scripts/`: local maintenance commands.
- `build/`: generated output; root `wrangler.jsonc` publishes `web/build/client`.

`VITE_API_BASE_URL` is the API origin/base host; application helpers still call
`/api/...`. When unset, requests are relative and development uses the Vite
`/api` proxy. The deployed Workers frontend uses
`VITE_API_BASE_URL=https://api.d20spellcodex.com`. Deployment commands and build
metadata belong to [deployment](../docs/operations/deployment.md#frontend-deployment).

Read [frontend-map](../docs/frontend-map.md) when locating a feature,
[design](../docs/design.md) for UI conventions, or [i18n](../docs/i18n.md) for
language and display fallback behavior. Historical release plans are not setup
prerequisites.
