# Agent Guide

This is the agent-facing execution guide for this repository.

Keep it compact. Human-facing overview material belongs in `README.md`; the
canonical documentation map belongs in `docs/README.md`; current work ordering
belongs in `docs/roadmap.md`.

## Project Shape

- `server/`: Express API, Prisma clients, SQLite runtime access, API tests.
- `web/`: React Router frontend, UI components, browser state, i18n runtime.
- `contracts/`: shared TypeScript DTOs used by both `server` and `web`.
- `data-tools/`: parser, import, inspection, rules patch, short-description,
  and data harness tooling.
- `docs/`: durable project docs, operational docs, and MVP history.
- `data/`: ignored nested local data repo for source inputs, maintained patch
  data, normalized import JSONL, and review decisions.
- `server/db/`: tracked DB migrations, seed entry points, portable fixtures,
  and ignored local runtime SQLite databases under `server/db/local/`.
- `data-tools/out/`: generated reports, parser output, review queues, and other
  rebuildable intermediates.

## Start Here

Use these docs for orientation instead of expanding this file:

- `docs/README.md`: canonical documentation map and historical/current doc
  ownership.
- `docs/roadmap.md`: current work ordering after a pause; v1.4 planning is
  active.
- `docs/releases/v1.4/README.md`: active PHB 3.5 source-first translation and
  proofreading release boundary.
- `docs/releases/v1.4/integrated-plan.md`: hard sequence from pinned source and
  errata through English QA, translation, accepted activation, and freeze.
- `docs/releases/v1.4/phb-source-and-errata-plan.md`: data-pipeline-owned PDF
  extraction, errata, comparison, and English acceptance plan.
- `docs/releases/v1.4/phb-translation-qa-plan.md`: i18n-owned translation,
  proofreading, QA, and reusable skill plan.
- `docs/releases/v1.4/phb-content-activation-plan.md`: backend-db-owned
  accepted apply, fallback, search, and consumer acceptance plan.
- `docs/releases/v1.3/FREEZE.md`: latest frozen formal release snapshot for
  the sitewide UX/style and secure Actions deployment release.
- `docs/releases/v1.3/README.md`: frozen v1.3 release boundary and accepted
  track map.
- `docs/releases/v1.3/sitewide-ux-redesign-plan.md`: accepted frontend-design
  cohesion record.
- `docs/releases/v1.3/platform-deploy-prerequisite-plan.md`: accepted secure
  Actions deployment prerequisite record.
- `docs/releases/v1.2.2/FREEZE.md`: previous frozen formal release snapshot for
  the internal quality-maintenance release.
- `docs/releases/v1.2.2/README.md`: frozen internal quality-maintenance release
  boundary and accepted pass map.
- `docs/releases/v1.2.2/agent-workflow-hardening-plan.md`: accepted canonical
  role, thin adapter, context-packet, and correspondence-check record.
- `docs/releases/v1.2.2/code-and-test-qa-plan.md`: accepted read-only audit,
  main-gate triage, bounded fixes, and regression record.
- `docs/releases/v1.2.1/FREEZE.md`: previous frozen formal release and latest
  frozen production/public release snapshot.
- `docs/releases/v1.2.1/README.md`: frozen content-backed full-text spell
  search release record.
- `docs/releases/v1.2.1/full-text-search-plan.md`: accepted full-text Search
  contract, FTS index, backend/data, and frontend consumer record.
- `docs/releases/v1.2/FREEZE.md`: older frozen formal public release
  snapshot.
- `docs/releases/v1.2/README.md`: frozen full-spell source review, mechanics
  localization, and Publications page release planning record.
- `docs/releases/v1.2/full-spell-source-review-plan.md`: accepted full-spell
  source inventory and parse QA record.
- `docs/releases/v1.2/full-corpus-correction-plan.md`: post-review correction
  apply record for accepted full-corpus rows and release activation.
- `docs/releases/v1.2/db-workflow-review-plan.md`: v1.2 DB/content workflow
  hardening acceptance record.
- `docs/releases/v1.2/mechanics-localization-plan.md`: accepted mechanics
  translation, QA workflow, and frontend consumer record.
- `docs/releases/v1.2/publications-page-plan.md`: accepted Publications page
  and minimum metadata record.
- `docs/releases/v1.1/FREEZE.md`: older frozen formal public release
  snapshot.
- `docs/releases/v1.1/README.md`: frozen production hardening and full spell
  corpus release plan.
- `docs/releases/v1.1/production-hardening-plan.md`: frozen CF/AWS security
  acceptance plan.
- `docs/releases/v1.1/full-spell-corpus-plan.md`: frozen full spell corpus
  import and content DB activation plan.
- `docs/releases/v1.1/frontend-content-pass-plan.md`: frozen focused frontend
  content acceptance plan.
- `docs/releases/v1.0/FREEZE.md`: older frozen formal public release
  snapshot.
- `docs/releases/v1.0/README.md`: frozen formal public release planning
  record.
- `docs/releases/v1.0/domain-and-deployment-plan.md`: frozen deployment
  topology planning context.
- `docs/releases/v1.0/about-and-status-plan.md`: frozen About/Status planning
  context.
- `docs/releases/v1.0/release-ready-doc-sweep-plan.md`: frozen release docs
  quality-gate planning context.
- `docs/mvp/v3.10/FREEZE.md`: latest frozen pre-release stage snapshot.
- `docs/features.md`: current user-facing feature map.
- `docs/feature-workflow.md`: feature intake and implementation loop.
- `docs/modules/README.md`: high-level module ownership and validation
  boundaries.
- `docs/harness.md`: validation and harness strategy.
- `docs/design.md`: durable UI design direction.
- `docs/i18n.md`: frontend copy, language fallback, and locale workflow.
- `docs/operations/README.md`: deployment, data setup, and remote operations
  map.
- `docs/operations/db-content-workflow.md`: durable DB/content handoff entry
  point after v1.2 workflow hardening.

For workspace command references, use:

- `server/README.md`
- `web/README.md`
- `contracts/README.md`
- `data-tools/README.md`

Version folders under `docs/mvp/` are stage records and active plan spaces. A
`FREEZE.md` records a shipped stage; it is not automatically the baseline for
later development. Treat plan documents as intended scope, not as proof of
shipped behavior.

Formal post-MVP release planning belongs under `docs/releases/`. Keep
`docs/mvp/` for MVP-stage history and final MVP closeout records.

## Repo-Local Skills

Use the repo-local `$branch-naming` skill before creating, renaming, or
assigning Codex work branches.

Use the repo-local `$commit-message` skill before committing.

Use the repo-local `$freeze-snapshot` skill before creating or updating a
version `FREEZE.md`, recording release acceptance evidence, or moving the
latest frozen snapshot in navigation docs.

Use the repo-local `$version-plan-doc` skill before creating or broadly updating
version or release planning docs under `docs/mvp/v*/` or `docs/releases/`,
especially when deciding whether an implementation branch should update
`integrated-plan.md`.

Repo-local skills live under `.agents/skills/` in the current worktree. When
using repo skills such as `branch-naming` or `commit-message`, read
`.agents/skills/<skill>/SKILL.md` relative to the active worktree root. Do not
probe a user-level `.agents` path first.

## Agent Role Routing

Canonical role contracts live in `.agents/roles/`. Project-scoped Codex files
under `.codex/agents/` are thin adapters, not a separate source of role
semantics.

| Role               | Durable responsibility                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| `main-gate`        | direction, context packets, cross-domain decisions, triage, and merge readiness |
| `librarian`        | plans, docs navigation, roadmap coherence, and freeze sweeps                    |
| `data-pipeline`    | source, patch, import, fixture, and corpus workflows                            |
| `backend-db`       | contracts, API runtime behavior, Prisma, and database boundaries                |
| `i18n-translation` | locale conventions, translation workflow, QA, and fallback semantics            |
| `frontend-design`  | frontend state, interaction, layout, and browser acceptance                     |
| `platform`         | CI, builds, packaging, dependencies, deployment, and environments               |

Read `.agents/roles/README.md` for role selection and handoff boundaries. Every
delegated task must name one primary role and provide a concrete context packet
with the outcome, owning plan or topic doc, required reading, expected edit
surface, non-goals, validation, handoff owner, and whether bounded child
delegation is allowed. Role profiles do not replace feature or release plans.
Recursive agent fan-out is disabled by default. No role may expand release
scope or merge its own PR.

## Working Rules

- Prefer existing patterns over new frameworks or broad rewrites.
- Keep changes scoped to the requested behavior.
- Keep specialist feature branches on a small documentation contract: read
  `AGENTS.md`, the closest `docs/features.md` entry, the owning topic doc when
  behavior or workflow changes, and nearby code/tests. Do not make specialist
  branches chase docs navigation, roadmap ordering, module docs, integrated
  plans, or freeze snapshots unless the branch changes scope, ownership,
  sequencing, or release state. Route questions caused by a missing or
  conflicting context packet back to the main gate.
- Treat `main` as remote-managed. Work on feature branches, push the branch,
  open a PR, and let remote CI protect merges. Do not locally merge and push
  `main` unless the user explicitly asks for a direct main update.
- When editing from a sibling worktree, use absolute paths with patch tools or
  otherwise prove the edit target is inside the intended worktree before
  applying changes.
- Do not commit local data, database files, generated logs, or personal wrapper
  scripts to the parent repo. The nested `data/` repo may version local source
  data separately.
- Do not treat root-level `.bat` files as canonical. Tracked deployment scripts
  live under `docs/deployment-scripts/`; the GitHub deploy workflow should stay
  a thin wrapper around those scripts.
- Keep root `.env` local and ignored. Use `.env.example` for non-secret helper
  keys, and let deployment helpers read real SSH aliases from local `.env`
  instead of hardcoding them in tracked docs or scripts.
- If shared DTOs change, rebuild `contracts` before validating `server` or
  `web`.
- If behavior differs from documentation, update the newest topic-specific
  canonical doc rather than editing old MVP history.
- Treat version `integrated-plan.md` files as sequencing and conflict-review
  docs, not implementation ledgers. Ordinary implementation branches should
  update their owning child plan, affected topic docs, and `docs/roadmap.md`
  only when active work ordering changes.
- Keep follow-up candidates local to the owning feature/topic/version plan or
  `docs/stable-backlog.md`; promote them into `docs/roadmap.md` only during a
  freeze, roadmap, or docs-governance sweep when scope and acceptance are clear.

## Feature Change Workflow

For ordinary feature requests:

1. Locate the feature in `docs/features.md`.
2. Read the existing feature entry point and nearby tests before editing.
3. For non-trivial changes with clear scope, copy
   `docs/templates/feature-plan.md` to `docs/tmp-feature-plan.md` and use it as
   a working checklist.
4. For ambiguous, structural, or workflow-changing requests, write a durable
   concrete plan under the active development docs indicated by
   `docs/roadmap.md`, commit that plan first, and only then implement the
   deliverable. Do not add new active scope to frozen version folders.
5. Reuse current API helpers, storage helpers, UI wrappers, and feature folders
   instead of creating parallel structures.
6. Add or update the closest harness layer.
7. Delete `docs/tmp-feature-plan.md` before commit unless the user explicitly
   wants it archived.
8. Run the smallest relevant validation command before handoff.
9. Update durable docs when behavior, workflow, workspace shape, validation
   commands, or agent guidance changed.

When adding, moving, or retiring a workspace, tool command, active plan, or
source-of-truth document, check the navigation surface together: root
`README.md`, `docs/README.md`, `AGENTS.md`, and the relevant workspace
`README.md`.

Use the plan-first path especially when the user corrects product semantics,
the change affects workspace boundaries or agent workflow, data import behavior
could create parallel sources of truth, or a feature request needs confirmation
before implementation details are safe.

## Data And Environment

The app depends on local SQLite files configured by `server/.env`:

- `RULES_DATABASE_URL`
- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`

`APP_DATABASE_URL` is a transitional compatibility alias for the content DB
only. These point at local files under `server/db/local/`. That local subtree is
intentionally excluded from the public repo baseline. Do not replace it, move
it, or assume a fresh clone has the same data.

Data tools may inspect local SQLite files, but must not modify
`server/db/local/` unless the user explicitly asked for a write-capable
workflow.

Content-bearing local patch data, maintained source indexes, normalized import
JSONL, and durable review decisions belong in the nested `data/` repo. Keep
schemas, validators, generators, generated queues, run reports, and
redacted/minimal fixtures in the parent repo.

Rulebook publication metadata belongs in
`data/rulebook-publications/publications.jsonl`. Seed it with
`npm run -w data-tools rulebooks:publications:seed`, then review and maintain it
in the nested data repo. Do not treat rules-clean `year` / `published` fields or
frontend grouping heuristics as the publication metadata source of truth.
Generated content may keep review status for grouping QA, but only rows marked
`accepted` should publish year/date/URL/image details to API-facing content.
When enriching publication metadata from the web, record ISBNs and source URLs
in data repo fields such as `isbn10`, `isbn13`, and `metadataSources`; do not
overwrite the canonical seed file without an intentional `--force` rebuild.

For any large-scale source reading or broad content QA over local data sources,
spawn a subagent to inspect the corpus and return summarized findings instead
of loading the source corpus into the main agent context.

For the v1.4 PHB workflow, distinguish the page-extraction pilot from the
end-to-end Gate 1 pilot. A page review cannot authorize full-PHB extraction.
The full-run boundary must require `npm run -w data-tools phb:pilot:verify`,
which accepts only clean, committed, non-stale, accepted source/pilot manifests
and an accepted end-to-end review.

## Validation Commands

Run the smallest relevant local check first. Do not default to full portable CI
for every branch while iterating; remote PR CI is the merge gate.

```bash
npm run verify
npm run ci:portable
```

`npm run ci:portable` is the clean-checkout CI subset used by GitHub Actions. It
includes backend API tests against disposable fixtures. Run it locally for
merge-readiness spot checks or CI/debugging, not as mandatory overhead for every
small edit.

Useful pieces:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
npm run -w web build
```

Use local data acceptance only when the change touches local source data,
rules DB manifests, parser output, or import behavior:

```bash
npm run -w data-tools acceptance:local
```

For frontend copy changes:

```bash
npm run i18n:sync
npm run i18n:check
```

For frontend behavior or layout changes, combine targeted tests/builds with a
manual browser smoke test of the affected pages.

## Module Notes

- Frontend routes and feature entry points are mapped in `docs/frontend-map.md`.
- High-level module ownership lives in `docs/modules/`.
- API calls should go through `web/app/api/`.
- Local UI wrappers live in `web/app/components/ui/`.
- Server API route registration starts in `server/src/app.ts`.
- Server internal imports use `#server/*`; generated Prisma client imports use
  `#prisma-rules-clean/*`, `#prisma-content/*`, or `#prisma-app-state/*`.
  Do not add new server `~` aliases or TypeScript-only `paths` aliases.
  Local TS execution must use the server npm scripts or
  `NODE_OPTIONS=--conditions=source`; built runtime commands intentionally
  omit that condition and resolve imports to `dist/`. Server tests use
  `server/vitest.config.ts` source-condition resolution, not `NODE_OPTIONS`.
- Spell backend behavior is split under `server/src/services/spells/`.
- Runtime database clients are generated from the rules-clean, content, and
  app-state Prisma schemas; regenerate clients when schemas change.
- Data-tool code belongs under the owning `data-tools/src/` module:
  `shared/`, `db/`, `rules/`, `rules-content/`, `rulebooks/`,
  `short-desc/`, `phb/`, `zh-parser/`, or `harness/`.
- Classify every `data-tools/package.json` script in
  `data-tools/scripts.manifest.json`.
- Maintained data-tool commands deserve focused helper tests. One-time or
  dormant local scripts should not be wired into always-on validation unless
  they are promoted into the maintained workflow.

## Documentation Notes

- `README.md` files are navigation and short operational entry points.
- `docs/` files are durable project truth by topic.
- `docs/features.md` is the user-facing feature map.
- `docs/modules/` is the high-level module design surface.
- `docs/mvp/` is stage history plus active plan space; frozen version folders
  should not become the daily agent working surface.
- `docs/releases/` is the formal post-MVP release planning surface.
- New agent or harness guidance belongs in `AGENTS.md` or `docs/harness.md`,
  not inside old MVP plan files.
- Current work ordering after a pause belongs in `docs/roadmap.md`, while
  detailed implementation plans stay in focused topic docs.
