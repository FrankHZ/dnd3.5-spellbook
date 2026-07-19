# v1.3 Platform Deployment Prerequisite Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: accepted in PR #95 and Actions deploy run `29669906495`; frozen in
[FREEZE.md](./FREEZE.md).

## Purpose

Restore a secure and reproducible GitHub Actions backend deployment path. The
work is independent from the sitewide UX redesign and may proceed in parallel,
but v1.3 cannot freeze until a real Actions run proves the complete path.

## Ownership

- Owning release: v1.3
- Owning domain: `platform`
- Primary specialist: platform agent
- Related docs: `docs/operations/deployment.md`,
  `docs/operations/bootstrap-remote.md`, `docs/modules/delivery.md`, and
  `docs/harness.md`
- Parallel consumer: none; the UX redesign does not depend on this
  implementation
- Handoff owner: main gate

## Agent Context

- Main gate outcome: choose and implement a secure Actions-to-origin
  connection, reconcile deploy Git identity and prerequisites, and prove one
  production deployment end to end.
- Required reading: `AGENTS.md`, `.agents/roles/platform.md`, this plan,
  `docs/operations/deployment.md`, `docs/modules/delivery.md`,
  `.github/workflows/deploy.yml`, `docs/deployment-scripts/deploy-backend.sh`,
  and deployment helper tests.
- Expected edit surface: `.github/workflows/`,
  `docs/deployment-scripts/`, deployment tests, `.env.example` only for
  non-secret local keys, this plan, and affected operations/module docs.
- Nearby code/tests: `scripts/deployment-scripts.test.mjs`,
  `scripts/release-metadata.test.mjs`, `/api/status/app`, and production
  version/status smoke paths.
- Validation: deployment helper tests, release-metadata tests,
  `npm run ci:portable`, secure-connection verification, one real Actions
  deploy, and live frontend/API version/ref/commit checks.
- Non-goals and follow-up parking: automatic DB upload, unrestricted public
  SSH, a general CI/CD rewrite, HA/zero-downtime architecture, and unrelated
  Cloudflare/AWS hardening remain outside this prerequisite.
- Delegation: bounded child delegation is allowed only for a named read-only
  connection/security investigation or an isolated test update. Recursive
  fan-out remains disabled.
- Handoff: return the selected connection model and rejected alternatives,
  infrastructure/config changes, secret/variable names without values,
  rollback steps, Actions run evidence, production smoke evidence, and open
  risks to main gate. The platform agent must not merge its own PR.

## Problem

GitHub Actions deploy run `29656374979` failed in Configure SSH while
`DEPLOY_SSH_KNOWN_HOSTS` was empty and the fallback `ssh-keyscan` command
exited with status 1. That evidence does not establish why the scan failed.
DNS resolution, the configured host and port, AWS ingress, routing, and runner
reachability remain unverified and must be separated during investigation
before a connection model is selected.

The deployment path also has three reproducibility gaps:

- `deploy-backend.sh` defaults `SPELLBOOK_DEPLOY_GIT_REMOTE` to `github`, but
  the AWS checkout currently uses `origin`;
- deploy metadata can report `origin/HEAD` instead of the logical release
  branch `main`;
- remote bootstrap already installs `sqlite3`, and `deploy-backend.sh` already
  checks it before Git fetch or any deployment mutation. That preflight
  correctly exposed host drift during the manual v1.2.2 deployment, but the
  failure ordering and restored-host state need explicit regression and
  acceptance evidence.

## Goals

- Diagnose the failed Actions connection from its inputs outward, then select
  the simplest secure, maintainable path that fits the confirmed cause without
  unrestricted public SSH ingress.
- Fail closed on missing host identity or connection configuration; do not use
  trust-on-first-use as production acceptance.
- Make deploy checkout remote and logical branch metadata explicit and
  deterministic.
- Preserve the existing `sqlite3` bootstrap/preflight contract and prove that
  host drift fails before deployment mutation.
- Prove portable gate, connection, deployment, and live metadata in one real
  Actions run.

## Non-Goals

- No automatic deployment or replacement of rules, content, or app-state
  SQLite artifacts.
- No public `0.0.0.0/0:22` or `::/0:22` rule, even temporarily as the accepted
  solution.
- No frontend deployment migration; Cloudflare Workers Builds remains the
  normal frontend path.
- No broad AWS rearchitecture, managed-database migration, general rollback
  project, or zero-downtime guarantee.
- No secret values, host keys, IPs, private endpoints, or credentials in Git.

## Current Facts

- `.github/workflows/deploy.yml` is a manual `workflow_dispatch` wrapper around
  the tracked backend deploy helper and runs `ci:portable` by default.
- Run `29656374979` targeted commit
  `5dd089fc872eb9379893d6fefb8d5927bd330213`. Checkout, dependency install,
  and portable validation passed; Configure SSH then failed because
  `DEPLOY_SSH_KNOWN_HOSTS` was empty and fallback `ssh-keyscan` exited 1. No
  helper upload or backend deployment ran, and the log does not identify the
  connection root cause.
- A later manual deployment of the same `5dd089f` commit succeeded. The public
  app-status response reports v1.2.2, full commit `5dd089f...`, deployment time
  `2026-07-18T18:50:55Z`, and ref `origin/HEAD`. This proves the reviewed commit
  can run on the host and preserves the metadata issue as separate evidence;
  it does not prove the Actions network path.
- Current GitHub `production` environment secrets now include
  `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_PRIVATE_KEY`,
  `DEPLOY_SSH_KNOWN_HOSTS`, and `AWS_DEPLOY_ROLE_ARN`. Current environment
  variables now include `DEPLOY_SSH_PORT`, `AWS_REGION`, and
  `DEPLOY_LIGHTSAIL_INSTANCE_NAME`. Repository-level copies may remain only as
  a short transition bridge for the pre-merge `main` workflow and should be
  removed after this workflow is merged.
- AWS CLI setup was verified on 2026-07-18 against the production account and
  Lightsail region. The target instance is running, HTTP and HTTPS remain
  public, and SSH remains restricted rather than exposed to
  `0.0.0.0/0` or `::/0`.
- The GitHub OIDC provider now exists in IAM. The deploy role
  `spellbook-github-actions-deploy` trusts only this repository's `main`
  branch subject with audience `sts.amazonaws.com`.
- The deploy role's inline policy allows `lightsail:GetInstancePortStates`
  and `lightsail:PutInstancePublicPorts` only for the required read path and
  target Lightsail instance update path. IAM policy simulation allowed both
  workflow actions, and a no-op `put-instance-public-ports` check preserved
  the exact Lightsail port state.
- `DEPLOY_SSH_KNOWN_HOSTS` was populated from an existing local `known_hosts`
  entry for the deployment host. Direct strict SSH to the deployment host
  succeeded from the operator machine with host-key checking enabled.
- PR review hardening split validation from deployment, scoped SSH secrets to
  deploy-only steps, pinned privileged actions to full commit SHAs, made
  Lightsail restore fail the workflow on error, added AWS read-back checks, and
  added behavior tests for the firewall transform and restore checks.
- Live host inspection confirms the production checkout remote is `origin`,
  the deployed commit is contained by both `origin/HEAD` and `origin/main`,
  `sqlite3` is installed, and the API process listens on `127.0.0.1:3000`.
- The backend helper verifies an explicit 40-character commit, builds the
  checked-out source, preserves runtime DB files, writes About / Status
  metadata, restarts the service, and performs a local API smoke.
- Production frontend deployment remains Cloudflare-owned, and production DB
  activation remains manual and operator-owned.
- `docs/operations/bootstrap-remote.md` already installs `sqlite3`, and
  `deploy-backend.sh` checks `command -v sqlite3` before Git fetch, build,
  service stop, DB staging, or activation. The current server has been restored
  to that declared state.

## Plan

### Slice 1: Connection And Threat-Model Audit

- Reproduce or inspect run `29656374979` and validate each connection input
  separately: secret presence and shape, DNS resolution, configured host/port,
  pinned host key, AWS ingress, route reachability, SSH daemon exposure, and
  deploy-user authentication. Do not treat `ssh-keyscan` exit 1 as a diagnosis.
- After the cause is known, evaluate only the connection options still needed
  against least privilege, GitHub-hosted runner compatibility, operational
  complexity, auditability, revocation, and recovery. Consider managed or
  private access paths before public ingress when direct access cannot be made
  safe and reliable.
- Record the selected model and why rejected options do not fit. Any design
  that relies on changing public ingress must be narrowly scoped, automated,
  authenticated, and reversible; unrestricted port 22 is disallowed.
- Define the required GitHub secret/variable set and a rotation/revocation
  path. Host identity must be pinned from an independently verified source.
- Selected model: keep GitHub-hosted runners, use GitHub OIDC to assume a
  narrowly scoped AWS role, snapshot the current Lightsail firewall, add only
  the current runner IPv4 `/32` to the SSH rule for the run, require pinned SSH
  host identity, then restore the prior firewall state in cleanup.
- Rejected options for this slice: unrestricted SSH ingress is disallowed;
  static allowlisting all GitHub-hosted runner ranges is too broad and GitHub
  documents those ranges as dynamic/shared; a persistent self-hosted runner on
  the production host adds a larger trust boundary than this prerequisite
  needs; larger runners with static IPs are unnecessary cost/complexity for
  this personal deployment path.

### Slice 2: Workflow And Remote Preflight

- Implement the selected secure connection path in the thin Actions wrapper
  while keeping `deploy-backend.sh` canonical for deploy behavior.
- Remove production reliance on `ssh-keyscan` trust-on-first-use. Missing host
  identity or connection inputs must fail before upload/deploy.
- Preserve the existing `sqlite3` preflight and add a regression proving a
  missing CLI fails before Git fetch, build, service control, DB staging, or
  activation. Review the same early-failure coverage for Git, Node/npm, service
  control, target directories, and any selected transport/helper rather than
  adding a second bootstrap contract.
- Include host-drift acceptance that compares the bootstrap package contract
  with the live host and confirms the current server provides `sqlite3`.
- Keep secret values out of command output and ensure cleanup runs after both
  success and failure. Firewall restore failure must fail the workflow because
  a stale runner `/32` is a production exposure, not a successful deploy.

### Slice 3: Git Remote And Metadata Contract

- Reconcile the script's default remote with the AWS checkout's actual
  `origin` remote. Accepted contract: default `deploy-backend.sh` to `origin`
  and keep `SPELLBOOK_DEPLOY_GIT_REMOTE` as the explicit override.
- Continue pinning deployment to the validated full commit SHA.
- Report logical release ref `main` for a main deployment instead of a remote
  symbolic name such as `origin/HEAD`. Keep the commit SHA authoritative and
  test non-main or detached behavior explicitly.
- Add regression tests for remote selection, missing prerequisites, host-key
  fail-closed behavior, and normalized metadata.

### Slice 4: Real Actions Deployment Acceptance

- Run the manual Actions deploy from an accepted `main` commit with portable
  validation enabled.
- Confirm the selected secure connection establishes successfully without
  unrestricted public SSH ingress.
- Confirm the reviewed helper deploys exactly `$GITHUB_SHA`, starts the API,
  and cleans temporary remote material.
- Smoke the public API and About / Status path. Verify backend version, logical
  ref `main`, and full/short commit metadata match the deployed main commit;
  an HTTP 200 alone is insufficient.
- Record the workflow run, commit, selected connection model, preflight result,
  and live smoke evidence in this plan before handing off to main gate.

## Acceptance Criteria

- The cause of run `29656374979` is documented from separate DNS, secret,
  host/port, ingress/routing, host-identity, and authentication evidence rather
  than inferred from `ssh-keyscan` alone.
- A documented, least-privilege Actions-to-origin connection model is selected
  and implemented only after that diagnosis; AWS does not expose SSH 22 to
  `0.0.0.0/0` or `::/0`.
- Production deployment requires pinned host identity or the selected
  transport's equivalent authenticated host/server identity and fails closed
  when it is missing.
- The deploy checkout remote is explicit and matches the actual AWS checkout;
  the script no longer assumes a nonexistent `github` remote.
- Main deployments publish logical ref `main`, and version/commit metadata
  matches the verified deployed SHA.
- Existing remote bootstrap and deploy preflight remain aligned on `sqlite3`;
  a regression proves missing `sqlite3` fails before Git fetch or any
  deployment mutation, and live-host acceptance confirms drift is closed.
- Deployment helper and metadata regression tests cover the changed failure
  modes.
- Lightsail firewall helper tests cover adding the runner `/32`, rejecting
  public SSH, restoring the original snapshot, and detecting read-back drift.
- One real Actions run passes portable validation, secure remote connection,
  backend deployment, local service smoke, and public version/ref/commit smoke.
- Workflow and operational docs name only required secrets/variables and do not
  disclose their values or private infrastructure details.

## Doc Updates

- Update this plan with the selected model, decision rationale, acceptance run,
  and any bounded follow-up candidates.
- Update `docs/operations/deployment.md` with the durable connection,
  prerequisite, remote-name, metadata, operator, and recovery contract.
- Update `docs/operations/bootstrap-remote.md` only if the accepted host
  package contract changes; do not duplicate its existing `sqlite3` ownership.
- Update `docs/modules/delivery.md` if CI/CD ownership or trust boundaries
  change.
- Update `docs/harness.md` if the maintained deployment acceptance gate
  changes.
- Update `.env.example` only for non-secret local helper keys; GitHub secrets
  belong in operational instructions, never tracked values.
- Update `docs/roadmap.md` only if active ordering or release scope changes.
- Do not update an integrated plan unless a real cross-track conflict appears.

## Open Questions

No setup or acceptance questions remain. The successful main-branch Actions
deploy closed the platform prerequisite.

## Follow-Up Candidates

Use this section during implementation for useful, non-blocking discoveries.
Do not park a release acceptance blocker here.

No platform follow-up was added by this prerequisite. Broader deployment and
rollback work remains in `docs/stable-backlog.md`.

## Completion Notes

- PR #95 merged at main commit
  `3ed3f4bc6272ca409e6c7d7bd02f46f05c785e05`.
- Actions run `29669906495` passed portable validation, OIDC/AWS access,
  temporary runner `/32` authorization, strict SSH, remote preflight, exact-
  commit deployment, local/public smoke, metadata verification, and firewall
  restoration.
- The accepted backend status reported ref `main`, commit `3ed3f4b`, and
  GitHub run `29669906495`.
- Use [FREEZE.md](./FREEZE.md) for the final canonical v1.3 snapshot.
