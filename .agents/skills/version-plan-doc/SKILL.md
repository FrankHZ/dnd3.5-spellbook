---
name: version-plan-doc
description: Shape docs/mvp/v* version planning docs in dnd3.5-spellbook. Use when creating, updating, reviewing, or assigning version README files, integrated plans, child plan docs, roadmap links, acceptance/freeze planning, or deciding whether an implementation branch should touch integrated-plan.md.
---

# Version Plan Doc

Use this skill to keep version planning docs useful without turning every
implementation branch into a cross-doc synchronization exercise.

## Core Rule

Integrated plans are early planning and conflict-review documents. Do not update
an integrated plan for ordinary implementation progress, validation evidence, or
completion notes.

Update an integrated plan only when one of these changes:

- version scope
- delivery sequence
- ownership boundary between child plans
- cross-plan conflict or decision
- added or retired major workstream

For implementation branches, update the owning child plan, affected operational
topic docs, and `docs/roadmap.md` only when active ordering changes.

## Doc Roles

- `docs/mvp/vX.Y/README.md`: version folder map, scope summary, and doc roles.
- `docs/mvp/vX.Y/integrated-plan.md`: cross-plan sequencing and conflict
  review; not a status ledger.
- `docs/mvp/vX.Y/*-plan.md`: child plan owned by one domain or deliverable.
- `docs/roadmap.md`: current next-work order after a pause.
- `docs/mvp/vX.Y/acceptance-checklist.md`: acceptance evidence while closing a
  version.
- `docs/mvp/vX.Y/FREEZE.md`: as-built shipped snapshot after acceptance.

## New Plan Workflow

1. Read `docs/roadmap.md`, `docs/mvp/README.md`, and the target version
   `README.md`.
2. For child plans, copy `docs/templates/version-plan.md` and fill only the
   sections that matter.
3. Put the plan maintenance rule at the top of new child plans.
4. Keep the plan scoped to one ownership domain. Split a broad plan instead of
   making it a second integrated plan.
5. Link affected operational docs, module docs, or feature docs under the
   `Doc Updates` section.
6. Use `integrated-plan.md` only to resolve cross-plan sequence or conflict.

## Implementation Branch Updates

Default to these updates:

- owning child plan: status, accepted slices, remaining work, validation notes
- topic docs: behavior, workflow, commands, schema, deployment, or i18n facts
- `docs/roadmap.md`: only if next-work order or active track changes

Do not update these by default:

- `integrated-plan.md`
- frozen older version plans
- unrelated child plans

## Templates

Use `docs/templates/version-plan.md` for new child plans. If a new document is
an integrated plan or version README, keep the same maintenance rule but adapt
the body to the doc role above.

Use `docs/templates/acceptance-checklist.md` when creating version acceptance
checklists. Use `docs/templates/freeze-snapshot.md` when preparing a new
freeze snapshot draft.

Operational and data workflow links now live under `docs/operations/`, for
example `docs/operations/deployment.md` and
`docs/operations/data-setup.md`.
