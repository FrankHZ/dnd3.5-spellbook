# DB Content Workflow

This is the durable entry point for DB/content update work after v1.2.

Use this document to choose the correct workflow and command owner. Do not copy
new command sequences here when an existing operations doc already owns them.

## Scope

This workflow covers:

- accepted data handoffs from the configured private data repo
- local rules-clean patching as a build input
- local content DB regeneration and provenance checks
- portable fixture manifest coverage for maintained local JSONL inputs
- optional remote content DB activation after merge and explicit operator authorization

It does not cover:

- full app-state/user-data migration
- automatic DB deployment in CD
- broad rules/content schema redesign
- raw/source data publication in the parent repo

## Source Of Truth

English original rulebook PDFs and applicable official errata govern translation
and rules content. Existing Chinese CHM, dice database text, and derived English
DB text are references, not acceptance authority. Translate missing Chinese
directly and correct demonstrated English/Chinese/mechanical discrepancies through
source-bound QA. Retained translations need source-faithfulness evidence; legacy
resemblance alone is not acceptance. Preserve original ambiguities faithfully
with separate reader notes.

Keep stable IDs, source evidence/fingerprint checks, and safe import order.
Preserve existing content and fallback outside accepted corrections/translations;
an existing English baseline does not override the original or applicable errata.
Corrections follow the accepted-input and explicit DB-write gates below. This
authority rule does not resume paused broad PHB extraction or translation work.

- Real source, patch, review, and decision data lives in the private data repo
  repo.
- Runtime SQLite files live under `server/db/local/` and are ignored by the
  parent repo.
- Public-safe portable fixtures live under `server/db/<db-role>/fixtures/`.
- Fixture coverage is declared in `server/db/fixtures.manifest.json`.
- Generated reports and rebuildable intermediates live under `data-tools/out/`.

The parent repo should own schemas, validators, tests, fixtures, and workflow
docs. It should not own local DB files or source-bearing data.

## DB Roles

- `rules-clean.sqlite`: locked local rules baseline and accepted patch staging
  input. It is not the artifact served to users after normalized content is
  generated.
- `content.sqlite`: generated runtime content artifact consumed by the app and
  activated remotely.
- `app-state.sqlite`: future user/app-state boundary. Do not mutate it with
  content import scripts.

For setup details, environment variables, and Prisma reset commands, use
[data-setup.md](./data-setup.md).

## Accepted Input Boundary

A proposed source package is not accepted import data. Dice replacement scope
and acceptance live in [the activation issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121).
Its accepted input, variant/request compatibility and safe import order must be
implemented and tested before a write-capable handoff. Existing PHB artifacts
and unmerged PR #113 are paused work, not implicit accepted inputs.
SC's [effective Chinese preflight](./import-workflow.md#effective-chinese-preflight)
revalidates its exact accepted handoff and computes field provenance read-only.
Its inspection outputs do not implement storage, import, consumer compatibility
or activation, and must not be passed to a DB writer.
The [disposable effective writer](./import-workflow.md#disposable-effective-writer)
reuses that complete preflight directly and writes only a command-created
experimental content copy under worktree output. Its field provenance and
limited build marker do not constitute a deployable artifact or permission to
migrate/write operator DBs. Full build/search/consumer integration remains separate.
The selected final candidate uses the maintained
[final overlay and migrated-state validator](./sc-final-source-binding.md#final-overlay-and-migrated-state-validation)
after genuine full normalized generation/import. It preserves generation
provenance and records accepted name/body authority while summaries and extra
relationship QA remain pending. Its validation needs durable final inputs,
not removable rehearsal DB snapshots; operator writes still require the owning
migration's authorization and acceptance.

## Standard Handoff Flow

1. Refresh context.
   - Confirm parent repo branch/status.
   - Confirm the configured private data repo branch/status.
   - Read the owning feature issue and its accepted data handoff.
   - Run the smallest relevant portable/data-tool validation before writing DB
     files.

2. Apply accepted rules patches only after handoff acceptance.
   - New batches may use the [atomic spell maintenance step](./rules-db-notes.md#atomic-spell-maintenance-step)
     for a read-only check and explicit transactional apply/repeat validation.
     This covers only rules and their derived indexes; partial history is rejected.
   - Validate and dry-run the exact pending file.
   - Apply to a temporary copy before touching the local rules DB.
   - Apply to operator-owned `rules-clean.sqlite` only with explicit DB-write
     authorization, accepted input and the required validation.
   - Move accepted patch files from `pending/` to `applied/` in the nested
     private data repo.
   - Rewrite and verify the rules manifest.

3. Regenerate the content DB artifact.
   - Use [import-workflow.md](./import-workflow.md) for the canonical local
     command order.
   - For an already accepted pair of full normalized artifacts, the
     [normalized import step](./import-workflow.md#normalized-content-import-step)
     proves exact before/after and supports atomic apply or a zero-write repeat.
     An annotated predecessor is refused until later coordination handles
     downstream acceptance; this stage does not run overlays, summaries or FTS.
   - For an already accepted pair of complete canonical summary inventories,
     the [summary import step](./import-workflow.md#summary-import-step) proves
     exact before/after and applies maintained upserts atomically. Annotated
     summary predecessors reject; valid exact-after annotations and all build
     provenance remain unchanged. Search is checked after summary completion.
   - Require canonical publication metadata for the full artifact; use the
     explicit audit-only generator only for limited, non-importable output.
   - Run content generate/import, then dry-run and rebuild the derived search
     index after all text and normalized-content imports.
   - Run parity/meta checks after the artifact is complete.
   - Verify the artifact's generation-time rules DB, canonical-input, and
     migration hashes during import.
   - Preserve generation-time parent/data commits and dirty flags in artifact
     metadata; keep importer repository state separate in `buildMetaJson`.
   - Verify representative rows named by the active handoff.

4. Maintain portable fixture coverage.
   - Add exact JSONL roots for narrow handoffs.
   - Use directory roots only when every JSONL under that directory is intended
     to be covered.
   - Map real local data to synthetic public-safe fixtures.
   - Run the portable harness after fixture manifest or fixture changes.

5. Activate remotely only after merge and explicit operator authorization.
   - Regenerate from the merged parent commit and intended data repo commit.
   - Use [deployment.md](./deployment.md) for upload and `~/update-db.sh`.
   - Compare remote `/api/status/db` provenance with local content metadata.
   - Sample public API responses after activation.

## Command Owners

- Local DB roles, environment variables, migrations, and reset setup:
  [data-setup.md](./data-setup.md)
- Local import, rules patch apply, content generation, parity, and metadata
  commands: [import-workflow.md](./import-workflow.md)
- Rules DB patch semantics and source-specific caveats:
  [rules-db-notes.md](./rules-db-notes.md)
- Remote upload, backend deploy, and operator activation:
  [deployment.md](./deployment.md)
- Portable DB fixture layout: [../../server/db/README.md](../../server/db/README.md)
- Data-tool command inventory: [../../data-tools/package.json](../../data-tools/package.json)

## Cache And Runtime Notes

The backend may cache some API responses in-process. After swapping local or
remote DB files, restart the API process before using cached endpoints such as
`/api/rulebooks` as evidence.

Use `/api/status/db` for DB provenance and active read-source checks. In
production, detailed DB status is operator-facing and token-protected.
