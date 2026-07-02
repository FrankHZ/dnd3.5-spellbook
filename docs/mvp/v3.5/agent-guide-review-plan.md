# Agent Guide Review Plan

Status: implemented as a compact execution-guide pass; future edits should keep
`AGENTS.md` from growing back into a full documentation map.

## Problem

`AGENTS.md` has gradually become a second documentation map. That helped early
repo orientation, but it now duplicates `docs/README.md`, `docs/roadmap.md`,
focused MVP plans, and sometimes feature/workspace docs. The result is
predictable drift: every new plan wants another line in `AGENTS.md`, and the
actual operational rules are harder to see.

There is a related docs-boundary problem. `docs/features.md` is a good
user-facing feature map, `docs/frontend-map.md` is a compact navigation aid, and
feature plans are useful for scoped work. High-level module design docs would be
useful later, but ordinary feature branches should not have to maintain broad
architecture docs by hand for every change.

There is also a recurring local-skill routing mistake: agents sometimes try to
read a global/user skill path first, then correct themselves to the repo-local
`.agents/skills/...` copy. That should be a crisp repo rule, not a repeated
conversation tax.

## Goals

- Make `AGENTS.md` a compact execution guide, not a full docs index.
- Keep canonical navigation in `docs/README.md` and active work ordering in
  `docs/roadmap.md`.
- Preserve high-value operational rules that prevent repo damage:
  - dirty worktree handling
  - local data and DB cautions
  - validation commands
  - data-tools boundaries
  - repo-local skill resolution
- Reduce duplicate lists that must be updated whenever a new plan doc appears.
- Make worktree-specific behavior explicit enough that agents do not patch the
  wrong checkout.
- Clarify which docs own feature behavior, feature workflow, frontend
  navigation, and future module design notes.
- Pair this review with the v3.5 CI/CD and module-doc automation plan so
  high-level module docs can be refreshed after accepted `main` merges.

## Non-Goals

- Do not remove `AGENTS.md`; it remains the agent-facing entry point.
- Do not move human-facing project overview into `AGENTS.md`.
- Do not duplicate universal Windows shell hygiene here; keep cross-repo habits
  in user-level/global guidance unless this repo needs a special exception.
- Do not make old MVP folders active work surfaces again.
- Do not require ordinary feature branches to update broad module design docs
  once merge-to-main module-doc automation exists.

## Proposed Shape

`AGENTS.md` should keep these sections:

- **Project Shape**: one short workspace list.
- **Start Here**: point to `docs/README.md`, `docs/roadmap.md`, and
  `docs/features.md`; avoid enumerating every active plan.
- **Repo-Local Skills**: explicitly resolve repo skills from the current
  worktree's `.agents/skills/` directory.
- **Working Rules**: small set of durable safety rules.
- **Feature Change Workflow**: plan-first and validation loop.
- **Data And Environment**: DB/local-data warnings.
- **Validation Commands**: current command spine.
- **Data Tooling Notes**: only rules that materially prevent data corruption or
  source-of-truth drift.
- **Documentation Notes**: where durable docs belong.

Move or keep elsewhere:

- detailed docs maps -> `docs/README.md`
- current sequence -> `docs/roadmap.md`
- user-facing behavior -> `docs/features.md`
- feature intake loop -> `docs/feature-workflow.md`
- frontend navigation map -> `docs/frontend-map.md`
- high-level module design -> future `docs/modules/*` docs refreshed by the
  merge-to-main doc automation
- implementation detail -> focused topic docs
- broad Windows shell habits -> user/global AGENTS guidance
- branch/commit formatting details -> repo-local skills

## Repo-Local Skill Rule

Add this rule directly to `AGENTS.md` before or inside Working Rules:

```text
Repo-local skills live under `.agents/skills/` in the current worktree. When
using repo skills such as `branch-naming` or `commit-message`, read
`.agents/skills/<skill>/SKILL.md` relative to the active worktree root. Do not
guess a user-level `.agents` path first.
```

This specifically prevents the repeated mistake where the agent tries a path
such as `C:\Users\...\ .agents\skills\commit-message\SKILL.md` before using the
repo copy.

## Worktree Rule

Add a concise rule for multi-worktree edits:

```text
When editing from a sibling worktree, use absolute paths with patch tools or
otherwise prove the edit target is inside the intended worktree before applying
changes.
```

The intent is not ceremony. It prevents a planning branch from accidentally
modifying an active implementation worktree.

## Acceptance Criteria

- `AGENTS.md` is shorter and reads as an execution guide rather than a catalog.
- `docs/README.md` remains the canonical documentation map.
- `docs/roadmap.md` remains the canonical current/future work ordering surface.
- `docs/features.md` remains the canonical user-facing feature map instead of
  turning into an architecture document.
- `docs/feature-workflow.md` explains when feature branches update focused docs
  and when broad module docs are handled after merge.
- `docs/frontend-map.md` remains a quick navigation map, not a full architecture
  document.
- Future module design docs are scoped to `docs/modules/*` and can be refreshed
  by the v3.5 merge-to-main doc automation.
- Repo-local skill resolution is explicit and examples include `branch-naming`
  and `commit-message`.
- Multi-worktree edit targeting is explicit.
- Future plan docs do not require expanding a long numbered list in `AGENTS.md`
  unless they introduce a new durable operational hazard.
