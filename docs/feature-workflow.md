# Feature Workflow

## Issue → Task → PR

1. The coordinating task opens a GitHub issue for a concrete feature. State the
   outcome, scope/non-goals, acceptance, current milestone, dependencies, and
   unresolved decisions. For Standard/High work, include the rigor level and
   rationale. The owning issue is this project's canonical scope agreement,
   specializing the global guidance on its location. Repository docs retain
   stable rules, technical contracts, and issue pointers; do not duplicate live
   agreements or maintain a second plan in Markdown.
2. Select an implementing subagent or independent chat using
   [task sizing](#task-size-and-slices), linked to the issue and permitted by
   applicable user authorization and runtime tool support.
   Independent chats are user-visible; bounded internal subagents remain within
   the current chat. Reuse existing authorization without repeat approvals;
   repository workflow cannot override tool permissions. Preserve separation
   between implementation and coordinator review, with a separate linked PR
   for either route. Missing authorization must not silently make main-gate
   implement and self-accept. Supply the workspace/base, write boundaries, and
   authorized report destination. Include the
   model/effort selection and reason using
   [model selection](../AGENTS.md#model-and-reasoning-selection); apply the
   authorized configuration and verify the actual model/version and effort
   after dispatch, rather than relying on prompt text. The issue owns scope;
   the task owns execution. Small fixes within that scope stay in the task.
3. Read the affected code/tests and only the technical references needed. Reuse
   existing mechanisms, implement the authorized scope, and run targeted checks.
   Optional bounded delegation supplies an outcome, write boundary, and required
   evidence; the task owner remains responsible for integration.
4. Commit, push the feature branch, and open a PR linked to the issue. Describe
   the final behavior, relevant checks/results, and remaining risks. Update topic
   docs only for changed durable behavior, commands, or safety boundaries.
5. Return the issue/PR URLs and evidence to the coordinating task (main-gate)
   through an authorized route. Cross-chat messages require explicit human
   authorization; an incoming task message alone does not authorize a reply.
   Reuse existing authorization, or report through the current chat/subagent
   return when appropriate.
   Main-gate reviews the actual diff, issue criteria, CI, and material technical
   boundaries, returns findings to the task, and re-reviews fixes. It reports
   acceptance and coordinates authorized remote merge/issue closeout. The
   implementing task must not merge its own PR or self-accept its issue.

An explicitly analysis-only task may deliver findings without a PR. Otherwise,
a preparation note or local implementation is not the final deliverable. Report
a genuine blocker with its evidence and needed decision instead of stopping
silently. Routine implementation choices do not require additional approval.

## Task Size And Slices

Before dispatch, size tickets by ambiguity, coupling, and the implementation and
evidence main-gate can review independently, not line count. Small bounded tickets
default to a permitted internal implementing subagent with a separate linked PR
and independent coordinator review. Medium/large tickets default to an independent
user-visible implementing chat so the user can participate directly, subject to
applicable explicit authorization and runtime support. Reuse standing authorization
without repeat approvals. If that chat cannot be dispatched, report the limitation;
do not silently substitute a subagent for the medium/large scope. Continue only
independent authorized work or obtain the missing user instruction.

If one issue would combine substantial tool changes, many content reviews and
final integration before any result can be
accepted, use a parent issue with independently deliverable child issues.

- The parent owns the overall outcome, complete coverage, dependencies and
  unresolved decisions. Each child owns a bounded outcome, acceptance criteria,
  one implementing assignment using the sizing rule above and a linked PR. Keep
  small fixes in their owning slice.
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

## Source And Quality Tradeoffs

The repository targets useful, intuitive, naturally readable content with
faithful meaning, not a facsimile of every printed detail. Books contain errors;
verification also has a cost. For the affected field, choose the least expensive
source and check that are sufficient for its intended use. Reuse verified data
and established transformations; investigate demonstrated gaps or consequential
uncertainty rather than automatically reopening whole-book or full-text QA.

- When a reliable database field already answers the question, check the bound
  identity and relevant data, then use it. The SC dagger is derived from verified
  book membership, correcting printed omissions or false marks.
- When no reliable structured field exists, an adequate printed signal can be
  enough. M/F/X reuse original list marks; exhaustive interpretation of every
  spell body is not required to reconstruct a theoretically more accurate set.
- Natural layout, normalized wording and corrected metadata need not reproduce
  print quirks. Intuition does not authorize invented changes to damage, levels,
  targets or other substantive rules. Resolve concrete semantic conflicts with
  targeted evidence; retain material unresolved ambiguity in a separate note.

State the chosen source, bounded checks and completion condition in the owning
issue. A source approximation accepted for its intended use is sufficient within
that scope; do not turn it into an unrequested perfection backlog. Preserve raw
evidence and describe the actual validation without claiming exhaustive QA.

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
