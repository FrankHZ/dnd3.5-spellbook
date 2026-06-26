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

Prepare the local rules DB:

```bash
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:sql:apply -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Validate and apply structured missing-spell patches:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

Inspect and generate structured patches from local `spells-full` data:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses --write-patch spells/spells-full-known-misses.jsonl
```

Run the Chinese CHM parser workflow:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
```

## Data Paths

These tools read local-only source data from `data/` and write
generated reports or parser output under `data-tools/out/`.

Current CHM parser defaults:

- raw CHM HTML: `data/chm-raw/`
- cleaned CHM HTML: `data/chm-clean/`
- parser test input: `data/chm-test/`
- CHM mapping and alias JSON: `data/chm-mapping/`
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

Rules DB patch SQL files live under `data/rules-patches/`. The SQL
runner rejects paths outside that directory. Use `rules:sql:dry-run` before
`rules:sql:apply`; dry-run copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Structured spell patch JSONL files also live under
`data/rules-patches/`, normally in `spells/`. The first supported
operation is `insertSpell`, which inserts the base spell row plus descriptors
and class/domain levels, then rebuilds derived spell indexes. Validation opens
the configured rules DB read-only; dry-run applies to a temporary copy.

The optional `spells-full` source dump lives under
`data/spells-full/` when present locally. It is ignored by the parent repo and
may be versioned in the nested local `data/` repo. Use `spells-full:inspect`
and `spells-full:generate` to create reviewable structured patch candidates
from it.

## Safety

- `inspect:rules` opens the SQLite database in read-only mode.
- `rules:spells:validate` opens the SQLite database in read-only mode and
  writes a JSON report under `data-tools/out/rules-patches/`.
- `rules:spells:apply -- --dry-run` applies to a temporary database copy.
- `rules:spells:apply` is write-capable and prints the target DB path before
  mutating it.
- `spells-full:*` reads local source data and writes reports or patch
  candidates; it does not mutate SQLite databases.
- `rules:sql:dry-run` never mutates the configured rules DB.
- `rules:sql:apply` and `rules:index:rebuild` are write-capable and must be run
  intentionally.
- Parser commands may write generated output under `data-tools/out/zh-parser/`.
- Future rules DB patch commands must clearly distinguish dry-run validation
  from write-capable imports.

