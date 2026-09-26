---
name: commit-message
description: Generate the repository's fixed-format Git commit message from the intended changes.
---

# Commit Message

Inspect the staged diff, or the requested change set if nothing is staged.
Use the version from the user's context, owning issue, or its explicitly linked
release scope; do not ask the user to repeat an already resolved version or
traverse unrelated historical plans. If none resolves the version, identify
that missing value rather than inventing it. Versions start with `v`.

Write in English. Choose one type and one scope matching the dominant intent:

- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`.
- Scopes: `web`, `server`, `contracts`, `db`, `infra`, `scripts`, `i18n`, `deps`.

Use an imperative summary of at most 72 characters, without a trailing period;
include one to three bullets and exactly one final `Refs:` line. Prefer the
owning issue reference; include a technical doc only when useful. No plan doc
is required. Leave `Refs:` empty if there is no reference.

When asked for a message, return only this shape:

```text
[<version>]<type>(<scope>): <summary>

- <most important change or effect>

Refs: <issue-or-doc-or-empty>
```
