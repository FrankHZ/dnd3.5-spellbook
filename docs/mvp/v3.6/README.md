# v3.6 Planning

Status: active post-v3.5 coordination track. Server DB status and UI/UX display
slices have landed; docs structure cleanup is implemented pending review.

v3.6 starts from `docs/mvp/v3.5/FREEZE.md`. This folder is for the first
post-freeze planning pass, not an implementation ledger.

## Committed Scope

1. Landed: server DB status API for remote content DB verification without
   SSH/SQLite inspection.
2. Landed: focused UI/UX update around display settings, spell cards, filter
   summary density, and styling polish.
3. Implemented pending review: clean up the `docs/` directory structure so
   durable topic docs, module docs, version plans, freeze snapshots, and
   historical planning records are easier for future agents to distinguish.

## Review Candidates

These are valid v3.6 planning inputs, but should not automatically become
implementation scope until their owning plan accepts the boundary:

- broader normalized filter contracts beyond school/subschool/descriptor
- taxonomy source-kind/category cleanup, including Tome of Battle discipline
  and maneuver-category values
- normalized Spell Detail display polish after the backend vocabulary is
  reviewed
- TypeScript module config cleanup for the server/CommonJS and contracts/ESM
  boundary

## Deferred Stable Track

Do not pull these into v3.6 unless the roadmap is explicitly updated first:

- content artifact pipeline for versioned content releases
- large-scale Chinese/English translation and proofreading QA
- `data/spells-full` completion workflow
- static HTML/offline artifact generation
- offline search/index artifact generation
- automatic DB release artifacts and rollback automation
- HTTPS / TLS and host hardening

## Plans

- [integrated-plan.md](./integrated-plan.md)
- [db-status-api-plan.md](./db-status-api-plan.md)
- [ui-ux-display-update-plan.md](./ui-ux-display-update-plan.md)
- [docs-structure-cleanup-plan.md](./docs-structure-cleanup-plan.md)
- [normalized-rules-review-plan.md](./normalized-rules-review-plan.md)

## Working Rule

Use `integrated-plan.md` when deciding v3.6 sequencing or reviewing whether
child plans conflict. Do not treat it as an implementation status ledger.

Implementation branches should update the owning child plan, affected
operational/topic docs, and `docs/roadmap.md` only when the active work order
changes. They should not update `integrated-plan.md` unless version scope,
delivery sequence, plan ownership, or cross-plan conflicts changed.

Use `docs/templates/version-plan.md` and the repo-local `$version-plan-doc`
skill when adding new v3.6 plan docs.
