# v3.6 Normalized Rules Review Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: first review inventory complete.

## Purpose

Review normalized rules facets before v3.6 adds broader query controls or uses
normalized mechanics in Spell Detail.

## Ownership

- Owning version: v3.6
- Owning domain: db / contracts / web
- Primary implementation branch or specialist: main agent with focused
  subagents for dirty-value reports
- Related feature/module docs: `docs/features.md`, `docs/operations/data-setup.md`,
  `docs/modules/server.md`, `docs/modules/web.md`
- Upstream dependency plans: v3.5 rules content normalization and frontend
  taxonomy filters
- Downstream consumer plans: UI/UX display update if more normalized detail
  fields are accepted

## Problem

v3.5 exposed the first school/subschool/descriptor filters. The generated
normalization also contains component and mechanics facets, but some source
values are still dirty, over-specific, or mixed across conceptual categories.
Exposing all of them directly would make Browse/Search noisy and hard to
maintain.

## Goals

- Review component and mechanics facet categories before new filters ship.
- Review taxonomy source-kind/category boundaries for Tome of Battle disciplines
  and maneuver categories.
- Decide which facet categories are ready for user-facing query controls.
- Preserve raw source text when normalized categories are incomplete.

## Non-Goals

- Do not expose broad new filters without review.
- Do not make frontend parse legacy DB strings.
- Do not clean every dirty value in v3.6 if a smaller accepted slice is enough.
- Do not turn Spell Detail into a QA/provenance surface.

## Current Facts

- `SpellTaxonomyFacet`, `SpellComponent`, and `SpellMechanicFacet` exist in the
  content DB.
- v3.5 Browse/Search consume school/subschool/descriptor ids.
- Mechanics and component filter controls are not shipped.
- `RulesContentIssue` contains review inventory for ambiguous source values.

## Review Snapshot

Command:

```bash
npm run -w data-tools rules:content:review
```

Local snapshot from `server/db/local/content.sqlite` on July 3, 2026:

- `SpellContent`: 4,926 rows.
- `SpellTaxonomyFacet`: 8,658 rows; review rows: 0.
- `SpellComponent`: 44,474 rows; review rows: 6.
- `SpellMechanicFacet`: 39,408 rows; review rows: 3,511.
- `RulesContentIssue`: 3,523 rows.

Review debt by issue code:

- `target_effect_area.review`: 2,111 rows.
- `casting_time.review`: 740 rows.
- `saving_throw.review`: 277 rows.
- `duration.review`: 170 rows.
- `range.review`: 147 rows.
- `spell_resistance.review`: 66 rows.
- `component.extra.review`: 6 rows.
- `list.extra.review`: 6 rows.

Tome of Battle disciplines currently appear as accepted `school` taxonomy rows
with 208 spell appearances. That does not block the existing
school/subschool/descriptor contract, but it should not be treated as ordinary
spell-school UI grouping without adding a source-kind or category boundary.

## Readiness Decision

- Ready: existing school/subschool/descriptor vocabulary as exposed in v3.5.
- Ready: base component flags (`verbal`, `somatic`, `material`, `arcane_focus`,
  `divine_focus`, `xp`, `metabreath`, `truename`, `corrupt`) as backend contract
  vocabulary.
- Needs normalization: extra/other component text. Keep raw text visible to
  detail consumers, but do not expose as filter vocabulary.
- Needs normalization: Tome of Battle discipline/category boundary. Keep current
  taxonomy rows compatible, but add a future source-kind distinction before UI
  grouping changes.
- Needs normalization: casting time and range. Their accepted buckets are useful,
  but review rows must stay out of public filter vocabularies until a stable
  fallback contract is defined.
- Defer: target/effect/area filters. These are still high-volume free-text
  mechanics.
- Defer: duration, saving throw, and spell resistance filters until each has
  explicit consumer semantics beyond raw category display.

## Plan

### Slice 1: Dirty-Value Inventory

- Status: complete for the first v3.6 review pass.
- Deliverable: summarized reports for component, mechanic, taxonomy, and source
  note values.
- Expected files: generated reports under `data-tools/out/` and distilled notes
  in this plan or a child plan if promoted.
- Validation: `npm run -w data-tools rules:content:review`.

### Slice 2: Contract Readiness Decision

- Status: complete for the first v3.6 review pass.
- Deliverable: classify each candidate filter family as ready, needs
  normalization, or defer.
- Expected files: this plan, `docs/roadmap.md` if work order changes.
- Validation: cross-check with representative Browse/Search examples.

### Slice 3: Implementation Plan If Promoted

- Status: not promoted in this branch.
- Deliverable: a focused child plan for the accepted filter/detail slice.
- Expected files: new plan doc only if implementation scope is accepted.
- Validation: no broad code changes in the review branch.

## Acceptance Criteria

- Review identifies which facet families can safely become query vocabulary.
- Tome of Battle discipline/category handling has an accepted direction before
  UI grouping changes.
- Frontend display work knows which normalized fields are stable enough to use.
- Deferred dirty values are documented as non-blocking backlog.

## Doc Updates

- Update this plan during review.
- Update `docs/roadmap.md` only when a review result changes v3.6 work order.
- Update feature/server/web docs only after a filter/detail behavior ships.
- Do not update `integrated-plan.md` unless the review promotes or retires a
  major v3.6 workstream.

## Open Questions

- Which accepted component flags should become the next public query contract,
  if any, after v3.6 closeout?
- What exact source-kind/category shape should separate Tome of Battle
  disciplines from ordinary spell schools?
- Which casting-time and range special values should collapse into an
  `other/source-note` or equivalent fallback category?
