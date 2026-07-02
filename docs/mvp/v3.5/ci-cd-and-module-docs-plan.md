# CI/CD, Dependency Review, And Module Docs Automation Plan

Status: portable CI with backend API fixtures implemented; dependency update
application, CD wrappers, and module-doc automation remain planned v3.5
follow-up work.

## Problem

The repository now has enough unit, API, typecheck, and pure frontend coverage
for a useful CI gate, but the checks are still local-first. In particular,
`docs/harness.md` notes that backend API tests currently depend on local SQLite
files from `server/.env`, which are intentionally not part of the public repo.

At the same time, feature work has started to produce good focused docs:
`docs/features.md` describes user-facing behavior, `docs/frontend-map.md`
orients frontend entry points, and feature plans capture scoped changes. The
missing layer is high-level module design documentation that stays fresh without
making every feature branch update several broad docs manually.

Deployment is already documented and backed by tracked scripts under
`docs/deployment-scripts/`. v3.5 should wrap or trigger that existing behavior
rather than inventing a separate deployment path.

Dependency updates are still mostly reactive. Recent TypeScript/tooling
deprecation warnings make this worth treating as a planned v3.5 maintenance
lane, so dependency updates happen with inventory, lockfile review, and
validation instead of being bundled into unrelated feature branches.

## Goals

- Add a CI gate around the existing validation spine once it can run from a
  clean checkout.
- Keep browser E2E out of the initial CI scope; the project has better ROI from
  the current unit/API/typecheck suite.
- Preserve the tracked deployment scripts as the CD source of truth.
- Review and update dependencies intentionally before broad v3.5 implementation
  work starts.
- Add a merge-to-main documentation automation path that refreshes high-level
  module design docs from accepted changes.
- Let ordinary feature branches focus on the nearest feature plan or feature
  doc, not broad architecture-document upkeep.
- Keep generated documentation changes reviewable and non-destructive.

## Non-Goals

- Do not add Playwright, Puppeteer, or broad E2E workflows in the v3.5 CI pass.
- Do not replace the current single-host deployment model.
- Do not duplicate deploy logic inside a workflow file when the tracked scripts
  already define the behavior.
- Do not allow an agent job to push implementation code directly to `main`.
- Do not make generated high-level docs the only source of truth for shipped
  behavior; focused feature docs and code remain review inputs.
- Do not bundle major dependency upgrades into unrelated feature branches unless
  a feature is explicitly blocked by that upgrade.
- Do not chase latest versions without a validation path and a hold/defer
  decision for risky packages.

## Existing Inputs

Current root validation spine:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
```

Current aggregate command:

```bash
npm run verify
```

Current dependency surfaces to review:

- root `package-lock.json`
- root and workspace `package.json` files
- TypeScript config deprecation settings
- React Router, Vite, Prisma, Vitest, Tailwind, ESLint/Prettier, and shared
  TypeScript packages

Current deployment scripts:

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`

Current documentation surfaces to review together:

- `AGENTS.md`: agent execution guide and durable safety rules
- `docs/features.md`: stable user-facing feature map
- `docs/feature-workflow.md`: feature intake and plan-first workflow
- `docs/frontend-map.md`: compact frontend entry-point map
- `docs/design.md`: UI design principles and review guardrails
- future `docs/modules/`: high-level module design docs refreshed after merges

## Proposed Plan

### 1. Make CI Inputs Portable

Inventory each command in `npm run verify` and record which commands already run
from a clean checkout.

For backend API tests, remove the hidden dependency on ignored local SQLite
files before enabling CI. The implementation can choose one of these approaches
after inspection:

- add small checked-in test fixtures that contain only minimal synthetic data
- add a CI preparation command that builds disposable test databases from
  checked-in fixture inputs
- split local-data acceptance checks from always-on CI tests when the data
  cannot be public or portable

The CI implementation should not commit real runtime DB files or raw local data
sources.

Initial implemented slice:

- root `npm run ci:portable`
- `.github/workflows/ci.yml`

This slice intentionally runs portable checks only:

```bash
npm run build:contracts
npm run check:contracts
npm run -w server db:generate
npm run build:server
npm run test:server
npm run typecheck:data-tools
npm run test:data-tools
npm run test:web
npm run typecheck:web
npm run -w web build
```

`npm run test:server` now uses synthetic disposable SQLite fixtures created by
the Vitest setup file. The fixtures cover the current API test expectations
without reading ignored local runtime DBs from `server/data/db/`.

### 2. Review And Update Dependencies

Run a dependency inventory before broad v3.5 implementation work:

```bash
npm outdated --workspaces
npm audit --omit=dev
```

Use audit as an advisory signal, not as an automatic upgrade mandate.

Classify candidates as:

- safe patch/minor updates
- major or ecosystem updates that need focused review
- deferred updates with a short reason

Keep dependency updates in a dedicated branch, such as `codex/deps-v3-5`, unless
a feature branch is explicitly blocked by the update.

After applying chosen updates:

```bash
npm install
npm run verify
npm run -w web build
```

Also run `npm run -w data-tools acceptance:local` when data tooling, TypeScript,
Prisma, parser, or SQLite-facing dependencies changed.

Inspect `package-lock.json` before commit and document held-back major upgrades
in this plan or a focused follow-up note under `docs/mvp/v3.5/`.

Initial dependency inventory, 2026-07-02:

- Safe patch/minor candidates: Radix UI packages, `@tailwindcss/vite`,
  `tailwindcss`, `radix-ui`, `immer`, `i18next-cli`, and `tsx`.
- Major or ecosystem candidates to defer into focused branches: React Router 8,
  Vite 8, `i18next` 26, `i18next-http-backend` 4, `react-i18next` 17,
  `lucide-react` 1, `shadcn` 4, `vite-tsconfig-paths` 6, and `@types/node` 26.
- `npm audit --omit=dev` reports three moderate advisories through the Prisma
  dev dependency chain (`@prisma/dev` -> `@hono/node-server`). The suggested
  `npm audit fix --force` would downgrade/install Prisma 6.19.3 from the
  current Prisma 7 line, so do not apply it automatically. Recheck after a
  Prisma 7-compatible advisory fix is available or when doing a focused Prisma
  dependency branch.

Applied update slice:

- `npm update --workspaces` was used to refresh package-lock entries that are
  already allowed by existing semver ranges.
- No `package.json` dependency ranges were widened in this slice.
- Remaining `npm outdated --workspaces` entries are pinned, major, or otherwise
  deferred candidates listed above.

### 3. Add The CI Workflow

Add a GitHub Actions workflow after the validation spine is portable.

Initial implemented workflow:

- `.github/workflows/ci.yml`
- triggers on pull requests and pushes to `main`
- runs on Ubuntu with Node 24.x
- installs with `npm ci`
- runs `npm run ci:portable`
- generates Prisma clients from checked-in schemas before building the server
- runs backend API tests against disposable SQLite fixtures

Initial triggers:

- `pull_request` for normal branch review
- `push` to `main` after merges

Future full checks after backend API fixtures exist:

- install dependencies with `npm ci`
- run any explicit generation step required for Prisma clients or contracts
- run `npm run verify`

The first CI pass should avoid matrix expansion unless a concrete compatibility
need appears. A single current Node LTS target is enough for this personal
project stage.

### 4. Keep CD Script-Backed

Keep `docs/deployment.md` and `docs/deployment-scripts/` as the deployment
contract.

The first CD automation should be a thin trigger around the existing scripts,
not a copy of their logic. Acceptable v3.5 shapes:

- a manual `workflow_dispatch` that SSHes to the configured host and invokes the
  tracked remote script copies
- a documented local release checklist that runs CI first, then invokes the
  current scripts
- a later automatic deploy from `main` only after secrets, host targeting, and
  rollback expectations are explicit

The scripts themselves remain the place to change deployment behavior.

### 5. Add Merge-To-Main Module Doc Automation

On accepted merges to `main`, trigger an agent job that reviews the merged diff
and refreshes high-level module design docs.

Target docs:

```text
docs/modules/
  README.md
  server.md
  web.md
  contracts.md
  data-tools.md
  delivery.md
```

Expected automation behavior:

- read the merge diff and the current feature/workspace docs
- update only high-level module documentation
- keep user-facing feature behavior in `docs/features.md`
- keep feature-specific decisions in the relevant feature plan or focused topic
  doc
- open a docs-only branch or PR when changes are needed
- do nothing when no high-level module doc update is warranted

The agent job should start as non-blocking. CI should protect implementation
quality; the module-doc job should reduce drift without blocking emergency
fixes.

### 6. Review Documentation Boundaries

Review `AGENTS.md` together with feature and module documentation so each doc
has a narrow job:

- `AGENTS.md`: how agents work safely in this repo
- `docs/README.md`: documentation map
- `docs/roadmap.md`: current and future work ordering
- `docs/features.md`: user-facing feature behavior
- `docs/feature-workflow.md`: feature intake and implementation loop
- `docs/frontend-map.md`: quick frontend navigation
- `docs/modules/*`: high-level module design after the automation exists

The intended feature workflow after v3.5:

1. Feature branch updates focused behavior docs and tests near the change.
2. Merge to `main` runs CI.
3. A doc agent reviews the accepted diff and opens a follow-up module-doc PR
   only when broad design docs need adjustment.

## Acceptance Criteria

- CI runs on pull requests and pushes to `main`.
- The first CI gate runs the portable subset of the existing
  build/unit/typecheck spine rather than browser E2E.
- CI can run from a clean checkout without ignored local DB files or raw local
  data sources.
- Backend API tests run in CI against disposable fixtures rather than ignored
  local SQLite files.
- Dependency review is documented before broad v3.5 implementation starts.
- Safe dependency updates are either applied with lockfile review and validation
  or explicitly deferred with a reason.
- CD remains backed by `docs/deployment-scripts/`; workflow wrappers do not
  duplicate deployment logic.
- Merge-to-main module-doc automation is documented and either implemented or
  explicitly blocked on the chosen agent runner/secrets.
- Generated module-doc changes are docs-only and reviewable.
- `AGENTS.md`, `docs/features.md`, `docs/feature-workflow.md`, and
  `docs/frontend-map.md` have clear non-overlapping ownership after the review.

## Open Questions For Implementation

- Which runner should own the merge-to-main agent job: GitHub Actions invoking a
  configured agent, or a Codex-side automation that watches `main`?
- Should CD stay manual `workflow_dispatch` through v3.5, or deploy
  automatically after `main` CI succeeds?
- Which minimal backend test fixture strategy gives the best balance between
  portability and realism?
- Should dependency review become a scheduled maintenance task after v3.5, or
  stay a release-readiness checklist item?
