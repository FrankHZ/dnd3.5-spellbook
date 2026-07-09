# v1.1 Frontend Content Pass Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

- Verify the production frontend still feels coherent after v1.1 hardening and
  full-corpus content activation.
- Catch content-display, route, i18n, status, and responsive layout issues
  before the v1.1 freeze.

## Ownership

- Owning version: v1.1.
- Owning domain: focused frontend acceptance and small content-display polish.
- Primary implementation branch or specialist: frontend-design specialist.
- Related feature/module docs: `docs/features.md`, `docs/design.md`,
  `docs/frontend-map.md`, `docs/i18n.md`.
- Upstream dependency plans: `docs/releases/v1.1/production-hardening-plan.md`,
  `docs/releases/v1.1/full-spell-corpus-plan.md`.
- Downstream consumer plans: v1.1 release acceptance and freeze.

## Agent Context

- Main gate outcome: run a focused frontend pass after the full corpus is stable
  enough to inspect through Browse, Search, Detail, and About/Status.
- Required reading: `AGENTS.md`, this plan, `docs/releases/v1.1/README.md`,
  `docs/design.md`, `docs/features.md`, `docs/frontend-map.md`, and
  `docs/i18n.md`.
- Expected edit surface: `web/` and frontend-facing docs. Avoid data-tool,
  server, and deployment changes unless a display-blocking contract issue is
  found.
- Nearby code/tests: web feature tests, route components, i18n resources, and
  shared spell display helpers.
- Validation or acceptance evidence: targeted web tests, web typecheck/build,
  i18n checks when copy changes, and manual browser smoke on representative
  production or production-like routes.
- Non-goals and follow-up parking: no sitewide redesign, no new filter model,
  no broad spell card rebuild, and no data import work. Put broad styling work
  in v1.3 or `docs/stable-backlog.md`.
- Handoff owner: main gate review, then librarian freeze sweep.

## Problem

v1.1 changes the production surface through security hardening and a larger
content corpus. The API and data harness can pass while the frontend still has
rough edges: long rulebook labels, new spell names, denser lists, changed
content counts, language/display interactions, or About/Status metadata drift.

This pass belongs in v1.1 because it verifies the release as users see it, but
it should stay acceptance-sized rather than becoming the v1.3 redesign.

## Goals

- Verify Browse, Search, Spell Detail, About/Status, Settings, and core shell
  routes against the updated production content.
- Check representative newly imported spells and rulebooks for list-card,
  detail-page, scope-summary, label, and mobile layout fit.
- Confirm language mode, display settings, rulebook scope, loading, empty, and
  error states did not regress.
- Record focused evidence for the v1.1 freeze.

## Non-Goals

- Do not redesign the sitewide UI or spell card system.
- Do not introduce new feature scope beyond small fixes needed for v1.1 content
  acceptance.
- Do not change backend or data-tool behavior unless a frontend-blocking
  contract issue is proven.

## Current Facts

- v1.0 established Cloudflare Workers frontend delivery and About/Status
  metadata.
- v1.1 full-corpus work increases the visible spell and rulebook corpus.
- v1.3 remains the planned sitewide UX/style redesign release.

## Plan

### Slice 1: Smoke Matrix

- Deliverable: representative route/content matrix for v1.1 frontend smoke.
- Expected files: this plan during planning; freeze evidence during closeout.
- Validation: identify representative newly imported spells, rulebooks, display
  settings, and language modes after production DB activation.

### Slice 2: Focused Frontend Fixes

- Deliverable: small UI/copy/layout fixes needed for v1.1 content acceptance.
- Expected files: `web/` route/components, locale files if copy changes, and
  affected frontend docs only when behavior changes.
- Validation: `npm run test:web`, `npm run typecheck:web`,
  `npm run -w web build`, plus `npm run i18n:check` when copy changes.

### Slice 3: Production Frontend Smoke

- Deliverable: production or production-like smoke evidence for the accepted
  frontend pass.
- Expected files: this plan completion notes or v1.1 freeze evidence.
- Validation: browser smoke for Browse, Search, representative Detail pages,
  About/Status, Settings, mobile layout, language/display settings, and a direct
  route refresh through Cloudflare Workers.

## Acceptance Criteria

- Representative newly imported spells and rulebooks are visible and usable in
  Browse, Search, and Detail.
- Main frontend routes load and remain coherent on desktop and mobile widths.
- Language mode, rulebook labels, card display settings, and About/Status
  metadata still match the v1.1 runtime state.
- Required frontend tests, typecheck/build, and relevant i18n checks pass.
- Any remaining styling or redesign ideas are parked outside v1.1.

## Doc Updates

- Update this plan when frontend pass scope, route matrix, validation, or
  completion evidence changes.
- Update `docs/roadmap.md` only when v1.1 ordering or release state changes.
- Update `docs/features.md`, `docs/design.md`, or `docs/i18n.md` only when
  behavior, design guidance, or copy workflow changes.
- Do not update `integrated-plan.md` unless v1.1 adds one due to sequencing or
  ownership conflict.

## Open Questions

- Which newly imported spells and rulebooks should anchor the production smoke
  after DB activation?
- Should the frontend pass wait for production DB activation, or can a
  production-like local content DB smoke satisfy part of the evidence?

## Follow-Up Candidates

- Sitewide UX/style redesign remains v1.3 work.
- Larger filter UX changes remain outside v1.1 unless the new corpus exposes a
  blocking usability issue.

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or freeze snapshots instead of pasting logs.
