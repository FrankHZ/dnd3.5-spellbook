# Documentation

Choose the relevant topic for the task; this is a lookup index, not a required
reading sequence. [GitHub issues](https://github.com/FrankHZ/dnd3.5-spellbook/issues)
own future scope, acceptance, dependencies and pending decisions. PRs/checks
record implementation evidence, and Git records checked-out state and history.
These documents describe durable current behavior and operating constraints.

## Product And Implementation

- [Features](features.md): current user-facing behavior and entry points.
- [Feature workflow](feature-workflow.md): issue, task and PR delivery.
- [Frontend map](frontend-map.md): routes and feature code.
- [Design](design.md): UI principles and inventory.
- [i18n](i18n.md): locale editing and content-language boundaries.
- [Harness](harness.md): choose validation for the affected behavior.
- Module boundaries, when needed: [server](modules/server.md),
  [web](modules/web.md), [contracts](modules/contracts.md),
  [data-tools](modules/data-tools.md), [delivery](modules/delivery.md).

## Setup And Operations

- Workspace setup: [server](../server/README.md), [web](../web/README.md),
  [contracts](../contracts/README.md), [data-tools](../data-tools/README.md).
- [Data setup](operations/data-setup.md): local DB roles and fixtures.
- [DB content workflow](operations/db-content-workflow.md): accepted data,
  content artifact and operator handoff boundaries.
- [Import workflow](operations/import-workflow.md): implemented import order.
- [Rules DB notes](operations/rules-db-notes.md): patch and source semantics.
- [Deployment](operations/deployment.md), [remote bootstrap](operations/bootstrap-remote.md)
  and [tracked deployment scripts](deployment-scripts/).
- [Public repository boundaries](operations/public-repo-notes.md) and
  [source credits](credits/).

## Task-Specific References

The [v1.4 content acceptance snapshot](releases/v1.4/ACCEPTANCE.md) records the
delivered SC HTML and database scope, production evidence, and known exclusions.
It does not certify complete corpus QA. Published tags and release notes live in
[GitHub Releases](https://github.com/FrankHZ/dnd3.5-spellbook/releases).

The [private review console](../review-console/README.md) and its
[module boundary](modules/review-console.md) concern the suspended PHB workflow.
Its [resumption safeguards](releases/v1.4/phb-source-and-errata-plan.md#paused-workflow-execution-safeguards)
remain applicable to an explicitly authorized resumption; they are not a dice
intake or normal startup prerequisite.

Existing files under `releases/` and `mvp/` are historical plans and acceptance
evidence, not current work queues or automatic authority over current topic
docs. Do not update frozen history to track later work. Keep commands and
technical contracts in their owning topic; do not copy issue status into docs.
