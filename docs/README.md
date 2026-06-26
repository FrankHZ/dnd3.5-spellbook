# Documentation Index

This directory contains the durable project documentation for the repository.

Use this file as the documentation entry point when you need to determine:

- which docs are current
- which docs are historical
- which document is canonical when multiple docs overlap

## Latest Frozen Release Snapshot

The latest frozen stage snapshot is **v3.2**.

Use it for historical comparison, regression checks, and understanding what was
shipped at that stage:

- [mvp/v3.2/FREEZE.md](./mvp/v3.2/FREEZE.md)

That file defines the final as-built interpretation of the v3.2 handoff set. It
is not automatically the baseline for later active development.

## Active Development Docs

Feature work after the v3.2 freeze is tracked under `docs/mvp/v3.3/`.

Current v3.3 planning docs:

- [mvp/v3.3/data-tools-workspace-plan.md](./mvp/v3.3/data-tools-workspace-plan.md)
- [mvp/v3.3/local-data-layout-plan.md](./mvp/v3.3/local-data-layout-plan.md)
- [mvp/v3.3/rules-db-prep-workflow-plan.md](./mvp/v3.3/rules-db-prep-workflow-plan.md)
- [mvp/v3.3/search-browse-query-plan.md](./mvp/v3.3/search-browse-query-plan.md)
- [mvp/v3.3/spells-full-import-plan.md](./mvp/v3.3/spells-full-import-plan.md)
- [mvp/v3.3/structured-spell-patch-plan.md](./mvp/v3.3/structured-spell-patch-plan.md)

## Current Operational Docs

For current work ordering, use:

- [roadmap.md](./roadmap.md)

For deployment and environment operations, use:

- [deployment.md](./deployment.md)
- [operations/bootstrap-remote.md](./operations/bootstrap-remote.md)
- [data-setup.md](./data-setup.md)
- [import-workflow.md](./import-workflow.md)
- [rules-db-notes.md](./rules-db-notes.md)
- [roadmap.md](./roadmap.md)
- [repo-conventions.md](./repo-conventions.md)
- [features.md](./features.md)
- [harness.md](./harness.md)
- [feature-workflow.md](./feature-workflow.md)
- [i18n.md](./i18n.md)
- [frontend-map.md](./frontend-map.md)
- [stable-backlog.md](./stable-backlog.md)
- [public-repo-notes.md](./public-repo-notes.md)

Workspace command references:

- [../data-tools/README.md](../data-tools/README.md)
- [../server/README.md](../server/README.md)
- [../web/README.md](../web/README.md)
- [../contracts/README.md](../contracts/README.md)

These documents define:

- the current manual deployment workflow
- the one-time remote host bootstrap process
- the current local database setup and origins
- the current MVP import pipeline for Chinese app-owned data
- practical notes for inspecting the local rules SQLite database
- the current active work ordering and restart path
- the repo conventions around local wrappers and canonical docs
- the current user-facing feature map
- the current validation surface and harness improvement path
- the lightweight intake workflow for new feature requests
- the current frontend i18n workflow and source-of-truth boundaries
- the quick navigation map for major frontend surfaces
- the intentionally deferred stable-version backlog
- the public-repo exclusions and publication caveats
- the tracked canonical deployment scripts under `docs/deployment-scripts/`
- the current data tooling commands in `data-tools`

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

## Versioned MVP Docs

The `docs/mvp/` directory contains version folders:

- `v1.0`
- `v1.1`
- `v2.0`
- `v2.1`
- `v3.0`
- `v3.1`
- `v3.2`
- `v3.3`

Treat frozen or older version folders as historical planning or handoff records.
Treat `v3.3` as active development until it gets its own freeze document.

They are useful for:

- implementation history
- scope evolution
- old design decisions

They are not automatically the source of truth for the current app state.

## Precedence Rule

When multiple docs overlap:

1. Prefer the newest focused topic doc for current behavior or workflow.
2. Prefer active development docs for in-flight v3.3 scope.
3. Use frozen `FREEZE.md` files as stage snapshots, not as automatic current
   baselines.
4. Prefer focused operational docs such as `deployment.md` for runtime workflow
   over incidental mentions in README files.
5. Treat plan documents as intended scope, not final shipped behavior.

## Maintenance Rule

To keep maintenance cost low:

- put current canonical statements in one place
- avoid repeating long feature descriptions across multiple README files
- use workspace READMEs for navigation and operational context
- use `docs/` for release-specific or cross-cutting truth
- use root `AGENTS.md` for agent-facing execution guidance
- when adding or moving workspaces, commands, active plans, or source-of-truth
  docs, update root `README.md`, this index, `AGENTS.md`, and the relevant
  workspace README together
