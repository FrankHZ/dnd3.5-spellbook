# Public Repo Notes

This document records what is intentionally excluded or left unresolved in the public repository baseline.

## Local-Only Data

The `server/data/` tree is intentionally local-only.

It is not part of the public repository baseline and may contain:

- processed rules-side database inputs
- CHM-derived HTML artifacts
- translation JSON inputs
- local notes and SQL helpers

Public consumers of the repository should expect to provide or recreate those files themselves.

## Data-Bearing Content

The public repository is intended to be code-first.

Data-bearing content with elevated redistribution risk is intentionally excluded where possible, especially imported or derived game content and translation artifacts.

## License Status

The repository includes an MIT `LICENSE` for the code in this repo.

That license does not automatically apply to third-party game content, imported databases, translations, or other external source material.

## Project Status

The current public documentation baseline is still MVP-oriented:

- manual deployment
- local data preparation
- intentionally deferred stable-version hardening and rollback work

## Related Docs

- [README.md](../README.md)
- [data-setup.md](./data-setup.md)
- [repo-conventions.md](./repo-conventions.md)
- [stable-backlog.md](./stable-backlog.md)
