# v3.5

Status: frozen.

`FREEZE.md` records the final as-built v3.5 state. The other files in this
folder are supporting plans and conflict-review notes.

## Frozen Scope

1. Split the current app-owned content DB boundary from the future
   user/app-state DB boundary before real server-side user data ships.
2. Build a normalized rules content model so the app can stop treating dirty
   legacy rules DB string columns as the long-term runtime schema.
3. Define the frontend consumer path for normalized rules facets before adding
   broad Browse/Search controls.
4. Review rulebook display labels so public UI does not depend on legacy
   DnDTools-style source abbreviations or slugs.
5. Review `AGENTS.md` together with feature and workflow docs so agent guidance,
   feature maps, and future module docs have clear ownership.
6. Review dependencies, apply safe updates with lockfile validation, add CI
   around the current unit/API/typecheck spine, keep E2E out of initial scope,
   and keep CD as a thin manual wrapper around the existing deployment scripts.
7. Establish high-level module design docs and keep merge-to-main doc-agent
   automation blocked until the runner/secrets decision is explicit.

## Plans

- [FREEZE.md](./FREEZE.md)
- [integrated-plan.md](./integrated-plan.md)
- [db-ownership-boundary-plan.md](./db-ownership-boundary-plan.md)
- [rules-content-normalization-plan.md](./rules-content-normalization-plan.md)
- [normalized-rules-frontend-consumer-plan.md](./normalized-rules-frontend-consumer-plan.md)
- [rulebook-display-labels-plan.md](./rulebook-display-labels-plan.md)
- [agent-guide-review-plan.md](./agent-guide-review-plan.md)
- [ci-cd-and-module-docs-plan.md](./ci-cd-and-module-docs-plan.md)

## Working Rule

Use `FREEZE.md` for shipped behavior and final acceptance evidence.

Use `integrated-plan.md` only when you need v3.5 sequencing rationale or
cross-plan conflict history. Do not treat it as an implementation status ledger.

Implementation branches should update the owning child plan, affected
operational/topic docs, and `docs/roadmap.md` only when the active work order
changes. They should not update `integrated-plan.md` unless version scope,
delivery sequence, plan ownership, or cross-plan conflicts changed.

Use `docs/templates/version-plan.md` and the repo-local `$version-plan-doc`
skill when adding new version plan docs.

Treat the supporting v3.5 plan docs as history and rationale, not newer proof
than the freeze snapshot.
