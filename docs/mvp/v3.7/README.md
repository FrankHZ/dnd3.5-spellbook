# v3.7 Planning

Status: active security review planning track after the v3.6 DB status slice.

v3.7 is a focused security review and hardening-planning pass. It is not a
large product deliverable, content release, or broad architecture rewrite.

## Committed Scope

1. Record the first repository security review after the content DB, deployment,
   and DB status API work.
2. Classify security findings by practical priority and implementation surface.
3. Select small hardening slices that can land without blocking ongoing UI,
   docs, or data work.

## Review Inputs

- public Express API surface and error behavior
- DB status endpoint exposure and operator workflow
- deployment scripts, GitHub Actions, SSH, and Nginx bootstrap docs
- frontend HTML rendering and browser-local state
- dependency audit output
- existing stable backlog security items

## Non-Goals

- Do not add authentication or user accounts as part of the review branch.
- Do not redesign deployment or DB artifact delivery in this branch.
- Do not run `npm audit fix --force`; dependency changes need a separate
  review because the current audit suggestion downgrades Prisma.
- Do not treat stable-version security hardening as finished until accepted
  implementation PRs land.

## Plans

- [security-review.md](./security-review.md)

## Working Rule

Use `security-review.md` as the v3.7 source of truth for findings, priority,
and first hardening slices.

Implementation branches should update the owning security review section,
affected operational docs, and `docs/roadmap.md` only when active ordering
changes. Create an integrated plan only if v3.7 grows beyond this security
review track into multiple conflicting workstreams.
