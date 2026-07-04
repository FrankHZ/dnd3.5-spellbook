# v3.6 Freeze

Status: frozen post-v3.5 stabilization stage.

Start with [FREEZE.md](./FREEZE.md) for final v3.6 as-built behavior and
validation evidence. Supporting plans explain intended scope, rationale, and
review decisions; they are not newer than the freeze snapshot.

v3.6 started from `docs/mvp/v3.5/FREEZE.md` and closed as a lightweight
post-freeze pass around DB status visibility, UI/UX display settings, docs
structure cleanup, and normalized rules review.

## Frozen Scope

1. Server DB status API for remote content DB verification without
   SSH/SQLite inspection.
2. Focused UI/UX update around display settings, spell cards, filter
   summary density, and styling polish.
3. Clean up the `docs/` directory structure so durable topic docs,
   module docs, version plans, freeze snapshots, and historical planning records
   are easier for future agents to distinguish.
4. Normalized rules review for component/mechanic/taxonomy readiness decisions
   without broadening public filter contracts in v3.6.

## Review Candidates

These are valid v3.6 planning inputs, but should not automatically become
implementation scope until their owning plan accepts the boundary:

- broader normalized filter contracts beyond school/subschool/descriptor
- taxonomy source-kind/category cleanup, including Tome of Battle discipline
  and maneuver-category values
- normalized Spell Detail display polish after the backend vocabulary is
  reviewed
- TypeScript module config cleanup for the server/CommonJS and contracts/ESM
  boundary is deferred to the v3.7 dependency-maintenance plan

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

- [FREEZE.md](./FREEZE.md)
- [acceptance-checklist.md](./acceptance-checklist.md)
- [integrated-plan.md](./integrated-plan.md)
- [db-status-api-plan.md](./db-status-api-plan.md)
- [ui-ux-display-update-plan.md](./ui-ux-display-update-plan.md)
- [docs-structure-cleanup-plan.md](./docs-structure-cleanup-plan.md)
- [normalized-rules-review-plan.md](./normalized-rules-review-plan.md)

## Working Rule

Use `FREEZE.md` for shipped/as-built behavior. Use the other v3.6 files as
historical plans and review records. Do not add new active scope to v3.6 after
freeze; promote follow-up work through `docs/roadmap.md` and the active version
planning docs instead.
