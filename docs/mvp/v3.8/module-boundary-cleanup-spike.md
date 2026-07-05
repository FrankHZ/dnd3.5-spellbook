# v3.8 Module Boundary Cleanup Spike

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: implemented; pending review.

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
- Server source now uses Node package imports instead of TypeScript-only path
  aliases:
  - `#server/*` for `server/src/*`
  - `#prisma-rules-clean/*` for the rules-clean Prisma schema/client tree
  - `#prisma-content/*` for the content Prisma schema/client tree
  - `#prisma-app-state/*` for the app-state Prisma schema/client tree
- `server/package.json` owns the runtime import map, and
  `server/tsconfig.json` no longer needs `paths`.
- Development, tests, and TS maintenance scripts use a custom `source`
  condition so package imports resolve to current `.ts` files. `tsx` entry
  points set `NODE_OPTIONS=--conditions=source`; Vitest uses
  `resolve.conditions: ["source"]`. Built runtime commands omit that condition
  and resolve to `dist/`.
- `tsc-alias` and `tsconfig-paths` are no longer server dependencies.
- `@dnd/contracts` is primarily DTO/runtime-light exports today, and the
  current CommonJS server can consume those exports after `contracts` is built.

## Decision

Accept Node package imports as the server import style for this codebase.

The initial probe showed that pure `tsc` output could not run while source
still used `~` and Prisma path aliases: compiled output kept unresolved
non-relative specifiers such as `~/controllers/spells.controller`. After
migrating server source, tests, and maintenance scripts to package imports, the
server build can run with plain `tsc -p tsconfig.json` and no post-build alias
rewrite.

Do not force a full server ESM runtime migration for v3.8. The package remains
CommonJS, but TypeScript keeps NodeNext compilation/resolution so package
imports and the ESM `@dnd/contracts` boundary are checked consistently.

Do not add a dual CJS/ESM `contracts` build now. The current runtime-light
exports are safe under the guarded server path. Revisit only if contracts gains
stateful runtime logic, top-level async work, or exports that fail
`npm run -w server check:runtime`.

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

- The spike answers whether `tsc-alias` can be dropped now. Accepted: yes,
  after migrating server imports to package imports.
- The recommendation names the preferred server import style for future work.
  Accepted: use Node package imports, not `~`.
- Contracts runtime consumption is either confirmed safe or assigned a concrete
  follow-up. Accepted: confirmed safe with `build:contracts`,
  `check:contracts`, `build:server`, and `check:runtime`.
- Normalized query and frontend consumer work remain unblocked unless an active
  deploy/runtime risk is found. Accepted: no blocking risk found.

## Doc Updates

- Update this plan with the final recommendation.
- Update `docs/roadmap.md` only if the spike changes v3.8 ordering or creates a
  blocking follow-up.
- Update `docs/modules/server.md`, `docs/modules/contracts.md`, and workspace
  READMEs if module-boundary behavior changes.
- Do not update `integrated-plan.md` unless this spike becomes a blocker for
  the main v3.8 deliverables.

## Open Questions

- If contracts grows beyond DTO/runtime-light exports, should it add a dual
  package build or should the server move fully to ESM first?
- Should any future data-tools/server shared runtime helpers live in contracts,
  or in a new workspace with an explicit runtime package boundary?

## Completion Notes

- Alias inventory found `~`, `DB_RULES`, `DB_CONTENT`, `DB_APP_STATE`, and
  direct Prisma generated-client aliases across server source, tests, and
  maintenance scripts.
- A no-migration `tsc` probe failed at runtime with unresolved `~` imports,
  confirming that dropping `tsc-alias` required an import-style change.
- Server source, tests, and scripts now use `#server/*` and `#prisma-*/*`
  package imports.
- `server/package.json` defines both `source` and default package import
  targets. Local `tsx` npm scripts use `NODE_OPTIONS=--conditions=source`, and
  Vitest uses source-condition resolution in `server/vitest.config.ts`, to avoid
  stale `dist/`; production runtime checks continue to use default `dist/`
  resolution.
- `server/package.json` now defines the package import map and builds with
  plain `tsc`; `server/tsconfig.json` no longer defines alias `paths`.
- `tsc-alias` and `tsconfig-paths` were removed from the server workspace.
- Validation used:
  - `node --conditions=source -p "require.resolve('#server/app')"`
  - `node -p "require.resolve('#server/app')"`
  - `npx tsx -e "... import('#server/utils/i18n') ..."`
  - `npm run build:contracts`
  - `npm run check:contracts`
  - `npm run -w server db:generate`
  - `npm run build:server`
  - `npm run -w server check:runtime`
  - `npm run test:server`
  - `npm run ci:portable`
