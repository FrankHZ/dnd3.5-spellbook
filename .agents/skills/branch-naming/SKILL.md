---
name: branch-naming
description: Choose and validate topic branch names for this repository.
---

# Branch Naming

Use `codex/<area>-<topic>` unless the user explicitly requests another prefix.
Use lowercase ASCII letters, digits, and hyphens; keep the slug short and tied
to the issue's durable topic, not an agent name, timestamp, or vague cleanup.
Examples: `codex/web-search-scope`, `codex/data-short-desc`,
`codex/docs-issue-task-workflow`.

Choose the most specific useful area, such as `web`, `server`, `contracts`,
`data`, `db`, `i18n`, `design`, `infra`, `deps`, `harness`, or `docs`.

Before branching, inspect `git status --short --branch` and the intended base.
Use current remote `main` unless the task specifies another base or an explicit
PR dependency. Reuse a branch only when it owns the same topic. Preserve other
work; do not rename/delete user-created branches without instruction.

Before PR handoff, resolve relevant base changes, report the branch/PR and checks,
and leave a clean worktree or explain intentional uncommitted files. Keep unrelated
work out of the branch rather than broadening its name.
