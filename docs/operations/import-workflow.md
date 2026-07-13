# Import Workflow

This document describes the current local data import workflow used to
populate local data artifacts and Chinese app-owned data.

It covers:

- preprocessing exported CHM HTML
- parsing spell content into matched records
- importing dictionary-style entity translations
- importing CHM-derived spell text into the content DB
- producing English rules-patch JSONL candidates from local `spells-full`
  source data
- producing reviewed English short-description handoff JSONL from local
  IMarvinTPA source-index data

For database creation and local DB roles, use [data-setup.md](./data-setup.md).

## Scope

This workflow is for the current local data pipeline.

At the moment:

- the content DB is normally rebuilt from scratch
- Prisma seed is not the active population path
- the active population path is the import scripts in the `server` workspace

## Main Scripts

The relevant workspace commands are:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
npm run -w data-tools zh:qa
npm run -w server db:content:import:zh-entities
npm run -w server db:content:import:zh-chm
npm run -w data-tools spells-full:inspect -- source-package
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/full-corpus-rulebooks.generated.jsonl
npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/full-corpus-rulebooks.generated.jsonl
npm run -w data-tools summaries:strict35-ready
```

DB/content maintainer apply commands for an accepted full-corpus handoff are:

```bash
npm run -w data-tools rules:manifest:verify
npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/full-corpus-rulebooks.generated.jsonl
npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/full-corpus-rulebooks.generated.jsonl
npm run -w data-tools rules:rulebooks:apply -- pending/rulebooks/full-corpus-rulebooks.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:apply -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:manifest:write
npm run -w data-tools rules:manifest:verify
npm run -w data-tools rules:content:audit
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:import -- --dry-run
npm run -w data-tools rules:content:import
npm run -w data-tools rules:content:parity
npm run -w data-tools rules:content:meta
```

After a structured spell JSONL patch is applied to the local locked rules DB,
move it from `data/rules-patches/pending/spells/` to
`data/rules-patches/applied/spells/` in the nested local `data/` repo before
rewriting the rules manifest. That keeps the manifest's verified patch set
aligned with the local `rules-clean.sqlite` baseline.

Rulebook additions use the same pending-to-applied convention under
`data/rules-patches/pending/rulebooks/` and
`data/rules-patches/applied/rulebooks/`. Apply reviewed `insertRulebook` rows
before regenerating full-corpus spell JSONL that references those new
abbreviations.

The `server` workspace keeps compatibility wrappers for the `tool:*` commands,
and transitional `db:app:*` aliases forward to the content DB import commands
where practical. New workflow docs should use the `db:content:*` names.

## Input And Output Locations

### Raw And Clean CHM HTML

- raw CHM-exported HTML input: `data/chm-raw/`
- cleaned intermediate HTML: `data/chm-clean/`
- smaller test input set: `data/chm-test/`

The CHM preprocess and parser commands scan nested directories and preserve
relative paths. Word/CHM companion directories ending in `.files` are skipped.
When spell headers omit explicit book labels, the parser may infer a label from
the mapped top-level source directory, such as `九剑/` for Tome of Battle.

### Mapping And Dictionary Inputs

- CHM book label mapping: `data/chm-mapping/books-zh-chm-mapping.json`
- extra alias support: `data/chm-mapping/enName-aliases-extra.json`
- global alias support: `data/chm-mapping/enName-aliases-global.json`
- entity translation JSON inputs:
  - `data/i18n/classes-zh.json`
  - `data/i18n/domains-zh.json`
  - `data/i18n/rulebooks-zh.json`
  - `data/i18n/descriptors-zh.json`
  - `data/i18n/schools-zh.json`
  - `data/i18n/subschools-zh.json`

### Parser Outputs

The parser writes into `data-tools/out/zh-parser/`:

- `matched.json`
- `unmatched.json`
- `candidates.json`
- `stats.json`
- `missing-zh.json` may also exist as a follow-up artifact from auxiliary checks
- `qa/summary.json` and `qa/issues.json` from mechanical CHM source QA

### English Spells-Full Source

- optional v6.01 source package: `data/spells-full/v6.01/`
- optional parsed source dump: `data/spells-full/spells-parsed.json`
- rebuildable inventory reports: `data-tools/out/spells-full/`
- reviewable structured patch JSONL: `data/rules-patches/pending/spells/`
- reviewed rulebook patch JSONL:
  `data/rules-patches/pending/rulebooks/` before apply and
  `data/rules-patches/applied/rulebooks/` after apply
- row-level rejected review JSONL:
  `data/spells-full/full-corpus-rejected.generated.jsonl`
- row-level ambiguous review JSONL:
  `data/spells-full/full-corpus-ambiguous.generated.jsonl`
- deferred source-label review JSONL:
  `data/spells-full/source-rulebooks.generated.jsonl`
- ambiguous source-label review JSONL:
  `data/spells-full/source-rulebooks-ambiguous.generated.jsonl`

The `spells-full` source dump is ignored by the parent repo and may be
maintained only in the nested local `data/` repo. The data-pipeline command
reads the configured rules DB read-only for matching and validation context.
It does not apply rules DB patches or rebuild content DB artifacts.
Confirmed non-import rows and unresolved row-level decisions are written as
review artifacts under `data/spells-full/`, not mixed into the ready patch.
Deferred source-label review rows classify unmapped sources such as
periodicals, web articles, licensed d20 settings, conversion material, and
parser artifacts. They are scope-review data, not rules DB patch operations.

For source/parse QA, run:

```bash
npm run -w data-tools spells-full:inspect -- source-package
```

This v1.2 review command reads `data/spells-full/v6.01/`, parses the package
source/name index from `Spells v6.01 - List.txt`, compares it with
`data/spells-full/spells-parsed.json`, and writes a report under
`data-tools/out/spells-full/`. It does not open SQLite, generate patch JSONL, or
parse the v6.01 full text into structured spell-body rows. The committed v1.2
review record is
`docs/releases/v1.2/full-spell-source-review-report.md`.

### English Short-Description Handoff

- reviewed strict-3.5 decision input:
  `data/short-desc-review/qa/en-strict35-missing.decisions.jsonl`
- ready ledger:
  `data/short-desc-review/qa/en-strict35-ready.generated.jsonl`
- reviewed normalized rows not yet merged into the import boundary:
  `data/short-desc-normalized/pending/en-strict35-ready.generated.jsonl`
- rebuildable command report:
  `data-tools/out/short-desc-qa/en-strict35-ready.summary.json`

`summaries:strict35-ready` reads the reviewed decisions, local IMarvinTPA source
index, current rules DB, and current normalized summary JSONL. It writes a
ledger for rows that are now consumable, marks rows already covered by
`summaries.generated.jsonl`, and writes only not-yet-covered normalized rows to
`short-desc-normalized/pending/`. The pending file uses the same row shape as
`summaries:import`, but it is not automatically imported; merge it into the
canonical normalized summary JSONL only after DB/content review.

## Recommended End-To-End Flow

For a normal full rebuild:

1. Ensure the rules DB exists and the content DB path is configured.
2. Run `npm install` from the repo root if needed.
3. Run `npm run -w server db:generate`.
4. Run `npm run -w server db:content:reset`.
5. Run `npm run -w data-tools zh:preprocess` if raw CHM HTML changed.
6. Run `npm run -w data-tools zh:parse`.
7. Run `npm run -w data-tools zh:qa`.
8. Inspect `data-tools/out/zh-parser/stats.json`, `matched.json`, and `unmatched.json`.
9. Run `npm run -w server db:content:import:zh-entities`.
10. Run `npm run -w server db:content:import:zh-chm`.

This order keeps the content DB aligned with the latest parser output and the latest entity translation JSON maintained in the nested data repo.

For English full-corpus candidate generation, run the `spells-full` inventory
and generation commands separately from the CHM content DB rebuild. That
workflow produces JSONL for DB/content maintainers to review; it is not itself
a content DB import.

For reviewed English strict-3.5 short-description rows, run
`summaries:strict35-ready` separately from both the CHM rebuild and the
spells-full rules patch workflow. It produces pending normalized summary rows
for DB/content maintainers to review before canonical import.

When the reviewed pending strict-3.5 rows are accepted, merge them into
`data/short-desc-normalized/summaries.generated.jsonl` in the nested local
`data/` repo, rerun `summaries:strict35-ready`, and expect the pending output
to drop to zero rows before running `summaries:import`.

## Step Details

### 1. Preprocess CHM HTML

Command:

```bash
npm run -w data-tools zh:preprocess
```

Current script behavior:

- input: `data/chm-raw/`
- output: `data/chm-clean/`

The preprocessing script:

- reads exported `.htm` files
- scans nested directories while skipping `.files` companion folders
- assumes GB2312 input by default
- removes CHM / Word-style wrapper noise
- strips heavy attributes
- writes stable UTF-8 cleaned HTML

Use this when the raw CHM-exported source files change.

### 2. Parse Cleaned CHM HTML

Command:

```bash
npm run -w data-tools zh:parse
```

Current script behavior:

- input: `data/chm-clean/`
- output: `data-tools/out/zh-parser/`

The parser:

- scans cleaned HTML files
- preserves relative source paths in parser output
- segments spell entries
- matches them against rules DB spell records by English name across books
- applies CHM book-label mapping
- sanitizes HTML descriptions
- writes `matched.json`, `unmatched.json`, `candidates.json`, and `stats.json`

For a smaller validation run, use:

```bash
npm run -w data-tools zh:parse:test
```

That uses the test input set under `data/chm-test/`.

### 3. Review Parser Artifacts

Before importing CHM spell text, inspect:

- `data-tools/out/zh-parser/stats.json` for match quality and parser counts
- `data-tools/out/zh-parser/unmatched.json` for unresolved entries
- `data-tools/out/zh-parser/candidates.json` for follow-up alias or mapping work
- `data-tools/out/zh-parser/qa/summary.json` for mechanical source/header drift

The normal import path expects `data-tools/out/zh-parser/matched.json` to be the source of truth for CHM-derived spell records.
`zh:qa` is a mechanical gate and report; long `<b>` text is informational and
is intended to catch copied formatting inside body text, not to block imports by
itself.

### 4. Import Entity Translation JSON

Command:

```bash
npm run -w server db:content:import:zh-entities
```

Current script behavior:

- reads JSON files from `data/i18n/`, or from `ZH_ENTITY_I18N_DIR` when set
- validates ids against the rules DB
- warns about:
  - ids missing from the rules DB
  - rules DB coverage missing from the zh JSON
  - stale English-name mismatches
- wipes and recreates rows for `lang=zh` and `variant=default` for each imported entity table

Imported tables include:

- character classes
- domains
- rulebooks
- spell schools
- spell subschools
- descriptors

### 5. Import CHM-Derived Spell Text

Command:

```bash
npm run -w server db:content:import:zh-chm
```

Current script behavior:

- reads `data-tools/out/zh-parser/matched.json`
- converts CHM HTML into plain text alongside stored HTML
- recreates `I18nSpellText` rows from the matched parser output
- writes records using:
  - `lang=zh`
  - `variant=chm`

This is the current import step for CHM-derived spell names and descriptions.

## Import Order Notes

For the current local workflow, the normal order after resetting the content DB
is:

1. import entity translations
2. import CHM spell text
3. import normalized spell summaries
4. generate and import normalized rules content

This keeps the content DB populated with both:

- dictionary-style entity overlays (`zh`, `default`)
- spell text overlays (`zh`, `chm`)
- accepted short-summary rows
- normalized rules-derived spell, taxonomy, component, mechanic, and list-entry
  content

If a local development content DB was created with an older migration checksum,
`db:content:reset` may ask for a Prisma reset instead of applying migrations in
place. The content DB is rebuildable, so a DB/content maintainer may run:

```bash
npx prisma migrate reset --force --config ./prisma-content/prisma.config.ts
```

Run that command from the `server/` workspace and then re-run all content import
commands. Do not use it for the app-state DB or any preserve-sensitive future
user data.

## What This Workflow Does Not Do

This workflow does not:

- rebuild the rules DB
- create new base spell rows that are missing from the rules DB
- treat Prisma seed as the normal data population path
- preserve content DB contents incrementally during a full rebuild

## Related Files

- [data-setup.md](./data-setup.md)
- [rules-db-notes.md](./rules-db-notes.md)
- [../../data-tools/README.md](../../data-tools/README.md)
- [../../data-tools/package.json](../../data-tools/package.json)
- [../../server/scripts/import-zh-entities.ts](../../server/scripts/import-zh-entities.ts)
- [../../server/scripts/import-zh-chm.ts](../../server/scripts/import-zh-chm.ts)
- [../../data-tools/src/zh-parser/cli.ts](../../data-tools/src/zh-parser/cli.ts)
- [../../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts](../../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts)

