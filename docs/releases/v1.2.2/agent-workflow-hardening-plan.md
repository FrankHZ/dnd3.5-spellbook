# v1.2.2 Agent Workflow Hardening Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected durable docs, and
> `docs/roadmap.md` only when active ordering changes. v1.2.2 has no
> `integrated-plan.md`.

Status: **accepted as built**. PR #79 merged the implementation, downstream
Code And Test QA completed, and [FREEZE.md](./FREEZE.md) is the canonical
v1.2.2 snapshot.

## Purpose

- Make the repository's existing agent roles explicit and reusable in Codex.
- Keep role semantics canonical without creating another copy of project
  documentation for each role or tool.
- Standardize context packets, boundaries, validation routing, and handoff
  evidence so specialists remain narrow and reviewable.

## Ownership

- Owning version: v1.2.2.
- Owning domain: agent workflow, documentation governance, and lightweight
  harness validation.
- Primary implementation owners: main gate approves role semantics; librarian
  owns canonical role contracts and navigation; platform owns thin tool
  adapters and `agents:check`.
- Upstream dependency: v1.2.1 freeze.
- Downstream consumer: v1.2.2 Code And Test QA.
- Handoff owner: main gate.

## Agent Context

- Main gate outcome: establish one stable role vocabulary and a thin Codex
  adapter surface without expanding release scope or documentation upkeep.
- Required reading: `AGENTS.md`, `docs/README.md`, `docs/roadmap.md`,
  `docs/feature-workflow.md`, `docs/harness.md`, and this plan.
- Expected edit surface: `.agents/roles/`, `.codex/agents/`, a small root
  validation script and npm entry, `AGENTS.md`, and directly affected
  navigation/harness docs.
- Validation: focused checker tests, `npm run agents:check`, `npm run verify`,
  and tool-specific adapter smoke where the tool is available.
- Non-goals: product behavior, implementation-domain refactors, a new docs
  hierarchy, copied module maps, recursive delegation, or full Codex-schema
  validation inside the correspondence checker.
- Handoff: return changed role/adapters, correspondence evidence, Codex loading
  smoke, unresolved client limitations, and no self-merge.

## Problem

The repository already uses main-gate, librarian, specialist, and subagent
roles, but their boundaries live partly in a growing `AGENTS.md` and partly in
conversation convention. Copying full role contracts into Codex adapter files
would create another documentation surface that drifts whenever the repo,
roadmap, commands, or module boundaries change.

The durable solution is a small stable role layer. Roles define responsibility
and handoff behavior; existing canonical docs continue to define current
project truth; each task's context packet supplies the active plan and exact
scope.

## Stability Contract

Canonical role files must remain low-churn routing contracts.

They may contain:

- when the role should be selected
- durable ownership boundary and explicit non-goals
- stable existing documentation entry points
- default top-level edit surface and validation routing
- adjacent-role boundaries
- required handoff shape
- shared rules against scope expansion and self-merging

They must not contain:

- active release/version status, branch names, PR numbers, or current counts
- copied roadmap prose, module/file inventories, or workspace command catalogs
- feature-specific acceptance criteria that belong in an owning plan
- Codex-specific adapter schema details
- temporary findings, implementation progress, or completion logs

All roles read `AGENTS.md`, their canonical role file, and the owning plan
provided by the context packet. Role-specific reading points only to stable
existing docs. The context packet, not the role profile, supplies current work.

## Canonical Role Set

Create `.agents/roles/README.md` plus these canonical contracts:

| Role               | Durable responsibility                                                                                                  | Stable documentation entry points                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `main-gate`        | direction, context packets, cross-domain decisions, finding triage, PR acceptance, and merge readiness                  | `docs/roadmap.md`, `docs/feature-workflow.md`                                                    |
| `librarian`        | plans, docs navigation, roadmap coherence, freeze snapshots, and cross-doc consistency                                  | `docs/README.md`, `docs/releases/README.md`, repo-local planning/freeze skills                   |
| `data-pipeline`    | data-tools, source/patch/import workflows, fixtures, generated-content reproducibility, and corpus harnesses            | `data-tools/README.md`, `docs/modules/data-tools.md`, `docs/operations/db-content-workflow.md`   |
| `backend-db`       | contracts, API/runtime behavior, Prisma schemas/clients, three runtime DB boundaries, errors, and read-source fallbacks | `server/README.md`, `contracts/README.md`, `docs/modules/server.md`, `docs/modules/contracts.md` |
| `i18n-translation` | locale conventions, translation/terminology workflow, i18n QA, and localized display semantics                          | `docs/i18n.md`, `web/README.md`, `data-tools/README.md`                                          |
| `frontend-design`  | frontend state, URL behavior, interaction design, components, layout, and browser smoke                                 | `web/README.md`, `docs/design.md`, `docs/frontend-map.md`, `docs/modules/web.md`                 |
| `platform`         | CI, builds, runtime packaging, dependency boundaries, deployment helpers, and environment consistency                   | `docs/harness.md`, `docs/modules/delivery.md`, `docs/operations/README.md`                       |

The canonical role filenames are the machine-readable role registry. Do not add
a second role manifest that would need synchronized updates.

Adjacent ownership must stay explicit:

- `backend-db` defines runtime schemas, migrations, API contracts, and read
  behavior; `data-pipeline` owns how accepted migrations and schemas are
  exercised by generators, imports, fixtures, parity checks, and artifacts.
- `frontend-design` owns interaction and rendering behavior;
  `i18n-translation` owns locale keys, terminology, translation workflow, and
  fallback semantics. Cross-cutting display changes require a named handoff.
- `platform` owns whether code builds, packages, validates, and deploys
  consistently; it does not redefine application or content semantics.

Each contract uses the same compact sections:

1. When To Use
2. Ownership And Non-Goals
3. Required Reading
4. Default Edit Surface And Validation
5. Adjacent Roles
6. Handoff Contract

The default validation section should route to `AGENTS.md` and the owning
workspace README instead of copying commands. Context packets choose the
smallest relevant commands for the task.

## Adapter Contract

Create one project-scoped Codex adapter per canonical role:

```text
.codex/agents/<role>.toml
```

Each adapter contains only what its tool requires:

- the identical canonical role name
- a short selection description
- tool/model/permission configuration when needed
- one instruction to read `.agents/roles/<role>.md`, then `AGENTS.md` and the
  supplied context packet before acting

Adapters must not repeat role ownership, required-reading lists, validation
commands, release state, or handoff detail. Codex schema changes should
normally touch only the adapters, not canonical role contracts.

Before implementation acceptance, validate adapter shapes against current
official OpenAI documentation or the installed Codex client. The checker only
proves repository correspondence; it is not a replacement for Codex parsing.

## Orchestration Rules

Keep `AGENTS.md` changes compact:

- add a short role table linking `.agents/roles/README.md`
- retain main-gate, librarian, specialist, and subagent responsibility at the
  shared-policy level
- require every delegated task to name one canonical role and provide a
  concrete context packet
- state that role profiles do not replace feature/release plans
- disallow recursive agent fan-out by default
- state that no role expands release scope or merges its own PR

A context packet must provide:

- intended outcome
- owning plan or durable topic doc
- required reading for this task
- expected edit surface
- explicit non-goals
- validation/acceptance evidence
- handoff owner
- whether bounded child delegation is allowed

## Plan

### Slice 1: Canonical Contracts

- Deliverable: `.agents/roles/README.md` and the seven stable role files.
- Constraint: role files route to existing docs and context packets; they do
  not become versioned project descriptions.
- Validation: manual role-boundary review by main gate and librarian.

### Slice 2: Thin Codex Adapters

- Deliverable: one project-scoped Codex adapter for each canonical role.
- Constraint: adapters contain selection/configuration plus the canonical role
  pointer, not copied prompts.
- Validation: current OpenAI documentation/schema review and Codex loading
  smoke; client limitations are reported in handoff.

### Slice 3: Shared Orchestration Guidance

- Deliverable: compact `AGENTS.md` role table and delegation rules.
- Constraint: move detailed role semantics out of `AGENTS.md`; do not duplicate
  the new role files in prose.
- Validation: main-gate and librarian review of entry-point clarity.

### Slice 4: Correspondence Check

- Deliverable: root `npm run agents:check` backed by
  `scripts/check-agent-roles.mjs`.
- The checker verifies:
  - canonical role filenames, excluding `.agents/roles/README.md`
  - one matching adapter basename in `.codex/agents/`
  - no missing or orphan adapter roles
  - each adapter's declared `name` matches its basename and canonical role
  - each adapter references its exact canonical role path
- The checker does not validate the complete Codex TOML schema, models,
  permissions, or tool availability.
- Validation: root command success plus a bounded temporary negative-case check
  or focused helper test; do not add a second role manifest or permanent copy
  of the adapter tree just for tests.

## Acceptance Criteria

- The seven canonical roles exist and have non-overlapping, reviewable
  ownership boundaries.
- Role files use stable docs entry points and contain no current release,
  branch, PR, progress, or copied command state.
- Adjacent data-pipeline/backend-db and frontend-design/i18n boundaries are
  explicit.
- Every adapter basename and declared `name` map one-to-one to a canonical role,
  and each adapter reads that role before acting.
- The checker derives role names from canonical filenames rather than another
  maintained manifest.
- Codex adapters remain thin enough that role semantics can change in one
  place.
- `AGENTS.md` links the canonical role index without restating every contract.
- Context packets remain mandatory and carry all task-specific scope.
- Recursive fan-out is disabled by default; no role expands scope or merges
  its own PR.
- `npm run agents:check`, focused checker tests, and `npm run verify` pass.
- Available-tool adapter smoke passes; unavailable-tool validation limits are
  explicit rather than silently claimed.
- Main gate accepts this pass before QA agents are dispatched.

## Doc Updates

- Update `AGENTS.md` only for the compact role table and shared orchestration
  rules.
- Update `docs/harness.md` only for the maintained `agents:check` boundary.
- Update `docs/README.md` or `.agents/roles/README.md` only when entry-point
  navigation changes.
- Do not create role-specific module docs, active-version copies, or an
  integrated plan.
- Update `docs/roadmap.md` only when pass ordering or release status changes.

## Open Questions

- None for implementation handoff. Full Codex-schema checking is explicitly
  outside the correspondence command.

## Follow-Up Candidates

- Additional specialist roles only after repeated work proves a durable,
  non-overlapping ownership boundary; do not add roles for one release task.
- More Codex schema validation only if adapter drift causes a real loading
  failure.

## Completion Notes

Implementation handoff:

- Added seven canonical role contracts under `.agents/roles/` and seven thin,
  one-to-one project-scoped Codex adapters.
- Added `scripts/check-agent-roles.mjs`, focused valid and negative-case tests,
  and root `agents:check` / `test:agents` commands. Both checks are part of
  `verify` and `ci:portable`.
- Kept `AGENTS.md` to a compact role table and shared orchestration rules;
  current project facts and task scope remain in existing docs and context
  packets.
- Reviewed adapter shapes against current official OpenAI documentation. All
  Codex TOML files parse successfully.
- Live Codex loading smoke passes after updating the PATH-selected npm CLI from
  `0.128.0` to stable `0.144.5`: a read-only `codex exec` selected the
  project-scoped `platform` role and returned its `# Platform` heading. The CLI
  still logs a non-fatal model-catalog cache warning because the refreshed
  catalog omits a field expected by this client; model execution and the role
  smoke both complete successfully.
- `npm run agents:check`, `npm run test:agents`, `npm run verify`, and
  `npm run ci:portable` pass locally.

Main gate accepted the role boundary and merged the implementation in PR #79.
The downstream QA pass used these canonical roles through audit, triage, ten
bounded fix PRs, and freeze without reopening their semantics. The v1.2.2
merged-state acceptance recorded `7/7` canonical role/adapter correspondence
with `agents:check`, `ci:portable`, and `verify` passing.
