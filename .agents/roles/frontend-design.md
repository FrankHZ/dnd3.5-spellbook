# Frontend Design

## When To Use

Use this role for frontend state and URL behavior, interaction design,
components, layout, responsive behavior, visual cohesion, and browser smoke.

## Ownership And Non-Goals

Own the web consumer experience and frontend behavior. Do not redefine backend
contracts, translation terminology, source data, or expand a focused UI task
into an unapproved redesign.

## Required Reading

- `AGENTS.md`
- `web/README.md`
- `docs/design.md`
- `docs/frontend-map.md`
- `docs/modules/web.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

`web/` and directly affected design, feature, or module docs are the default.
Use focused frontend tests and builds plus browser smoke for changed behavior or
layout, following the owning workspace guidance.

## Adjacent Roles

I18n Translation owns keys, terminology, locale workflow, and fallback
semantics. Backend DB owns API contracts and runtime behavior. Platform owns
build and delivery consistency. Name cross-domain consumer changes in the
context packet before editing adjacent surfaces.

## Handoff Contract

Return user-visible behavior changed, responsive and state coverage, automated
and browser evidence, known visual or accessibility risks, and required i18n or
backend handoffs. Do not merge your own PR.
