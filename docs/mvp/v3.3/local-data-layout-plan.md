# Local Data Layout Plan

This plan defines the v3.3 repository boundary for local data files before
moving CHM inputs or adding new rules DB patch workflows.

Status: implemented for CHM parser inputs, CHM parser output defaults, local
data documentation, and the root `data/` local repo boundary. CHM preprocessing
and parsing support nested source directories while skipping Word/CHM `.files`
companion folders. Rules DB patch workflows use the same boundary.

## User Outcome

Maintainers and agents should be able to tell whether a file is:

- runtime data required by the server
- source input consumed by data tooling
- generated output from data tooling
- historical or upstream raw material

That distinction should be visible from the path alone.

## Pre-Migration Problem

The parser and inspection tools now live in the `data-tools` workspace, but many
of their inputs and outputs still lived under `server/`:

- CHM raw HTML: `server/data/chm-raw/`
- CHM cleaned HTML: `server/data/chm-clean/`
- CHM parser test input: `server/data/chm-test/`
- CHM mapping JSON: `server/data/chm-mapping/`
- text raw source: `server/data/txt-raw/`
- parser output: `server/out/zh-parser/`

This keeps old MVP paths working, but it weakens the workspace boundary:

- `server/data/` looks like both runtime data and tool source data.
- data-tool commands appear to depend on server-owned folders.
- future rules DB patch workflows could be added under the wrong owner.

## Proposed Boundary

Keep server runtime data under `server/data/db/`.

Move data-tool source inputs to the root `data/` local repo and generated
outputs under `data-tools/out/`:

```text
server/data/db/
  rules-clean.sqlite
  app.sqlite

data/
  chm-raw/
  chm-clean/
  chm-test/
  chm-mapping/
  txt-raw/
  rules-patches/        # future write-capable rules DB patch inputs

data-tools/out/
  zh-parser/
```

Responsibilities:

- `server/data/db/`: local SQLite files consumed by the API runtime.
- `data/`: local-only inputs used by import, parser, inspection, and
  patch tooling. In the current workspace this is a nested local Git repo,
  ignored by the parent project repo.
- `data-tools/out/`: generated reports or intermediate outputs from data tools.

## Migration Scope

In scope:

- Move CHM raw, clean, test, mapping, and text raw directories from
  `server/data/` to `data/`.
- Move parser output defaults from `server/out/zh-parser/` to
  `data-tools/out/zh-parser/`.
- Update `data-tools/package.json` default parser command paths.
- Update `data-tools` TypeScript aliases that pointed at `../server/data/*`.
- Update `server` import scripts or wrappers so CHM import can read from the new
  parser output path.
- Preserve a documented compatibility command or explicit old-path override only
  if it reduces breakage during transition.
- Update docs that mention CHM source, parser output, or local-only data layout.

Out of scope:

- Changing app DB schema.
- Changing parser output schema.
- Rewriting the parser.
- Importing new spells.
- Adding write-capable rules DB patch commands.
- Moving `server/data/db/` before there is a separate runtime data plan.

## Command Direction

Preferred commands after migration:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-chm
```

Expected default paths:

- preprocess input: `data/chm-raw/`
- preprocess output: `data/chm-clean/`
- parse input: `data/chm-clean/`
- parse test input: `data/chm-test/`
- parse output: `data-tools/out/zh-parser/`
- app DB import input: `data-tools/out/zh-parser/matched.json`

Commands may still accept explicit path arguments for one-off local work, but
the documented defaults should use the new layout.

## Gitignore And Public Repo Policy

The public repo should continue excluding data-bearing local artifacts. The root
`data/` directory is intentionally ignored by the parent repo and can be
versioned by its own local Git repo.

After migration, make `.gitignore` path-aware enough that local data files do not
depend only on broad file extensions. At minimum, ignore:

```gitignore
server/data/db/
/data/
data-tools/out/
```

Mapping files are treated as local-only data in this migration because they were
not tracked before the move.

Do not commit CHM-derived HTML, generated parser reports, SQLite databases, or
copyright-sensitive source material.

## Documentation Updates

Update these docs during migration:

- `AGENTS.md`
- `README.md` if the top-level layout changes
- `docs/README.md`
- `docs/data-setup.md`
- `docs/import-workflow.md`
- `docs/public-repo-notes.md`
- `data-tools/README.md`
- `server/README.md`

The docs should state that `server/data/db/` is the server runtime database
location, while CHM and future rules patch inputs belong to `data/`.

## Harness Plan

Validation for the migration:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:parse
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-chm
npm run verify
```

If full CHM source data is not available in the current environment, validate the
test parser flow and document which source-data checks were skipped.

## Acceptance Criteria

- Server runtime DB files remain under `server/data/db/`.
- CHM parser source inputs are no longer under `server/data/`.
- Parser generated output defaults no longer write under `server/out/`.
- Data-tool commands work through documented defaults.
- Server CHM import reads the documented parser output path.
- Docs no longer describe `server/data/` as the owner of all local data.
- `.gitignore` explicitly protects the root local data repo and generated
  output locations.
- No runtime server code imports `data-tools` modules.

## Follow-Up After Migration

Once the layout is migrated, use this boundary for the missing-spell workflow:

- source spell patch files under `data/rules-patches/` in the nested local data
  repo
- generated validation reports under `data-tools/out/`
- write-capable rules DB mutation commands gated behind explicit command names
  and dry-run defaults

