# v1.1 Full Spell Corpus Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: local DB/content apply complete; production activation pending.

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
| duplicate       |  5095 |
| mismatch        |    14 |
| manual-review   |    33 |
| deferred        |  2081 |

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
| `data/spells-full/full-corpus-rejected.generated.jsonl` | 5136 | confirmed non-import rows: existing DB duplicates, parser artifacts, out-of-scope edition rows, and reviewed typo/duplicate hazards |
| `data/spells-full/full-corpus-ambiguous.generated.jsonl` | 6 | unresolved in-scope row-level mismatches or source/edition ambiguity |

The rejected queue includes 22 bare core-source rows from `Player’s Handbook`,
`Player’s Handbook, Rules Compendium`, and `Dungeon Master’s Guide` that matched
existing PH/DMG 3.5 rows in `rules-clean.sqlite`. Bare core source rows without
an exact PH/DMG 3.5 rules DB match stay in source-level ambiguity. It also
separates target-rulebook rows whose resolved rulebook edition is explicitly
3.0 into `out-of-scope-edition` rejected rows. Parser/index placeholders such
as `Lesser (Spell Name)` and header-only fragments such as `Leonal’s Road` are
rejected as `parser-artifact`; numbered real-spell rows such as `Dirge 1` and
`Sandblast 1` use de-numbered spell-name variants for DB matching. For
multi-source rows, spells-full currently provides one combined body rather than
source-specific bodies, so a hit in any mapped target book is treated as already
collected unless the row is on a version-aware manual review blocklist. Reviewed
alias spell-name variants also reject `Junglerazor`/`Junglerazer`,
`Rejuvenate Corpse`/`Rejuvenative Corpse`, and
`Invisibility, Superior`/`Superior Invisibility` as already collected. The
remaining row-level ambiguous artifact is limited to in-scope review: 1
`source-or-edition-ambiguity` row and 5 `conversion-mismatch` rows.

Deferred source labels are also summarized into
`data/spells-full/source-rulebooks.generated.jsonl`. The current run produced
246 source-label rows. Current import disposition counts are:

| Disposition               | Labels | Entries |
| ------------------------- | -----: | ------: |
| candidate-import-rulebook |     42 |     231 |
| manual-review-source      |     85 |     152 |
| defer-out-of-scope        |    118 |    1427 |
| defer-parser-artifact     |      1 |     271 |

The 231 `candidate-import-rulebook` entries represent D&D 3.5 sources that are
in scope but lack a current rules DB rulebook mapping: Dragon Magazine #309+
issue labels, `Forgotten Realms: Anauroch`, `Eberron: City of Stormreach`,
`Eberron: Shadows of the Last War`, and `Expeditions to Undermountain`.
Dragonlance Campaign Setting (`DCS`) already maps to the current rules DB and is
part of the ready patch; other Dragonlance family labels are deferred from the
v1.1 published-corpus scope. `spells-full:rulebooks` also writes
`data/spells-full/source-rulebooks-ambiguous.generated.jsonl`, currently 85
`manual-review-source` labels, so edition/source ambiguity is not buried inside
the broader source-rulebook report. After the bare-core exact-match pass, the
only remaining high-confidence ambiguous core source label is
`Dungeon Master’s Guide` for `Shadow Image`.

### Slice 2: Import And Review Workflow

- Deliverable: accepted rows imported through maintained rules/content DB
  tooling with explicit review decisions for hard cases.
- Expected files: data-tools code/tests, fixtures, patch metadata, and import
  workflow docs as needed.
- Validation: focused data-tools tests, import dry-run/apply evidence, and
  review reports for unresolved rows.
- Current handoff input: the data-pipeline branch provides
  `data/rules-patches/pending/spells/full-corpus-ready.generated.jsonl`, the
  matching inventory report, row-level rejected/ambiguous JSONL, and
  source-label review JSONL. DB/content maintainers decide whether to apply the
  ready JSONL as-is, split it by rulebook, add missing 3.5 rulebook mappings
  for `candidate-import-rulebook`, or send specific ambiguous rows back to
  manual review.
- Current short-description handoff input: reviewed strict-3.5 English summary
  decisions are materialized as
  `data/short-desc-review/qa/en-strict35-ready.generated.jsonl`. That ledger
  currently has 63 ready rows: 23 already covered by the normalized summary
  import file and 40 written to
  `data/short-desc-normalized/pending/en-strict35-ready.generated.jsonl` for DB
  maintainer review before merging into the canonical summary import boundary.
  The generator is `npm run -w data-tools summaries:strict35-ready`; it keeps
  3.0 sources out of the default scope and does not perform fuzzy reuse.

Current data-pipeline validation:

```bash
npm run -w data-tools test:portable
npm run -w data-tools typecheck
npm run -w data-tools summaries:strict35-ready
npm run -w data-tools summaries:qa
npm run -w data-tools summaries:import -- --dry-run --input ../data/short-desc-normalized/pending/en-strict35-ready.generated.jsonl
```

The pending short-description dry-run reads 40 normalized rows and reports 40
inserts, 0 updates, and 0 unchanged rows against the current local content DB.
No rules DB apply, canonical summary merge, content DB write, or production
activation was performed in this data-pipeline branch.

Current DB/content maintainer run on July 9, 2026:

- `rules:manifest:verify` passed before apply against the previous 18-operation
  rules manifest.
- `rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl`
  passed with 33 operations, 0 warnings, and 0 errors.
- `rules:spells:apply -- --dry-run pending/spells/full-corpus-ready.generated.jsonl`
  passed against a temporary SQLite copy.
- `rules:spells:apply -- pending/spells/full-corpus-ready.generated.jsonl`
  applied the 33 `insertSpell` operations to the local `rules-clean.sqlite`.
- The patch file was moved to
  `data/rules-patches/applied/spells/full-corpus-ready.generated.jsonl`.
- `rules:manifest:write` then `rules:manifest:verify` passed with 10 patch
  files, 51 verified spell operations, 0 missing, and 0 mismatched operations.
- The 40 pending strict-3.5 English summary rows were merged into
  `data/short-desc-normalized/summaries.generated.jsonl`; rerunning
  `summaries:strict35-ready` reported 63 ready rows, 63 already covered rows,
  and 0 pending rows.

### Slice 3: Content DB Artifact And Provenance

- Deliverable: updated content DB artifact/provenance report suitable for
  operator-owned production activation.
- Expected files: data/setup or import docs, generated metadata, and any
  maintained fixture updates.
- Validation: content DB metadata check, representative row counts, and clear
  rollback source.

Current local content DB rebuild on July 9, 2026:

- The local content DB was reset with
  `prisma migrate reset --force --config ./prisma-content/prisma.config.ts`
  after Prisma detected old local migration checksum drift.
- `db:content:import:zh-entities` imported 66 class, 177 domain, 82 rulebook,
  26 school, 20 subschool, and 45 descriptor zh/default rows. Its existing
  missing/stale local-data warnings remain informational for the corpus import.
- `db:content:import:zh-chm` completed against the existing CHM parser output.
- `summaries:import -- --dry-run` and `summaries:import` read 6572 canonical
  normalized summary rows and inserted 6572 rows into the freshly reset content
  DB.
- `rules:content:audit`, `rules:content:generate`,
  `rules:content:import -- --dry-run`, and `rules:content:import` all completed
  against the updated rules DB. The generated rules-content artifact contains
  4959 spells and 3544 review issues.
- `rules:content:parity` passed with matching legacy/content counts:
  4959 spells, 110 rulebooks, 2312 descriptors, 12580 class list entries,
  1549 domain list entries, 44631 base component rows, and 140 extra component
  rows.
- `rules:content:meta` reported content DB checksum
  `479ebb98d284331185af0515bfd99ee3757617f9c1635857af8f01760bb850b6` for the
  first local rebuild pass. Rebuild once more after parent/data commits so the
  final local `RulesContentBuild` commit ids match the review branch heads.

### Slice 4: API And Production Activation Smoke

- Deliverable: representative server/API validation after local update and
  after production activation.
- Expected files: server tests or data-tools acceptance evidence only when
  coverage changes.
- Validation: Browse/Search/Detail checks for newly imported spells, DB status
  provenance, and no regression in existing content-backed reads.

Local API smoke on July 9, 2026 passed against `npm run -w server dev` with
the default content-backed read source:

- `GET /api/status/db` reported `activeSpellReadSource: "content"` and
  4959 `SpellContent` rows.
- `GET /api/spells/search?q=Alibi&rulebookIds=110&pageSize=5` returned one
  result: spell id 4931, `Alibi`, rulebook `EE`.
- `GET /api/spells/4931` returned detail for `Alibi` with rulebook `EE`,
  school `Illusion`, subschool `Phantasm`, and casting time `1 swift action`.

Production upload/activation and remote `/api/status/db` verification remain
operator-owned and are not part of CD.

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

- What rulebook identifiers should DB/content maintainers use for Dragon
  Magazine issue labels and the 3.5 adventure/source labels currently marked
  `candidate-import-rulebook`?
- What production artifact naming/versioning is sufficient before a broader
  content artifact pipeline exists, beyond `RulesContentBuild` plus operator
  upload notes?
- Should the current parser/source dump's unresolved third-party class list
  notes remain informational, or should they block future ready classification?

## Follow-Up Candidates

- Large-scale Chinese/English translation and proofreading QA belongs in v1.2
  after the full corpus is stable.
- Official WotC web articles and web enhancements should stay out of the v1.1
  published-corpus gate and move into a later `official-web-corpus` slice with
  URL/date/article provenance, edition confirmation, and duplicate/conflict
  review against printed sources.
- Run a Spell Compendium PDF-backed sweep after v1.1 to verify SpC-derived
  source/body variants and close any remaining source-dump parser ambiguity.
- Static/offline search or HTML artifacts remain later stable-track work.
- Broader DB schema cleanup should remain separate from corpus import unless a
  blocking import issue proves otherwise.

## Completion Notes

Data-pipeline handoff completed on the `codex/data-full-spell-corpus` branch.
The parent repo commit adds the strict-3.5 summary ready generator, reviewed
IMarvin alias matching, fixture manifest coverage, and data-tool docs. The
nested local `data/` repo commit adds the ready ledger and pending normalized
summary JSONL. DB/content maintainers should consume the generated JSONL after
this branch is merged, then handle rules DB apply, canonical normalized summary
merge/import, content DB artifact provenance, and production activation.

DB/content apply completed locally on `codex/db-full-corpus-apply`. The nested
local `data/` repo records the applied full-corpus spell JSONL, updated rules
manifest, canonical summary merge, and regenerated strict-3.5 summary ledger.
The remaining v1.1 acceptance work is final metadata-aligned local rebuild,
operator-owned production upload/activation, and remote `/api/status/db`
verification.
