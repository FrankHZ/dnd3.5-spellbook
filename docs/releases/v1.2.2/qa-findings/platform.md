# Platform Raw Audit Findings

> This is a temporary raw role audit. Proposed severities are not final.
> Main gate owns de-duplication and disposition. This file must be removed or
> collapsed into the v1.2.2 Code And Test QA plan Completion Notes before the
> v1.2.2 freeze.

Audit context:

- Primary role: `platform`
- Audit base: `ff4f2ff7eb7158d2007178179c15919923769311`
- Owning plan: [v1.2.2 Code And Test QA Plan](../code-and-test-qa-plan.md)
- Baseline supplied by main gate: `npm run ci:portable` passed on the exact
  audit-base commit
- Audit mode: read-only; no production configuration, dependencies, workflows,
  deployment scripts, SQLite data, or remote state changed

## V122-PLAT-001 - Proposed P1

**Failure statement:** Both DB helpers replace live SQLite files and remove
WAL/SHM sidecars before stopping the API. `deploy-backend.sh` also activates
DBs before pulling and building code, then rsyncs over the running application
tree before restart.

**Evidence:**

- Replacement and sidecar deletion occur in
  [`deploy-backend.sh`](../../../deployment-scripts/deploy-backend.sh#L103),
  while service restart waits until
  [line 200](../../../deployment-scripts/deploy-backend.sh#L200).
- The standalone helper has the same ordering in
  [`update-db.sh`](../../../deployment-scripts/update-db.sh#L33), with restart
  only at [line 82](../../../deployment-scripts/update-db.sh#L82).
- Activation is checksum-only. Failed smoke exits without rollback at
  [`update-db.sh:86`](../../../deployment-scripts/update-db.sh#L86).

**Impact:** A corrupt or incompatible upload remains active after failed smoke.
Backups can omit committed WAL data, in-flight app-state writes can be lost,
and a failed code build can leave a new DB serving through the old backend.

**Coverage gap:** Portable CI does not exercise these helpers. No deployment
script regression harness exists; `bash -n` proves syntax only. Smoke checks
only `/api/rulebooks`.

**Recommended owner and smallest safe fix surface:** Platform, consulting
backend-db for schema checks. Limit the fix to the two DB helpers: stage and
validate SQLite integrity and expected schema, stop or quiesce the service
before backup and swap, preserve or checkpoint sidecars, and automatically
restore backups when restart or smoke fails.

**Confidence and unresolved question:** High. Current remote journal modes and
write traffic were not inspected, but they do not remove the ordering defect.

## V122-PLAT-002 - Proposed P1

**Failure statement:** The workflow validates and labels one Git commit, but
the remote helper independently pulls whatever its current branch contains.
Production code and reported metadata can therefore refer to different commits.

**Evidence:**

- The workflow passes `$GITHUB_SHA` as metadata at
  [`deploy.yml:72`](../../../../.github/workflows/deploy.yml#L72).
- The remote helper runs an unpinned `git pull --ff-only` at
  [`deploy-backend.sh:157`](../../../deployment-scripts/deploy-backend.sh#L157).
- The workflow invokes an independently synchronized `~/deploy-backend.sh`;
  the operations documentation confirms tracked helper changes are not synced
  automatically at
  [`deployment.md:97`](../../../operations/deployment.md#L97).

**Impact:** If `main` advances during validation, commit B can be deployed after
commit A was validated while `/api/status/app` reports A. A stale remote helper
can likewise bypass reviewed deployment changes. Audit, rollback, and release
evidence become unreliable.

**Coverage gap:**
[`release-metadata.test.mjs`](../../../../scripts/release-metadata.test.mjs#L16)
checks string wiring only; it does not require deployed HEAD or the helper
checksum to match the workflow checkout. A valid Git ref containing an
apostrophe was also accepted by `git check-ref-format`, while the workflow
embeds the ref in a single-quoted remote shell command.

**Recommended owner and smallest safe fix surface:** Platform. Execute or upload
the helper from the checked-out commit, deploy an explicit expected SHA, reject
HEAD mismatches, and derive metadata from the verified deployed HEAD.

**Confidence and unresolved question:** High. Whether the current remote helper
matches the tracked file was not inspected.

## V122-PLAT-003 - Proposed P2

**Failure statement:** Production logger startup requires `pino-pretty`, but
that package is declared only as a development dependency.

**Evidence:**

- Production still selects the pretty transport unconditionally in
  [`logger.ts`](../../../../server/src/logger.ts#L4).
- `pino-pretty` is under `devDependencies` in
  [`server/package.json`](../../../../server/package.json#L69).
- `npm explain pino-pretty` reported `dev`.
- A read-only missing-module simulation with `NODE_ENV=production` failed with
  `unable to determine transport target for "pino-pretty"`.

**Impact:** A production-only install or packaged runtime using
`npm ci --omit=dev` fails before the API starts. The current deployment hides
the boundary because it installs and copies all development dependencies.

**Coverage gap:** Runtime import runs against the full development dependency
tree. No production-only package or runtime import check exists.

**Recommended owner and smallest safe fix surface:** Platform. Prefer disabling
the pretty transport in production; alternatively classify it as a runtime
dependency. Add an omit-dev runtime import or start smoke.

**Confidence and unresolved question:** High. The policy question is whether
production-only dependency installation is intended to become supported.

## V122-PLAT-004 - Proposed P2

**Failure statement:** Missing `RULES_DATABASE_URL` becomes the literal SQLite
path `undefined` instead of failing configuration validation.

**Evidence:**

- [`rules-prisma-client.ts`](../../../../server/src/lib/rules-prisma-client.ts#L5)
  string-interpolates the absent value.
- The content and app-state clients perform explicit checks at
  [`content-prisma-client.ts:5`](../../../../server/src/lib/content-prisma-client.ts#L5)
  and
  [`app-state-prisma-client.ts:5`](../../../../server/src/lib/app-state-prisma-client.ts#L5).
- A stubbed, non-writing connection check printed `opened-path=undefined`.

**Impact:** The process can import or start without exposing the configuration
error, then attempt to open or create a stray `undefined` database on the first
rules query and return API failures.

**Coverage gap:**
[`check-runtime-import.cjs`](../../../../server/scripts/check-runtime-import.cjs#L1)
always supplies a fallback URL, and server tests initialize every DB variable.
No missing-required-environment test exists.

**Recommended owner and smallest safe fix surface:** Backend-db. Add shared
required SQLite URL validation before client construction and focused missing
or invalid-variable tests.

**Confidence and unresolved question:** High. The production environment
example supplies the variable, so this manifests when configuration drifts.

## V122-PLAT-005 - Proposed P2

**Failure statement:** `apply-nginx-site.sh` installs the candidate
configuration before running `nginx -t`; validation failure leaves the active
site file invalid.

**Evidence:** Backup and installation happen at
[`apply-nginx-site.sh:190`](../../../deployment-scripts/apply-nginx-site.sh#L190),
followed by validation only at
[`apply-nginx-site.sh:207`](../../../deployment-scripts/apply-nginx-site.sh#L207).
`set -e` exits without restoring the backup.

**Impact:** The currently running Nginx process may continue temporarily, but a
subsequent reload or restart fails until an operator restores the backup.

**Coverage gap:** No behavioral script test or failure-path simulation exists.

**Recommended owner and smallest safe fix surface:** Platform. Validate the
candidate before activation where possible, or install with a rollback trap
that restores the previous file when `nginx -t` or reload fails.

**Confidence and unresolved question:** High. No unresolved question.

## Commands And Checks Run

- Confirmed the clean audit state and exact base with `git status`,
  `git rev-parse`, `git cat-file`, and base-diff inspection.
- Read the required role, plan, harness, delivery, operations, workspace,
  workflow, package, runtime, deployment, environment, and nearby test files.
- `npm run check:contracts` - passed.
- `npm run -w server check:runtime` - passed against existing built output.
- `node --test scripts/release-metadata.test.mjs` - passed.
- `node scripts/release-metadata.mjs --label` - returned `v1.2.1`.
- `npm ls --omit=dev --depth=0` and `npm explain pino-pretty` - completed.
- `npm audit --omit=dev --audit-level=high` - exited 0 and reported three
  moderate Prisma development-toolchain advisories, with no demonstrated
  deployed-runtime path.
- `bash -n` for all four tracked shell deployment helpers - passed.
- Ran read-only simulations for missing `pino-pretty` and missing
  `RULES_DATABASE_URL`.
- `git check-ref-format` accepted the tested apostrophe-containing branch ref.
- Did not rerun `npm run ci:portable`; its exact-commit passing result was
  supplied as the baseline.

## Residual Risks

- Production builds were not regenerated because they write ignored artifacts;
  the runtime check used existing `dist` output. Behavioral source/dist parity
  beyond import resolution remains unverified.
- No remote host, systemd state, SQLite journal mode, remote helper checksum,
  GitHub secret, or Cloudflare Workers configuration was inspected.
- Deployment, DB, and Nginx helpers were not executed or transaction-simulated
  against a disposable Linux host.
- No files, branches, commits, SQLite data, workflows, dependencies, or remote
  configuration were changed during the audit itself.
