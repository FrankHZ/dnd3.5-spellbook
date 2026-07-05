# D&D 3.5 Spellbook

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/FrankHZ/dnd3.5-spellbook)

A monorepo for a Dungeons & Dragons 3.5 spellbook application with:

- a React frontend
- an Express API
- shared TypeScript contracts
- data import and inspection tooling
- bilingual English / Chinese spell support

The project is optimized for practical tabletop use: fast lookup, clean spell detail pages, favorites, spellbooks, and prepared spell management.

## Public Repo Status

This repository is an unofficial fan project.

It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast.

To reduce redistribution risk, data-bearing local artifacts are intentionally
excluded from the public repository, especially runtime databases under
`server/db/local/` and parser/source data under `data/`.

## Status

The active version plan is **v3.9**. The latest frozen stage snapshot is
**v3.8**.

Start here:

- [docs/README.md](./docs/README.md): documentation map and precedence rules.
- [docs/roadmap.md](./docs/roadmap.md): current work order.
- [docs/features.md](./docs/features.md): current feature map.
- [docs/mvp/v3.9/README.md](./docs/mvp/v3.9/README.md): active normalized
  mechanics/query fullstack completion plan.
- [docs/mvp/v3.8/FREEZE.md](./docs/mvp/v3.8/FREEZE.md): latest frozen
  release snapshot.
- [docs/mvp/v3.8/README.md](./docs/mvp/v3.8/README.md): frozen normalized
  query/filter planning record.
- [docs/mvp/v3.7/FREEZE.md](./docs/mvp/v3.7/FREEZE.md): previous frozen
  security, deploy/status visibility, and dependency-maintenance snapshot.
- [docs/mvp/v3.6/FREEZE.md](./docs/mvp/v3.6/FREEZE.md): older frozen
  stabilization snapshot.

## Quick Start

Install workspace dependencies from the repo root:

```bash
npm install
```

Build shared contracts:

```bash
npm run build:contracts
```

Run the API in one terminal:

```bash
npm run -w server dev
```

Run the frontend in another terminal:

```bash
npm run -w web dev
```

The main workspace commands and constraints are documented in:

- [server/README.md](./server/README.md)
- [web/README.md](./web/README.md)
- [contracts/README.md](./contracts/README.md)
- [data-tools/README.md](./data-tools/README.md)

## Operational Helpers

The current deployment workflow is documented in:

- [docs/operations/README.md](./docs/operations/README.md)
- [docs/operations/deployment.md](./docs/operations/deployment.md)
- [docs/operations/data-setup.md](./docs/operations/data-setup.md)
- [data-tools/README.md](./data-tools/README.md)

Tracked shell scripts under `docs/deployment-scripts/` are the canonical deployment scripts.

The GitHub Actions deploy workflow is a manual code/web wrapper around those
scripts; it does not replace them as the deployment source of truth. Database
deployment remains manual until the DB ownership model is redesigned.

Ignored root-level `.bat` files may exist as local machine-specific convenience wrappers, but they are not part of the canonical deployment contract.

For local database setup and data origins, use [docs/operations/data-setup.md](./docs/operations/data-setup.md).

## Repo Layout

```text
.
|- server/      Backend API, Prisma schemas, content DB import scripts, tests
|- web/         Frontend app, routes, UI, i18n assets
|- contracts/   Shared DTOs and TypeScript types
|- data-tools/  Data inspection, parser, and rules DB tooling
|  `- out/      Generated parser output and data-tool reports
|- data/        Nested local repo for upstream/source inputs and rules patches
|- docs/        Durable docs, operations docs, module docs, and version history
```

## What The App Covers

- Spell browsing and search
- Spell detail pages
- Favorites
- Spellbook collections
- Prepared spell tracking
- English / Chinese UI and content support

## Intentional Non-Goals

To keep the scope stable, the project currently does not aim to provide:

- full character sheets
- automatic spell-slot legality enforcement
- multi-edition support
- a full rules engine beyond spell-centric workflows

## Documentation Model

This repo keeps documentation intentionally lightweight:

- The root `README.md` is a short human-friendly entry point.
- [docs/README.md](./docs/README.md) is the canonical documentation map.
- [docs/roadmap.md](./docs/roadmap.md) is the current active work ordering.
- [docs/design.md](./docs/design.md) is the current UI design inventory and
  principle note.
- Each workspace `README.md` gives short operational guidance.
- `docs/` contains versioned and canonical project documents.

When documents conflict, prefer the newest focused topic doc called out by
[docs/README.md](./docs/README.md). Frozen MVP docs are stage snapshots, not
automatic baselines for later work.

## Data Notes

- Spell data ultimately comes from local imported sources and app databases that
  are not fully committed as portable source data.
- Chinese content is derived from player-created source material processed by local tooling.
- If you reuse project data or publish derivatives, review the licensing status of the underlying data sources first.

## License Status

The repository now includes an MIT `LICENSE` for the code in this repo.

That license applies to the code you are publishing here. It does not automatically grant rights to third-party game content, imported databases, or other external source material.

## Author

Maintained by `FrankHZ`.
