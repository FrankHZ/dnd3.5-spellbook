# Note: commit-message

This is the original generated note kept for reference.

Goal:
Generate a Git commit message in a fixed format for this repo.

Output rules (MUST):

- Output ONLY the final commit message text (no markdown, no explanations).
- Use English.
- First line: `[<version>]<type>(<scope>): <summary>`
- Summary: imperative mood, <= 72 chars, no trailing period.
- Blank line after the first line.
- Body uses bullet points starting with "- ".
- Include exactly one "Refs:" line at the end (even if empty).

Allowed types:

- feat, fix, refactor, perf, docs, test, chore, build, ci

Allowed scopes (choose ONE):

- web, server, contracts, db, infra, scripts, i18n, deps

Template:

```
[<version>]<type>(<scope>): <summary>

- <bullet 1>
- <bullet 2>

Refs: <ticket-or-doc-or-empty>
```
