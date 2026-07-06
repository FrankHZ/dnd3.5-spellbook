# Release Planning

This directory contains formal post-MVP release plans.

Use `docs/mvp/` for MVP-stage history and the final MVP closeout. Use this
directory for release lines after MVP scope is frozen.

## Current Release Plans

- [v1.0/README.md](./v1.0/README.md): planned first formal public release line.

## Maintenance Rules

- Keep release plans focused on public release readiness, deployment topology,
  operational acceptance, and release-specific user-visible completeness.
- Do not backfill old MVP history into this directory.
- Keep large deferred engineering candidates in `docs/stable-backlog.md` until
  they are explicitly promoted into a release plan.
- Update `docs/roadmap.md` only when a release plan becomes the active track.
- A `FREEZE.md` in a release folder records the shipped release state.
