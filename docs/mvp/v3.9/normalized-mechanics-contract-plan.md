# v3.9 Normalized Mechanics Contract Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: first backend contract slice in progress.

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
- Start with `casting_time` and `range` readiness because they are plausible
  public filters with bounded review queues.
- Resolve or explicitly classify the six `components.other_or_extra` review
  rows before mechanics expansion.
- Define bucket keys, labels, query params, selection mode, and fallback
  semantics for each promoted facet.
- Keep high-volume or unclear mechanics families review-only until their
  consumer semantics are accepted.

## Non-Goals

- Do not add frontend controls in this plan.
- Do not promote `target` / `effect` / `area` in the first pass.
- Do not promote `duration`, `savingThrow`, or `spellResistance` before their
  consumer semantics are explicit.
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
  - `components.other_or_extra`: needs normalization with `6` review rows
  - `mechanics.casting_time`: needs normalization with `740` review rows
  - `mechanics.range`: needs normalization with `147` review rows
  - `mechanics.target_effect_area`: defer with `target` `1360`, `effect` `510`,
    and `area` `241` review rows
  - `mechanics.duration_save_sr`: defer pending consumer semantics, with
    `duration` `170`, `savingThrow` `277`, and `spellResistance` `66` review
    rows
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

## Accepted Public Mechanics Contract

The first promoted mechanics filters are:

- `castingTimeKeys`, selection mode `any` within the field:
  `immediate_action`, `swift_action`, `free_action`, `standard_action`,
  `full_round_action`, `round`, `minute`, `hour`
- `rangeKeys`, selection mode `any` within the field:
  `personal`, `touch`, `close`, `medium`, `long`, `fixed`, `unlimited`

When both fields are present, they combine with `all` semantics: a spell must
match one selected casting-time bucket and one selected range bucket.

Fallback behavior:

- Content-backed reads match accepted `SpellMechanicFacet` rows only.
- Legacy rules rollback reads use conservative raw-string matching aligned with
  the accepted bucket definitions.
- Missing, `empty`, `special`, and review-status mechanics rows are not public
  vocabulary and do not match promoted filters.

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
  rows if safe, or explicitly classify them as review-only before mechanics
  expansion continues.
- Expected files: component normalization rules, review decision fixtures or
  reports, focused data-tools tests.
- Validation:
  - `npm run -w data-tools rules:content:review`
  - targeted data-tools tests for component review classification

### Slice 3: Shared DTO And Server Meta Vocabulary

- Deliverable: shared contracts and `GET /api/meta/filters` expose only
  accepted mechanics vocabulary with stable query params and labels.
- Status: implemented for `castingTimeKeys` and `rangeKeys`.
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

- What exact public bucket set should `casting_time` expose?
- Should `range` bucket semantics distinguish personal, touch, fixed distance,
  scaling distance, unlimited, and special text, or start with a smaller public
  set?
- Which component extra rows can be safely normalized versus classified as
  review-only?
- What explicit consumer semantics would make `duration`, `savingThrow`, or
  `spellResistance` safe to promote later?

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
