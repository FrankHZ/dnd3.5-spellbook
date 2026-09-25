# Roadmap

This document is the lightweight official roadmap for active work.

It is intentionally shorter than the versioned stage plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

Keep scratch notes, unpromoted ideas, and loose follow-up candidates in
`docs/stable-backlog.md` or the owning feature/version plan. Promote an item
here only when the direction is accepted, the scope can be bounded, and
acceptance can be described.

## Current Track

v1.4 is replanned for dice database Chinese text replacement:

- [Release boundary](./releases/v1.4/README.md)
- [Integrated sequence](./releases/v1.4/integrated-plan.md)
- [Source intake and matching](./releases/v1.4/dice-source-intake-plan.md)
- [English-assisted discrepancy QA](./releases/v1.4/dice-text-qa-plan.md)
- [Safe activation and consumer acceptance](./releases/v1.4/dice-content-activation-plan.md)

Use the supplied `data/spells-dice-db-by-mo/` package across existing supported
publications. Match and QA replacements, retaining CHM/English fallback for
uncovered or unresolved content. PDF extraction, its human review queues, and
full PHB retranslation are suspended. Existing code/tests/data are retained;
no old PHB gate blocks the new release. Implementation has not started.

v1.3 is the latest frozen formal release:

- `docs/releases/v1.3/FREEZE.md`
- `docs/releases/v1.3/README.md`
- `docs/releases/v1.3/sitewide-ux-redesign-plan.md`
- `docs/releases/v1.3/platform-deploy-prerequisite-plan.md`

Root release metadata is `v1.3.0`. Production metadata activation follows the
freeze merge and must be verified separately before tagging.

v1.2.2 is the previous frozen formal release, covering internal quality
maintenance:

- `docs/releases/v1.2.2/FREEZE.md`
- `docs/releases/v1.2.2/README.md`
- `docs/releases/v1.2.2/agent-workflow-hardening-plan.md`
- `docs/releases/v1.2.2/code-and-test-qa-plan.md`

v1.2.1 is the previous frozen formal release and latest frozen
production/public release:

- `docs/releases/v1.2.1/FREEZE.md`
- `docs/releases/v1.2.1/README.md`
- `docs/releases/v1.2.1/full-text-search-plan.md`

v1.2 is an older frozen formal public release:

- `docs/releases/v1.2/FREEZE.md`
- `docs/releases/v1.2/README.md`
- `docs/releases/v1.2/full-spell-source-review-plan.md`
- `docs/releases/v1.2/full-corpus-correction-plan.md`
- `docs/releases/v1.2/db-workflow-review-plan.md`
- `docs/releases/v1.2/mechanics-localization-plan.md`
- `docs/releases/v1.2/publications-page-plan.md`

v1.1 is an older frozen formal public release:

- `docs/releases/v1.1/FREEZE.md`
- `docs/releases/v1.1/README.md`
- `docs/releases/v1.1/production-hardening-plan.md`
- `docs/releases/v1.1/full-spell-corpus-plan.md`
- `docs/releases/v1.1/frontend-content-pass-plan.md`

v1.0 is the older frozen formal public release:

- `docs/releases/v1.0/FREEZE.md`
- `docs/releases/v1.0/README.md`
- `docs/releases/v1.0/domain-and-deployment-plan.md`
- `docs/releases/v1.0/about-and-status-plan.md`
- `docs/releases/v1.0/release-ready-doc-sweep-plan.md`

The latest frozen pre-release snapshot is `docs/mvp/v3.10/FREEZE.md`.

Use the v1.3 freeze for accepted UI/platform behavior, the v1.2.2 freeze for
accepted internal maintenance behavior, and the v1.2.1 freeze for the latest
frozen content-backed Search/DB production snapshot. Do not reopen those
releases while scoping later work.

Older frozen snapshots remain historical comparison points, not active
baselines.

## Completed Work References

Use the frozen release records above for shipped acceptance and `git log` for
implementation history. Paused PHB work is preserved in the v1.4 `phb-*` child
plans, not in the active work queue.

## Current Data Pointers

Keep detailed counts and acceptance evidence in the owning data, operations, or
freeze docs instead of copying them into this roadmap.

- Runtime DB roles and local setup live in `docs/operations/data-setup.md`.
- Import and content DB workflows live in `docs/operations/import-workflow.md`.
- Rules DB inspection and structured patch notes live in
  `docs/operations/rules-db-notes.md`.
- Current public release DB/status behavior is frozen in
  `docs/releases/v1.2.1/FREEZE.md`.
- Current v1.3 UI/platform code acceptance is frozen in
  `docs/releases/v1.3/FREEZE.md`.
- Production still uses an operator-owned content DB upload/activation path;
  DB upload is not part of automatic CD.
- `GET /api/status/db` remains the remote runtime state check for content DB
  activation and provenance, with private details protected in production.

## Next Work

1. **Accept the revised v1.4 planning boundary.** This session changes only
   plans and documentation. PR #113 remains open on the suspended PDF/SRD
   track with unresolved provenance findings; it is not a merge prerequisite.
   See the release README for its recommended close-unmerged disposition.
2. **Inventory and commit the intended dice source snapshot in nested data.**
   The supplied TXT directory is currently untracked; the nested repo remains
   on the old PHB branch. Preserve both and choose the intake data branch/base
   explicitly before implementation. Confirm publication/edition mappings and
   source credits without inferring unique coverage from header counts.
3. **Build a bounded TXT parse/match/comparison pilot, then the full inventory.**
   Reuse existing header/matching helpers; match existing IDs by book and name.
   Account for duplicate, new/unsupported, malformed, and missing candidates.
4. **Resolve substantive differences using aligned English.** Batch clean
   cases, use agent QA for semantic differences, and send only unresolved
   conflicts to the user. Record fallback instead of blocking all replacements.
5. **Implement safe accepted-text activation.** Preserve uncovered CHM, current
   English/mechanics/summaries, and existing variant requests; dry-run on a
   disposable artifact, rebuild Search, and verify API/EN/ZH consumers.
6. **Accept coverage and prepare the operator handoff.** Freeze and production
   activation require later evidence and authorization. The existing v1.3
   metadata activation/tag verification remains a separate operator follow-up,
   not a prerequisite to source inventory or a claim of deployed v1.4.

## Official Release Sequence

The expected post-v1.1 release order is:

1. **v1.2 Full-Spell Review + Mechanics Localization + Publications Page
   (Frozen)**

   Review the local full-spell 6.01 source package and the existing v6.00
   parsed JSON quality, translate all normalized mechanics into Chinese, run
   and document the translation + QA workflow as a reusable agent
   skill/playbook, make frontend mechanics display correctly in Chinese, and
   add a Publications page for rulebook/publication browsing and scope
   management. Add only the publication metadata needed to make that page
   durable.

2. **v1.2.1 Content-Backed Full-Text Search (Frozen)**

   Add an explicit Search mode for content-backed full-text queries over
   prepared spell text while preserving name search as the default. Keep the
   existing Search rulebook scope, class/domain/level filters, taxonomy,
   component, and mechanics filters active in full-text mode. Use SQLite FTS5
   inside the content DB rather than a separate search service.

3. **v1.2.2 Internal Quality Maintenance (Frozen)**

   Hardened agent role contracts and tool adapters first, then completed a
   structured code/test QA pass across backend/DB, data tooling,
   frontend/i18n, and platform boundaries. All P1 findings were fixed, every
   P2 was fixed or explicitly deferred, and no user-facing scope was added.

4. **v1.3 Sitewide UX / Style Redesign + Platform Prerequisite (Frozen)**

   Completed the deliberate sitewide cohesion pass across Browse, Search,
   Detail, About/Status, collections, prepared spells, Publications, filters,
   spell cards, density, and mobile behavior. The independent platform track
   restored and proved the secure GitHub Actions backend deploy path before
   freeze.

5. **v1.4 Dice Database Chinese Text Replacement (Planned)**

   Replace matched CHM Chinese text from the supplied TXT corpus, resolve
   substantive differences against English, retain explicit fallback, and
   validate accepted import/search/consumer behavior. PDF extraction is paused.

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- content artifact pipeline for versioned content releases outside the v1.1
  full-corpus acceptance path
- static HTML/offline artifact generation to replace old loose HTML
  distribution
- search/index artifact generation for offline or static deployments; v1.2.1
  owns only online content DB full-text search
- package-manager migration spike, if npm workspaces become a real bottleneck:
  keep npm as the default for now; prefer a focused pnpm spike over Yarn if
  install speed, disk usage, workspace filtering, or dependency isolation become
  worth the CI/deploy/docs migration cost
- full server ESM runtime migration only if the CommonJS server plus package
  imports boundary starts creating real deploy/runtime risk
- DB schema and server backend review to remove legacy fallback paths after the
  normalized content contract settles; do not optimize for minimal migration in
  that pass, and prefer a clean schema/query design over preserving temporary
  compatibility layers
- complete filter UX design for future normalized detail filters: the v3.8
  sidebar works for the current small taxonomy/component set, but a larger
  filter vocabulary needs a deliberate model for grouping, density, chip
  labels, reset behavior, mobile disclosure, scope summaries, and how advanced
  filters differ from primary Browse/Search scope
- rollback playbook
- release automation beyond the current backend deploy workflow
- deeper architecture docs beyond the v3.5 module-doc automation pass

See `docs/stable-backlog.md`.

## Working Rule

When restarting after a gap:

1. read this roadmap
2. check `git status --short`
3. read the topic doc for the next area
4. run the smallest relevant validation command before editing
5. update this roadmap only when the next-work order or active track changes
