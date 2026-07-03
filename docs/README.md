# Documentation Index

This directory contains the durable project documentation for the repository.

Use this file to choose the right source of truth. Use `docs/roadmap.md` to
decide what to do next after a pause.

## Current Entry Points

- [roadmap.md](./roadmap.md): current work order, recently completed slices,
  and later stable backlog.
- [features.md](./features.md): current user-facing feature map.
- [harness.md](./harness.md): validation and harness strategy.
- [design.md](./design.md): durable UI design direction.
- [i18n.md](./i18n.md): frontend copy and locale workflow.
- [modules/README.md](./modules/README.md): high-level module ownership.
- [operations/README.md](./operations/README.md): deployment, data setup, and
  remote operations map.

Agents should also read the repository-root [AGENTS.md](../AGENTS.md) for
execution rules and role boundaries.

## Active Planning

v3.6 is the active post-v3.5 planning space:

- [mvp/v3.6/README.md](./mvp/v3.6/README.md)
- [mvp/v3.6/integrated-plan.md](./mvp/v3.6/integrated-plan.md)
- [mvp/v3.6/db-status-api-plan.md](./mvp/v3.6/db-status-api-plan.md)
- [mvp/v3.6/ui-ux-display-update-plan.md](./mvp/v3.6/ui-ux-display-update-plan.md)
- [mvp/v3.6/docs-structure-cleanup-plan.md](./mvp/v3.6/docs-structure-cleanup-plan.md)
- [mvp/v3.6/normalized-rules-review-plan.md](./mvp/v3.6/normalized-rules-review-plan.md)

Use the integrated plan only for sequencing, ownership, and conflict review.
Implementation branches should update their owning child plan and affected
topic docs.

## Latest Frozen Snapshot

The latest frozen stage snapshot is **v3.5**:

- [mvp/v3.5/FREEZE.md](./mvp/v3.5/FREEZE.md)
- [mvp/v3.5/README.md](./mvp/v3.5/README.md)

`FREEZE.md` records the as-built v3.5 handoff state. Supporting v3.5 plan docs
describe rationale and implementation history; they are not newer than the
freeze snapshot.

## Doc Areas

### Durable Topic Docs

- [features.md](./features.md): feature map.
- [feature-workflow.md](./feature-workflow.md): feature intake and plan-first
  workflow.
- [frontend-map.md](./frontend-map.md): frontend route and feature entry map.
- [design.md](./design.md): UI direction.
- [i18n.md](./i18n.md): i18n workflow.
- [harness.md](./harness.md): validation strategy.
- [stable-backlog.md](./stable-backlog.md): deferred stable-version work.
- [public-repo-notes.md](./public-repo-notes.md): public repo exclusions and
  publication cautions.

### Operations And Data

- [operations/README.md](./operations/README.md): operations map.
- [deployment.md](./deployment.md): deployment workflow.
- [data-setup.md](./data-setup.md): database roles, local DB setup, and
  fixtures.
- [import-workflow.md](./import-workflow.md): maintained app-owned import
  workflow.
- [rules-db-notes.md](./rules-db-notes.md): rules DB inspection and patch notes.
- [repo-conventions.md](./repo-conventions.md): local wrappers and source of
  truth conventions.

### Module Docs

- [modules/README.md](./modules/README.md)
- [modules/server.md](./modules/server.md)
- [modules/web.md](./modules/web.md)
- [modules/contracts.md](./modules/contracts.md)
- [modules/data-tools.md](./modules/data-tools.md)
- [modules/delivery.md](./modules/delivery.md)

### Versioned MVP Docs

- [mvp/README.md](./mvp/README.md): versioned-doc roles and maintenance rules.
- [mvp/v3.5/FREEZE.md](./mvp/v3.5/FREEZE.md): latest frozen release snapshot.
- [mvp/v3.4/FREEZE.md](./mvp/v3.4/FREEZE.md): previous frozen snapshot.
- [mvp/v3.3/FREEZE.md](./mvp/v3.3/FREEZE.md): data-tooling foundation
  snapshot.

Older version folders remain under `docs/mvp/` as historical planning and
handoff records.

### Templates

- [templates/feature-plan.md](./templates/feature-plan.md)
- [templates/version-plan.md](./templates/version-plan.md)

## Workspace References

- [../server/README.md](../server/README.md)
- [../web/README.md](../web/README.md)
- [../contracts/README.md](../contracts/README.md)
- [../data-tools/README.md](../data-tools/README.md)

## Precedence Rule

When documents overlap:

1. Prefer the newest focused topic doc for current behavior or workflow.
2. Prefer active development docs for in-flight future scope.
3. Use frozen `FREEZE.md` files as stage snapshots, not as automatic current
   baselines.
4. Prefer focused operational docs such as `deployment.md` for runtime workflow
   over incidental mentions in README files.
5. Treat plan documents as intended scope, not final shipped behavior.

## Maintenance Rule

- Keep current canonical statements in one place.
- Avoid repeating long feature descriptions across multiple README files.
- Use workspace READMEs for workspace-specific commands.
- Use root `AGENTS.md` for agent-facing execution guidance.
- When adding or moving workspaces, commands, active plans, or source-of-truth
  docs, update root `README.md`, this index, `AGENTS.md`, and the relevant
  workspace README together.
