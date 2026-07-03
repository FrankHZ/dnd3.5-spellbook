---
name: branch-naming
description: Choose and validate Git branch names for this repository. Use when creating, renaming, reviewing, or asking a specialist/subagent to work on a branch in dnd3.5-spellbook, especially for planning branches, feature branches, docs branches, cleanup branches, and merge-prep handoffs.
---

# Branch Naming

Use this skill to keep local and pushed branches predictable enough for the main
agent to review, merge, and clean up later.

## Default Format

Use:

```text
codex/<area>-<topic>
```

Examples:

```text
codex/design-refresh
codex/i18n-semantic-keys
codex/data-short-desc-plan
codex/docs-structure-cleanup
codex/web-search-scope
codex/infra-deploy-scripts
```

Rules:

- Always use the `codex/` prefix for Codex-created branches unless the user
  explicitly asks for another prefix.
- Use lowercase ASCII letters, digits, and hyphens after the prefix.
- Keep the slug short: usually two to five words.
- Prefer a durable topic name over an agent name, timestamp, or implementation
  detail.
- Do not include spaces, underscores, uppercase letters, issue-freeform notes,
  or punctuation.

## Area Words

Prefer one of these first slug segments:

- `web`
- `server`
- `contracts`
- `data`
- `data-tools`
- `db`
- `i18n`
- `design`
- `infra`
- `deps`
- `harness`
- `docs`

Use the most specific useful area:

- `i18n-semantic-keys`, not `web-i18n-semantic-keys`, when the branch primarily
  owns translation workflow.
- `design-refresh`, not `web-design-refresh`, when the branch primarily owns
  design direction and docs.
- `web-search-scope`, not `search-fix`, when the branch primarily changes a
  frontend feature.

## Planning And Specialist Branches

Use topic branches for librarian and specialist agents:

```text
codex/docs-version-plan
codex/docs-structure-cleanup
codex/i18n-semantic-keys
codex/design-refresh
codex/data-short-desc
codex/harness-browser-smoke
```

Specialist branches should stay focused on one domain. If a branch starts to mix
unrelated work, split it before review instead of broadening the name.

## Small Implementation Branches

For small subagent slices, add the feature or component after the area:

```text
codex/web-prepared-empty-state
codex/web-topbar-mobile-fit
codex/db-spells-full-misses
```

Avoid vague names such as:

```text
codex/fix
codex/update
codex/docs
codex/misc-cleanup
```

## Branch Lifecycle

Before creating a branch:

1. Check `git status --short --branch`.
2. Start from the latest local `main` unless the user gives a different base.
3. Reuse an existing branch only when it clearly owns the same topic.

Before handing a branch to the main agent for review:

1. Rebase or merge the latest `main` if the branch may be stale.
2. Keep the worktree clean or clearly explain any intentional uncommitted files.
3. Provide the branch name, summary, and validation commands run.

Do not rename or delete user-created branches unless the user asks.
