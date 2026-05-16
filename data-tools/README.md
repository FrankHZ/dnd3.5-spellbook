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

These tools currently read and write local-only data under `server/data/` and
`server/out/`.

The rules DB path comes from `RULES_DATABASE_URL`; see `server/.env` and
`docs/data-setup.md`.

## Safety

- `inspect:rules` opens the SQLite database in read-only mode.
- Parser commands may write generated output under `server/out/zh-parser/`.
- Future rules DB patch commands must clearly distinguish dry-run validation
  from write-capable imports.
