# Roadmap

This document is the lightweight current roadmap for active work.

It is intentionally shorter than the versioned stage plans. Use it to decide what
to do next after a pause, then follow the linked topic docs for implementation
details.

## Current Track

v1.0 is the active formal public release plan:

- `docs/releases/v1.0/README.md`
- `docs/releases/v1.0/domain-and-deployment-plan.md`
- `docs/releases/v1.0/about-and-status-plan.md`
- `docs/releases/v1.0/release-ready-doc-sweep-plan.md`

The latest frozen pre-release snapshot is `docs/mvp/v3.10/FREEZE.md`.

v1.0 should focus on public release readiness: Cloudflare Workers frontend
delivery, the `api.d20spellcodex.com` backend API topology, About/Status
visibility, and release-ready documentation consistency. It should not reopen
v3.10 UI/i18n acceptance.

Older frozen snapshots remain historical comparison points, not active
baselines.

## Recently Completed

The v1.0 domain/deployment and About/Status implementation slices have landed:

- Cloudflare Workers Static Assets owns production frontend delivery for
  `https://www.d20spellcodex.com`.
- the apex `d20spellcodex.com` is intentionally unassigned until a redirect or
  canonical-domain policy is accepted.
- `https://api.d20spellcodex.com` reaches the existing Express API through
  Cloudflare proxying and the API-only Nginx reverse proxy.
- production CORS is scoped to the accepted Workers frontend origin.
- GitHub deploy workflow is backend/API-only; frontend CD is owned by
  Cloudflare Workers Builds.
- About / Status separates Status and Credits, reports frontend hosting and
  API origin, reads public backend/content status, and keeps operator DB
  provenance on the private `/api/status/db` path.

The v3.10 final pre-release closeout is frozen with:

- `docs/mvp/v3.10/FREEZE.md` as the as-built snapshot.
- localized frontend display adapters for stable taxonomy, component, and
  mechanics filter vocabulary.
- server-provided vocabulary labels preserved as fallback display text for
  unknown or future keys.
- Browse, Search, Advanced filters, active-scope summaries, and Spell Detail
  supported-mechanics notes using localized labels where stable keys are known.
- a UI/UX cohesion pass across page headers, sidebars, Advanced filters,
  result cards, status states, Spell Detail metadata, collection workflows,
  prepared-spell workflows, settings, and about/status surfaces.
- final local validation through `npm run ci:portable` and
  `npm run i18n:check`.
- v1.0 formal release planning promoted as the next active track.

The v3.9 release is frozen with:

- `docs/mvp/v3.9/FREEZE.md` as the as-built snapshot.
- backend normalized mechanics query contracts for `castingTimeKeys`,
  `rangeKeys`, `durationKeys`, `savingThrowKeys`, and
  `spellResistanceKeys`.
- server-provided mechanics vocabulary consumed by Search and Browse/by-level
  endpoints.
- content-backed reads matching accepted `SpellMechanicFacet` rows, with
  conservative legacy rules rollback matching.
- `components.other_or_extra` classified as detail/raw text only rather than
  public filter vocabulary.
- `target`, `effect`, and `area` deferred because their source text remains
  high-volume and mixed.
- Browse/Search Advanced filters consuming server-provided mechanics vocabulary
  without frontend legacy string parsing.
- compact mechanics counts in Browse/Search scope summaries.
- content-backed Spell Detail displaying supported `casting.mechanics` flags
  for duration, saving throw, and spell resistance.
- local final validation through `npm run ci:portable`, `npm run i18n:check`,
  and `npm run -w data-tools rules:content:review`.

The v3.8 release is frozen with:

- `docs/mvp/v3.8/FREEZE.md` as the as-built snapshot.
- server-provided normalized filter vocabulary consumed by Browse/Search.
- Browse remaining filter-first and Search remaining name-first with the same
  structured class, domain, level, taxonomy, and component scope.
- shareable URL state for normalized taxonomy and component filters.
- compact active-scope summaries that count primary scope, taxonomy filters,
  component filters, and rulebook selections.
- taxonomy controls grouped by server-provided source/category metadata, so
  Tome of Battle entries can be separated without frontend string parsing.
- descriptor noise collapsed through backend-provided `Other` buckets rather
  than raw legacy `see text` labels.
- a bounded Filter UX pass: component filters, disclosure icons, unified
  spacing, and one detail-filter reset that clears taxonomy and component
  filters without touching primary scope.
- the current detail-filter UI accepted as a small v3.8 pass, not the final
  broader filter-design system.
- server module-boundary cleanup using Node package imports instead of
  TypeScript-only alias rewriting.
- `tsc-alias` and `tsconfig-paths` removed from the server workspace.
- full server ESM and dual contracts builds explicitly deferred until the
  current package-import boundary creates real runtime risk.

The v3.7 release is frozen with:

- `docs/mvp/v3.7/FREEZE.md` as the as-built snapshot.
- `/about` and `GET /api/status/app` for frontend, backend, and public content
  status.
- production-private `GET /api/status/db` by default, with token or explicit
  public override for operators.
- production-safe generic 500 responses for non-`ApiError` failures.
- Express-owned security headers and configurable production CORS allowlist.
- deploy workflow least-privilege permissions and warning behavior for skipped
  portable validation.
- tracked Nginx apply helper and deployment script sync coverage.
- backend deploy build heap defaulted to `384MB` and operator-overridable.
- Prisma 7 generated clients aligned with the current CommonJS server runtime.
- `npm run -w server check:runtime` wired into `npm run ci:portable`.
- React Router, Vite, i18n, lucide/shadcn, Node type, and related dependency
  upgrades accepted with the forced Prisma audit downgrade rejected.
- final GitHub deploy run `28708398468` succeeded on commit `476c93d`.

The v3.6 release is frozen with:

- `docs/mvp/v3.6/FREEZE.md` as the as-built snapshot.
- `GET /api/status/db` for read-only runtime DB provenance and remote content
  DB activation checks.
- browser-local display settings for list density, summary/full-detail spell
  cards, Chinese display comparisons, and compact rulebook/source labels.
- summary spell cards as scan-only rows, with favorite/prepare actions in
  full-detail card mode.
- shared Browse/Search compact scope summaries for class, domain, level,
  taxonomy, and rulebook selections.
- operations docs, versioned-doc guidance, and acceptance/freeze templates.
- `npm run -w data-tools rules:content:review` as the read-only normalized
  rules inventory command.
- stable existing school/subschool/descriptor contracts, with base component
  flags identified as the safest next backend contract candidate.
- Tome of Battle source-kind/category handling and broader mechanics filters
  explicitly deferred.
- v3.7 security, deploy/status visibility, and dependency-maintenance planning
  as the later frozen follow-up.

The v3.6 DB status slice has landed with:

- `GET /api/status/db` as a read-only runtime DB provenance endpoint.
- sanitized database role reporting for rules/content/content alias/app-state.
- latest `RulesContentBuild` metadata and normalized content table counts.
- deployment/data setup docs explaining comparison with `rules:content:meta`.
- portable fixture manifest coverage for maintained local data JSONL inputs.

The v3.6 UI/UX display slice has landed with:

- browser-local display settings for list density and summary/full-detail spell
  cards.
- compact special-component markers and restrained shared spell-card styling.
- Browse/Search scope summary density updates.
- clarified docs that summary spell cards are scan-only and favorite/prepare
  actions live in full-detail card mode.

The v3.6 normalized rules review slice has landed with:

- `npm run -w data-tools rules:content:review` as the read-only content DB
  inventory command for taxonomy, component, and mechanic facets.
- documented review results in
  `docs/mvp/v3.6/normalized-rules-review-plan.md`.
- confirmation that existing school/subschool/descriptor contracts remain
  stable.
- base component flags accepted as the safest next filter-contract candidate,
  but not promoted inside v3.6.
- casting time, range, target/effect/area, duration, saving throw, and spell
  resistance filters deferred until further normalization or fallback semantics.
- Tome of Battle discipline/category handling deferred until a source-kind or
  category boundary is accepted.

The v3.5 release remains frozen with:

- `docs/mvp/v3.5/FREEZE.md` as the as-built snapshot.
- separate rules, content, and app-state DB roles.
- normalized rules-derived spell content in the content DB:
  - `SpellContent`: `4,926`
  - `SpellTaxonomyFacet`: `8,658`
  - `RulesContentBuild`: `1`
- content-backed spell reads by default, with `SPELL_READ_SOURCE=rules` as the
  legacy rollback switch.
- Browse/Search taxonomy filters for schools, subschools, and descriptors.
- rulebook display-label metadata and shared frontend display helpers.
- portable CI through `npm run ci:portable`.
- script-backed code/web deployment with DB upload still manual.
- compact agent guidance and baseline module docs.

The v3.4 release remains frozen with:

- `docs/mvp/v3.4/FREEZE.md` as the as-built snapshot.
- `6,532` accepted local spell-summary rows in `I18nSpellSummaryText`.
- an idempotent summary import dry-run: `0` inserted, `0` updated, `6,532`
  unchanged.
- local data acceptance through `npm run -w data-tools acceptance:local`.
- portable data-tools coverage through `npm run -w data-tools test:portable`.
- semantic frontend i18n keys enforced by `npm run i18n:check`.
- a small frontend design refresh documented by `docs/design.md` and the v3.4
  design plan.

The v3.3 data-tooling foundation is in place:

- `data-tools` owns parser, inspection, rules SQL, and structured spell patch
  workflows.
- local data layout was moved under the root `data/` local repo and generated
  reports under `data-tools/out/`.
- legacy rules SQL patch assets moved to
  `data/rules-patches/applied/legacy-sql/`.
- structured `insertSpell` JSONL patches can be validated, dry-run, and applied.
- `spells-full` can inspect known misses and generate reviewable patch
  candidates.
- verified missing rows have been added for:
  - `Fiery Assault`, `ToB`, id `4916`
  - `Resistance Item`, `ECS`, id `4917`
  - `Skill Enhancement`, `ECS`, id `4918`
  - `Spider Poison`, `Sc_`, id `4919`
- `Shield Of Faith, Legion's` is resolved as existing `MH` id `1945`; the CHM
  `ECS` source label maps to that row rather than creating a duplicate.
- Clean CHM source-of-truth work has been accepted for the current v3.3 data
  pass:
  - hard parser misses are clear
  - maintained CHM inputs live under the nested local `data/chm-clean/` repo
  - mechanical source QA runs through `npm run -w data-tools zh:qa`
- Search/Browse query behavior is represented in the current feature map and
  code surface: Search owns name search plus Browse-equivalent filter scope, and
  header search preserves the active Browse/Search filter scope.

See:

- `docs/mvp/v3.3/data-tools-workspace-plan.md`
- `docs/mvp/v3.3/local-data-layout-plan.md`
- `docs/mvp/v3.3/rules-db-prep-workflow-plan.md`
- `docs/mvp/v3.3/structured-spell-patch-plan.md`
- `docs/mvp/v3.3/spells-full-import-plan.md`
- `docs/operations/rules-db-notes.md`

## Current Data State

Latest v3.5 local DB/content foundation snapshot:

- rules DB manifest: verified, `18` spell operations, `18` verified
- locked legacy rules baseline: `data/rules-clean/rules-clean.sqlite` in the
  nested local data repo
- local runtime DB files: ignored `server/db/local/*.sqlite`
- normalized rules content import:
  - `SpellContent`: `4,926`
  - `RulesContentIssue`: `3,523`
  - `RulesContentBuild`: `1`
- content DB provenance is tracked in `RulesContentBuild` through input hashes
  and parent/data repo commit metadata
- server API tests include content-backed normalized repository parity coverage
  for representative Search, Browse/by-level, detail, batch, and resolve flows
- `rules:content:parity` and `rules:content:meta` provide local-only normalized
  content DB acceptance and artifact provenance checks without adding DB upload
  to CD
- production uses the explicit content DB file role (`content.sqlite`) after
  manual upload/activation; remote runtime state can be checked through
  `GET /api/status/db`, but DB upload remains operator-owned rather than CD

Latest v3.4 local short-description acceptance snapshot:

- normalized summary rows: `6,532`
- app DB import dry-run: `0` inserted, `0` updated, `6,532` unchanged
- short-description QA: `0` errors, `0` import blockers
- rules DB manifest: verified, `8` patches, `15` spell operations, `15`
  verified
- scoped coverage report:
  - books: `60`
  - total spells: `3,938`
  - zh summaries: `3,152`
  - en summaries: `3,380`
  - missing zh summaries: `786`
  - missing en summaries: `1,273`
  - missing both summaries: `369`
  - en source rows missing DB spell: `531`
  - en source rows book mismatch: `151`

Latest local CHM parser snapshot:

- `matched`: `3235`
- `unmatched`: `0`
- `unknownBookLabel`: `0`
- `missingSpellInDb`: `0`

The CHM parser currently has no hard unmatched records. The latest cleanup:

- removed note-like source labels from `Death Dragon` and `Phantasmal Thief`
- split combined source labels for `Defenestrating Sphere` and `Delay Death`
- downgraded the `召唤列表-summon.htm` page title so `Summon` is not parsed as a
  spell record

`missing-zh` is a broader coverage report, not the same thing as parser hard
misses. Its count may increase when a new rulebook label becomes recognized and
the backcheck coverage set grows.

Mechanical CHM source QA now runs through `npm run -w data-tools zh:qa`. The
current report has no errors or warnings; remaining body-note and long-bold-text
markers are informational review leads, not parser blockers.

Full bulk Chinese/English translation and proofreading QA is deferred until a
large translation rewrite or a future short-description import creates new
target text to review.

## Next Work

Recommended next sequence:

1. **Release Ready Doc Sweep**

   Run the final cross-doc quality gate for v1.0. Verify root README,
   docs index, roadmap, AGENTS.md, feature docs, design docs, operations docs,
   module docs, and the v1.0 release README all agree on the Cloudflare Workers
   frontend, API domain, backend-only origin role, and About/Status model.

2. **v1.0 release acceptance and freeze**

   After implementation branches land, validate production SPA deep links,
   cross-origin API fetches, CORS rejection for unallowed origins, API TLS,
   About/Status behavior, backend deploy scripts, and docs consistency, then
   create the v1.0 release freeze snapshot.

3. **Triage the non-blocking maintenance tail as needed**

   `npm audit --workspaces --omit=dev --json` still reports the reviewed Prisma
   dev-chain / Hono moderate advisories. Treat them as explicit maintenance
   follow-ups, not hidden release blockers.

## v3.6 Frozen Workstreams

These are frozen v3.6 workstreams. Read `docs/mvp/v3.6/FREEZE.md` for
as-built behavior, then use the focused plan docs only for rationale and
follow-up context.

1. **Server DB status API**

   Landed. `GET /api/status/db` reports deployment-safe DB provenance: active
   read source, content DB file role, latest `RulesContentBuild` metadata, hash
   fields, and minimal row counts. The endpoint verifies remote content DB
   activation without requiring SSH/SQLite access for every check.

2. **UI/UX display update**

   Landed. Browser-local display settings, spell card/list presentation,
   compact scope summaries, and restrained styling polish are in place. Keep
   display settings browser-local unless a separate app-state feature is
   accepted later.

3. **Docs directory structure cleanup**

   Landed. The docs map now separates durable topic docs, module docs,
   operations docs, version plans, freeze snapshots, and historical records.
   Frozen version folders remain immutable records.

## v3.6 Review Candidates

These were planning inputs. Normalized rules review has resolved the immediate
v3.6 decision: do not broaden filter contracts inside v3.6.

1. **Normalize more filter contracts**

   Reviewed. Base component flags are the safest next filter-contract candidate,
   but they are not promoted in v3.6. Range and casting-time categories need
   stable fallback semantics before public vocabulary exposure.

2. **Review taxonomy normalization**

   Reviewed for the current contract. Existing school/subschool/descriptor
   vocabulary remains stable, but Tome of Battle disciplines and maneuver
   categories need an accepted source-kind/category boundary before UI grouping
   changes.

3. **Review normalized detail display**

   Not promoted for v3.6. Raw source text remains the fallback, and normalized
   mechanics should not become a Spell Detail QA/provenance surface.

4. **Review filter selection display density for broader filters**

   Not promoted for v3.6 because no broader filter vocabulary is shipping.

5. **Review TypeScript module config cleanup**

   `data-tools` has moved to `moduleResolution: "Node16"` with an explicit
   `rootDir`. The v3.7 dependency branch accepts the minimal server cleanup:
   keep the server package/runtime boundary as CommonJS, but compile and
   resolve with TypeScript `module: "NodeNext"` and
   `moduleResolution: "NodeNext"`. That removes the TypeScript 6 deprecation
   suppression without requiring a full server ESM migration or a dual CJS/ESM
   contracts build. Future work only needs to revisit the package boundary if
   contracts gains runtime exports that cannot be safely consumed from the
   CommonJS server path.

## Later Stable Track

The stable-version backlog remains intentionally deferred:

- content artifact pipeline for versioned content releases
- large-scale Chinese/English translation/proofreading QA workflow
- `data/spells-full` completion workflow for adding remaining source-backed
  English spells into the content/rules DB path
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
- release automation beyond the v3.5 script-backed CD pass
- rollback playbook
- HTTPS / TLS and host hardening
- deeper architecture docs beyond the v3.5 module-doc automation pass

See `docs/stable-backlog.md`.

## Working Rule

When restarting after a gap:

1. read this roadmap
2. check `git status --short`
3. read the topic doc for the next area
4. run the smallest relevant validation command before editing
5. update this roadmap only when the next-work order or active track changes
