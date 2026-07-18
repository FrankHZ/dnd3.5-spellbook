# v1.3 Release Plan

Status: planned.

v1.3 is a focused sitewide UX and style release. It improves the product's
shared interface language across the existing spellbook workflows without
adding a new content, query, or data-model deliverable.

The release also carries one independent platform prerequisite: restore a
secure, reproducible GitHub Actions backend deployment path and prove it with a
real production deploy before v1.3 freezes. Platform work may run in parallel
with design work, but it is not part of the UX redesign deliverable.

## Release Boundary

v1.3 owns two acceptance tracks:

1. **Sitewide UX / style redesign**

   Establish a coherent design-system vocabulary and apply it across Browse,
   Search, Spell Detail, Publications, collections, prepared spells, Settings,
   About / Status, shared filters, spell cards, density controls, and mobile
   layouts. This is a product-cohesion pass, not an open-ended visual rewrite.

2. **Platform deployment prerequisite**

   Diagnose the blocked GitHub Actions SSH path, select a secure remote
   connection model without exposing SSH to the public internet, reconcile the
   deploy checkout's Git remote and branch metadata, prove the existing
   `sqlite3` bootstrap/preflight contract against host drift, and complete one
   real Actions deployment with live version/commit verification.

## Track Order And Ownership

- `frontend-design` owns
  [sitewide-ux-redesign-plan.md](./sitewide-ux-redesign-plan.md).
- `platform` owns
  [platform-deploy-prerequisite-plan.md](./platform-deploy-prerequisite-plan.md).
- Both tracks may begin after this plan is accepted and may proceed in
  parallel.
- The platform track does not block design exploration or implementation, but
  it is a hard prerequisite for final v1.3 acceptance and freeze.
- Main gate controls scope, cross-track decisions, merge readiness, and final
  acceptance. Neither specialist merges its own PR.

This release does not need an `integrated-plan.md`. The two child plans have
separate owners and edit surfaces; this README is the coordination contract.
Create an integrated plan only if implementation reveals a real sequence,
ownership, or cross-plan conflict that cannot be resolved here.

## Non-Goals

- Do not add a new spell corpus, translation corpus, or publication-data pass.
- Do not change normalized query contracts or backend filter semantics for the
  sake of the redesign.
- Do not start full spell-body, spell-name, or short-description translation
  and proofreading QA.
- Do not make automatic SQLite database deployment part of GitHub Actions.
- Do not solve Actions connectivity by opening SSH port 22 to
  `0.0.0.0/0` or `::/0`.
- Do not turn the UX track into a marketing-site redesign, framework migration,
  or unbounded component rewrite.

## Release Acceptance

v1.3 may freeze only when:

- the accepted shared UI vocabulary is applied consistently to the scoped
  screens and states in both English and Chinese;
- desktop and mobile acceptance covers Browse, Search, Spell Detail,
  Publications, collections, prepared spells, Settings, and About / Status;
- name and full-text Search, Browse filters, rulebook scope, local collections,
  and display preferences retain their accepted behavior;
- focused frontend tests, i18n checks, production build, and browser smoke pass;
- the platform prerequisite has selected and documented a secure Actions-to-
  origin connection model and has not introduced public unrestricted SSH;
- one real GitHub Actions deployment passes portable validation, authenticated
  remote connection, backend deployment, and live version/ref/commit smoke;
- deployment scripts, workflow configuration, operational docs, design docs,
  feature docs, and release navigation agree with the accepted implementation;
- a final `FREEZE.md` records both tracks' as-built evidence.

## Plans

- [sitewide-ux-redesign-plan.md](./sitewide-ux-redesign-plan.md)
- [platform-deploy-prerequisite-plan.md](./platform-deploy-prerequisite-plan.md)

## Handoff Rule

Implementation branches update their owning child plan and affected topic docs.
They should not turn this README into a progress ledger. Update this README only
when release scope, ownership, track relationship, or acceptance changes.
