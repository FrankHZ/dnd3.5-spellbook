# v3.9 Normalized Mechanics Contract Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: backend contract implemented; frontend consumer planned separately.

## Purpose

Define the data-tools, shared DTO, and server API contract for the next accepted
normalized mechanics filters before the frontend adds public controls.

## Ownership

- Owning version: v3.9
- Owning domain: data-tools / contracts / server
- Primary implementation branch or specialist: normalized mechanics backend
  specialist
- Related feature/module docs: `docs/features.md`,
  `docs/modules/data-tools.md`, `docs/modules/contracts.md`,
  `docs/modules/server.md`, `docs/operations/data-setup.md`
- Upstream dependency plans: v3.8 normalized query/filter contract and frontend
  consumer plans
- Downstream consumer plans:
  `docs/mvp/v3.9/frontend-normalized-mechanics-consumer-plan.md`

## Problem

v3.8 shipped taxonomy and base component normalized query/filter consumption.
The current rules-content review inventory says taxonomy and
`components.base_flags` are ready, while the next useful mechanics families
still need explicit normalization and bucket semantics before they can become
public filters.

The next release should normalize now instead of dragging the mechanics
contract forward indefinitely, but it should promote only facets whose fallback
and consumer behavior are clear.

## Goals

- Promote accepted normalized mechanics from data-tools review into shared DTOs
  and server filter vocabulary.
- Promote `casting_time`, `range`, `duration`, `savingThrow`, and
  `spellResistance` as public mechanics filters with explicit bucket
  semantics.
- Explicitly classify the six `components.other_or_extra` review rows before
  mechanics expansion.
- Define bucket keys, labels, query params, selection mode, and fallback
  semantics for each promoted facet.
- Keep high-volume or unclear mechanics families review-only until their
  consumer semantics are accepted.

## Non-Goals

- Do not add frontend controls in this plan.
- Do not promote `target` / `effect` / `area` in the first pass.
- Do not add content artifact/versioned DB release automation, static/offline
  generation, large translation QA, broad security/deploy hardening, dependency
  audit cleanup, or full server ESM migration unless one becomes a direct
  blocker.
- Do not make raw source text or dirty review rows public query vocabulary.

## Current Facts

- Current read-only inventory command:

```bash
npm run -w data-tools rules:content:review
```

- Current review rows:
  - taxonomy: `0`
  - components: `6`
  - mechanics: `3511`
- Current report readiness:
  - taxonomy: ready
  - `components.base_flags`: ready
  - `components.other_or_extra`: detail/raw only with `6` review rows; not
    public filter vocabulary
  - `mechanics.casting_time`: public filter implemented; `740` review rows
    remain excluded from public vocabulary
  - `mechanics.range`: public filter implemented; `147` review rows remain
    excluded from public vocabulary
  - `mechanics.target_effect_area`: defer with `target` `1360`, `effect` `510`,
    and `area` `241` review rows
  - `mechanics.duration_save_sr`: public filters implemented for `duration`,
    `savingThrow`, and `spellResistance`; review rows remain excluded from
    public vocabulary
- Current known audit tail:
  `npm audit --workspaces --omit=dev --json` still reports the reviewed three
  moderate Prisma dev-chain / Hono advisories. `fixAvailable` points to
  `prisma` `6.19.3`; this remains maintenance tail and is not a v3.9 blocker.
- v3.8 public filter vocabulary already includes taxonomy metadata and base
  component keys.
- Current contract adjustment: descriptor noise is public as
  `descriptorBuckets=see-text` / `key: "see-text"` rather than the broader
  `other` label, and spell descriptor DTOs may expose `rawText` / `note` for
  detail display.
- The frontend must not parse legacy mechanics strings or invent filter
  vocabulary.

## Normalized Field Audit

Local audit source: `server/db/local/content.sqlite`, checked on 2026-07-05.
Mechanics counts include accepted `empty` categories because normalized content
tracks source-field coverage; public vocabulary still excludes `empty`,
`special`, and review rows.

Public server contract fields:

| field | normalized source | public query/meta | accepted rows | review rows | public vocabulary | detail metadata |
| --- | --- | --- | ---: | ---: | --- | --- |
| school | `SpellTaxonomyFacet.school` | `schoolIds`, `taxonomy.schools` | 4,938 | 0 | 18 legacy ids | no extra detail metadata |
| subschool | `SpellTaxonomyFacet.subschool` | `subschoolIds`, `taxonomy.subschools` | 1,443 | 0 | 18 legacy ids | no extra detail metadata |
| descriptor | `SpellTaxonomyFacet.descriptor` | `descriptorIds`, `descriptorBuckets`, `taxonomy.descriptors` | 2,291 | 0 | 36 legacy ids plus `see-text` | `rawText` / `note` can explain `see-text` |
| base components | `SpellComponent` base flags | `componentKeys`, `components` | 44,334 | 0 | 9 component flags | present/absent only |
| casting time | `SpellMechanicFacet.casting_time` | `castingTimeKeys`, `mechanics.castingTimes` | 4,186 | 740 | 8 buckets | amount/unit only; no special flags |
| range | `SpellMechanicFacet.range` | `rangeKeys`, `mechanics.ranges` | 4,779 | 147 | 7 buckets | amount/unit only; no special flags |
| duration | `SpellMechanicFacet.duration` | `durationKeys`, `mechanics.durations` | 4,756 | 170 | 4 buckets | detail flags proposed below |
| saving throw | `SpellMechanicFacet.saving_throw` | `savingThrowKeys`, `mechanics.savingThrows` | 4,649 | 277 | 4 buckets | detail flags proposed below |
| spell resistance | `SpellMechanicFacet.spell_resistance` | `spellResistanceKeys`, `mechanics.spellResistances` | 4,860 | 66 | 2 buckets | detail flags proposed below |

Base component accepted rows are one row per spell per base flag. Present-row
counts are: `verbal` 4,224, `somatic` 3,986, `material` 1,330,
`divine_focus` 1,038, `arcane_focus` 434, `xp` 105, `corrupt` 19,
`truename` 18, and `metabreath` 9.

Normalized but not public filter fields:

| field | normalized source | accepted rows | review rows | current decision |
| --- | --- | ---: | ---: | --- |
| component other/extra | `SpellComponent.other` | 134 | 6 | detail/raw text only; not filter vocabulary; confirmed samples are long material text or combined labels |
| target | `SpellMechanicFacet.target` | 3,566 | 1,360 | defer; high-volume mixed free text |
| effect | `SpellMechanicFacet.effect` | 4,416 | 510 | defer; high-volume mixed free text |
| area | `SpellMechanicFacet.area` | 4,685 | 241 | defer; high-volume mixed free text |

## Accepted Public Mechanics Contract

The first promoted mechanics filters are:

- `castingTimeKeys`, selection mode `any` within the field:
  `immediate_action`, `swift_action`, `free_action`, `standard_action`,
  `full_round_action`, `round`, `minute`, `hour`
- `rangeKeys`, selection mode `any` within the field:
  `personal`, `touch`, `close`, `medium`, `long`, `fixed`, `unlimited`
- `durationKeys`, selection mode `any` within the field:
  `instantaneous`, `timed`, `concentration`, `permanent`
- `savingThrowKeys`, selection mode `any` within the field:
  `none`, `fortitude`, `reflex`, `will`
- `spellResistanceKeys`, selection mode `any` within the field:
  `yes`, `no`

When multiple fields are present, they combine with `all` semantics: a spell
must match one selected bucket in each selected mechanics family.

Fallback behavior:

- Content-backed reads match accepted `SpellMechanicFacet` rows only.
- Legacy rules rollback reads use conservative raw-string matching aligned with
  the accepted bucket definitions.
- Missing, `empty`, `special`, and review-status mechanics rows are not public
  vocabulary and do not match promoted filters. Duration flags such as
  dismissible or discharge, and saving throw flags such as partial, negates,
  harmless, or object, and spell resistance flags such as harmless or object,
  remain detail metadata, not public filters.

## Detail Metadata Audit

Local audit source: `server/db/local/content.sqlite`,
`SpellMechanicFacet.flagsJson`, checked on 2026-07-05 after the duration and
saving throw filter slices.

Special flags are common enough to expose on spell detail pages, but they
should stay out of public filter vocabulary unless a future consumer need
justifies more query surface.

| family | accepted rows | review rows | accepted rows with detail flags | review rows with detail flags |
| --- | ---: | ---: | ---: | ---: |
| duration | 4,756 | 170 | 1,065 | 23 |
| saving throw | 4,649 | 277 | 1,907 | 48 |
| spell resistance | 4,860 | 66 | 800 | 3 |

Accepted detail flag counts:

| family | detail flags |
| --- | --- |
| duration | `dismissible` 955, `discharge` 141 |
| saving throw | `partial` 305, `negates` 1,602, `harmless` 621, `object` 171 |
| spell resistance | `harmless` 672, `object` 185 |

Recommended follow-up:

- Add a separate mechanics detail metadata contract after the saving throw
  filter PR merges.
  - Status: implemented for content-backed Spell Detail under
    `casting.mechanics`.
- Expose only `accepted` facet flags as structured detail metadata; keep review
  rows/raw or special text as raw detail text only.
  - Status: implemented for `duration.dismissible`, `duration.discharge`,
    `savingThrow.partial`, `savingThrow.negates`, `savingThrow.harmless`,
    `savingThrow.object`, `spellResistance.harmless`, and
    `spellResistance.object`.
- Keep mechanics detail metadata separate from public filter slices.
- Keep frontend consumers on server-provided metadata instead of parsing legacy
  mechanics strings.

## Plan

### Slice 1: Mechanics Readiness And Bucket Contract

- Deliverable: accepted readiness classification for `casting_time` and
  `range`, including bucket keys, labels, sort order, query params, selection
  mode, and fallback behavior for ambiguous or missing values.
- Status: implemented for the first public bucket set above.
- Expected files: data-tools review helpers, normalized content builders,
  server tests or fixtures as needed, this plan.
- Validation:
  - `npm run -w data-tools rules:content:review`
  - targeted data-tools tests for promoted normalization and bucket assignment
  - local acceptance only if maintained local source or import behavior changes:
    `npm run -w data-tools acceptance:local`

### Slice 2: Component Other/Extra Closure

- Deliverable: normalize and close the six `components.other_or_extra` review
  rows if safe, or explicitly classify them as detail/raw only before mechanics
  expansion continues.
- Status: classified as detail/raw only. The six remaining review rows are
  extra component prose or combined source labels, all preserved in
  `components.extra` / raw content and intentionally excluded from public
  filter vocabulary.
- Expected files: component normalization rules, review decision fixtures or
  reports, focused data-tools tests.
- Validation:
  - `npm run -w data-tools rules:content:review`
  - targeted data-tools tests for component review classification

### Slice 3: Shared DTO And Server Meta Vocabulary

- Deliverable: shared contracts and `GET /api/meta/filters` expose only
  accepted mechanics vocabulary with stable query params and labels.
- Status: implemented for `castingTimeKeys`, `rangeKeys`, `durationKeys`,
  `savingThrowKeys`, and `spellResistanceKeys`.
- Expected files: `contracts/src/dto/*`, server meta/filter vocabulary, server
  DTO tests.
- Validation:
  - `npm run build:contracts`
  - `npm run check:contracts`
  - targeted server meta API tests

### Slice 4: Server Query Implementation

- Deliverable: Search and Browse/by-level endpoints parse, sanitize, echo, and
  apply accepted mechanics filter params consistently for content-backed reads
  and supported fallback paths.
- Status: implemented for content-backed reads and legacy rules rollback.
- Expected files: `server/src/services/spells/`, request parsing helpers,
  fixtures, server API tests.
- Validation:
  - `npm run test:server`
  - targeted server tests for each promoted query param and at least one
    fallback case

### Slice 5: Frontend Handoff

- Deliverable: frontend-ready contract summary for promoted mechanics fields,
  including vocabulary shape, query params, all/any semantics, label/i18n
  expectations, and unsupported detail-display fields.
- Status: backend contract also exposes accepted detail-only mechanics flags on
  content-backed Spell Detail as optional `casting.mechanics` metadata. Frontend
  detail display remains a separate consumer slice.
- Expected files: this plan and the frontend consumer plan.
- Validation: docs review before frontend implementation starts.

## Acceptance Criteria

- Promoted mechanics facets are listed by public query param and stable bucket
  key.
- Review-only mechanics remain hidden from public query controls.
- Fallback behavior is documented for missing, ambiguous, stale, or legacy
  source values.
- Data-tools review output shows accepted facets are ready or explicitly
  classified.
- Shared DTOs compile and check after contract changes.
- Server API tests cover accepted meta vocabulary and query behavior.
- Server API tests cover content-backed Spell Detail mechanics metadata without
  inferring flags from legacy raw strings.
- Frontend consumer work can proceed without parsing legacy mechanics strings.

## Doc Updates

- Update this plan when public mechanics vocabulary, bucket semantics, fallback
  behavior, or review classification changes.
- Update `docs/roadmap.md` only when v3.9 ordering changes.
- Update `docs/features.md`, `docs/modules/data-tools.md`,
  `docs/modules/contracts.md`, `docs/modules/server.md`, and
  `docs/operations/data-setup.md` after behavior or workflow ships.
- Do not update `integrated-plan.md` unless this plan conflicts with another
  v3.9 workstream.

## Open Questions

- Which frontend detail fields should render `casting.mechanics` first, and how
  should localized labels explain harmless/object/dismissible flags?

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
