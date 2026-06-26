# Import Workflow

This document describes the current MVP data import workflow used to populate Chinese app-owned data.

It covers:

- preprocessing exported CHM HTML
- parsing spell content into matched records
- importing dictionary-style entity translations
- importing CHM-derived spell text into the app DB

For database creation and local DB roles, use [data-setup.md](./data-setup.md).

## Scope

This workflow is for the current MVP data pipeline.

At the moment:

- the app DB is normally rebuilt from scratch
- Prisma seed is not the active population path
- the active population path is the import scripts in the `server` workspace

## Main Scripts

The relevant workspace commands are:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-entities
npm run -w server db:app:import:zh-chm
```

The `server` workspace keeps compatibility wrappers for the `tool:*` commands,
but `data-tools` owns parser and inspection tooling.

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
  - `server/data/i18n/classes-zh.json`
  - `server/data/i18n/domains-zh.json`
  - `server/data/i18n/rulebooks-zh.json`
  - `server/data/i18n/descriptors-zh.json`
  - `server/data/i18n/schools-zh.json`
  - `server/data/i18n/subschools-zh.json`

### Parser Outputs

The parser writes into `data-tools/out/zh-parser/`:

- `matched.json`
- `unmatched.json`
- `candidates.json`
- `stats.json`
- `missing-zh.json` may also exist as a follow-up artifact from auxiliary checks

## Recommended End-To-End Flow

For a normal full rebuild:

1. Ensure the rules DB exists and the app DB path is configured.
2. Run `npm install` from the repo root if needed.
3. Run `npm run -w server db:generate`.
4. Run `npm run -w server db:app:reset`.
5. Run `npm run -w data-tools zh:preprocess` if raw CHM HTML changed.
6. Run `npm run -w data-tools zh:parse`.
7. Inspect `data-tools/out/zh-parser/stats.json`, `matched.json`, and `unmatched.json`.
8. Run `npm run -w server db:app:import:zh-entities`.
9. Run `npm run -w server db:app:import:zh-chm`.

This order keeps the app DB aligned with the latest parser output and the latest checked-in entity translation JSON.

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

The normal import path expects `data-tools/out/zh-parser/matched.json` to be the source of truth for CHM-derived spell records.

### 4. Import Entity Translation JSON

Command:

```bash
npm run -w server db:app:import:zh-entities
```

Current script behavior:

- reads checked-in JSON files from `server/data/i18n/`
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
npm run -w server db:app:import:zh-chm
```

Current script behavior:

- reads `data-tools/out/zh-parser/matched.json`
- converts CHM HTML into plain text alongside stored HTML
- recreates `I18nSpellText` rows from the matched parser output
- writes records using:
  - `lang=zh`
  - `variant=chm`

This is the current MVP import step for CHM-derived spell names and descriptions.

## Import Order Notes

For the current MVP, the normal order after resetting the app DB is:

1. import entity translations
2. import CHM spell text

This keeps the app DB populated with both:

- dictionary-style entity overlays (`zh`, `default`)
- spell text overlays (`zh`, `chm`)

## What This Workflow Does Not Do

This workflow does not:

- rebuild the rules DB
- create new base spell rows that are missing from the rules DB
- treat Prisma seed as the normal data population path
- preserve app DB contents incrementally during a full rebuild

## Related Files

- [data-setup.md](./data-setup.md)
- [rules-db-notes.md](./rules-db-notes.md)
- [../data-tools/README.md](../data-tools/README.md)
- [../data-tools/package.json](../data-tools/package.json)
- [../server/scripts/import-zh-entities.ts](../server/scripts/import-zh-entities.ts)
- [../server/scripts/import-zh-chm.ts](../server/scripts/import-zh-chm.ts)
- [../data-tools/src/zh-parser/cli.ts](../data-tools/src/zh-parser/cli.ts)
- [../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts](../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts)

