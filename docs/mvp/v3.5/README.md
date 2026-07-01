# v3.5 Planning

Status: early planning branch.

v3.5 should start after v3.4 short-description and data-harness work has a
clear acceptance point. This folder is for planning work that is intentionally
separate from active v3.4 implementation branches.

## Candidate Scope

1. Review DB ownership boundaries before real user/app-state data ships.
2. Review rulebook display labels so public UI does not depend on legacy
   DnDTools-style source abbreviations or slugs.
3. Review `AGENTS.md` so it becomes a compact execution guide again instead of
   a second documentation map.

## Plans

- [db-ownership-boundary-plan.md](./db-ownership-boundary-plan.md)
- [rulebook-display-labels-plan.md](./rulebook-display-labels-plan.md)
- [agent-guide-review-plan.md](./agent-guide-review-plan.md)

## Working Rule

Treat v3.5 docs as future-facing plans, not proof of shipped behavior. If a
v3.5 plan needs facts from an active v3.4 branch, rebase or merge the accepted
v3.4 docs first instead of copying stale assumptions.
