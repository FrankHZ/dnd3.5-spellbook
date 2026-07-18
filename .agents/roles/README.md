# Agent Roles

This directory is the canonical source for stable agent role semantics in this
repository. Project-scoped Codex files under `.codex/agents/` are thin adapters
and must point back here.

Roles describe durable responsibility and handoff boundaries. They do not
replace `AGENTS.md`, a feature or release plan, or a task-specific context
packet. Current project truth remains in the existing documentation linked by
each role.

## Role Index

| Role                                      | Use for                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| [main-gate](./main-gate.md)               | direction, cross-domain decisions, triage, and merge readiness          |
| [librarian](./librarian.md)               | plans, navigation, roadmap coherence, and freeze sweeps                 |
| [data-pipeline](./data-pipeline.md)       | source, patch, import, fixture, and corpus workflows                    |
| [backend-db](./backend-db.md)             | contracts, API behavior, Prisma, and runtime DB boundaries              |
| [i18n-translation](./i18n-translation.md) | locale conventions, translation workflow, and localized semantics       |
| [frontend-design](./frontend-design.md)   | frontend state, interaction, components, layout, and browser acceptance |
| [platform](./platform.md)                 | CI, builds, packaging, dependencies, deployment, and environments       |

## Shared Rules

Every delegated task names exactly one primary role and supplies a context
packet containing:

- intended outcome
- owning plan or durable topic document
- task-specific required reading
- expected edit surface
- explicit non-goals
- validation and acceptance evidence
- handoff owner
- whether bounded child delegation is allowed

Read `AGENTS.md`, the selected role contract, and the supplied context packet
before acting. The context packet controls task scope when the role could cover
more work.

No role may expand release scope or merge its own PR. Recursive agent fan-out
is disabled unless the context packet explicitly authorizes one bounded child
delegation. Return a concise handoff with changed surfaces, validation evidence,
unresolved questions, and follow-up candidates.
