# Versioned MVP Docs

This directory contains stage records and active version planning spaces.

Use version folders for release-scoped planning, acceptance evidence, and
freeze snapshots. Do not use older MVP folders as the daily working surface for
new behavior.

## Current Version Folders

- `v3.7`: latest frozen release snapshot and supporting plans.
- `v3.6`: previous frozen release snapshot and supporting plans.
- `v3.5`: older frozen release snapshot and supporting plans.
- `v3.4` and older: historical release snapshots, plans, and handoff records.

## How To Read A Version Folder

When a version has a `FREEZE.md`, read it first for shipped/as-built behavior.
Supporting plan files explain rationale and implementation history, but they
are not newer than the freeze snapshot.

When a version is active and not frozen, read its `README.md` first. If it has
an `integrated-plan.md`, use that only for sequencing, scope split, ownership,
and conflict review. Implementation branches should update their focused child
plan instead of turning integrated plans into status ledgers.

## Maintenance Rules

- Keep frozen version folders immutable except for navigation corrections.
- Put durable current behavior in topic docs such as `docs/features.md`,
  `docs/operations/deployment.md`, `docs/operations/data-setup.md`, or `docs/modules/`.
- Put current work order in `docs/roadmap.md`.
- Create new child plans from `docs/templates/version-plan.md`.
- Create acceptance checklists and freeze snapshots from the matching templates
  under `docs/templates/`.
