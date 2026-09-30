# Feature Workflow

## Issue → Task → PR

1. The coordinating task opens a GitHub issue for a concrete feature. State the
   outcome, scope/non-goals, acceptance, dependencies, and unresolved decisions.
   Link relevant technical docs rather than maintaining a second plan in Markdown.
2. Create one independent task linked to the issue, with the workspace/base,
   write boundaries, and coordinating task's report destination. Include the
   model/effort recommendation and reason using
   [model selection](../AGENTS.md#model-and-reasoning-selection), distinguishing
   it from the actual launch settings. The issue owns scope; the task owns
   execution. Small fixes within that scope stay in the task.
3. Read the affected code/tests and only the technical references needed. Reuse
   existing mechanisms, implement the authorized scope, and run targeted checks.
   Optional bounded delegation supplies an outcome, write boundary, and required
   evidence; the task owner remains responsible for integration.
4. Commit, push the feature branch, and open a PR linked to the issue. Describe
   the final behavior, relevant checks/results, and remaining risks. Update topic
   docs only for changed durable behavior, commands, or safety boundaries.
5. Send the issue/PR URLs and evidence to the coordinating task (main-gate).
   Main-gate reviews the actual diff, issue criteria, CI, and material technical
   boundaries, returns findings to the task, and re-reviews fixes. It reports
   acceptance and coordinates authorized remote merge/issue closeout. The
   implementing task must not merge its own PR or self-accept its issue.

An explicitly analysis-only task may deliver findings without a PR. Otherwise,
a preparation note or local implementation is not the final deliverable. Report
a genuine blocker with its evidence and needed decision instead of stopping
silently. Routine implementation choices do not require additional approval.

## Task Size And Slices

Before dispatch, size work by the amount of implementation and evidence that
main-gate can review independently. If one issue would combine substantial tool
changes, many content reviews and final integration before any result can be
accepted, use a parent issue with independently deliverable child issues.

- The parent owns the overall outcome, complete coverage, dependencies and
  unresolved decisions. Each child owns a bounded outcome, acceptance criteria,
  one independent task and a linked PR. Keep small fixes in their owning slice.
- When tooling or evidence and handoff contracts are unproven, first complete a
  representative small slice through review and acceptance. Resolve demonstrated
  shared tooling gaps in a prerequisite PR before scaling the dependent batches.
  A plan or extraction-only result does not establish an accepted handoff.
- Size content batches by text length, dependencies and review effort. Around
  30–60 complete spells is a starting point, not a quota; use fewer for long or
  ambiguous entries. Keep each spell's English, mechanics and Chinese together.
  Assign exact entry boundaries and shared-file ownership before parallel work.
- Each slice records its base, accepted dependencies and exact evidence revision.
  Refresh affected evidence when a dependency changes. Internal subagent reading
  assignments may help a slice, but do not replace its independent PR and review
  or justify postponing all acceptance until the full batch is finished.
- Final parent acceptance reuses accepted slice evidence and checks for missing
  or overlapping entries, baseline conflicts, integration failures and unresolved
  source decisions. Full coverage requires every entry to have a disposition;
  a tracked unresolved item is not a quality pass. Keep progress and residual
  ownership in GitHub issues, without a parallel repository status ledger.

## Scope Decisions

Resolve unclear product semantics, new authority/fallback behavior, or production
activation before the affected work. Record the decision in the issue and keep
independent authorized work moving. No mandatory temporary plan, separate plan
commit, fixed agent role, or model profile is required.

Keep blockers and dependencies in the issue. Record out-of-scope follow-ups in
GitHub; create a separate issue when there is a concrete feature to pursue.
Do not maintain duplicate roadmap, backlog, or task-progress Markdown files.
Historical release snapshots do not automatically define current scope.

## Architecture Correspondence

For changes involving an authoritative source, module, schema, ordering rule,
or fallback, identify the material boundary in the issue/PR:

- the authoritative input/component and its derived consumers;
- permitted fallback/repair behavior and forbidden substitutions;
- changes that would require a scope decision.

During review, compare the actual imports, calls, manifests, and runtime wiring
with the accepted issue and relevant technical docs, including their state
before the branch changed them. Output parity and passing tests alone cannot
prove that authority was preserved. Use focused failure evidence when material:
missing authority fails, stale evidence is rejected, or forbidden fallback is
unreachable. Documentation edited in the implementation PR cannot retroactively
authorize a different source of truth or weaker safety boundary.

## Verification

Choose checks by changed behavior: docs need link/command/diff checks; copy needs
i18n sync/check; frontend behavior needs relevant tests/build and browser smoke;
shared DTOs need contracts built before consumers; data changes need the affected
harness. Local corpus checks are conditional and do not grant DB write permission.
See [harness.md](./harness.md) for the relevant test boundary. Full remote CI
remains the merge gate; no full local suite is required for editorial changes.
