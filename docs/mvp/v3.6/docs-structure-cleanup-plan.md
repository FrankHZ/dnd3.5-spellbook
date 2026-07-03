# v3.6 Docs Structure Cleanup Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: active; structure cleanup implementation in progress.

## Purpose

Make the documentation layout easier for agents to navigate after v3.5 added
freeze snapshots, module docs, deployment docs, and more version plans.

## Ownership

- Owning version: v3.6
- Owning domain: docs / infra
- Primary implementation branch or specialist: main agent or docs-focused
  subagent
- Related feature/module docs: `docs/README.md`, `AGENTS.md`, `docs/roadmap.md`,
  `docs/modules/README.md`
- Upstream dependency plans: v3.5 agent guide review and module-doc baseline
- Downstream consumer plans: future version planning and module-doc automation

## Problem

`docs/` is usable but increasingly history-shaped. Future agents must know
which files are durable topic docs, which are current operational docs, which
are frozen snapshots, and which are old plan records. v3.6 should reduce that
context tax without rewriting frozen history.

## Goals

- Clarify directory roles for durable topic docs, module docs, operations,
  version plans, and freeze snapshots.
- Reduce duplicate navigation surfaces where possible.
- Keep frozen MVP folders immutable as historical records.
- Update `AGENTS.md` only if a durable operational rule changes.

## Non-Goals

- Do not rewrite old plan contents for style.
- Do not move source-bearing data or generated reports.
- Do not create a documentation framework or generated site.
- Do not make ordinary feature branches update broad docs manually.

## Current Facts

- `docs/README.md` is the canonical documentation map.
- `docs/roadmap.md` is the current work ordering surface.
- `docs/modules/` owns high-level module boundaries.
- `docs/mvp/` contains both frozen snapshots and planning history.
- `AGENTS.md` is intentionally compact after v3.5.
- `docs/operations/` owns deployment, data setup, import workflow, rules DB
  notes, public-repo notes, repo conventions, and remote host bootstrap.

## Structure Decisions

- Keep durable topic docs at the docs root for now. They are stable entry
  points and moving them would create broad link churn.
- Add `docs/mvp/README.md` so version folders have their own role and
  maintenance rules.
- Move operational/data/hygiene docs under `docs/operations/` and use
  `docs/operations/README.md` as the operations map.
- Add reusable acceptance and freeze templates under `docs/templates/`.
- Do not move frozen MVP folders or rewrite old plan content.
- Treat future file moves as separate accepted slices only when the link churn
  clearly pays for itself.

## Plan

### Slice 1: Inventory

- Status: implemented in this plan.
- Deliverable: a short move/keep proposal for current docs.
- Expected files: this plan.
- Validation: no file moves yet.

### Slice 2: Navigation Cleanup

- Status: implemented.
- Deliverable: update documentation map and roadmap to make current/frozen
  boundaries obvious.
- Expected files: `docs/README.md`, `README.md`, `docs/roadmap.md`.
- Validation: link/path checks by `rg` and `git diff --check`.

### Slice 3: Optional Moves

- Status: implemented for operations docs.
- Deliverable: move files only when the destination clearly reduces future
  confusion.
- Expected files: operations docs and updated references.
- Validation: update links in docs and AGENTS/module READMEs where affected.

### Slice 4: Version Closeout Templates

- Status: implemented.
- Deliverable: add reusable acceptance and freeze templates.
- Expected files: `docs/templates/acceptance-checklist.md`,
  `docs/templates/freeze-snapshot.md`, `docs/README.md`,
  `docs/mvp/README.md`.
- Validation: link/path checks and `git diff --check`.

## Acceptance Criteria

- A new agent can identify current topic docs versus historical plan docs from
  `docs/README.md`.
- v3.5 and older `FREEZE.md` files remain intact.
- Roadmap points to v3.6 active plans and later stable backlog without
  duplicating long plan text.
- `git diff --check` passes.

## Doc Updates

- Update this plan when structure decisions change.
- Update `docs/roadmap.md` when active docs cleanup work order changes.
- Update `AGENTS.md` only for durable operational guidance.
- Do not update `integrated-plan.md` unless docs cleanup changes v3.6 scope or
  plan ownership.

## Open Questions

- Operations docs moved under `docs/operations/`.
- Acceptance and freeze templates added under `docs/templates/`.
- Should old MVP planning docs stay in place or eventually move under a
  historical subfolder? Current decision: keep them in place and make
  `docs/mvp/README.md` explain their role.
