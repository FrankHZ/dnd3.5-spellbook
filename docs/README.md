# Documentation Index

This directory contains the durable project documentation for the repository.

Use this file as the documentation entry point when you need to determine:

- which docs are current
- which docs are historical
- which document is canonical when multiple docs overlap

## Current Canonical Release Docs

The current frozen release state is **v3.2**.

Start here:

- [mvp/v3.2/FREEZE.md](./mvp/v3.2/FREEZE.md)

That file is the canonical release-level summary for the current project state and defines the final as-built interpretation of the v3.2 handoff set.

## Current Operational Docs

For deployment and environment operations, use:

- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./operations/bootstrap-remote.md)
- [data-setup.md](./data-setup.md)
- [import-workflow.md](./import-workflow.md)
- [repo-conventions.md](./repo-conventions.md)
- [features.md](./features.md)
- [harness.md](./harness.md)
- [feature-workflow.md](./feature-workflow.md)
- [i18n.md](./i18n.md)
- [frontend-map.md](./frontend-map.md)
- [stable-backlog.md](./stable-backlog.md)
- [public-repo-notes.md](./public-repo-notes.md)

These documents define:

- the current manual deployment workflow
- the one-time remote host bootstrap process
- the current local database setup and origins
- the current MVP import pipeline for Chinese app-owned data
- the repo conventions around local wrappers and canonical docs
- the current user-facing feature map
- the current validation surface and harness improvement path
- the lightweight intake workflow for new feature requests
- the current frontend i18n workflow and source-of-truth boundaries
- the quick navigation map for major frontend surfaces
- the intentionally deferred stable-version backlog
- the public-repo exclusions and publication caveats
- the tracked canonical deployment scripts under `docs/deployment-scripts/`

## Agent Entry Point

Agents should start at the repository-root `AGENTS.md`.

That file defines:

- the fastest project orientation path
- current source-of-truth ordering
- validation commands
- data and generated-file cautions
- harness priorities

Keep detailed agent guidance there rather than scattering operational rules
through old MVP plan documents.

## v3.2 Supporting Docs

The rest of `docs/mvp/v3.2/` contains the supporting plan and implementation handoff notes for that release.

When you need implementation detail beyond the freeze summary, read the v3.2 documents in this order:

1. [mvp/v3.2/FREEZE.md](./mvp/v3.2/FREEZE.md)
2. [mvp/v3.2/ui-polish-and-public-readiness.md](./mvp/v3.2/ui-polish-and-public-readiness.md)
3. [mvp/v3.2/ui-stabilization-and-toast.md](./mvp/v3.2/ui-stabilization-and-toast.md)
4. [mvp/v3.2/favorites-json-import-export.md](./mvp/v3.2/favorites-json-import-export.md)
5. [mvp/v3.2/related-spell-references.md](./mvp/v3.2/related-spell-references.md)
6. [mvp/v3.2/plan.md](./mvp/v3.2/plan.md)

## Historical MVP Docs

The `docs/mvp/` directory also contains older version folders:

- `v1.0`
- `v1.1`
- `v2.0`
- `v2.1`
- `v3.0`
- `v3.1`
- `v3.2`

Treat older version folders as historical planning or handoff records unless a newer freeze document explicitly says they still define current behavior.

They are useful for:

- implementation history
- scope evolution
- old design decisions

They are not automatically the source of truth for the current app state.

## Precedence Rule

When multiple docs overlap:

1. Prefer the newest relevant `FREEZE.md` if one exists.
2. Prefer later implementation handoff docs over earlier implementation notes.
3. Prefer focused operational docs such as `deployment.md` for runtime workflow over incidental mentions in README files.
4. Treat plan documents as intended scope, not final shipped behavior.

## Maintenance Rule

To keep maintenance cost low:

- put current canonical statements in one place
- avoid repeating long feature descriptions across multiple README files
- use workspace READMEs for navigation and operational context
- use `docs/` for release-specific or cross-cutting truth
- use root `AGENTS.md` for agent-facing execution guidance
