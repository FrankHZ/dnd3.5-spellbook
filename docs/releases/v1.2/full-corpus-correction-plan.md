# v1.2 Full-Corpus Correction Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned. This is a post-review correction plan, not a new v1.2
acceptance track or a current freeze blocker.

## Purpose

Correct evidence-backed field and body loss in the 171 v1.1 full-corpus spell
patch rows without reimporting the corpus or treating the v6.00 parsed dump as
a new source of truth.

## Ownership

- Owning version: v1.2 post-review follow-up.
- Owning domain: data/corpus and structured rules patches.
- Primary implementation branch or specialist: data-pipeline specialist for
  review ledger and candidate JSONL; DB/content maintainer for patch capability,
  local apply, manifest, and content artifact work.
- Related feature/module docs: `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`, `docs/modules/data-tools.md`, and
  `data-tools/README.md`.
- Upstream dependency plans: `full-spell-source-review-plan.md` and its
  committed report; v1.1 full-corpus patch history is frozen context only.
- Downstream consumer plans: DB/content maintainer handoff and any later
  source-specific correction work.

## Agent Context

- Main gate outcome: produce a narrow, reviewable correction handoff for the
  accepted v1.1 full-corpus entries; do not apply it in the data-pipeline slice.
- Required reading: `AGENTS.md`, this plan,
  `full-spell-source-review-report.md`, `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`, `data-tools/README.md`, and nearby
  `data-tools/src/rules/` patch code/tests.
- Expected edit surface: data-tool patch schema/apply helpers and focused
  tests; durable review and pending patch JSONL in the nested `data/` repo;
  this plan and affected workflow docs.
- Nearby code/tests: `data-tools/src/rules/spells-schema.ts`,
  `data-tools/src/rules/spells.ts`, `data-tools/src/rules/manifest.ts`, and
  portable rules-patch tests.
- Validation or acceptance evidence: reviewed ledger counts, focused validator
  and apply tests, temporary SQLite dry-run, manifest verification after the
  DB owner applies an accepted patch, and content artifact parity checks.
- Non-goals and follow-up parking: no full-corpus reparse, broad proofreading,
  production activation, or speculative correction from malformed source rows.
- Handoff owner: main gate reviews candidate scope, then DB/content maintainer
  owns local DB apply and artifact activation.

## Problem

The v1.1 full-corpus patches used the historical v6.00 parsed source. The
post-review audit against the local v6.01 text package found confirmed loss in
some accepted rows: missing components and text after table/stat-block
boundaries. The current structured `updateSpell` path only updates `slug`, so
it cannot express a safe field-level correction patch yet.

## Goals

- Preserve the audit evidence as a durable, source-located review ledger before
  generating any patch operations.
- Define a conservative representation for bare `F`, `M/DF`, `F/DF`, and
  `Dragonmark` components without turning alternatives into mandatory
  conjunctions.
- Extend structured spell updates only as far as needed for reviewed fields and
  descriptions, with focused tests and dry-run evidence.
- Produce a narrow pending JSONL handoff for DB/content maintainers.

## Non-Goals

- Do not reopen the accepted v1.2 source-review track or delay mechanics
  localization/freeze by default.
- Do not reimport all 5,411 parsed rows or expand English corpus coverage.
- Do not infer corrections for `Spell Fangs` or `Undead Eyes` from malformed
  v6.01 text.
- Do not rewrite source HTML/PDF parsing or make broad rules/content schema
  changes.
- Do not apply local SQLite changes or activate a production content DB in the
  data-pipeline implementation slice.

## Current Facts

- The two applied v1.1 full-corpus spell patches contain 171 rows: 33 initial
  rows and 138 rulebook-backed rows.
- The local audit classifies 134 rows as no material drift, 1 as a preferable
  editorial correction already present, 34 as material drift, and 2 as
  unavailable or ambiguous source evidence. The high-confidence body-name
  parser-artifact set has zero overlap with the accepted rows.
- The 34 material rows include 26 component differences and 9 body/stat-block
  differences, with `Magius's Light of Truth` in both groups.
- `Components` has boolean material, arcane-focus, and divine-focus fields plus
  `extraComponents`; the v6.00 importer only recognized `M`, `AF`, and `DF`.
- `UpdateSpellOperation` and its SQLite apply path currently support only a
  slug update. A generic field update must be designed and tested before a
  correction JSONL can be applied.
- `data-tools/out/` remains rebuildable audit evidence. Durable review
  decisions and pending patch JSONL belong in the nested `data/` repo.

## Plan

### Slice 1: Stabilize The Review Ledger

- Deliverable: a durable source-located review ledger under
  `data/spells-full/` that accounts for all 171 accepted rows and records the
  34 material decisions, 1 no-change editorial decision, and 2 deferred rows.
- Expected files: a review JSONL plus a separate rejected/deferred JSONL when
  that improves DB-maintainer handoff clarity. Generated audit output remains
  under `data-tools/out/`.
- Validation: ledger classifications sum to 171; every candidate includes
  spell ID, rulebook, source locator, affected fields, and review rationale.

### Slice 2: Decide Component And Stat-Block Semantics

- Deliverable: an explicit component policy for `F`, `M/DF`, `F/DF`, and
  `Dragonmark`, plus a decision for stat-block fields with no direct structured
  column such as `Aura`.
- Expected files: review-ledger decision fields and, if the maintained patch
  contract changes, focused schema/docs updates.
- Validation: no alternative source component is encoded as multiple required
  boolean components; unsupported structured fields remain raw/deferred rather
  than being repurposed into unrelated columns.

### Slice 3: Add Narrow Structured Update Support

- Deliverable: `updateSpell` can validate and apply the reviewed partial fields
  needed by this plan, while leaving unspecified spell columns, levels, and
  descriptors unchanged.
- Expected files: `data-tools/src/rules/spells-schema.ts`,
  `data-tools/src/rules/spells.ts`, manifest/portable fixtures or focused
  tests, and workflow documentation if the update contract becomes durable.
- Validation: portable tests cover valid partial updates, unknown or empty
  update rejection, component-policy edge cases, and no-op protection; apply
  dry-run runs only against a temporary SQLite copy.

### Slice 4: Generate And Review The Correction Handoff

- Deliverable: a pending JSONL patch at
  `data/rules-patches/pending/spells/full-corpus-v600-v601-corrections.jsonl`
  containing only accepted, source-located corrections.
- Expected files: pending patch JSONL, its review ledger, and a small generated
  report under `data-tools/out/` that proves row/field counts.
- Validation: `rules:spells:validate` passes; candidate IDs/slugs match the
  locked rules DB; no operation targets the 2 ambiguous rows or overwrites the
  approved `Cynosure` wording.

### Slice 5: DB/Content Maintainer Apply

- Deliverable: DB-owner-reviewed local apply, manifest refresh, content artifact
  regeneration, and representative API/content verification.
- Expected files: move the accepted patch to `data/rules-patches/applied/`,
  update the rules manifest, and update operations/data-tool docs as needed.
- Validation: temporary-copy dry-run, local apply, `rules:manifest:verify`,
  content generation/import/parity checks, and focused spell-detail checks for
  corrected examples.

## Acceptance Criteria

- Every one of the 171 accepted rows has a durable audit disposition.
- The correction patch contains only reviewed, source-located changes and is
  safe to re-run through the structured patch workflow.
- Component alternatives are preserved without false required-component
  semantics.
- The update contract is tested and cannot modify unlisted spell fields.
- The DB/content maintainer can dry-run and apply independently from the
  data-pipeline branch.
- The v1.1 freeze remains historical; this plan and any implementation record
  current behavior in v1.2/topic docs instead.

## Doc Updates

- Update this plan as slices are accepted or deferred.
- Update `docs/operations/import-workflow.md`,
  `docs/operations/rules-db-notes.md`, `data-tools/README.md`, and
  `docs/modules/data-tools.md` only when the maintained update workflow lands.
- Update `docs/roadmap.md` only if the main gate promotes this correction work
  into v1.2 release acceptance or changes current ordering.
- Do not update `integrated-plan.md` unless a real cross-track conflict appears.
- Do not update v1.1 `FREEZE.md` or its frozen plans.

## Open Questions

- Which component forms should remain only in `extraComponents`, and which can
  safely map to existing structured booleans without losing alternative
  semantics?
- Should a corrected `Aura` remain in the spell description until a dedicated
  stat-block field has a justified consumer, or should it be represented by a
  new raw-field contract?
- Does the main gate want this correction implementation promoted into v1.2
  acceptance, or kept as a separate post-review data-quality follow-up?

## Follow-Up Candidates

- Source-specific PDF review for the two malformed v6.01 comparison rows.
- A broader source-body parser only if later audit queues prove the current
  scoped correction workflow insufficient.
- Full spell-body/name/short-description translation QA after the mechanics
  workflow is established.

## Completion Notes

Use this section only after implementation review. Link the correction patch,
validation evidence, and DB/content handoff rather than reproducing command
logs.
