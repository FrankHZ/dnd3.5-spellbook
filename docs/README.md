# Documentation Index

This directory contains the durable project documentation for the repository.

Use this file to choose the right source of truth. Use `docs/roadmap.md` to
decide what to do next after a pause.

## Current Entry Points

- [roadmap.md](./roadmap.md): official current work order, recently completed
  slices, and promoted stable-track sequence.
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

The active formal public release plan is v1.1:

- [releases/v1.1/README.md](./releases/v1.1/README.md)
- [releases/v1.1/production-hardening-plan.md](./releases/v1.1/production-hardening-plan.md)
- [releases/v1.1/full-spell-corpus-plan.md](./releases/v1.1/full-spell-corpus-plan.md)
- [releases/v1.1/frontend-content-pass-plan.md](./releases/v1.1/frontend-content-pass-plan.md)

The latest frozen formal public release is v1.0:

- [releases/v1.0/FREEZE.md](./releases/v1.0/FREEZE.md)
- [releases/v1.0/README.md](./releases/v1.0/README.md)
- [releases/v1.0/domain-and-deployment-plan.md](./releases/v1.0/domain-and-deployment-plan.md)
- [releases/v1.0/about-and-status-plan.md](./releases/v1.0/about-and-status-plan.md)
- [releases/v1.0/release-ready-doc-sweep-plan.md](./releases/v1.0/release-ready-doc-sweep-plan.md)

The latest frozen planning record is v3.10:

- [mvp/v3.10/FREEZE.md](./mvp/v3.10/FREEZE.md)
- [mvp/v3.10/README.md](./mvp/v3.10/README.md)
- [mvp/v3.10/filter-i18n-plan.md](./mvp/v3.10/filter-i18n-plan.md)
- [mvp/v3.10/ui-ux-cohesion-plan.md](./mvp/v3.10/ui-ux-cohesion-plan.md)

The previous frozen planning record is v3.9:

- [mvp/v3.9/FREEZE.md](./mvp/v3.9/FREEZE.md)
- [mvp/v3.9/README.md](./mvp/v3.9/README.md)
- [mvp/v3.9/normalized-mechanics-contract-plan.md](./mvp/v3.9/normalized-mechanics-contract-plan.md)
- [mvp/v3.9/frontend-normalized-mechanics-consumer-plan.md](./mvp/v3.9/frontend-normalized-mechanics-consumer-plan.md)

Use [roadmap.md](./roadmap.md) for current ordering after a pause.

## Latest Frozen Snapshot

The latest frozen public release snapshot is **v1.0**:

- [releases/v1.0/FREEZE.md](./releases/v1.0/FREEZE.md)
- [releases/v1.0/README.md](./releases/v1.0/README.md)

The latest frozen pre-release stage snapshot is **v3.10**:

- [mvp/v3.10/FREEZE.md](./mvp/v3.10/FREEZE.md)
- [mvp/v3.10/README.md](./mvp/v3.10/README.md)

The v3.10 `FREEZE.md` records the as-built pre-release handoff state.
Supporting v3.10 plan docs describe rationale and implementation history; they
are not newer than the freeze snapshot.

The previous frozen stage snapshot is **v3.9**:

- [mvp/v3.9/FREEZE.md](./mvp/v3.9/FREEZE.md)
- [mvp/v3.9/README.md](./mvp/v3.9/README.md)

The older frozen stage snapshot before that is **v3.8**:

- [mvp/v3.8/FREEZE.md](./mvp/v3.8/FREEZE.md)
- [mvp/v3.8/README.md](./mvp/v3.8/README.md)

Use older `FREEZE.md` files as historical comparison points, not active
baselines.

## Doc Areas

### Durable Topic Docs

- [features.md](./features.md): feature map.
- [feature-workflow.md](./feature-workflow.md): feature intake and plan-first
  workflow.
- [frontend-map.md](./frontend-map.md): frontend route and feature entry map.
- [design.md](./design.md): UI direction.
- [i18n.md](./i18n.md): i18n workflow.
- [harness.md](./harness.md): validation strategy.
- [stable-backlog.md](./stable-backlog.md): unpromoted stable-track candidate
  pool and promotion rules.
- [credits/](./credits/): source credit notes used by About / Status.
- [public-repo-notes.md](./operations/public-repo-notes.md): public repo exclusions and
  publication cautions.
- [releases/README.md](./releases/README.md): formal release planning.

### Operations And Data

- [operations/README.md](./operations/README.md): operations map.
- [deployment.md](./operations/deployment.md): deployment workflow.
- [data-setup.md](./operations/data-setup.md): database roles, local DB setup, and
  fixtures.
- [import-workflow.md](./operations/import-workflow.md): maintained app-owned import
  workflow.
- [rules-db-notes.md](./operations/rules-db-notes.md): rules DB inspection and patch notes.
- [repo-conventions.md](./operations/repo-conventions.md): local wrappers and source of
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
- [mvp/v3.10/FREEZE.md](./mvp/v3.10/FREEZE.md): latest frozen pre-release
  snapshot.
- [mvp/v3.10/README.md](./mvp/v3.10/README.md): frozen final pre-release
  planning record.
- [mvp/v3.9/FREEZE.md](./mvp/v3.9/FREEZE.md): previous frozen release
  snapshot.
- [mvp/v3.9/README.md](./mvp/v3.9/README.md): frozen normalized
  mechanics/query fullstack planning record.
- [mvp/v3.8/FREEZE.md](./mvp/v3.8/FREEZE.md): previous frozen release snapshot.
- [mvp/v3.7/FREEZE.md](./mvp/v3.7/FREEZE.md): previous frozen snapshot.
- [mvp/v3.6/FREEZE.md](./mvp/v3.6/FREEZE.md): older frozen snapshot.
- [mvp/v3.5/FREEZE.md](./mvp/v3.5/FREEZE.md): older frozen snapshot.
- [mvp/v3.4/FREEZE.md](./mvp/v3.4/FREEZE.md): older frozen snapshot.
- [mvp/v3.3/FREEZE.md](./mvp/v3.3/FREEZE.md): data-tooling foundation
  snapshot.

Older version folders remain under `docs/mvp/` as historical planning and
handoff records.

### Release Plans

- [releases/README.md](./releases/README.md): release planning roles and
  maintenance rules.
- [releases/v1.1/README.md](./releases/v1.1/README.md): active production
  hardening and full spell corpus release plan.
- [releases/v1.1/production-hardening-plan.md](./releases/v1.1/production-hardening-plan.md):
  active CF/AWS security acceptance plan.
- [releases/v1.1/full-spell-corpus-plan.md](./releases/v1.1/full-spell-corpus-plan.md):
  active full spell corpus import and content DB activation plan.
- [releases/v1.1/frontend-content-pass-plan.md](./releases/v1.1/frontend-content-pass-plan.md):
  active focused frontend content acceptance plan.
- [releases/v1.0/FREEZE.md](./releases/v1.0/FREEZE.md): latest frozen formal
  public release snapshot.
- [releases/v1.0/README.md](./releases/v1.0/README.md): frozen first formal
  public release planning record.

### Templates

- [templates/feature-plan.md](./templates/feature-plan.md)
- [templates/version-plan.md](./templates/version-plan.md)
- [templates/acceptance-checklist.md](./templates/acceptance-checklist.md)
- [templates/freeze-snapshot.md](./templates/freeze-snapshot.md)

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
