# v1.2 Mechanics Localization Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: accepted on 2026-07-16 in PR #72.

## Purpose

Define when normalized mechanics fully preserve the authoritative raw text,
produce an English normalized display representation for those fields, then
localize and consume that representation in the frontend. A field uses the
normalized display only when coverage is explicitly complete; every other
non-empty field falls back to its raw mechanics text.

## Ownership

- Owning version: v1.2
- Owning domain: data pipeline, i18n, and frontend consumer
- Primary implementation branch or specialist: data-pipeline specialist owns
  English normalization and display-coverage classification; i18n specialist
  owns locale vocabulary QA after that contract exists; frontend-design or
  focused web specialist owns final display consumption and smoke review
- Related feature/module docs: `docs/i18n.md`, `docs/features.md`,
  `docs/modules/web.md`, `docs/modules/data-tools.md`
- Upstream dependency plans: v1.1 normalized mechanics/content state
- Downstream consumer plans: later full translation QA

## Agent Context

- Main gate outcome: mechanics display uses localized normalized text when it
  fully covers the raw field and otherwise preserves the authoritative raw
  display; the workflow is reusable for later translation QA.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2/README.md`, `docs/i18n.md`, `docs/features.md`.
- Expected edit surface: normalized mechanics schema/generation/reporting,
  content fixtures, public mechanics contract, i18n resources, frontend
  display adapter or components, tests, and this plan.
- Nearby code/tests: `data-tools/src/rules-content`, content Prisma schema and
  fixtures, `web/app/i18n`, frontend detail display code, and focused harness.
- Validation or acceptance evidence: portable data-tool tests, local corpus
  coverage report, i18n checks, targeted web tests, and manual Chinese/English
  display smoke notes.
- Non-goals and follow-up parking: do not translate full spell bodies, spell
  names, or short descriptions.
- Handoff owner: main gate after data-pipeline, i18n, and frontend review.

## Problem

Mechanics facets were normalized for filtering and review, not for lossless
replacement of raw stat-block text. `reviewStatus = accepted` currently means
that the parser did not emit an issue; it does not prove that category, amount,
unit, and flags preserve every qualifier in the raw field. Localization cannot
safely replace raw mechanics until the data pipeline records that stronger
coverage decision.

## Goals

- Classify every normalized mechanics facet with an explicit display coverage
  independent from parser review status.
- Produce a deterministic English normalized display for facets whose coverage
  is complete.
- Translate the resulting normalized display vocabulary into Chinese.
- Run translation QA over the normalized display vocabulary actually exposed
  by the data contract.
- Document the workflow as durable repo guidance.
- Render localized normalized mechanics without regressing raw fallback or
  English behavior.

## Non-Goals

- Do not translate full spell bodies, spell names, or short descriptions.
- Do not replace the existing frontend i18n library or source/display split.
- Do not redesign all filter UX.
- Do not use fuzzy equivalence or infer display safety from
  `reviewStatus = accepted`.
- Do not force target/effect/area buckets to replace richer raw text when the
  current structure cannot preserve it.

## Current Facts

- Frontend i18n workflow is documented in `docs/i18n.md`.
- Mechanics display appears in filters, scope summaries, and spell detail
  supported-mechanics notes.
- The current content DB contains 40,776 mechanics facets: 37,152 accepted and
  3,624 review rows. These are parser-review counts, not display coverage.
- The v7 read-only rules audit projects 18,097 complete, 4,726 partial, 3,548
  review, and 14,405 empty display-coverage rows across 5,097 spells. Raw rules
  fields and existing content facet raw text have zero mismatches.
- The current frontend mechanics audit covers 25 maintained filter keys and 16
  Spell Detail labels/notes. It is a bounded public-vocabulary audit, not a
  complete normalized corpus audit.
- v1.2 must preserve authoritative raw mechanics for every non-complete field.

## Display Contract

`reviewStatus` continues to describe parser/reviewer confidence. A separate
`displayCoverage` value determines whether normalized data may replace raw text:

- `complete`: normalized data fully conveys the raw field and may replace it.
- `partial`: normalized data is useful but omits raw semantics; display raw.
- `review`: parsing or equivalence is uncertain; display raw.
- `empty`: the source field is empty; there is no display value.

The consumer rule is deliberately narrow: select normalized display only for
`complete`; otherwise select raw text. Raw text remains stored for provenance,
comparison, and fallback even when coverage is complete.

## Plan

### Slice 1: Public Mechanics Vocabulary Audit

- Deliverable: maintained public filter and Spell Detail mechanics vocabulary
  to translate and QA.
- Expected files: frontend locale resources and audit script.
- Validation: exported contract keys and maintained detail keys match locale
  resources.
- Status: implemented as a portable `npm run i18n:check` audit over
  `contracts/src/dto/spell.ts` mechanics key exports and Spell Detail mechanics
  note keys. The report currently covers 25 filter keys and 16 detail
  labels/notes; it does not claim normalized corpus coverage.

### Slice 2: Public Locale Vocabulary QA

- Deliverable: Chinese public mechanics translations plus QA report.
- Expected files: i18n resources, QA output, and workflow documentation.
- Validation: QA command summary and reviewed issue categories.
- Status: defined on `codex/i18n-mechanics-localization`. The durable workflow
  lives in `docs/i18n.md` and runs through `npm run i18n:check`; the audit fails
  missing, placeholder, duplicate, or English-identical Chinese strings in the
  maintained locale resources. `npm run -w web i18n:audit -- --report` emits
  this bounded public-vocabulary count.

### Slice 3: Display Coverage And English Normalization

- Deliverable: explicit per-facet display coverage, deterministic English
  normalized display data for complete rows, and a corpus coverage report.
- Expected files: data-tool normalization helpers and tests, content schema and
  fixture updates, generated review/report support, and public contract fields
  needed by the later consumer.
- Validation: portable helper tests plus local corpus reporting by mechanic
  type and coverage, including representative complete and fallback samples.
- Status: data-pipeline implementation complete. Generator v7 records
  `normalizedText` and `displayCoverage`, import validates the artifact and
  migration columns, the read-only review report groups coverage with samples,
  and portable tests prove complete/partial/review/empty behavior. The
  conservative complete grammars cover simple casting time, range, duration,
  saving throw, and spell resistance forms; all non-empty target/effect/area
  rows remain `partial` or `review`. The local content DB has been migrated and
  regenerated from this contract. Content-backed Spell Detail now exposes all
  eight structured mechanic facets with their coverage; legacy rules responses
  continue to omit this metadata.

### Slice 4: Localized Frontend Consumer

- Deliverable: Chinese UI renders localized normalized mechanics for complete
  fields and raw mechanics for every non-complete field.
- Expected files: frontend display adapter/components and tests.
- Validation: `npm run i18n:check`, targeted web tests, and manual display
  smoke for Chinese/English surfaces.
- Status: implemented. Spell Detail now selects normalized English display for
  complete facets and formats the structured category, amount/unit, and flags
  through the maintained `spell-mechanic-vocabulary` namespace in Chinese.
  Partial, review, unsupported, and legacy facets retain raw text. Complete
  values suppress duplicate secondary notes, while raw fallback fields keep
  supported backend-provided notes.

## Acceptance Criteria

- Every normalized mechanics facet has an explicit display coverage value.
- `complete` rows have a deterministic English normalized display that is
  semantically equivalent to the full raw field.
- `partial` and `review` rows retain raw text as their main display; empty rows
  do not invent a value.
- Coverage reporting groups counts by mechanic type and coverage and includes
  samples suitable for review.
- Every normalized display key exposed by complete rows has a Chinese display
  string or explicit deferred reason.
- QA catches missing, duplicate, placeholder, or suspicious translations.
- Chinese UI shows localized normalized mechanics only for complete fields and
  raw mechanics everywhere else.
- English UI remains unchanged except for intentional normalized selection.

## Doc Updates

- Update this plan when mechanics localization slices are accepted.
- Update `docs/i18n.md` when the locale workflow or consumer contract changes.
- Update `docs/features.md` after user-visible mechanics display changes ship.
- Update `docs/modules/data-tools.md` if the maintained data contract changes.
- Update `docs/roadmap.md` only when v1.2 ordering changes.
- Do not update `integrated-plan.md` unless cross-track sequencing changes.

## Open Questions

- Resolved for v1.2: keep the reusable locale workflow in `docs/i18n.md` and
  the portable i18n audit first. Promote to a repo-local skill only if later
  full translation QA needs delegation beyond frontend locale resources.

## Handoff Notes

- Data-pipeline handoff: English normalized display data and explicit coverage
  are implemented in generator v7, migrated into the local content DB, and
  exposed through the content-backed Spell Detail API. Keep raw text on every
  facet for provenance and fallback.
- i18n handoff: translate and QA only the normalized display vocabulary exposed
  by complete rows; the existing public filter/detail audit remains a separate
  bounded check.
- Frontend handoff: select normalized display only when
  `displayCoverage = complete`; otherwise select raw text. Verify Browse/Search
  filter labels and Spell Detail stat-block fields in both Chinese and English.

## Follow-Up Candidates

- Expand conservative complete grammars after corpus review without weakening
  the fallback rule.
- Full spell-body/name/short-description translation QA after mechanics proves
  the workflow.
- Broader filter display polish if mechanics labels reveal UI density problems.

## Completion Notes

Frontend implementation evidence:

- focused adapter and note tests cover Chinese complete formatting, English
  normalized selection, raw fallback, unsupported categories, and note
  de-duplication
- `npm run test:web`: 32 files and 132 tests passed
- `npm run typecheck:web`: passed
- `npm run i18n:check`: passed with 25 filter keys, 16 detail keys, and 40
  normalized display keys under mechanics localization audit
- `npm run -w web build`: passed
- `npm run verify`: passed
- local HTTP smoke passed for Spell Detail route, API coverage metadata, and
  both normalized mechanics locale resources
- main-gate review accepted the English/Chinese complete-only display contract
  and raw fallback before PR #72 merged
- v1.2 production smoke confirms `Fiery Assault` / `烈焰诀` exposes eight
  mechanics facets with complete coverage for casting time and range
