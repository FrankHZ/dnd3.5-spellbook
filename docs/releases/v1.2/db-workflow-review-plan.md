# v1.2 DB Workflow Review Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: complete. Fixture manifest coverage, documentation reconciliation, and
the accepted full-corpus apply-slice evidence are complete. Remote activation
remains outside this plan.

## Purpose

Define the DB/content maintainer workflow for v1.2 data handoffs so local rules
DB patching, content DB regeneration, portable fixture coverage, and optional
remote activation use one repeatable sequence. The user-facing/runtime artifact
for these updates is the content DB; the local `rules-clean.sqlite` patch step
is a build input used to regenerate normalized content, not the artifact we
publish or deploy.

## Ownership

- Owning version: v1.2 workflow hardening.
- Owning domain: DB/content maintenance and data-tool harness.
- Primary implementation branch or specialist: DB/server specialist.
- Related feature/module docs: `docs/operations/data-setup.md`,
  `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`,
  `docs/operations/deployment.md`, `server/db/README.md`,
  `docs/modules/data-tools.md`, and `data-tools/README.md`.
- Upstream dependency plans: `full-corpus-correction-plan.md`,
  `publications-page-plan.md`, and the v1.1 full-corpus apply record.
- Downstream consumer plans: v1.2 freeze and later content artifact work.

## Agent Context

- Main gate outcome: make DB update work repeatable and auditable without
  committing local DB files or moving raw/source data into the parent repo.
- Required reading: `AGENTS.md`, this plan,
  `docs/operations/data-setup.md`, `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`, `docs/operations/deployment.md`,
  `server/db/README.md`, and the active data handoff plan.
- Expected edit surface: fixture manifest, portable synthetic fixtures,
  operation docs, data-tool docs, and focused harness tests.
- Nearby code/tests: `server/db/fixtures.manifest.json`,
  `server/db/*/fixtures/portable/*.jsonl`,
  `data-tools/src/harness/portable-tests.ts`,
  `data-tools/src/rules/manifest.ts`, and rules/content CLI commands.
- Validation or acceptance evidence: `npm run -w data-tools test:portable`,
  rules patch validate/dry-run/apply evidence when a rules DB patch is accepted,
  `rules:manifest:verify`, content generate/import/parity/meta, representative
  API/content checks, and remote DB hash/status checks only when activation is
  explicitly requested after merge.
- Non-goals and follow-up parking: no automatic DB upload in CD, no raw data in
  the parent repo, no broad schema redesign, and no production activation from
  an unmerged specialist branch by default.
- Handoff owner: main gate for scope; DB/content maintainer for apply and
  activation evidence.

## Problem

DB update knowledge currently spans several documents:

- `data-setup.md` defines DB roles, local runtime DB boundaries, and fixture
  manifest intent.
- `import-workflow.md` lists local import/apply command sequences.
- `rules-db-notes.md` records rules patch semantics and source-specific notes.
- `deployment.md` owns remote DB upload and operator activation details.
- `server/db/README.md` owns portable fixture file layout.

That split is valid, but recent handoffs exposed two risks: agents can refresh
content DBs without first checking whether rules DB patches were accepted and
applied, and new maintained data JSONL can bypass fixture-manifest coverage if
its file or directory is not listed in `server/db/fixtures.manifest.json`.

## Goals

- Make fixture-manifest coverage explicit for maintained data JSONL files or
  directories used by v1.2 correction handoffs.
- Preserve the two-track model: nested `data/` owns real local data; parent
  `server/db/*/fixtures/portable/` owns public-safe synthetic coverage.
- Define the stable DB update sequence from context refresh through optional
  remote activation.
- Keep remote activation operator-owned and post-merge unless the main gate
  explicitly says otherwise.

## Non-Goals

- Do not change release acceptance ordering by itself.
- Do not commit `server/db/local/*.sqlite`, `data/`, or `data-tools/out/`.
- Do not upload a remote DB from an unmerged branch as a default workflow.
- Do not collapse rules-clean, content, and app-state DB roles.

## Current Facts

- `server/db/fixtures.manifest.json` is enforced by portable tests. A
  `dataRoots` entry may be an exact JSONL file or a directory. When the nested
  `data/` repo exists, each listed file root and every JSONL under each listed
  directory root must have a mapping to at least one checked-in portable fixture
  file.
- The manifest previously covered publication, labels, short descriptions, and
  applied rules patches, but did not cover the v1.2 correction patch file or
  its review/deferred ledgers.
- The v1.2 full-corpus correction handoff is an applied structured patch with
  review/deferred ledgers preserved in the nested data repo.
- Accepted correction data may update the local locked rules DB as a staging
  input, but app/runtime reads and remote activation are expected to use the
  regenerated content DB artifact.
- `rules:content:meta` records parent/data commits and dirty state in
  `RulesContentBuild`; this is the local source for comparing remote DB state.
- `/api/rulebooks` has server-side process cache behavior, so local API
  processes must be restarted after DB swaps when rulebook metadata is being
  checked through API responses. `/api/status/db` remains the better provenance
  check.

## Fixed Workflow

### 1. Refresh Context

- Confirm parent branch, upstream status, and data repo branch:
  `git status --short --branch` and `git -C data status --short --branch`.
- Read the active handoff plan and relevant operation docs.
- Run the portable harness before writing DB files when the change touches data
  JSONL, fixtures, manifest coverage, or data-tool schema.

### 2. Apply Rules DB Patches Only After Handoff Acceptance

- Use the accepted-handoff apply sequence in
  [`import-workflow.md`](../../operations/import-workflow.md). That document is
  the canonical local command sequence for rules patch apply and content DB
  rebuild.
- Validate and dry-run the specific pending file, not an inferred directory.
- Dry-run against a temporary copy before touching local `rules-clean.sqlite`.
- Apply only after the main gate accepts the handoff for DB/content maintainer
  work.
- Move the accepted patch from `pending/` to `applied/` in the nested data repo.
- Rewrite and verify the rules manifest after moving the accepted patch.

### 3. Rebuild Local Content DB

- Use [`import-workflow.md`](../../operations/import-workflow.md) for the local
  content DB rebuild command order and
  [`data-setup.md`](../../operations/data-setup.md) for DB roles, environment
  variables, and migration/reset setup.
- Verify `RulesContentBuild.parentRepoCommit`, `dataRepoCommit`,
  `parentRepoDirty`, and `dataRepoDirty`.
- Do focused read-only SQLite or API checks for representative rows named by
  the active handoff.
- Restart local API processes before relying on cached endpoints such as
  `/api/rulebooks`.

### 4. Update Fixtures And Manifest

- Add exact maintained JSONL files to `dataRoots` for narrow handoffs; use a
  directory root only when all current JSONL files under it are intentionally
  mapped.
- Map real data JSONL to synthetic portable fixtures that cover the same DB
  role or table shape; do not copy real source text into parent fixtures.
- When a handoff introduces a new patch shape, add a small synthetic fixture
  row that represents the post-apply rules/content shape.
- Run the portable harness after manifest or fixture edits.

### 5. Activate Remote DB Only After Merge Or Explicit Gate Approval

- Use [`deployment.md`](../../operations/deployment.md) as the canonical remote
  DB activation procedure.
- Regenerate the local content DB from the merged parent commit and intended
  data repo commit before upload.
- Compare remote `/api/status/db` provenance with local content metadata and
  sample public API responses after activation.

## Plan

### Slice 1: Manifest And Portable Fixture Coverage

- Deliverable: `server/db/fixtures.manifest.json` covers the v1.2 applied
  correction patch and its review/deferred ledgers, with synthetic portable
  fixture rows for the post-apply rules/content shape.
- Expected files: `server/db/fixtures.manifest.json`,
  `server/db/rules-clean/fixtures/portable/spell-runtime.jsonl`, and
  `server/db/content/fixtures/portable/normalized-rules-spells.jsonl`.
- Validation: `npm run -w data-tools test:portable`.
- Status: complete.

### Slice 2: Operation Doc Reconciliation

- Deliverable: align operation docs so this plan is the review checklist while
  `import-workflow.md`, `rules-db-notes.md`, `deployment.md`, and
  `data-setup.md` remain the canonical command references for their domains.
- Expected files: this plan and narrowly scoped operation-doc links or wording.
- Validation: doc diff review plus relevant data-tool checks.
- Status: complete.

### Slice 3: Apply-Slice Acceptance Evidence

- Deliverable: after an accepted DB/content apply, record local apply,
  manifest verify, content parity/meta, and focused representative row checks
  in the owning handoff plan.
- Expected files: `full-corpus-correction-plan.md` and affected operation docs
  if the workflow changes.
- Validation: local SQLite/content checks only; remote activation remains
  separate unless requested.
- Status: complete. The correction patch was applied after validation and
  temporary-copy dry-run, then recorded in the rules manifest. Manifest
  verification reports 223 of 223 spell operations with zero missing rows or
  mismatches. The content artifact was regenerated, parity reports 5,097
  matching spells, and direct content checks verified all 34 corrections: 26
  normalized `other` component rows and 10 text/HTML/hash replacements.

## Acceptance Criteria

- Maintained data JSONL files or directories used by v1.2 DB handoffs have
  fixture manifest mappings.
- Portable fixtures remain synthetic and public-safe.
- The DB update workflow clearly distinguishes pending data handoff, local
  rules DB apply, local content rebuild, and remote activation.
- `npm run -w data-tools test:portable` passes after manifest/fixture changes.
- No local SQLite DB, generated report, or nested data file is committed to the
  parent repo.

## Doc Updates

- Update this plan when DB/content workflow slices are accepted.
- Update `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`, `docs/operations/deployment.md`, and
  `docs/operations/data-setup.md` only when their command ownership changes.
- Update `docs/roadmap.md` only if DB workflow review changes active ordering.
- Do not update `integrated-plan.md` unless this introduces a real cross-track
  conflict.

## Open Questions

- Should older historical `data/spells-full/*.jsonl` review ledgers be promoted
  to manifest-covered maintained inputs, or remain outside the DB apply
  checklist until they become active handoffs?

## Follow-Up Candidates

- Add a dedicated `rules-patch-updates.jsonl` portable fixture if future update
  patches need more coverage than a synthetic post-apply spell row.
- Add a small command that prints local vs remote `RulesContentBuild` evidence
  in one table for operator DB activation.

## Completion Notes

- Manifest/harness update: `dataRoots` supports exact JSONL file roots for
  narrow handoffs and directory roots for intentionally full-covered folders.
- The v1.2 correction patch, review ledger, and deferred ledger are mapped to
  synthetic rules/content portable fixtures.
- Validation: `npm run -w data-tools test:portable`, `npm run test:server`, and
  `git diff --check`.
- Apply acceptance: the 34 correction operations are now under
  `data/rules-patches/applied/`; the manifest verifies them as part of its 223
  structured spell operations, and the rebuilt content DB passes parity at
  5,097 spells. Runtime maintenance and any future activation consume that
  content artifact rather than the local rules SQLite file.
