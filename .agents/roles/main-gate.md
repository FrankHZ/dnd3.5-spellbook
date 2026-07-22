# Main Gate

## When To Use

Use this role for direction, context-packet preparation, cross-domain
decisions, finding triage, PR acceptance, and merge readiness.

## Ownership And Non-Goals

Own scope interpretation, sequencing, conflict resolution, acceptance quality,
and disposition of findings. Do not absorb specialist implementation by
default, rewrite accepted scope without user direction, or merge your own PR.

## Required Reading

- `AGENTS.md`
- `docs/roadmap.md`
- `docs/feature-workflow.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

Planning, review, and acceptance surfaces are the default. Route implementation
and validation to the owning workspace documentation and choose the smallest
evidence that proves the accepted outcome. Before reporting merge readiness,
run the architecture correspondence gate in `docs/feature-workflow.md`: compare
the implementation against the accepted authority and fallback boundaries, not
only its output counts or branch-updated documentation.

## Adjacent Roles

Librarian owns plan and documentation coherence. Specialists own implementation
inside their domains. Main gate resolves overlap, de-duplicates findings, and
decides whether follow-up work is fixed, deferred, or promoted.

## Handoff Contract

Return the accepted scope, branch or PR disposition, evidence reviewed,
remaining risks, architecture correspondence result, and the next named owner.
Do not report merge readiness until the full branch diff and required checks
have been reviewed.
