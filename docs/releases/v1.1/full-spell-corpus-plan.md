# v1.1 Full Spell Corpus Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: in progress.

## Purpose

- Bring the remaining source-backed spell corpus into the maintained
  rules/content DB path.
- Preserve provenance, review status, and rollback clarity so production can
  activate the updated content DB with confidence.

## Ownership

- Owning version: v1.1.
- Owning domain: data tools, rules/content DB import, content artifact
  validation.
- Primary implementation branch or specialist: data-pipeline specialist for
  inventory and JSONL generation; DB/content maintainer for apply and artifact
  activation.
- Related feature/module docs: `docs/operations/import-workflow.md`,
  `docs/operations/data-setup.md`, `docs/operations/rules-db-notes.md`,
  `docs/modules/data-tools.md`, `docs/modules/server.md`.
- Upstream dependency plans: `docs/releases/v1.1/README.md`.
- Downstream consumer plans: v1.1 release acceptance and freeze.

## Agent Context

- Main gate outcome: import the remaining source-backed spell corpus through
  maintained data tooling, then produce reviewable reports and a production
  content DB activation path.
- Current data-pipeline specialist boundary: produce reproducible inventory
  reports and reviewable structured JSONL patch candidates only. Rules DB
  apply, content DB rebuild, artifact provenance, and production activation are
  owned by the DB/content maintenance track.
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
  plus durable summary notes in this plan or operations docs. Ready candidates
  may be written as structured JSONL under the nested local `data/` repo.
- Validation: inventory command is reproducible from maintained scripts and is
  clearly marked local-only.

Current command:

```bash
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
```

Current local run on July 8, 2026 produced:

| Category        | Count |
| --------------- | ----: |
| ready           |    33 |
| duplicate       |  5016 |
| mismatch        |    17 |
| manual-review   |    87 |
| deferred        |  2103 |

The inventory is entry-based rather than source-row-based because one parsed
source row can list multiple source appearances. The ready set generated 33
`insertSpell` JSONL operations and passed `rules:spells:validate` with 0
warnings and 0 errors. No DB apply or dry-run apply was performed in this
data-pipeline branch. The generated ready patch keeps 17 `DCS` rows in scope
and moves 24 apparent typo/duplicate hazards into `manual-review` instead of
letting them create new spell rows. A subagent DB cross-check on July 8, 2026
confirmed the original 15 blocked rows and identified 9 additional ready rows
whose names/descriptions matched existing DB spells closely enough to require
manual review before import.

Generate mode also writes row-level review artifacts in the nested `data/`
repo:

| Artifact | Rows | Purpose |
| --- | ---: | --- |
| `data/spells-full/full-corpus-rejected.generated.jsonl` | 5040 | confirmed non-import rows: existing DB duplicates and reviewed typo/duplicate hazards |
| `data/spells-full/full-corpus-ambiguous.generated.jsonl` | 80 | unresolved row-level mismatches or source/edition ambiguity |

Deferred source labels are also summarized into
`data/spells-full/source-rulebooks.generated.jsonl`. The current run produced
248 source-label rows. Current import disposition counts are:

| Disposition               | Labels | Entries |
| ------------------------- | -----: | ------: |
| candidate-import-rulebook |     42 |     231 |
| manual-review-source      |     87 |     174 |
| defer-out-of-scope        |    118 |    1427 |
| defer-parser-artifact     |      1 |     271 |

The 231 `candidate-import-rulebook` entries represent D&D 3.5 sources that are
in scope but lack a current rules DB rulebook mapping: Dragon Magazine #309+
issue labels, `Forgotten Realms: Anauroch`, `Eberron: City of Stormreach`,
`Eberron: Shadows of the Last War`, and `Expeditions to Undermountain`.
Dragonlance Campaign Setting (`DCS`) already maps to the current rules DB and is
part of the ready patch; other Dragonlance family labels are deferred from the
v1.1 published-corpus scope. `spells-full:rulebooks` also writes
`data/spells-full/source-rulebooks-ambiguous.generated.jsonl`, currently 87
`manual-review-source` labels, so edition/source ambiguity is not buried inside
the broader source-rulebook report.

### Slice 2: Import And Review Workflow

- Deliverable: accepted rows imported through maintained rules/content DB
  tooling with explicit review decisions for hard cases.
- Expected files: data-tools code/tests, fixtures, patch metadata, and import
  workflow docs as needed.
- Validation: focused data-tools tests, import dry-run/apply evidence, and
  review reports for unresolved rows.
- Current handoff input: the data-pipeline branch can provide
  `data/rules-patches/pending/spells/full-corpus-ready.generated.jsonl`, the
  matching inventory report, row-level rejected/ambiguous JSONL, and
  source-label review JSONL. DB/content maintainers decide whether to apply the
  ready JSONL as-is, split it by rulebook, add missing 3.5 rulebook mappings
  for `candidate-import-rulebook`, or send specific ambiguous rows back to
  manual review.

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

- Whether DB/content maintainers should apply the 33 ready JSONL rows
  directly versus split by rulebook or source family?
- What rulebook identifiers should DB/content maintainers use for Dragon
  Magazine issue labels and the 3.5 adventure/source labels currently marked
  `candidate-import-rulebook`?
- What production artifact naming/versioning is sufficient before a broader
  content artifact pipeline exists?
- Should the current parser/source dump's unresolved third-party class list
  notes remain informational, or should they block future ready classification?

## Follow-Up Candidates

- Large-scale Chinese/English translation and proofreading QA belongs in v1.2
  after the full corpus is stable.
- Official WotC web articles and web enhancements should stay out of the v1.1
  published-corpus gate and move into a later `official-web-corpus` slice with
  URL/date/article provenance, edition confirmation, and duplicate/conflict
  review against printed sources.
- Static/offline search or HTML artifacts remain later stable-track work.
- Broader DB schema cleanup should remain separate from corpus import unless a
  blocking import issue proves otherwise.

## Completion Notes

Use this section only after implementation review.
