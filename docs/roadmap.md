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

v1.0 is the latest frozen formal public release:

- `docs/releases/v1.0/FREEZE.md`
- `docs/releases/v1.0/README.md`
- `docs/releases/v1.0/domain-and-deployment-plan.md`
- `docs/releases/v1.0/about-and-status-plan.md`
- `docs/releases/v1.0/release-ready-doc-sweep-plan.md`

The latest frozen pre-release snapshot is `docs/mvp/v3.10/FREEZE.md`.

No later formal release plan is active yet. Use the post-release governance
tracks below to clean up the stable-track candidate pool before opening the
next release plan.

Older frozen snapshots remain historical comparison points, not active
baselines.

## Recently Completed

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
  `docs/releases/v1.0/FREEZE.md`.
- Production still uses an operator-owned content DB upload/activation path;
  DB upload is not part of automatic CD.
- `GET /api/status/db` remains the remote runtime state check for content DB
  activation and provenance, with private details protected in production.

## Next Work

Recommended next sequence:

1. **Agent Workflow Review**

   Solidify the collaboration model that is already working: main gate agents
   own planning, review, and merge readiness; librarian agents own docs,
   roadmap, freeze, and plan coherence; specialist agents own focused
   implementation in areas such as design, i18n, db, security, and frontend;
   subagents handle bounded implementation or corpus-inspection slices. Keep
   `AGENTS.md` compact and move detailed process into topic docs, templates, or
   repo-local skills.

2. **Promote Candidates To Official Roadmap**

   Sweep freeze notes, feature docs, follow-up candidates, and
   `docs/stable-backlog.md`. Promote only confirmed, acceptance-definable work
   that matches the product and engineering direction. Leave valuable but
   unprioritized ideas in the stable backlog, and delete or archive completed,
   duplicate, or stale candidates. After promotion, `docs/roadmap.md` should
   remain the official route, not a scratchpad.

3. **CF/AWS Security Pass**

   Run a post-release security acceptance pass, not a v1.0 freeze patch.
   Cloudflare review should cover DNSSEC, Full Strict HTTPS, HTTP-to-HTTPS,
   basic WAF or managed rules, reasonable API rate limiting, security response
   headers, and Pages/Workers environment-variable and token permissions. AWS
   review should cover security groups, SSH exposure, deploy user/IAM
   permissions, key rotation, system update strategy, Nginx reverse-proxy
   exposure, logs, backups, and rollback paths. HSTS preload, Bot Fight, and
   aggressive caching need evaluation before enabling. The acceptance artifact
   should record enabled items, deferred items with reasons, and post-change
   smoke for frontend, API, CORS, deploy, and private db-status/admin paths.

4. **Open the next formal release track**

   Create a release plan only after the governance sweep has promoted the next
   bounded slice from the stable backlog.

## Official Release Sequence

The expected post-v1.0 release order is:

1. **v1.1 Production Hardening + Full Spell Corpus**

   Scope this as two independent acceptance tracks so security configuration
   and content import can be evaluated separately:

   - production hardening: resolve confirmed security-checklist findings,
     apply Cloudflare/AWS configuration changes, and smoke frontend, API, CORS,
     deploy, and db-status/admin-only behavior
   - full spell corpus: import the remaining source-backed spell corpus,
     update content DB artifacts, and validate deploy/content status without
     adding DB upload to automatic CD

   Non-goals: broad UI redesign and large-scale translation/proofreading.

2. **v1.2 Translation + QA**

   After the full corpus is stable, build the bulk Chinese/English translation
   and proofreading workflow: QA reports, human review queues, terminology and
   rulebook consistency checks, and data/i18n/corpus harness coverage.

3. **v1.3 Sitewide UX / Style Redesign**

   Run a deliberate design-system and sitewide cohesion pass across Browse,
   Search, Detail, About/Status, collections, prepared spells, filters, spell
   cards, layout density, and mobile behavior. Let frontend-design own the
   implementation branch while the main gate controls scope and acceptance.

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- content artifact pipeline for versioned content releases outside the v1.1
  full-corpus acceptance path
- static HTML/offline artifact generation to replace old loose HTML
  distribution
- search/index artifact generation for offline or static deployments
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
