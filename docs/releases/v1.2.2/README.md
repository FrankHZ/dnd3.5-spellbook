# v1.2.2 Release Plan

Status: in progress. v1.2.1 is frozen, Agent Workflow Hardening was accepted
and merged in PR #79, and Code And Test QA is in main-gate triage.

v1.2.2 is an internal quality-maintenance release. It adds no user-facing
feature scope. The release first hardens the repository's agent workflow, then
uses that workflow for a structured code and test QA pass.

## Release Boundary

v1.2.2 owns two strictly ordered acceptance tracks:

1. **Agent Workflow Hardening**

   Establish stable role contracts under `.agents/roles/`, add thin
   project-scoped Codex adapters, keep `AGENTS.md` compact, and add a
   lightweight `agents:check` correspondence check.

2. **Code And Test QA**

   Use the accepted role system for parallel read-only audits, main-gate
   finding triage, and bounded domain fix PRs with failure-focused regression
   evidence.

The second track is the first formal acceptance exercise for the role system.
It must not begin until the first track is reviewed and merged.

Current position: the freeze prerequisite and workflow tracks are complete.
Five read-only role audits finished from one shared base; their temporary raw
handoffs are preserved while the main gate de-duplicates findings and assigns
their dispositions before opening bounded fix PRs.

## Track Order

1. **Freeze prerequisite**

   Merge the v1.2.1 freeze after production backend, content DB, FTS, and
   frontend acceptance is complete.

2. **Agent Workflow Hardening**

   Follow
   [agent-workflow-hardening-plan.md](./agent-workflow-hardening-plan.md).
   Main gate approves role semantics; librarian owns the compact canonical
   contracts and navigation; platform owns adapter/schema checks and the
   lightweight correspondence command.

3. **Workflow acceptance**

   Confirm the canonical role set, adapter mapping, context-packet rule,
   handoff format, and `agents:check` before dispatching QA agents.

4. **Code And Test QA**

   Follow [code-and-test-qa-plan.md](./code-and-test-qa-plan.md). Run bounded
   read-only audits in parallel, let main gate de-duplicate and disposition
   findings, then open focused fix PRs by owning domain.

5. **Acceptance and freeze**

   Resolve all P0/P1 findings, explicitly fix or defer every P2, park P3 and
   broad refactors, run the release gates, smoke critical local pages, and
   freeze the as-built maintenance release.

## Documentation Shape

The durable release plan intentionally uses only:

- [README.md](./README.md): boundary, sequence, and release acceptance
- [agent-workflow-hardening-plan.md](./agent-workflow-hardening-plan.md): role
  contracts, adapters, and workflow validation
- [code-and-test-qa-plan.md](./code-and-test-qa-plan.md): audit, triage, fixes,
  and regression acceptance

The two passes have a simple hard dependency, so v1.2.2 does not need an
`integrated-plan.md`. Ordinary implementation branches update only their owning
child plan and affected durable topic/operations docs.

During active QA triage, `qa-findings/` is a temporary working evidence pack,
not a fourth plan or permanent ledger. Collapse accepted outcomes into the QA
plan Completion Notes and remove the pack before freeze.

## Non-Goals

- Do not add user-facing features.
- Do not start the v1.3 sitewide UX/style redesign.
- Do not start full spell translation or corpus QA.
- Do not import new spell or publication data.
- Do not perform an open-ended architecture rewrite or dependency migration.
- Do not set a repository-wide test coverage percentage target.
- Do not turn role profiles into duplicated project documentation or
  version-specific implementation prompts.
- Do not add an integrated plan or a permanent findings ledger.

## Release Acceptance

v1.2.2 release acceptance requires:

- v1.2.1 is frozen before v1.2.2 implementation starts.
- `.agents/roles/` is the only source of role semantics.
- Every canonical role remains stable and routes to existing docs entry points
  plus the task-specific context packet; role files do not copy active version
  status, module inventories, or command catalogs.
- Codex adapters stay thin and map one-to-one to the canonical role names.
- `AGENTS.md` contains only the compact role table and shared orchestration
  rules needed by every agent.
- Every delegated agent receives one role plus a concrete context packet; role
  profiles do not replace release or feature plans.
- Recursive agent fan-out is disabled by default unless the context packet
  explicitly authorizes a bounded delegation.
- `npm run agents:check` verifies canonical role/adapter correspondence without
  pretending to validate the complete Codex schema.
- QA begins with read-only audits and main-gate triage before any fix branch.
- All P0/P1 findings are resolved; every P2 is fixed or deferred with a
  specific rationale; P3 and broad refactors are parked outside the release.
- Regression tests demonstrate accepted failure modes rather than increasing
  test counts for their own sake.
- `npm run ci:portable`, `npm run verify`, web build, i18n check, server runtime
  check, `agents:check`, and critical-page local smoke all pass at freeze.

## Handoff Rule

Use the two child plans as the only v1.2.2 implementation plans. Keep role
semantics in `.agents/roles/`, current project truth in existing canonical docs,
and task-specific scope in the context packet. Update `docs/roadmap.md` only
when active ordering or release status changes.
