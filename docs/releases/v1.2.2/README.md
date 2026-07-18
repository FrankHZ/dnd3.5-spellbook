# v1.2.2 Release Record

Status: **frozen and accepted**. v1.2.2 is an internal quality-maintenance
release with no user-facing feature scope. The canonical as-built snapshot is
[FREEZE.md](./FREEZE.md).

The release hardened the repository's agent workflow, then used that workflow
for a structured code and test QA pass. Agent Workflow Hardening merged in PR
#79, the read-only findings pack merged in PR #80, main-gate triage merged in
PR #81, and all ten bounded fix batches merged in PRs #82 through #91.

## Release Boundary

v1.2.2 accepted two strictly ordered tracks:

1. **Agent Workflow Hardening**

   Seven canonical role contracts under `.agents/roles/`, seven thin
   project-scoped Codex adapters, concrete context-packet and handoff rules,
   and the maintained `agents:check` correspondence check.

2. **Code And Test QA**

   Five role-based read-only audits, centralized main-gate triage, and ten
   dependency-ordered fix PRs covering accepted backend/DB, data-pipeline,
   frontend/i18n, and platform failure modes.

The second track was the first formal acceptance exercise for the role system.
No audit agent edited files, no role expanded release scope, and no role merged
its own PR.

## Accepted Sequence

1. v1.2.1 froze before v1.2.2 implementation began.
2. [Agent Workflow Hardening](./agent-workflow-hardening-plan.md) established
   and validated the canonical roles, adapters, and orchestration rules.
3. Five role audits ran read-only from one shared base.
4. Main gate de-duplicated and dispositioned every finding before fixes.
5. [Code And Test QA](./code-and-test-qa-plan.md) completed ten bounded fix
   batches and the merged-state release acceptance matrix.
6. This freeze sweep preserved the one durable deferred candidate in
   `docs/stable-backlog.md` and removed the temporary findings pack.

## Documentation Shape

The durable v1.2.2 record is intentionally limited to:

- [FREEZE.md](./FREEZE.md): canonical as-built release snapshot and acceptance
  evidence
- [README.md](./README.md): release boundary, accepted sequence, and document
  map
- [agent-workflow-hardening-plan.md](./agent-workflow-hardening-plan.md):
  accepted role, adapter, and correspondence-check record
- [code-and-test-qa-plan.md](./code-and-test-qa-plan.md): accepted audit,
  disposition, fix, and regression record

The two tracks had a simple hard dependency, so v1.2.2 has no
`integrated-plan.md`. The temporary QA evidence pack was not retained as a
permanent ledger.

## Final Disposition

The QA pass triaged 27 findings:

- P0: 0
- P1: 11 fixed
- P2: 14 fixed and one deferred
- Closed: one unsupported hypothetical path

The only durable deferred finding is `DP-AUD-007`, parked in
`docs/stable-backlog.md` for the next reactivation of the dormant local CHM
preprocessing workflow. No P0 or P1 remains open.

## Non-Goals Preserved

- No user-facing features were added.
- The v1.3 sitewide UX/style redesign did not start.
- Full spell translation and corpus QA did not start.
- No new spell or publication data was imported.
- No open-ended architecture rewrite, dependency migration, coverage target,
  integrated plan, or permanent findings ledger was added.
- Production deployment was explicitly outside this internal maintenance
  freeze.

## Handoff

Use [FREEZE.md](./FREEZE.md) as the authority for v1.2.2 as-built state and
`docs/roadmap.md` for next-work ordering. v1.3 planning is next, but no v1.3
plan is created by this freeze.
