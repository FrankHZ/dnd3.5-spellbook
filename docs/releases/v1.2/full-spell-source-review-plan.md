# v1.2 Full-Spell Source Review Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Review the local full-spell source package before relying on it for future
import, translation, or QA work. The goal is evidence and classification, not a
new production import.

## Ownership

- Owning version: v1.2
- Owning domain: data/corpus
- Primary implementation branch or specialist: data/corpus specialist
- Related feature/module docs: `docs/operations/import-workflow.md`,
  `docs/modules/data-tools.md`
- Upstream dependency plans: v1.1 full corpus freeze state
- Downstream consumer plans: mechanics localization and later full translation
  QA

## Agent Context

- Main gate outcome: produce a reliable source/parse QA report for
  `data/spells-full/v6.01/` and the existing v6.00 parsed JSON.
- Required reading: `AGENTS.md`, `docs/roadmap.md`,
  `docs/releases/v1.2/README.md`, `docs/operations/import-workflow.md`,
  `data-tools/README.md`.
- Expected edit surface: data-tool review scripts or reports, this plan,
  affected operations docs, and generated review outputs under
  `data-tools/out/` when appropriate.
- Nearby code/tests: existing rules/content import and review commands under
  `data-tools/src/`.
- Validation or acceptance evidence: source inventory, parse quality report,
  command output summary, and `git diff --check`.
- Non-goals and follow-up parking: do not import reviewed data into production
  content DB in this track; park import candidates in follow-up notes.
- Handoff owner: main gate after data/corpus specialist review.

## Problem

The project now has a stable v1.1 content DB, but the local full-spell source
package and the existing parsed JSON need a clear quality review before they
become a dependency for translation, import, or provenance work.

## Goals

- Inventory `data/spells-full/v6.01/` source files and identify what can be
  trusted, compared, or parsed.
- Review the existing `data/spells-full/spells-parsed.json` quality from the
  v6.00 source.
- Produce a repeatable source/parse QA report with accepted, blocked, deferred,
  and follow-up categories.

## Non-Goals

- Do not import additional full-spell rows into the production content DB.
- Do not start full spell-body/name/short-description translation.
- Do not rewrite the entire rules/content import pipeline.

## Current Facts

- v1.1 froze a content-backed runtime with `5097` `SpellContent` rows.
- Local source data lives in the ignored nested `data/` repo.
- Data-tool reports and rebuildable intermediates belong under
  `data-tools/out/`.

## Plan

### Slice 1: Source Inventory

- Deliverable: inventory report for `data/spells-full/v6.01/`.
- Expected files: data-tool report output and this plan's completion notes.
- Validation: command summary plus `git diff --check`.

### Slice 2: Parsed JSON Quality Review

- Deliverable: quality report for `data/spells-full/spells-parsed.json` from
  v6.00.
- Expected files: report output and affected import-workflow notes.
- Validation: review counts and sampled findings.

### Slice 3: Follow-Up Classification

- Deliverable: accepted, blocked, deferred, and follow-up categories for later
  import or translation work.
- Expected files: report output and plan follow-up candidates.
- Validation: main gate review of categories.

## Acceptance Criteria

- Source package inventory is complete enough to support later planning.
- Parsed JSON quality review identifies high-risk source, parse, or coverage
  issues.
- The report separates evidence from recommendations.
- No production content DB changes are made by this track.
- Documentation explains how future agents should consume the review output.

## Doc Updates

- Update this plan when source review slices are accepted.
- Update `docs/roadmap.md` only when v1.2 ordering changes.
- Update `docs/operations/import-workflow.md` if review commands or report
  locations become durable workflow.
- Do not update `integrated-plan.md` unless cross-track sequencing changes.

## Open Questions

- Which report format should become canonical for later full translation QA?

## Follow-Up Candidates

- Future full-spell import candidates discovered by the review.
- Future full spell-body/name/short-description translation QA after the review
  model is accepted.

## Completion Notes

Use this section only after implementation review.
