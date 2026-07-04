# v3.7 Dependency Upgrade Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: inventory refreshed; upgrade branches pending.

## Purpose

Promote the major and risky dependency upgrades deferred from the v3.5
safe-update pass into v3.7 maintenance planning without interrupting remaining
v3.6 planning tracks.

This plan owns dependency inventory, TypeScript module-boundary cleanup,
upgrade ordering, compatibility review, and validation boundaries. The v3.7
security review may reference dependency audit findings, but it should not
become the general dependency-upgrade plan.

## Ownership

- Owning version: v3.7
- Owning domain: dependency maintenance and delivery safety
- Primary implementation branch or specialist: dedicated dependency branch per
  upgrade slice
- Related feature/module docs: `docs/modules/delivery.md`, `docs/harness.md`,
  workspace READMEs when commands or runtime expectations change
- Upstream dependency plans:
  `docs/mvp/v3.5/ci-cd-and-module-docs-plan.md`,
  `docs/mvp/v3.7/security-review.md`
- Downstream consumer plans: frontend router/build-tool migration plans accepted
  after inventory

## Problem

v3.5 intentionally applied only safe dependency updates within existing semver
ranges. v3.6 also kept TypeScript module config cleanup as a review candidate
instead of an implementation slice. The remaining major or ecosystem upgrades
and the server module-config cleanup were deferred because they can change build
behavior, router behavior, Prisma generation, i18n runtime behavior, type
baselines, server runtime imports, or validation tooling.

Leaving them only as stable-backlog items makes them easy to forget. Pulling
them into v3.6 would interrupt active UI/docs/security coordination. v3.7 is
the right place to inventory and sequence them.

## Goals

- Re-run dependency inventory and audit from the current lockfile.
- Decide the server CommonJS / contracts ESM boundary before removing
  TypeScript deprecation suppression.
- Classify major/risky upgrades into focused, reviewable branches.
- Upgrade only when the blast radius and validation surface are clear.
- Keep `npm audit fix --force` out of normal flow unless an explicit
  compatibility review accepts its side effects.
- Record held-back upgrades with reasons instead of silently carrying them.

## Non-Goals

- Do not bundle all major upgrades into one PR.
- Do not run broad framework migrations as drive-by work inside feature
  branches.
- Do not downgrade Prisma or other core tooling only to satisfy audit output.
- Do not remove `ignoreDeprecations` or switch server module resolution without
  proving the server/contracts runtime import boundary.
- Do not make dependency upgrades a prerequisite for finishing unrelated v3.6
  planning tracks.

## Current Facts

- v3.5 inventory, dated 2026-07-02, deferred React Router 8, Vite 8,
  `i18next` 26, `i18next-http-backend` 4, `react-i18next` 17,
  `lucide-react` 1, `shadcn` 4, `vite-tsconfig-paths` 6, and `@types/node` 26.
- The same v3.5 pass reported Prisma dev-chain audit advisories through
  `@prisma/dev` -> `@hono/node-server`; the suggested forced fix would move the
  repo away from the current Prisma 7 line.
- v3.7 security review tracks the Prisma audit finding as a policy item, not as
  an instruction to force-downgrade.
- CI now has `npm run ci:portable`; use it as the clean-checkout merge gate for
  dependency branches.
- `data-tools` already uses `moduleResolution: "Node16"` with an explicit
  `rootDir`. The server still uses CommonJS plus `moduleResolution: "node"` and
  `ignoreDeprecations: "6.0"` because direct Node16 migration exposes the
  CommonJS server / ESM `@dnd/contracts` boundary.
- Data, Prisma, parser, SQLite-facing, or TypeScript changes may also require
  `npm run -w data-tools acceptance:local`.

## Current Inventory

Inventory refreshed from the v3.7 dependency branch with:

```bash
npm outdated --workspaces --json
npm audit --workspaces --json
npm audit --workspaces --omit=dev --json
```

### Low-Risk Patch Or Minor Candidates

These are within the current major line and can be reviewed in a small
maintenance PR before larger ecosystem upgrades:

| Package | Workspaces | Current | Wanted/Latest | Notes |
| --- | --- | --- | --- | --- |
| `iconv-lite` | `data-tools`, `server` | `0.7.2` | `0.7.3` | parser/server dependency; validate data-tools tests plus server tests |
| `immer` | `web` | `11.1.9` | `11.1.11` | browser state helper dependency; validate web tests |
| `tsx` | `data-tools`, `server` | `4.22.5` | `4.23.0` | tooling runtime; validate data-tools/server commands |

`prettier` reports `3.8.1` current and `3.9.4` latest, but the current
workspace range does not select it as `wanted`; treat it as tooling maintenance,
not part of app runtime.

### Major Or Risky Candidates

Keep these in focused branches because they can affect routing, build output,
i18n runtime behavior, icon/shadcn generated code, or TypeScript baselines:

| Package | Workspaces | Current | Latest | Primary Risk |
| --- | --- | --- | --- | --- |
| `@react-router/dev`, `@react-router/node`, `@react-router/serve`, `react-router` | `web` | `7.18.0` | `8.1.0` | route/build/runtime behavior |
| `vite` | `web` | `7.3.6` | `8.1.3` | build pipeline and plugin compatibility |
| `vite-tsconfig-paths` | `server`, `web` | `5.1.4` | `6.1.1` | path resolution in tests/builds |
| `i18next` | `web` | `25.10.10` | `26.3.4` | runtime fallback/loading semantics |
| `i18next-http-backend` | `web` | `3.0.6` | `4.0.0` | locale loading behavior |
| `react-i18next` | `web` | `16.6.6` | `17.0.8` | React binding behavior |
| `lucide-react` | `web` | `0.563.0` | `1.23.0` | icon export/package changes |
| `shadcn` | `web` | `3.8.5` | `4.13.0` | generated component/tooling behavior |
| `@types/node` | `data-tools`, `server`, `web` | `25.9.4` / `22.20.0` | `26.1.0` | Node type baseline drift |
| `@types/supertest` | `server` | `6.0.3` | `7.2.0` | server test type surface |

### Audit Status

Both full and `--omit=dev` audit commands report the same three moderate
vulnerabilities:

| Package | Path | Advisory | Current npm Fix |
| --- | --- | --- | --- |
| `@hono/node-server` | `prisma` -> `@prisma/dev` -> `@hono/node-server` | `GHSA-92pp-h63x-v22m`, middleware bypass via repeated slashes in `serveStatic` | `npm audit fix --force` to `prisma@6.19.3` |
| `@prisma/dev` | transitive under `prisma` | inherits the Hono advisory | same forced Prisma downgrade |
| `prisma` | direct dev dependency | affected range reported as `6.20.0-dev.1 - 7.9.0-dev.7` | same forced Prisma downgrade |

Do not run the forced fix. This repo is on Prisma 7, and the suggested fix is a
breaking downgrade. Track the advisory as a reviewed build/deploy exposure until
a Prisma-7-compatible upgrade path is available or deploy dependency ownership
changes.

## Plan

### Slice 1: Refresh Inventory

- Status: complete for the current v3.7 baseline.
- Deliverable: current `npm outdated --workspaces` and audit classification.
- Expected files: this plan. Package manifests should change only in follow-up
  upgrade branches.
- Validation:

```bash
npm outdated --workspaces
npm audit --workspaces
npm audit --workspaces --omit=dev
```

### Slice 2: Frontend Runtime And Build Tool Review

- Deliverable: decide ordering for React Router, Vite, Vitest, Tailwind,
  `vite-tsconfig-paths`, `lucide-react`, and shadcn-related upgrades.
- Expected files: `web/package.json`, root/package lock, frontend config, and
  focused frontend tests only for the accepted slice.
- Validation:

```bash
npm run test:web
npm run typecheck:web
npm run -w web build
npm run i18n:check
```

### Slice 3: i18n Runtime Review

- Deliverable: decide whether `i18next`, `i18next-http-backend`, and
  `react-i18next` major upgrades can move together or need separate branches.
- Expected files: i18n runtime helpers, locale workflow docs, and affected
  tests if APIs changed.
- Validation:

```bash
npm run i18n:sync
npm run i18n:check
npm run test:web
```

### Slice 4: Server Module Boundary Review

- Deliverable: choose whether server moves to ESM, contracts adds an explicit
  CJS-compatible boundary, or the current suppression remains held with a
  documented reason.
- Expected files: `server/tsconfig.json`, `server/package.json`,
  `contracts/package.json`, contracts build/runtime import checks, and module
  docs if ownership changes.
- Validation:

```bash
npm run build:contracts
npm run check:contracts
npm run test:server
npm run ci:portable
```

### Slice 5: Prisma And Server Tooling Review

- Deliverable: resolve or explicitly defer the Prisma audit finding with a
  Prisma-7-compatible path, and decide whether server module-config cleanup
  changes dependency sequencing.
- Expected files: `server/package.json`, Prisma schemas/generation docs,
  `docs/mvp/v3.7/security-review.md` if audit status changes.
- Validation:

```bash
npm run build:contracts
npm run test:server
npm run ci:portable
```

### Slice 6: Lockfile And Deployment Review

- Deliverable: inspect lockfile churn and confirm deploy scripts still install,
  generate, build, and restart with the accepted dependency set.
- Expected files: `package-lock.json`, deployment docs/scripts only when
  install/build commands change.
- Validation:

```bash
npm run ci:portable
```

## Acceptance Criteria

- Current inventory is recorded with explicit classifications.
- TypeScript module-config cleanup has a chosen server/contracts boundary or an
  explicit deferral reason.
- Each accepted upgrade slice has a dedicated branch and validation list.
- Forced audit fixes are rejected or accepted with documented compatibility
  reasoning.
- Remaining held-back major upgrades have short reasons and a next review point.
- v3.6 plans are not changed only to carry dependency-maintenance scope.

## Doc Updates

- Update this plan when dependency inventory, upgrade ordering, or held-back
  reasons change.
- Update `docs/roadmap.md` only when dependency work becomes or stops being the
  active next track.
- Update `docs/stable-backlog.md` when a deferred dependency item is promoted
  into or completed by v3.7.
- Update workspace READMEs, `docs/harness.md`, or `docs/modules/delivery.md`
  when install, build, generation, or validation commands change.

## Open Questions

- Should React Router and Vite be reviewed together, or should router behavior
  be isolated from build-tool changes?
- Should server move to ESM, or should contracts provide an explicit
  CJS-compatible package boundary first?
- Should Prisma audit remediation wait for an upstream compatible fix, or
  should deploy/build dependency ownership change first?
- Should dependency review become a recurring maintenance task after v3.7?
