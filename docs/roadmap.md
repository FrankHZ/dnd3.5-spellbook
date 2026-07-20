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

v1.4 planning is active:

- `docs/releases/v1.4/README.md`
- `docs/releases/v1.4/integrated-plan.md`
- `docs/releases/v1.4/phb-source-and-errata-plan.md`
- `docs/releases/v1.4/phb-translation-qa-plan.md`
- `docs/releases/v1.4/phb-content-activation-plan.md`

The release is deliberately limited to PHB 3.5. It pins the PHB PDF and
official errata, accepts the effective English source before translation,
translates/proofreads the accepted Chinese corpus, and activates only accepted
rows. Source/translation bytes remain in the nested local data repo.

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

## Recently Completed

The v1.3 sitewide UX/style and platform release is frozen with:

- `docs/releases/v1.3/FREEZE.md` as the canonical as-built snapshot.
- PR #95 and Actions run `29669906495` accepting the OIDC-backed temporary
  runner `/32` deployment path, strict SSH identity, exact-commit deploy,
  metadata, and firewall restoration.
- PR #96 applying the modern rulebook-inspired interface vocabulary across all
  scoped routes without changing accepted product contracts.
- English/Chinese desktop/mobile browser acceptance and merged-main portable
  CI run `29704940782` passing.
- root release metadata advanced to `v1.3.0`; production metadata activation
  remains the explicit post-freeze merge operation before tagging.

The v1.2.2 internal quality-maintenance release is frozen with:

- `docs/releases/v1.2.2/FREEZE.md` as the canonical as-built snapshot.
- seven canonical roles, seven thin Codex adapters, and maintained
  role/adapter correspondence checks accepted in PR #79.
- five read-only role audits, centralized main-gate triage, and 27 final
  dispositions recorded through PRs #80 and #81.
- ten bounded fix batches merged in PRs #82 through #91: 25 findings fixed,
  one P2 deferred, one unsupported path closed, and no open P0/P1.
- portable, root, deployment, server, web, data, import, i18n, build/runtime,
  local-data, and English/Chinese desktop/mobile smoke acceptance passing.
- `DP-AUD-007` preserved in `docs/stable-backlog.md` and the temporary QA
  evidence pack removed.
- production deployment explicitly excluded from this internal freeze.

The v1.2 release is frozen with:

- `docs/releases/v1.2/FREEZE.md` as the as-built snapshot.
- full-spell source inventory and parsed-source QA without an unsafe broad
  import.
- 34 evidence-backed corpus correction operations and a durable DB/content
  handoff workflow.
- explicit mechanics display coverage, Chinese normalized mechanics display,
  and authoritative raw fallback.
- accepted publication metadata plus `/publications` as the scope-management
  surface.
- production backend `e244a02` and content DB build provenance matching parent
  `2d98ed4`, data `fbdcc780`, 5,097 spells, and 3,560 issues.

The v1.2 Mechanics Localization track is accepted with:

- explicit normalized mechanics display coverage independent from parser review
  status.
- deterministic English normalized display for complete facets while partial,
  review, unsupported, and legacy rows preserve authoritative raw text.
- maintained Chinese mechanics vocabulary and portable i18n audit coverage.
- frontend Spell Detail consumption with complete-only normalized display and
  tested raw fallback.
- focused web, i18n, build, and root verification passing before merge in #72.

The v1.2 Publications track is accepted with:

- `/publications` as the primary publication/rulebook scope management page.
- Settings no longer acting as the rulebook-scope management surface.
- accepted publication metadata powering robust page grouping.
- publication row sorting by accepted date or abbreviation within stable
  category/family groups.
- local publication metadata refresh showing 151 `RulebookContent` rows, 111
  accepted publication rows, and 111 publication-date rows.

The v1.2 Full-Spell Source Review track is accepted with:

- `docs/releases/v1.2/full-spell-source-review-report.md` as the committed
  source/parse QA record.
- repeatable `spells-full:inspect -- source-package` inventory for local
  `data/spells-full/v6.01/`.
- parsed JSON QA identifying `120` high-confidence body/table-name rows in the
  historical v6.00 parsed source.
- `spells-full:inspect -- corpus-inventory` producing `0` ready patch rows, so
  no DB/content import handoff was made by the review track.

The v1.1 release is frozen with:

- `docs/releases/v1.1/FREEZE.md` as the as-built snapshot.
- production hardening for the Cloudflare Workers frontend plus
  Lightsail/Nginx/Express API topology.
- full source-backed spell corpus import through maintained data tooling.
- rulebook-backed corpus patch flow with structured `insertRulebook` and
  `insertSpell` validation.
- focused frontend content acceptance for Settings rulebook tabs, rulebook
  scope links, About/Credits, and representative v1.1 content.
- backend deploy to commit `9cf77e4d6dda7b2700be5a63968e3de000691545`.
- remote DB activation with `5097` `SpellContent` rows and `151`
  `RulebookContent` rows.
- production smoke for status, CORS, route loads, operator DB status, and
  representative `Fiery Assault` / `Spider Poison` content queries.

The v1.0 release is frozen with:

- `docs/releases/v1.0/FREEZE.md` as the as-built snapshot.
- Cloudflare Workers Static Assets frontend delivery at
  `https://www.d20spellcodex.com`.
- backend API domain at `https://api.d20spellcodex.com`.
- backend-only origin server responsibility for Express/API,
  SQLite/content DBs, DB update scripts, and Nginx API reverse proxying.
- About / Status reporting frontend build metadata, API origin, backend
  version metadata, public content DB status, and source credits.
- final frontend Workers production build
  `d72db3fd-b5cd-4f98-999b-e74a1907c218` on commit `96c84b7`.
- backend deploy workflow run `28906821504` on commit `96c84b7`.
- production smoke checks for representative SPA routes, API status, CORS,
  private DB provenance, and About frontend metadata.
- release-ready documentation consistency across root README, docs index,
  roadmap, AGENTS.md, feature docs, module docs, operations docs, and release
  docs.

The v3.10 final pre-release closeout is frozen as the last MVP-stage snapshot:

- `docs/mvp/v3.10/FREEZE.md` records the as-built snapshot.
- v3.10 closed filter i18n completeness and UI/UX cohesion for the MVP line.
- v1.0 formal release planning became the next active track after v3.10.

Older MVP-stage records stay under `docs/mvp/` and should not be repeated here:

- `docs/mvp/v3.9/FREEZE.md`: normalized mechanics contracts and frontend
  consumers.
- `docs/mvp/v3.8/FREEZE.md`: normalized filter consumers and server module
  boundary cleanup.
- `docs/mvp/v3.7/FREEZE.md`: status APIs, production-safe server hardening,
  deployment helpers, and dependency maintenance.
- `docs/mvp/v3.6/FREEZE.md`: DB status, display settings, docs structure, and
  normalized rules review.
- `docs/mvp/v3.5/FREEZE.md`: split DB roles, content-backed reads, taxonomy
  filters, and portable CI.
- `docs/mvp/v3.4/FREEZE.md`: short-description import, i18n convention cleanup,
  and design refresh.
- v3.3 and older: data-tooling foundation and historical MVP setup records.

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

Recommended next sequence:

1. **Close v1.3 production metadata activation independently**

   Deploy merged `main` through the accepted Cloudflare frontend and GitHub
   Actions backend paths. Verify About / Status reports `v1.3.0`, logical ref
   `main`, and the exact accepted commit before creating the release tag. This
   does not relax or reorder v1.4 source gates.

2. **v1.4 PHB source lock and representative pilot (Completed)**

   Gate 1 is accepted on a ten-case, 23-page end-to-end pilot with deterministic
   extraction, errata overlay, DB comparison, terminal row decisions, and a
   committed provenance verifier. This acceptance authorizes the full PHB run.

3. **Complete English QA before translation (Next)**

   Run full-PHB extraction, then reconcile the complete PDF and current PHB DB
   sets with terminal comparison/errata decisions and zero unexplained misses.
   Only after main-gate acceptance may the i18n translation/proofreading track
   begin.

4. **Activate only accepted v1.4 content**

   Apply accepted English corrections and Chinese reviewed overlays through the
   maintained DB/content workflow, rebuild search, preserve CHM/English summary
   fallback, and verify existing frontend consumers without a UI redesign.

5. **Preserve frozen and publication boundaries**

   Use the v1.3 freeze for current UI/platform behavior and older freezes for
   their owned areas. Do not expand v1.4 to DMG, Spell Compendium, PHB II, or
   another publication, and do not pull `DP-AUD-007` into active work unless
   the dormant CHM preprocessing workflow is intentionally reactivated.

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

5. **v1.4 PHB 3.5 Source-First Translation And Proofreading (Planned)**

   Pin the PHB 3.5 PDF and official errata, prove extraction/comparison on a
   representative pilot, accept the complete English source, then translate
   and proofread PHB names, bodies, and short descriptions. Activate only
   accepted rows and preserve existing frontend fallback without a redesign.

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
