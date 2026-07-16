# v1.2 Mechanics Localization Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: in progress.

## Purpose

Translate the normalized mechanics vocabulary into Chinese, prove the
translation and QA workflow on a bounded corpus, and make frontend mechanics
display localized where the Chinese UI shows mechanics.

## Ownership

- Owning version: v1.2
- Owning domain: i18n/data plus frontend consumer
- Primary implementation branch or specialist: i18n/data specialist owns the
  normalized mechanics locale QA workflow; frontend-design or focused web
  specialist owns final display consumption and smoke review
- Related feature/module docs: `docs/i18n.md`, `docs/features.md`,
  `docs/modules/web.md`, `docs/modules/data-tools.md`
- Upstream dependency plans: v1.1 normalized mechanics/content state
- Downstream consumer plans: later full translation QA

## Agent Context

- Main gate outcome: mechanics display is localized in Chinese UI, and the
  workflow is reusable for later translation QA.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2/README.md`, `docs/i18n.md`, `docs/features.md`.
- Expected edit surface: i18n resources, mechanics translation data/reports,
  frontend display adapter or components, tests, and this plan.
- Nearby code/tests: `web/app/i18n`, frontend filter/detail display code, and
  data-tool mechanics review/report code.
- Validation or acceptance evidence: i18n checks, targeted web tests, generated
  QA report summary, and manual Chinese/English display smoke notes.
- Non-goals and follow-up parking: do not translate full spell bodies, spell
  names, or short descriptions.
- Handoff owner: main gate after i18n/data and frontend consumer review.

## Problem

Mechanics are normalized enough to query and display, but Chinese UI still
depends on English vocabulary in mechanics-heavy surfaces. The full translation
project is too large for v1.2; mechanics are the right bounded corpus to prove
the workflow.

## Goals

- Translate all normalized mechanics into Chinese display strings.
- Run translation QA over the complete mechanics vocabulary.
- Document the workflow as repo-local skill guidance or an equivalent durable
  playbook.
- Render localized mechanics in Chinese UI without regressing English display
  or comparison behavior.

## Non-Goals

- Do not translate full spell bodies, spell names, or short descriptions.
- Do not replace the existing frontend i18n library or source/display split.
- Do not redesign all filter UX.

## Current Facts

- Frontend i18n workflow is documented in `docs/i18n.md`.
- Mechanics display appears in filters, scope summaries, and spell detail
  supported-mechanics notes.
- v1.2 should preserve English comparison/display behavior.

## Plan

### Slice 1: Mechanics Vocabulary Export

- Deliverable: complete mechanics vocabulary to translate and QA.
- Expected files: data/i18n source or generated report as appropriate.
- Validation: count comparison against normalized mechanics source.
- Status: implemented as a portable `npm run i18n:check` audit over
  `contracts/src/dto/spell.ts` mechanics key exports and Spell Detail
  mechanics note keys.

### Slice 2: Translation And QA Workflow

- Deliverable: Chinese mechanics translations plus QA report.
- Expected files: i18n data/resources, QA output, workflow/playbook doc.
- Validation: QA command summary and reviewed issue categories.
- Status: defined on `codex/i18n-mechanics-localization`. The durable workflow
  lives in `docs/i18n.md` and runs through `npm run i18n:check`; the audit
  fails missing, placeholder, duplicate, or English-identical Chinese mechanics
  strings in the maintained locale resources. `npm run -w web i18n:audit --
  --report` emits the mechanics corpus count used as the QA report summary.

### Slice 3: Frontend Consumer

- Deliverable: Chinese UI renders localized mechanics where mechanics appear.
- Expected files: frontend display adapter/components and tests.
- Validation: `npm run i18n:check`, targeted web tests, and manual display
  smoke for Chinese/English surfaces.
- Status: existing frontend consumers already read mechanics filter labels
  through `web/app/i18n/display/spell-filter.ts` and Spell Detail note labels
  through `spell-detail`; this branch hardens coverage and terminology rather
  than changing the consumer contract. Final frontend display review and manual
  Chinese/English smoke are handed to the frontend agent.

## Acceptance Criteria

- Every normalized mechanics key has a Chinese display string or explicit
  deferred reason.
- QA report catches missing, duplicate, placeholder, or suspicious translations.
- Workflow handoff is durable enough for a later full translation QA track.
- Chinese UI shows localized mechanics in the accepted surfaces.
- English UI remains unchanged except for intentional fallback behavior.

## Doc Updates

- Update this plan when mechanics localization slices are accepted.
- Update `docs/i18n.md` when the workflow becomes durable.
- Update `docs/features.md` after user-visible mechanics display changes ship.
- Update `docs/roadmap.md` only when v1.2 ordering changes.
- Do not update `integrated-plan.md` unless cross-track sequencing changes.

## Open Questions

- Resolved for v1.2: keep the reusable workflow in `docs/i18n.md` and the
  portable i18n audit first. Promote to a repo-local skill only if later full
  translation QA needs delegation beyond frontend locale resources.

## Handoff Notes

- i18n/data handoff: normalized mechanics locale QA is documented in
  `docs/i18n.md` and enforced by `npm run i18n:check`.
- Frontend handoff: verify accepted mechanics labels in Browse/Search filters
  and Spell Detail note surfaces in both Chinese and English UI. No frontend
  contract change is required unless smoke testing exposes a display issue.

## Follow-Up Candidates

- Full spell-body/name/short-description translation QA after mechanics proves
  the workflow.
- Broader filter display polish if mechanics labels reveal UI density problems.

## Completion Notes

Use this section only after implementation review.
