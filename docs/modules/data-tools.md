# Data Tools Module

## Role

`data-tools/` owns local data preparation, parser workflows, rules DB patching,
short-description extraction and QA, source inspection, and the data harness.

It exists so runtime `server/` code does not become a parser, migration, or
source-data operations workspace.

## Main Boundaries

`data-tools/src/` is grouped by owning module:

- `shared/`: path, environment, and local-data helpers.
- `db/`: data-tool database clients.
- `rules/`: rules DB inspection, SQL patching, structured spell patches,
  manifests, and `spells-full` patch generation.
- `rules-content/`: generated content rows derived from the rules DB, including
  publication metadata overlays and conservative normalized mechanics display
  coverage for runtime consumers.
- `rulebooks/`: rulebook label audits, publication metadata helpers, and the
  local publication metadata seed workflow.
- `short-desc/`: English/Chinese short-description matching, QA,
  normalization, import, coverage, and reuse workflows.
- `zh-parser/`: CHM preprocessing, parsing, QA, matching, and summary
  extraction.
- `harness/`: portable tests and explicit local acceptance bundles.

Command lifecycle metadata lives in `data-tools/scripts.manifest.json`.

## Data Ownership

Local source inputs, maintained patch data, normalized import JSONL, and review
decisions belong in the nested `data/` repo. Generated reports and parser output
belong under `data-tools/out/`.

The canonical local publication metadata source is
`data/rulebook-publications/publications.jsonl`. Seed it with
`rulebooks:publications:seed`, then review and maintain rows in the data repo;
the seed inherits publication dates from rules-clean where available and should
not be treated as externally verified until row `reviewStatus` is accepted.
Generated content only exposes publication year/date/URL/image details from
rows marked `accepted`. Use `isbn10`, `isbn13`, and `metadataSources` in the
data repo for provenance when publication details are researched from external
ISBN-backed sources.

An importable rules-content build requires that canonical file and one row for
every rules-clean rulebook. Explicit audit-only generation may omit it or limit
spell rows, but the resulting artifact is marked limited and cannot enter the
content DB import boundary.

Parent-repo code should include schemas, validators, fixtures, command
wrappers, and docs. Do not commit ignored raw CHM data, local SQLite DBs, or
generated run reports to the parent repo.

Structured spell corrections use a deliberately narrow `updateSpell` contract:
only `slug`, raw `extraComponents`, and paired `description`/`descriptionHtml`
updates are allowed. Source-located review ledgers and pending JSONL belong in
the data repo; reusable validation and temporary-copy apply behavior belong in
the parent workspace.

## Harness Boundary

Portable tests should cover reusable helpers behind maintained workflows and
must not depend on ignored source data or local SQLite DBs.

The portable rules-content import acceptance is the bounded exception for
database constraints: it applies tracked content migrations to a disposable
in-memory SQLite database and imports only public-safe portable fixtures. It
does not read or write `server/db/local/`.

Local acceptance commands may depend on the nested `data/` repo and local DBs,
but they should remain explicit and outside root `npm run verify` or CI.

`rules:content:review` is the read-only content DB inventory for normalized
rules content. Its readiness output can mark a family as `detail_only` when
review rows are intentionally preserved for raw/detail display and should not
be promoted into public filter vocabulary; `components.other_or_extra` uses
that classification. Mechanics `reviewStatus` describes parser confidence;
the independent `displayCoverage` field controls display replacement. Only
`complete` rows expose canonical English `normalizedText`; every other
non-empty row stays on raw fallback.

## Validation

Use:

```bash
npm run typecheck:data-tools
npm run test:data-tools
```

For local data acceptance, use:

```bash
npm run -w data-tools acceptance:local
```

Use local acceptance only when the change actually touches local source data,
rules DB manifests, parser output, or import behavior.

## Related Docs

- [../../data-tools/README.md](../../data-tools/README.md)
- [../operations/data-setup.md](../operations/data-setup.md)
- [../operations/import-workflow.md](../operations/import-workflow.md)
- [../operations/rules-db-notes.md](../operations/rules-db-notes.md)
- [../mvp/v3.4/data-harness-hardening-plan.md](../mvp/v3.4/data-harness-hardening-plan.md)
- [../mvp/v3.4/short-description-pipeline-plan.md](../mvp/v3.4/short-description-pipeline-plan.md)
