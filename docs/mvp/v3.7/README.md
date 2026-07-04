# v3.7 Planning

Status: active security, deploy/status visibility, and
dependency-maintenance planning track after the v3.6 freeze.

v3.7 is a focused security review, hardening-planning, dependency maintenance,
and deploy/status visibility pass. It is not a large product deliverable,
content release, or broad architecture rewrite.

## Committed Scope

1. Record the first repository security review after the content DB, deployment,
   and DB status API work.
2. Classify security findings by practical priority and implementation surface.
3. Select small hardening slices that can land without blocking ongoing UI,
   docs, or data work.
4. Add a small About / Version status page so frontend, backend, and content DB
   build state can be checked without SSH or SQLite inspection.
5. Promote major and risky dependency upgrades deferred from the v3.5
   safe-update pass into a focused v3.7 maintenance plan.
6. Decide the TypeScript server/CommonJS and contracts/ESM module boundary
   before removing the current deprecation suppression.

## Review Inputs

- public Express API surface and error behavior
- DB status endpoint exposure and operator workflow
- deployment scripts, GitHub Actions, SSH, and Nginx bootstrap docs
- frontend HTML rendering and browser-local state
- deploy-time frontend/backend version metadata
- dependency audit output
- v3.5 deferred major dependency inventory
- v3.6 TypeScript module config cleanup review candidate
- existing stable backlog security items

## Non-Goals

- Do not add authentication or user accounts as part of the review branch.
- Do not redesign deployment or DB artifact delivery in this branch.
- Do not run `npm audit fix --force`; dependency changes need a separate
  review because the current audit suggestion downgrades Prisma.
- Do not switch server module resolution or remove TypeScript deprecation
  suppression without a focused server/contracts compatibility review.
- Do not interrupt v3.6 UI/docs planning tracks for dependency maintenance.
- Do not treat stable-version security hardening as finished until accepted
  implementation PRs land.

## Plans

- [security-review.md](./security-review.md)
- [about-version-page-plan.md](./about-version-page-plan.md)
- [dependency-upgrade-plan.md](./dependency-upgrade-plan.md)

## Working Rule

Use `security-review.md` as the v3.7 source of truth for security findings,
priority, and first hardening slices. Use `about-version-page-plan.md` for the
small deploy/status visibility deliverable. Use `dependency-upgrade-plan.md`
for major/risky dependency inventory, sequencing, and validation boundaries.

Implementation branches should update the owning security review section,
the owning dependency plan section, affected operational docs, and
`docs/roadmap.md` only when active ordering changes. Create an integrated plan
only if v3.7 grows into multiple conflicting workstreams.
