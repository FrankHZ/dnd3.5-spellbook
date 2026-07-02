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
`server/data/db/` and parser/source data under `data/`.

## Status

The latest frozen stage snapshot is **v3.3**.
v3.4 planning docs have started under `docs/mvp/v3.4/`.

For the current work order, use [docs/roadmap.md](./docs/roadmap.md).
For the current feature map, start with [docs/features.md](./docs/features.md).
For current UI design notes, use [docs/design.md](./docs/design.md).
For v3.4 scope and closeout sequencing, use [docs/mvp/v3.4/integrated-plan.md](./docs/mvp/v3.4/integrated-plan.md).
For v3.4 acceptance commands, use [docs/mvp/v3.4/acceptance-checklist.md](./docs/mvp/v3.4/acceptance-checklist.md).
For v3.4 short-description planning, use [docs/mvp/v3.4/short-description-pipeline-plan.md](./docs/mvp/v3.4/short-description-pipeline-plan.md).
For v3.4 data harness planning, use [docs/mvp/v3.4/data-harness-hardening-plan.md](./docs/mvp/v3.4/data-harness-hardening-plan.md).
For early v3.4 UI refresh planning, use [docs/mvp/v3.4/design-refresh-plan.md](./docs/mvp/v3.4/design-refresh-plan.md).
For the v3.3 release snapshot, use [docs/mvp/v3.3/FREEZE.md](./docs/mvp/v3.3/FREEZE.md).
For the full documentation map, use [docs/README.md](./docs/README.md).

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

- [docs/deployment.md](./docs/deployment.md)
- [docs/data-setup.md](./docs/data-setup.md)
- [data-tools/README.md](./data-tools/README.md)

Tracked shell scripts under `docs/deployment-scripts/` are the canonical deployment scripts.

Ignored root-level `.bat` files may exist as local machine-specific convenience wrappers, but they are not part of the canonical deployment contract.

For local database setup and data origins, use [docs/data-setup.md](./docs/data-setup.md).

## Repo Layout

```text
.
|- server/      Backend API, Prisma schemas, app DB import scripts, tests
|- web/         Frontend app, routes, UI, i18n assets
|- contracts/   Shared DTOs and TypeScript types
|- data-tools/  Data inspection, parser, and rules DB tooling
|  `- out/      Generated parser output and data-tool reports
|- data/        Nested local repo for upstream/source inputs and rules patches
|- docs/        Release docs, MVP plans, handoff notes
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

