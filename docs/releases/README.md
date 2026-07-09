# Release Planning

This directory contains formal post-MVP release plans.

Use `docs/mvp/` for MVP-stage history and the final MVP closeout. Use this
directory for release lines after MVP scope is frozen.

## Current Release Plans

- [v1.1/README.md](./v1.1/README.md): active production hardening, full spell
  corpus, and frontend content acceptance release plan.
- [v1.1/production-hardening-plan.md](./v1.1/production-hardening-plan.md):
  active CF/AWS security acceptance plan.
- [v1.1/full-spell-corpus-plan.md](./v1.1/full-spell-corpus-plan.md): active
  full spell corpus import and content DB activation plan.
- [v1.1/frontend-content-pass-plan.md](./v1.1/frontend-content-pass-plan.md):
  active focused frontend content acceptance plan.
- [v1.0/FREEZE.md](./v1.0/FREEZE.md): frozen first formal public release
  snapshot.
- [v1.0/README.md](./v1.0/README.md): frozen first formal public release
  planning record.

## Maintenance Rules

- Keep release plans focused on public release readiness, deployment topology,
  operational acceptance, and release-specific user-visible completeness.
- Do not backfill old MVP history into this directory.
- Keep canonical release docs in the repository so PR review, CI, freeze
  snapshots, and agent workflows use the same source of truth.
- GitHub Wiki or another external docs surface may link to or summarize these
  docs, but should not become the canonical release-planning source.
- Keep large deferred engineering candidates in `docs/stable-backlog.md` until
  they are explicitly promoted into a release plan.
- Update `docs/roadmap.md` only when a release plan becomes the active track.
- A `FREEZE.md` in a release folder records the shipped release state.
