# Documentation Index

This directory contains the durable project documentation for the repository.

Use this file as the documentation entry point when you need to determine:

- which docs are current
- which docs are historical
- which document is canonical when multiple docs overlap

## Latest Frozen Release Snapshot

The latest frozen stage snapshot is **v3.4**.

Use it for historical comparison, regression checks, and understanding what was
shipped at that stage:

- [mvp/v3.4/FREEZE.md](./mvp/v3.4/FREEZE.md)

That file defines the final as-built interpretation of the v3.4 handoff set. It
is not automatically the baseline for later active development.

## v3.4 Supporting Docs

The rest of `docs/mvp/v3.4/` contains the supporting plan and acceptance notes
for that release.

When you need implementation detail beyond the freeze summary, read the v3.4
documents in this order:

- [mvp/v3.4/FREEZE.md](./mvp/v3.4/FREEZE.md)
- [mvp/v3.4/integrated-plan.md](./mvp/v3.4/integrated-plan.md)
- [mvp/v3.4/acceptance-checklist.md](./mvp/v3.4/acceptance-checklist.md)
- [mvp/v3.4/short-description-pipeline-plan.md](./mvp/v3.4/short-description-pipeline-plan.md)
- [mvp/v3.4/data-harness-hardening-plan.md](./mvp/v3.4/data-harness-hardening-plan.md)
- [mvp/v3.4/design-refresh-plan.md](./mvp/v3.4/design-refresh-plan.md)
- [mvp/v3.4/i18next-conventions-plan.md](./mvp/v3.4/i18next-conventions-plan.md)

The freeze document records the as-built v3.4 state. The supporting plan
documents describe implementation rationale and are not newer than the freeze
snapshot.

## v3.3 Supporting Docs

The rest of `docs/mvp/v3.3/` contains the supporting plan and acceptance notes
for that release.

When you need implementation detail beyond the freeze summary, read the v3.3
documents in this order:

- [mvp/v3.3/FREEZE.md](./mvp/v3.3/FREEZE.md)
- [mvp/v3.3/acceptance-checklist.md](./mvp/v3.3/acceptance-checklist.md)
- [mvp/v3.3/data-tools-workspace-plan.md](./mvp/v3.3/data-tools-workspace-plan.md)
- [mvp/v3.3/local-data-layout-plan.md](./mvp/v3.3/local-data-layout-plan.md)
- [mvp/v3.3/rules-db-prep-workflow-plan.md](./mvp/v3.3/rules-db-prep-workflow-plan.md)
- [mvp/v3.3/search-browse-query-plan.md](./mvp/v3.3/search-browse-query-plan.md)
- [mvp/v3.3/spells-full-import-plan.md](./mvp/v3.3/spells-full-import-plan.md)
- [mvp/v3.3/structured-spell-patch-plan.md](./mvp/v3.3/structured-spell-patch-plan.md)

## Active v3.5 Planning

v3.5 planning has started under `docs/mvp/v3.5/`:

- [mvp/v3.5/README.md](./mvp/v3.5/README.md)
- [mvp/v3.5/integrated-plan.md](./mvp/v3.5/integrated-plan.md)
- [mvp/v3.5/db-ownership-boundary-plan.md](./mvp/v3.5/db-ownership-boundary-plan.md)
- [mvp/v3.5/rules-content-normalization-plan.md](./mvp/v3.5/rules-content-normalization-plan.md)
- [mvp/v3.5/normalized-rules-frontend-consumer-plan.md](./mvp/v3.5/normalized-rules-frontend-consumer-plan.md)
- [mvp/v3.5/rulebook-display-labels-plan.md](./mvp/v3.5/rulebook-display-labels-plan.md)
- [mvp/v3.5/agent-guide-review-plan.md](./mvp/v3.5/agent-guide-review-plan.md)
- [mvp/v3.5/ci-cd-and-module-docs-plan.md](./mvp/v3.5/ci-cd-and-module-docs-plan.md)

The integrated plan ties the v3.5 child plans together and records the current
cross-plan conflict review. The DB ownership plan covers the v3.5 split between
generated content data and
future user/app-state data. The rules content normalization plan covers
promoting cleaned legacy rules data into this repo's own normalized runtime
content model for finer query surfaces. The normalized rules frontend consumer
plan covers how Browse, Search, Spell Detail, Prepared Spells, and Settings
consume those facets without bloating page controls. The rulebook display-label
plan covers curated English rulebook abbreviations and Chinese full-name display
labels without mutating legacy source slugs or rulebook IDs. The agent guide
review plan covers shrinking `AGENTS.md` back into an execution guide,
clarifying repo-local skill path resolution, and reviewing feature/workflow doc
boundaries. The CI/CD, dependency review, and module-docs plan covers
clean-checkout CI, dependency inventory and safe updates, script-backed CD, and
merge-to-main agent automation for high-level module design docs.

For high-level module ownership after the v3.5 module-doc baseline, use:

- [modules/README.md](./modules/README.md)
- [modules/server.md](./modules/server.md)
- [modules/web.md](./modules/web.md)
- [modules/contracts.md](./modules/contracts.md)
- [modules/data-tools.md](./modules/data-tools.md)
- [modules/delivery.md](./modules/delivery.md)

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
- [design.md](./design.md)
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
- the current UI design inventory, principles, and non-roadmap design notes
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
- `v3.4`
- `v3.5`

Treat frozen or older version folders as historical planning or handoff records.
Start new active work from `docs/roadmap.md` and a focused topic plan rather
than treating frozen version folders as active scratch space.

They are useful for:

- implementation history
- scope evolution
- old design decisions

They are not automatically the source of truth for the current app state.

## Precedence Rule

When multiple docs overlap:

1. Prefer the newest focused topic doc for current behavior or workflow.
2. Prefer active development docs for in-flight future scope.
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
