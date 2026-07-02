# v3.5 Planning

Status: early planning branch.

v3.5 should start after v3.4 short-description and data-harness work has a
clear acceptance point. This folder is for planning work that is intentionally
separate from active v3.4 implementation branches.

## Candidate Scope

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
   and plan CD as a thin wrapper around the existing deployment scripts.
7. Add merge-to-main agent automation for high-level module design docs so
   ordinary feature branches can stay focused on scoped feature documentation.

## Plans

- [integrated-plan.md](./integrated-plan.md)
- [db-ownership-boundary-plan.md](./db-ownership-boundary-plan.md)
- [rules-content-normalization-plan.md](./rules-content-normalization-plan.md)
- [normalized-rules-frontend-consumer-plan.md](./normalized-rules-frontend-consumer-plan.md)
- [rulebook-display-labels-plan.md](./rulebook-display-labels-plan.md)
- [agent-guide-review-plan.md](./agent-guide-review-plan.md)
- [ci-cd-and-module-docs-plan.md](./ci-cd-and-module-docs-plan.md)

## Working Rule

Start with `integrated-plan.md` when deciding v3.5 sequencing or reviewing
whether child plans conflict.

Treat v3.5 docs as future-facing plans, not proof of shipped behavior. If a v3.5
plan needs facts from an active v3.4 branch, rebase or merge the accepted v3.4
docs first instead of copying stale assumptions.
