# D&D 3.5 Spellbook

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/FrankHZ/dnd3.5-spellbook)

A bilingual English / Chinese Dungeons & Dragons 3.5 spellbook for browsing,
search, spell details, favorites, spellbooks, and prepared spell tracking.
The monorepo contains a React frontend, Express API, shared TypeScript contracts,
and local data tooling.

## Quick Start

Install dependencies and build shared contracts from the repository root:

```bash
npm install
npm run build:contracts
```

Configure the local databases using [data setup](docs/operations/data-setup.md)
and [server configuration](server/README.md#configuration-and-files). Runtime databases
and source data are intentionally absent from a fresh clone.

Run the API and frontend in separate terminals:

```bash
npm run -w server dev
npm run -w web dev
```

## Working In The Repository

- [GitHub issues](https://github.com/FrankHZ/dnd3.5-spellbook/issues) own feature
  scope, acceptance, dependencies and unresolved decisions. PRs and checks own
  implementation evidence; Git records actual files and history.
- [Documentation](docs/README.md) links current behavior and operations by task.
- Workspace setup and usage: [server](server/README.md), [web](web/README.md),
  [contracts](contracts/README.md), [data-tools](data-tools/README.md).
- The [review console](review-console/README.md) is a private localhost workspace
  for the suspended PHB workflow, not required for normal app development.
- [Deployment](docs/operations/deployment.md) covers the tracked deployment
  scripts. Backend deploys and database activation are operator actions;
  database deployment is not automatic CD.

## Scope And Data

The app does not provide full character sheets, automatic spell-slot legality,
multi-edition support, or a general rules engine.

This is an unofficial fan project, unaffiliated with Wizards of the Coast.
Source inputs and maintained decisions belong in the ignored nested `data/`
repo; runtime SQLite files under `server/db/local/` are also excluded. Generated
local reports live under `data-tools/out/`. Do not publish those artifacts as
portable source data. See [public repository boundaries](docs/operations/public-repo-notes.md).

The [MIT license](LICENSE) covers repository code, not third-party game content,
imported databases or external source material. Review the underlying source
rights before redistributing data or derivatives.

Maintained by `FrankHZ`.
