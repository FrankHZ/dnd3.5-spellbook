# v1.0 Release Ready Doc Sweep Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Make the final v1.0 documentation pass a release-readiness quality gate. This
plan does not add implementation scope. It verifies that canonical docs agree
after the domain/deployment and About / Status implementation branches have
updated their owning topic docs.

## Ownership

- Owning release: v1.0
- Owning domain: docs / delivery / release readiness
- Primary implementation branch or specialist: librarian
- Related docs: root `README.md`, `docs/README.md`, `docs/roadmap.md`,
  `AGENTS.md`, `docs/features.md`, `docs/design.md`,
  `docs/operations/*`, `docs/modules/*`
- Upstream dependency plans: `domain-and-deployment-plan.md`,
  `about-and-status-plan.md`
- Downstream consumer plans: v1.0 release acceptance and freeze

## Problem

The v1.0 release changes the public deployment topology from the MVP-era
single-origin model to Cloudflare Pages plus a dedicated API domain. Individual
implementation branches should update their owning topic docs, but formal
release readiness needs one final cross-doc sweep so current docs do not keep
describing the old topology as current truth.

This should be a final quality gate, not another implementation bucket.

## Goals

- Verify canonical docs agree on the v1.0 release topology.
- Remove or reframe current-truth wording that still describes MVP-era static
  frontend hosting on the origin server as the normal production model.
- Ensure Cloudflare Pages frontend responsibilities are reflected in current
  docs.
- Ensure `api.d20spellcodex.com` backend API responsibilities are reflected in
  current docs.
- Ensure About / Status behavior is described as the public release status
  surface.
- Keep old MVP docs historical instead of editing them into current release
  truth.
- Decide and document whether any public-facing external docs surface, such as
  GitHub Wiki, is needed for v1.0. Repository docs remain canonical either way.

## Non-Goals

- Do not add new runtime behavior.
- Do not make this branch responsible for implementing Cloudflare Pages, API
  CORS/TLS, or About / Status changes.
- Do not rewrite historical MVP snapshots except for navigation corrections.
- Do not migrate canonical release docs out of the repository.
- Do not make GitHub Wiki or another external docs surface a parallel source of
  truth for release planning.
- Do not pull stable-backlog content artifact, translation QA, static/offline,
  or backend normalization work into v1.0.

## Current Facts

- `docs/mvp/` contains MVP-stage planning and freeze records.
- `docs/releases/` is the formal post-MVP release planning surface.
- GitHub Wiki can be useful as a public reader entry point, but it is not part
  of PR review, CI, freeze snapshots, or agent-loaded repo context. If used, it
  should summarize and link back to repo docs.
- v1.0 plans the production split:
  - Cloudflare Pages frontend at `https://d20spellcodex.com`
  - backend API at `https://api.d20spellcodex.com`
  - origin server focused on Express/API, SQLite/content DB, DB update scripts,
    and Nginx API reverse proxying
- Existing docs still contain MVP-era deployment descriptions until the v1.0
  implementation branches update them.

## Plan

### Slice 1: Navigation And Role Sweep

- Deliverable: verify root README, `docs/README.md`, `docs/roadmap.md`, and
  `AGENTS.md` point readers to the correct current release docs and do not
  confuse MVP history with formal release planning.
- Expected files: root README, `docs/README.md`, `docs/roadmap.md`,
  `AGENTS.md`, this plan if findings change.
- Validation: docs review and `git diff --check`.

### Slice 2: Product And Design Truth Sweep

- Deliverable: verify `docs/features.md` and `docs/design.md` describe current
  user-visible release behavior, including About / Status and the final
  frontend topology where relevant.
- Expected files: `docs/features.md`, `docs/design.md`.
- Validation: docs review against accepted v1.0 behavior and browser smoke
  evidence from implementation branches.

### Slice 3: Operations And Module Ownership Sweep

- Deliverable: verify `docs/operations/*` and `docs/modules/*` agree on:
  - Cloudflare Pages owns production frontend delivery
  - `api.d20spellcodex.com` is the public API domain
  - backend deploy remains remote/server owned
  - DB updates remain operator-owned
  - Nginx on the origin is API reverse proxy, not canonical static frontend
    hosting for v1.0 production
- Expected files: operations docs and module docs touched by implementation
  branches.
- Validation: docs review against release acceptance evidence.

### Slice 4: Release Freeze Readiness

- Deliverable: verify the v1.0 release README, child plans, final acceptance
  evidence, and freeze snapshot agree before v1.0 is frozen.
- Expected files: `docs/releases/v1.0/README.md`,
  `docs/releases/v1.0/FREEZE.md`, child plans, roadmap after promotion.
- Validation:
  - docs navigation agrees across root README, docs index, roadmap, AGENTS,
    operations docs, module docs, and release README
  - accepted implementation evidence is linked or summarized
  - no unresolved documentation mismatch remains a release blocker

### Slice 5: Public Docs Surface Decision

- Deliverable: decide whether v1.0 needs an external public docs surface such
  as GitHub Wiki, and document the chosen boundary.
- Expected decision:
  - repo `docs/` remains canonical
  - GitHub Wiki, if enabled, is a short public index or reader-facing summary
    that links back to canonical repo docs
  - release implementation and freeze work do not depend on manually syncing a
    second docs source
- Validation:
  - docs navigation states the source of truth
  - any external docs surface is checked only as a release-readiness item, not
    as an implementation blocker unless the release explicitly depends on it

## Acceptance Criteria

- Root README, docs index, roadmap, AGENTS.md, features, design, operations
  docs, module docs, and release README agree on the v1.0 topology.
- Canonical docs describe Cloudflare Pages as the production frontend host.
- Canonical docs describe `api.d20spellcodex.com` as the production API domain.
- Canonical docs describe the origin server as backend/API/content/DB-update
  infrastructure, not the normal production static frontend host.
- About / Status is represented as the release status surface.
- Old MVP docs remain historical and are not edited into current release truth.
- Repo `docs/` remains the canonical release documentation source.
- Any GitHub Wiki or external docs surface is either explicitly out of scope or
  documented as a non-canonical public index that links back to repo docs.
- Documentation navigation, deployment docs, module ownership docs, and release
  README all agree before v1.0 freeze.
- `git diff --check` passes.

## Doc Updates

- Update this plan when release-ready doc sweep scope changes.
- Update current canonical docs when they conflict with accepted v1.0 behavior.
- Update historical MVP docs only for navigation corrections.
- Update `docs/roadmap.md` only when v1.0 active work ordering or release scope
  changes.

## Open Questions

- None for planning. If the sweep finds an actual behavior mismatch, route it
  back to the owning implementation plan instead of expanding this plan.

## Follow-Up Candidates

- A broader architecture-doc refresh can remain post-v1.0 unless the release
  sweep finds a direct public-doc blocker.

## Completion Notes

Use this section only after implementation review. Keep it short and link to
merged PRs, validation evidence, or release freeze snapshots instead of pasting
logs.
