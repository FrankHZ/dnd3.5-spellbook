# Data Tools Workspace

This workspace owns data preparation, inspection, parser, and future rules DB
patch tooling.

It is separate from the `server` workspace so API runtime code stays focused on
serving requests.

## Commands

Inspect the local rules DB:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools inspect:rules -- spell fireball
npm run -w data-tools inspect:rules -- schema dnd_spell
```

Run the Chinese CHM parser workflow:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
```

## Data Paths

These tools read local-only source data from `data-tools/data/` and write
generated reports or parser output under `data-tools/out/`.

Current CHM parser defaults:

- raw CHM HTML: `data-tools/data/chm-raw/`
- cleaned CHM HTML: `data-tools/data/chm-clean/`
- parser test input: `data-tools/data/chm-test/`
- CHM mapping and alias JSON: `data-tools/data/chm-mapping/`
- parser output: `data-tools/out/zh-parser/`

CHM preprocess and parse commands scan nested directories and preserve relative
paths in cleaned output and parser source keys. Word/CHM companion directories
ending in `.files` are skipped.

If a nested source file does not include an explicit book label in its spell
headers, the parser may infer one from the top-level source directory when that
directory is mapped to a known rulebook. For example, `九剑/` is treated as the
CHM label for `Tome of Battle` (`ToB`).

The rules DB path comes from `RULES_DATABASE_URL`; see `server/.env` and
`docs/data-setup.md`.

## Safety

- `inspect:rules` opens the SQLite database in read-only mode.
- Parser commands may write generated output under `data-tools/out/zh-parser/`.
- Future rules DB patch commands must clearly distinguish dry-run validation
  from write-capable imports.
