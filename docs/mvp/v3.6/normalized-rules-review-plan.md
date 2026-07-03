# v3.6 Normalized Rules Review Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: review candidate.

## Purpose

Review normalized rules facets before v3.6 adds broader query controls or uses
normalized mechanics in Spell Detail.

## Ownership

- Owning version: v3.6
- Owning domain: db / contracts / web
- Primary implementation branch or specialist: main agent with focused
  subagents for dirty-value reports
- Related feature/module docs: `docs/features.md`, `docs/data-setup.md`,
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

## Plan

### Slice 1: Dirty-Value Inventory

- Deliverable: summarized reports for component, mechanic, taxonomy, and source
  note values.
- Expected files: generated reports under `data-tools/out/` and distilled notes
  in this plan or a child plan if promoted.
- Validation: data-tools command or focused script with documented input.

### Slice 2: Contract Readiness Decision

- Deliverable: classify each candidate filter family as ready, needs
  normalization, or defer.
- Expected files: this plan, `docs/roadmap.md` if work order changes.
- Validation: cross-check with representative Browse/Search examples.

### Slice 3: Implementation Plan If Promoted

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

- Are component flags ready for the next filter contract, or do mechanics facets
  provide higher user value first?
- Should Tome of Battle disciplines be displayed with spell schools or in a
  separate source-kind group?
- Which source-note variants should collapse into an `other/source-note`
  category?
