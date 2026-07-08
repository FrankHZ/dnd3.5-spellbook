# v1.1 Full Spell Corpus Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

- Bring the remaining source-backed spell corpus into the maintained
  rules/content DB path.
- Preserve provenance, review status, and rollback clarity so production can
  activate the updated content DB with confidence.

## Ownership

- Owning version: v1.1.
- Owning domain: data tools, rules/content DB import, content artifact
  validation.
- Primary implementation branch or specialist: data/db specialist.
- Related feature/module docs: `docs/operations/import-workflow.md`,
  `docs/operations/data-setup.md`, `docs/operations/rules-db-notes.md`,
  `docs/modules/data-tools.md`, `docs/modules/server.md`.
- Upstream dependency plans: `docs/releases/v1.1/README.md`.
- Downstream consumer plans: v1.1 release acceptance and freeze.

## Agent Context

- Main gate outcome: import the remaining source-backed spell corpus through
  maintained data tooling, then produce reviewable reports and a production
  content DB activation path.
- Required reading: `AGENTS.md`, this plan,
  `docs/releases/v1.1/README.md`, `docs/operations/import-workflow.md`,
  `docs/operations/data-setup.md`, `docs/operations/rules-db-notes.md`, and
  `data-tools/README.md`.
- Expected edit surface: `data-tools/`, parent-repo fixtures/reports/docs, and
  content/rules DB workflow docs; local source data stays in the ignored nested
  `data/` repo.
- Nearby code/tests: data-tools import/review tests, server content-backed API
  tests, and DB status/provenance checks.
- Validation or acceptance evidence: data-tool reports, content DB provenance,
  representative API checks, and production DB status after activation.
- Non-goals and follow-up parking: put translation QA, static/offline indexes,
  and broad schema redesign in `docs/stable-backlog.md` or later release plans.
- Handoff owner: main gate review, then librarian freeze sweep.

## Problem

The app is production-visible, but the content DB still has known corpus
coverage gaps from earlier MVP stages. v1.1 should close the English
source-backed spell corpus gap through the maintained data harness instead of
ad hoc runtime migrations or one-off server scripts.

## Goals

- Define the source intake boundary for remaining source-backed spells.
- Import accepted rows through maintained data-tools workflows.
- Produce review reports for missing, duplicate, mismatched, and manually
  deferred rows.
- Update the content DB artifact with provenance and activation evidence.
- Validate representative Browse/Search/Detail behavior against the updated
  content.

## Non-Goals

- Do not start large-scale Chinese translation or proofreading QA.
- Do not require automatic DB upload in CD.
- Do not redesign the content/app-state DB split.
- Do not add static HTML/offline artifact generation.
- Do not make UI changes beyond what is required to keep content display
  correct.

## Current Facts

- Local source inputs and maintained patch data belong in the ignored nested
  `data/` repo.
- Parent-repo data-tools own validators, generators, fixtures, schemas,
  reports, and maintained import commands.
- Runtime SQLite files under `server/db/local/` are ignored and should not be
  treated as the public repo baseline.
- Production DB upload/activation remains operator-owned.
- `GET /api/status/db` is the production state check for active content DB
  provenance.

## Plan

### Slice 1: Corpus Inventory

- Deliverable: report of remaining source-backed spells to import, grouped by
  ready, duplicate, mismatch, manual-review, and deferred categories.
- Expected files: data-tools reports under `data-tools/out/` when rebuildable,
  plus durable summary notes in this plan or operations docs.
- Validation: inventory command is reproducible from maintained scripts or is
  clearly marked local-only.

### Slice 2: Import And Review Workflow

- Deliverable: accepted rows imported through maintained rules/content DB
  tooling with explicit review decisions for hard cases.
- Expected files: data-tools code/tests, fixtures, patch metadata, and import
  workflow docs as needed.
- Validation: focused data-tools tests, import dry-run/apply evidence, and
  review reports for unresolved rows.

### Slice 3: Content DB Artifact And Provenance

- Deliverable: updated content DB artifact/provenance report suitable for
  operator-owned production activation.
- Expected files: data/setup or import docs, generated metadata, and any
  maintained fixture updates.
- Validation: content DB metadata check, representative row counts, and clear
  rollback source.

### Slice 4: API And Production Activation Smoke

- Deliverable: representative server/API validation after local update and
  after production activation.
- Expected files: server tests or data-tools acceptance evidence only when
  coverage changes.
- Validation: Browse/Search/Detail checks for newly imported spells, DB status
  provenance, and no regression in existing content-backed reads.

## Acceptance Criteria

- Remaining source-backed spell corpus is inventoried with clear categories.
- Accepted rows are imported through maintained data-tools workflows.
- Duplicates, mismatches, and deferred rows have review decisions or follow-up
  owners.
- Content DB artifact/provenance is updated and reproducible enough for
  operator-owned activation.
- Production activation is verified through `GET /api/status/db`.
- Representative Browse/Search/Detail checks cover newly imported spells.
- Docs explain the import, activation, rollback, and remaining follow-up path.

## Doc Updates

- Update this plan when corpus scope, import workflow, or validation changes.
- Update `docs/roadmap.md` only when v1.1 ordering or release state changes.
- Update `docs/operations/import-workflow.md`,
  `docs/operations/data-setup.md`, and `docs/operations/rules-db-notes.md` when
  commands, artifact handling, or patch/review rules change.
- Update `docs/features.md` only after user-visible content coverage changes.
- Do not update `integrated-plan.md` unless v1.1 adds one due to sequencing or
  ownership conflict.

## Open Questions

- Which remaining source-backed rows are ready for automatic import versus
  manual review?
- What production artifact naming/versioning is sufficient before a broader
  content artifact pipeline exists?

## Follow-Up Candidates

- Large-scale Chinese/English translation and proofreading QA belongs in v1.2
  after the full corpus is stable.
- Static/offline search or HTML artifacts remain later stable-track work.
- Broader DB schema cleanup should remain separate from corpus import unless a
  blocking import issue proves otherwise.

## Completion Notes

Use this section only after implementation review.
