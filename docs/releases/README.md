# Release Planning

This directory contains formal post-MVP release plans.

Use `docs/mvp/` for MVP-stage history and the final MVP closeout. Use this
directory for release lines after MVP scope is frozen.

## Current Release Plans

- [v1.2/README.md](./v1.2/README.md): active full-spell source review,
  mechanics localization, and Publications page release plan.
- [v1.2/full-spell-source-review-plan.md](./v1.2/full-spell-source-review-plan.md):
  active full-spell source inventory and parse QA plan.
- [v1.2/full-corpus-correction-plan.md](./v1.2/full-corpus-correction-plan.md):
  planned post-review correction workflow for accepted corpus rows; it does not
  alter current v1.2 acceptance or freeze ordering.
- [v1.2/db-workflow-review-plan.md](./v1.2/db-workflow-review-plan.md):
  DB/content update checklist and fixture-manifest hardening for accepted data
  handoffs.
- [v1.2/mechanics-localization-plan.md](./v1.2/mechanics-localization-plan.md):
  active mechanics translation, QA workflow, and frontend consumer plan.
- [v1.2/publications-page-plan.md](./v1.2/publications-page-plan.md): active
  Publications page and minimum metadata plan.
- [v1.1/FREEZE.md](./v1.1/FREEZE.md): frozen production hardening, full spell
  corpus, and frontend content acceptance release snapshot.
- [v1.1/README.md](./v1.1/README.md): frozen production hardening, full spell
  corpus, and frontend content acceptance release plan.
- [v1.1/production-hardening-plan.md](./v1.1/production-hardening-plan.md):
  frozen CF/AWS security acceptance plan.
- [v1.1/full-spell-corpus-plan.md](./v1.1/full-spell-corpus-plan.md): frozen
  full spell corpus import and content DB activation plan.
- [v1.1/frontend-content-pass-plan.md](./v1.1/frontend-content-pass-plan.md):
  frozen focused frontend content acceptance plan.
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
