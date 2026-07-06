# Feature Workflow

This document defines the lightweight intake path for new feature work.

The goal is to help agents reuse the existing app shape, choose the right
harness layer, and avoid creating parallel code paths while implementing a
single request.

## Default Flow

1. Find the closest current feature in `docs/features.md`.
2. Copy `docs/templates/feature-plan.md` into `docs/tmp-feature-plan.md` if the
   change has more than one obvious edit and the scope is already clear.
3. Fill only the sections that reduce risk for the current task.
4. Implement against existing entry points and helpers.
5. Update the nearest tests or add the smallest useful harness.
6. Move useful non-blocking follow-up candidates into the owning durable feature
   or topic doc before deleting the temporary plan. Keep true blockers in the
   active checklist instead.
7. Delete `docs/tmp-feature-plan.md` before commit, unless the user asks to
   preserve it as a dated handoff note.
8. Update durable docs only for changed behavior, workflow, or project rules.

Small one-file fixes do not need a temporary plan. Use judgment.

## Plan-First Flow

Use a durable plan commit before implementation when the request is ambiguous,
structural, or workflow-changing.

Examples:

- the user is still clarifying feature semantics
- the change affects workspace boundaries
- the change affects agent workflow or documentation precedence
- data import behavior could create a new source of truth
- the implementation needs an agreed acceptance contract before code is safe

Place durable plans under the active development docs indicated by
`docs/roadmap.md`, then add them to `docs/README.md` when they become a
canonical planning surface.

The sequence is:

1. Write the concrete plan.
2. Commit the plan only.
3. Implement the deliverable in a follow-up commit.
4. Update durable docs if shipped behavior differs from the plan.

## Intake Rules

- State the user-visible outcome before choosing files.
- List reuse targets before adding new modules.
- Mark explicit non-goals when the request could balloon.
- Treat contract changes as cross-workspace work: update `contracts`, then
  validate `server` and `web`.
- Treat UI copy changes as i18n work and follow `docs/i18n.md`.
- Treat data import, parser, rules DB inspection, and future rules DB patch
  work as data tooling. Follow
  `docs/mvp/v3.3/data-tools-workspace-plan.md` rather than adding new tooling
  under `server/src`.
- Keep feature behavior in `docs/features.md` or a focused feature plan.
  Reserve `docs/modules/` for durable module ownership, validation boundaries,
  and cross-module data flow.
- Keep specialist feature documentation narrow. A feature branch should usually
  read and update only `AGENTS.md`, the closest `docs/features.md` entry, the
  owning topic doc or focused plan when behavior/workflow changes, and nearby
  code/tests.
- Leave docs navigation, roadmap ordering, module-doc sweeps, integrated-plan
  reconciliation, acceptance evidence, and `FREEZE.md` updates to librarian or
  freeze-sweep branches unless the feature itself changes scope, ownership,
  sequencing, or release state.

## Temporary Plan Lifecycle

`docs/tmp-feature-plan.md` is intentionally ignored by git.

Use it as a working checklist during implementation. At the end of the task:

- delete it when it only contains execution notes
- move durable decisions into `docs/features.md`, `docs/harness.md`, or another
  focused doc
- move broad module-boundary changes into `docs/modules/` during acceptance
  review, not as routine churn for every feature branch
- archive it only when the user explicitly wants a retained handoff record

Temporary plans should never become the canonical description of shipped
behavior.
