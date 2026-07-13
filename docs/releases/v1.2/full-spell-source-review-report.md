# v1.2 Full-Spell Source Review Report

Date: 2026-07-13

## Scope

This report records the v1.2 source/parse review for local full-spell data. It
does not approve a production content DB import.

Reviewed local inputs:

- `data/spells-full/v6.01/`
- `data/spells-full/spells-parsed.json`

Generated reports are rebuildable and stay under `data-tools/out/spells-full/`.

## Commands

```bash
npm run -w data-tools spells-full:inspect -- source-package
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools test:portable
npm run typecheck:data-tools
git diff --check
```

## Source Package Inventory

`spells-full:inspect -- source-package` inventories the local v6.01 package
without opening SQLite. It hashes all package files, counts text rows, parses
the source index from `Spells v6.01 - List.txt`, and compares index names with
the existing v6.00 parsed JSON.

Latest observed output:

- files: `6`
- total size: `25,979,180` bytes
- text/pdf/word files: `2` / `2` / `2`
- parsed JSON rows: `5,411`
- parsed unique names: `5,339`
- high-confidence parsed body-name rows: `120`
- v6.01 source index entry rows: `7,400`
- v6.01 source index sourced rows: `7,285`
- v6.01 source index redirect rows: `115`
- v6.01 source index unique names: `5,216`
- parsed names missing from v6.01 index: `179`
- parsed review names missing from v6.01 index: `61`
- v6.01 index names missing from parsed JSON: `56`
- unique source labels in the index: `2,193`

The raw parsed-name diff is intentionally not the acceptance metric. The v6.00
parsed JSON contains rows where body text or table text was parsed as `name`.
The review metric excludes high-confidence body-name rows before comparing
against the v6.01 source index.

## Parsed JSON Quality

The existing parsed JSON remains useful as a reviewed historical source, but it
is not clean enough to become a direct future import source without another
parser QA pass.

High-confidence parse issues identified:

- `120` rows look like body/table text parsed as spell names.
- `271` rows have no source label.
- Issue-code counts in the latest report: `colon: 19`, `long-name: 96`,
  `missing-source: 271`, `sentence-ending: 98`, `table-or-body-like: 81`.

After excluding high-confidence body-name rows, `61` parsed review names still
do not appear in the v6.01 source index and `56` source-index names do not
appear in the parsed JSON. These are follow-up review queues, not v1.2 blockers.

## Corpus Inventory Baseline

`spells-full:inspect -- corpus-inventory` remains the rules-DB-aware baseline
for the existing v6.00 parsed JSON. It opens the configured rules DB read-only
and does not write SQLite.

Latest observed output:

- source spells: `5,411`
- ready: `0`
- duplicate: `5,381`
- mismatch: `96`
- manual-review: `40`
- deferred: `1,849`
- generated patch rows: `0`
- rejected review rows: `5,422`
- ambiguous review rows: `95`

This means there is no low-risk ready patch left from the current reviewed
source boundary. Later DB additions should come from scoped review queues or
PDF/source-specific work, not from blindly importing the whole parsed dump.

## Classification

Accepted for v1.2:

- The v6.01 local package is present and repeatably inventoryable.
- The source index from `Spells v6.01 - List.txt` is the safer package-level
  name/source inventory surface.
- The existing v6.00 parsed JSON is duplicate-heavy against the current rules
  DB and produces no new ready patch rows in inspect mode.
- The source review command path does not mutate SQLite databases.

Blocked for direct import:

- The existing parsed JSON has high-confidence body/table text rows in `name`.
- The v6.01 full text has not been parsed into a clean structured JSON source.
- Remaining 61/56 name-set differences need manual or source-specific review
  before they can become patch candidates.

Deferred:

- Production content DB import.
- New rules DB spell patch generation from v6.01 full text.
- Full spell-body, name, or short-description translation QA.

Follow-up candidates:

- Build a v6.01 text parser only if future source work needs cleaner spell-body
  extraction than the current v6.00 parsed JSON.
- Review the 61 parsed-review names and 56 v6.01 index-only names as a bounded
  queue before promoting any import candidates.
- Use source-specific PDFs or official source pages for future low-confidence
  gaps instead of trusting the combined parsed dump.

## Validation

Passed on 2026-07-13:

```bash
npm run -w data-tools spells-full:inspect -- source-package
npm run -w data-tools test:portable
npm run typecheck:data-tools
git diff --check
```

`spells-full:inspect -- corpus-inventory` also passed in inspect mode and
produced zero ready patch rows.
