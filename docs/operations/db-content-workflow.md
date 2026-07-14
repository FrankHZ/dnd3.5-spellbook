# DB Content Workflow

This is the durable entry point for DB/content update work after v1.2.

Use this document to choose the correct workflow and command owner. Do not copy
new command sequences here when an existing operations doc already owns them.

## Scope

This workflow covers:

- accepted data handoffs from the nested `data/` repo
- local rules-clean patching as a build input
- local content DB regeneration and provenance checks
- portable fixture manifest coverage for maintained local JSONL inputs
- optional remote content DB activation after merge or explicit gate approval

It does not cover:

- full app-state/user-data migration
- automatic DB deployment in CD
- broad rules/content schema redesign
- raw/source data publication in the parent repo

## Source Of Truth

- Real source, patch, review, and decision data lives in the nested `data/`
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

## Standard Handoff Flow

1. Refresh context.
   - Confirm parent repo branch/status.
   - Confirm nested `data/` branch/status.
   - Read the active release or handoff plan.
   - Run the smallest relevant portable/data-tool validation before writing DB
     files.

2. Apply accepted rules patches only after handoff acceptance.
   - Validate and dry-run the exact pending file.
   - Apply to a temporary copy before touching the local rules DB.
   - Apply to `rules-clean.sqlite` only after main gate acceptance.
   - Move accepted patch files from `pending/` to `applied/` in the nested
     `data/` repo.
   - Rewrite and verify the rules manifest.

3. Regenerate the content DB artifact.
   - Use [import-workflow.md](./import-workflow.md) for the canonical local
     command order.
   - Run content generate/import/parity/meta checks.
   - Record `RulesContentBuild` parent/data commit ids and dirty flags.
   - Verify representative rows named by the active handoff.

4. Maintain portable fixture coverage.
   - Add exact JSONL roots for narrow handoffs.
   - Use directory roots only when every JSONL under that directory is intended
     to be covered.
   - Map real local data to synthetic public-safe fixtures.
   - Run the portable harness after fixture manifest or fixture changes.

5. Activate remotely only after merge or explicit gate approval.
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
- Data-tool command inventory: [../../data-tools/README.md](../../data-tools/README.md)

## Cache And Runtime Notes

The backend may cache some API responses in-process. After swapping local or
remote DB files, restart the API process before using cached endpoints such as
`/api/rulebooks` as evidence.

Use `/api/status/db` for DB provenance and active read-source checks. In
production, detailed DB status is operator-facing and token-protected.

## Release Notes

`docs/releases/v1.2/db-workflow-review-plan.md` records the v1.2 acceptance
evidence that hardened this workflow. After v1.2 freeze, use this operations
document as the current workflow entry point and treat the release plan as a
historical acceptance record.
