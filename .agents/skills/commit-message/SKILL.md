---
name: commit-message
description: Generate git commit messages for this repo in the required fixed format. Use when the user asks for a commit message, asks to summarize staged or pending changes into a commit, or needs help choosing the correct commit type and scope for this repository.
---

# Commit Message

Generate a commit message that matches the repository's required format.

Use the version provided by the user or already present in the conversation context. If no version is available, ask for it instead of inventing one.

Inspect the staged diff first when available. If nothing is staged, inspect the requested change set or the working diff that the user is referring to.

Derive the commit message in this order:

1. Identify the primary intent of the change.
2. Choose exactly one type from: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`.
3. Choose exactly one scope from: `web`, `server`, `contracts`, `db`, `infra`, `scripts`, `i18n`, `deps`.
4. Write a short imperative summary no longer than 72 characters and do not end it with a period.
5. Write one to three `- ` bullets describing the most important changes or effects.
6. End with exactly one `Refs:` line. It will usually be a plan doc and a deliverable doc. Leave it blank after the colon when no reference is available.

Prefer the type and scope that match the dominant user-facing effect of the change, not every file touched. If multiple scopes are involved, choose the one that best represents the main purpose.

Map common changes consistently:

- New behavior or new capability: `feat`
- Bug fix or regression fix: `fix`
- Internal restructuring without behavior change: `refactor`
- Performance improvement: `perf`
- Documentation-only change: `docs`
- Test-only change: `test`
- Maintenance, cleanup, or non-feature housekeeping: `chore`
- Build tooling or dependency packaging changes: `build`
- CI workflow or automation changes: `ci`

Use this exact output shape and return only the commit message text:

`[<version>]<type>(<scope>): <summary>`

`- <bullet 1>`
`- <bullet 2>`

`Refs: <ticket-or-doc-or-empty>`
