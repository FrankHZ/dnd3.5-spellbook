# Release Planning

This directory contains formal post-MVP release plans.

Use `docs/mvp/` for MVP-stage history and the final MVP closeout. Use this
directory for release lines after MVP scope is frozen.

v1.3 is the latest frozen formal release. Post-v1.3 planning is not yet assigned
a version; use `docs/roadmap.md` for next-work ordering.

## Release Records

- [v1.3/FREEZE.md](./v1.3/FREEZE.md): latest frozen formal release snapshot.
- [v1.3/README.md](./v1.3/README.md): frozen release boundary, ownership, and
  accepted track map.
- [v1.3/sitewide-ux-redesign-plan.md](./v1.3/sitewide-ux-redesign-plan.md):
  accepted frontend-design record for sitewide cohesion.
- [v1.3/platform-deploy-prerequisite-plan.md](./v1.3/platform-deploy-prerequisite-plan.md):
  accepted independent platform prerequisite for secure Actions deployment.
- [v1.2.2/FREEZE.md](./v1.2.2/FREEZE.md): previous frozen formal release
  snapshot for the internal quality-maintenance release.
- [v1.2.2/README.md](./v1.2.2/README.md): frozen internal quality-maintenance
  release boundary and accepted pass map.
- [v1.2.2/agent-workflow-hardening-plan.md](./v1.2.2/agent-workflow-hardening-plan.md):
  accepted canonical roles, thin tool adapters, and workflow correspondence
  checks.
- [v1.2.2/code-and-test-qa-plan.md](./v1.2.2/code-and-test-qa-plan.md):
  accepted role-based read-only audits, main-gate triage, bounded fixes, and
  regression record.
- [v1.2.1/FREEZE.md](./v1.2.1/FREEZE.md): previous frozen formal release and
  latest frozen production/public release snapshot.
- [v1.2.1/README.md](./v1.2.1/README.md): frozen focused content-backed
  full-text spell search release record.
- [v1.2.1/full-text-search-plan.md](./v1.2.1/full-text-search-plan.md):
  accepted Search full-text mode, content DB FTS index, and frontend consumer
  record.
- [v1.2/FREEZE.md](./v1.2/FREEZE.md): older frozen full-spell review,
  mechanics localization, Publications, and DB/content workflow snapshot.
- [v1.2/README.md](./v1.2/README.md): frozen full-spell source review,
  mechanics localization, and Publications page release plan.
- [v1.2/full-spell-source-review-plan.md](./v1.2/full-spell-source-review-plan.md):
  accepted full-spell source inventory and parse QA record.
- [v1.2/full-corpus-correction-plan.md](./v1.2/full-corpus-correction-plan.md):
  accepted post-review correction apply and activation record.
- [v1.2/db-workflow-review-plan.md](./v1.2/db-workflow-review-plan.md):
  accepted DB/content update and fixture-manifest hardening record.
- [v1.2/mechanics-localization-plan.md](./v1.2/mechanics-localization-plan.md):
  accepted mechanics translation, QA workflow, and frontend consumer record.
- [v1.2/publications-page-plan.md](./v1.2/publications-page-plan.md): accepted
  Publications page and minimum metadata record.
- [v1.1/FREEZE.md](./v1.1/FREEZE.md): older frozen production hardening,
  full spell corpus, and frontend content acceptance release snapshot.
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
