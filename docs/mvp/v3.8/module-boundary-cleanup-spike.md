# v3.8 Module Boundary Cleanup Spike

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned independent spike.

## Purpose

Answer whether the server can drop `tsc-alias`, how server import aliases
should migrate, and whether the `@dnd/contracts` runtime boundary needs to
change.

## Ownership

- Owning version: v3.8
- Owning domain: infra / server / contracts
- Primary implementation branch or specialist: infrastructure agent
- Related feature/module docs: `docs/modules/server.md`,
  `docs/modules/contracts.md`, `server/README.md`, `contracts/README.md`
- Upstream dependency plans: v3.7 dependency upgrade plan
- Downstream consumer plans: none unless the spike finds an active runtime risk

## Problem

v3.7 accepted the minimal TypeScript cleanup: keep the server runtime as
CommonJS while compiling/resolving with NodeNext and preserving the current
alias build path. That removed the TypeScript deprecation suppression, but it
did not answer whether `tsc-alias` and `~` imports should remain long term.

The cleanup should be investigated without blocking normalized query work.

## Goals

- Inventory current server alias usage and emitted runtime paths.
- Test whether `tsc-alias` can be dropped safely.
- Compare migration options: relative `.js` specifiers, Node `#...` package
  imports, or keeping aliases with documented constraints.
- Confirm whether `@dnd/contracts` DTO-only runtime exports are safe for the
  current server boundary.
- Produce a decision and implementation recommendation.

## Non-Goals

- Do not force a full server ESM runtime migration.
- Do not change query/filter behavior.
- Do not redesign the monorepo package manager.
- Do not rewrite imports repo-wide unless the spike accepts that as the
  smallest safe implementation.

## Current Facts

- The server package runtime remains CommonJS.
- TypeScript compilation/resolution uses NodeNext after v3.7.
- `tsc-alias` still rewrites server aliases after build.
- `@dnd/contracts` is primarily DTO/runtime-light exports today.
- Roadmap guidance prefers relative `.js` specifiers or Node-standard `#...`
  package imports over expanding `~` if future ESM work proceeds.

## Plan

### Slice 1: Alias And Runtime Inventory

- Deliverable: count and classify server aliases, emitted import paths, and
  contracts runtime imports.
- Expected files: spike notes in this plan or a focused scratch report if the
  output is noisy.
- Validation:
  - `rg -n "from \"~|from '~|import\\(\"~" server/src server/tests`
  - inspect built `server/dist/` after `npm run build:server`

### Slice 2: Drop-`tsc-alias` Feasibility Probe

- Deliverable: answer whether the server can build and start without
  `tsc-alias`, and what migration would be required if not.
- Expected files: temporary branch changes or documented no-change decision.
- Validation:
  - `npm run build:server`
  - `npm run -w server check:runtime`
  - targeted server test if code changes are made

### Slice 3: Contracts Runtime Boundary Decision

- Deliverable: decide whether contracts needs a dual CJS/ESM output,
  export-map adjustment, or no change.
- Expected files: contracts/server docs if behavior changes.
- Validation:
  - `npm run build:contracts`
  - `npm run check:contracts`
  - `npm run build:server`

### Slice 4: Recommendation Or Implementation

- Deliverable: either a documented decision to defer, or a small accepted
  implementation that removes the risk.
- Expected files: this plan, `docs/roadmap.md` only if follow-up ordering
  changes, package/tsconfig files only if implementation is accepted.
- Validation: `npm run ci:portable` for any package/build change.

## Acceptance Criteria

- The spike answers whether `tsc-alias` can be dropped now.
- The recommendation names the preferred server import style for future work.
- Contracts runtime consumption is either confirmed safe or assigned a concrete
  follow-up.
- Normalized query and frontend consumer work remain unblocked unless an active
  deploy/runtime risk is found.

## Doc Updates

- Update this plan with the final recommendation.
- Update `docs/roadmap.md` only if the spike changes v3.8 ordering or creates a
  blocking follow-up.
- Update `docs/modules/server.md`, `docs/modules/contracts.md`, and workspace
  READMEs if module-boundary behavior changes.
- Do not update `integrated-plan.md` unless this spike becomes a blocker for
  the main v3.8 deliverables.

## Open Questions

- Is keeping `tsc-alias` acceptable if `check:runtime` continues to guard
  deploy output?
- Are Node `#...` imports a cleaner migration than relative `.js` specifiers
  for the server package?
- Does contracts need runtime packaging changes before it grows beyond DTOs?

## Completion Notes

Use this section only after implementation review.
