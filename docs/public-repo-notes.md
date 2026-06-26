# Public Repo Notes

This document records what is intentionally excluded or left unresolved in the public repository baseline.

## Local-Only Data

Data-bearing local artifact directories are intentionally local-only.

They are not part of the public repository baseline and may contain:

- `server/data/db/`: processed rules-side and app SQLite databases
- `server/data/i18n/`: app-owned entity translation JSON inputs
- `data/`: nested local data repo containing upstream raw inputs, CHM-derived
  HTML, parser mappings, raw text inputs, and rules patch inputs
- `data-tools/out/`: generated parser reports and intermediate artifacts

Public consumers of the repository should expect to provide or recreate those files themselves.

## Data-Bearing Content

The public repository is intended to be code-first.

Data-bearing content with elevated redistribution risk is intentionally excluded where possible, especially imported or derived game content and translation artifacts.
Rules patch files with source text are also excluded from the parent repo by
default; the parent repo should contain tooling, schemas, reports, docs, and
redacted/minimal fixtures instead.

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

