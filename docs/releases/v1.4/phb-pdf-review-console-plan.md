# v1.4 PHB PDF Review Console Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned.

## Purpose

Build a dedicated localhost-only PDF review console for the two existing PHB
Gate 2 decision queues. The console should make page/layout evidence and
PHB/SRD/DB conflicts reviewable without weakening the current fingerprint,
validation, source-authority, or nested-data write boundaries.

This is internal v1.4 review tooling. It is not a public site feature and must
not be added to the deployed `web` or production `server` workspaces.

## Ownership

- Owning version: v1.4.
- Owning domain: `data-pipeline` for candidate assembly, validation, local API,
  fingerprint checks, and nested-data writes.
- Frontend consumer: `frontend-design` for the bounded React review surface
  after the data/API contract is accepted.
- Primary implementation branch: `codex/data-phb-review-console`.
- Frontend implementation branch: `codex/design-phb-review-console`, based on
  the accepted data/API slice or stacked on it until that slice merges.
- Related docs: `data-tools/README.md`, `docs/operations/import-workflow.md`,
  `docs/modules/data-tools.md`, and a new `review-console/README.md`.
- Upstream plan:
  [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md).
- Downstream gate: residual English decisions and the Gate 2 handoff in
  [integrated-plan.md](./integrated-plan.md).

## Agent Context

- Main-gate outcome: a locally runnable review console that can safely record
  current MinerU layout and English residual decisions without bypassing the
  canonical PHB pipeline.
- Required reading: `AGENTS.md`, `.agents/roles/data-pipeline.md`,
  `.agents/roles/frontend-design.md`, this plan,
  [integrated-plan.md](./integrated-plan.md),
  [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md),
  `data-tools/README.md`, and `docs/operations/import-workflow.md`.
- Expected edit surface: new `review-console/` workspace, the root workspace
  and validation wiring, a narrow reusable review service under
  `data-tools/src/phb/`, portable fixtures/tests, and affected durable docs.
- Nearby code/tests: `data-tools/src/phb/full-mineru.ts`,
  `full-row-review.ts`, `full-pipeline.ts`, `srd-adjudication.ts`, their
  portable tests, and the current Vite/React conventions in `web/` where they
  are useful without importing public-app state.
- Validation: focused data-service/API tests, review-console unit tests,
  typecheck/build, portable synthetic-fixture coverage, and a local real-data
  browser smoke for both queues.
- Non-goals: no public deployment, production API/DB access, arbitrary file
  browser, generic annotation platform, translation QA, or broad visual
  redesign.
- Handoff owner: `main-gate`; Gate 2 remains open until the canonical data
  commands revalidate all decisions after console use.

## Problem

The current review artifacts are safe but awkward to inspect manually. A
reviewer must correlate a PDF page, MinerU blocks, PDF.js items, PHB/SRD/DB
components, evidence ids, fingerprints, and one or more JSONL files before
recording a decision. Direct text editing makes stale-fingerprint and wrong-row
mistakes too easy, while putting this workflow into the public app would expose
local source files and write-capable data operations to the wrong runtime.

The current committed data snapshot has two bounded review surfaces:

- 131 accepted MinerU layout decisions: 126 outside-bbox projections, two
  source-order overrides, and three illustration-caption exclusions. The
  console must support these rows for inspection and future regenerated
  proposed decisions; it must not assume the current count is permanent.
- 75 English Gate 2 residual exceptions after deterministic SRD adjudication.
  These are the only active row decisions the first console release should
  help close.

## Architecture And Authority

- The pinned PHB PDF plus accepted errata remains display/source authority.
- MinerU remains the primary full-corpus structure, reading-order, field, body,
  and table extractor. PDF.js remains an independent exact-character and
  coordinate baseline projected only inside MinerU boundaries unless a current
  layout decision explicitly permits otherwise.
- Existing data-tools candidate builders, evidence fingerprints, merge logic,
  and validators remain the only decision-rule implementation. The browser
  receives display DTOs and allowed actions; it does not recompute candidates,
  fingerprints, eligible blocks, or terminal validity.
- The local Node API is the only write-capable layer. `data-tools` must expose
  the review service through one documented, Node-only public package subpath,
  provisionally `data-tools/phb-review`. The Node API imports only that public
  entry; it must not use relative or package-deep imports into
  `data-tools/src/**`.
- The public service entry owns candidate/detail/action DTOs, fingerprints,
  freshness checks, merges, validation, and atomic writes. `review-console/`
  must not copy those rules, queue schemas, or validators. Its browser bundle
  consumes HTTP DTOs and may share types only through an explicit type-only
  boundary; it must never import the Node service runtime.
- The nested `data/` JSONL remains the decision source of truth. The console
  never writes parent-repo fixtures, SQLite, accepted content, search artifacts,
  or production state.
- Missing, stale, unsupported, or ambiguous evidence fails closed. There is no
  fallback that converts display state into an accepted decision.

## Supported Queue Contract

The first release supports exactly two queue ids:

1. `mineru-layout`

   Read the current full MinerU layout review rows, full page/block evidence,
   PDF.js text-layer items, and the pinned PHB source reference. Display all
   statuses and kinds, but only allow actions defined by the current candidate.
   Layout candidates that require placement must submit a selected eligible
   target block or anchor to the data-tools service.

2. `english-residual`

   Read only current SRD adjudication exceptions and join them to the current
   full row review, PHB comparison/entity evidence, SRD components, DB diff,
   page provenance, and errata evidence. Accept/reject updates the canonical
   full-row review decision; deterministic terminal candidates are not exposed
   as clerical review work. This queue is available only while the full
   extraction, comparison, SRD adjudication, and terminal-candidate apply
   artifacts are mutually current. The service must fail closed when any
   upstream layout decision or artifact makes that chain stale.

Both queues expose a stable item id, status, kind/category, printed name/page,
current evidence fingerprint, evidence references, allowed actions, and a
server-derived detail payload. Queue totals and filter facets are derived from
current artifacts and are never hard-coded into the client.

## Local Runtime Boundary

- Add `review-console/` as a private npm workspace using React and Vite.
- Use one local Node launcher and one browser origin. The launcher mounts the
  review API plus Vite middleware in development or built static assets for a
  local production-like smoke.
- Bind the listener to the literal `127.0.0.1`; a configurable port is allowed,
  but no host override or network binding is supported.
- Do not enable CORS. Validate the `Host` and same-origin `Origin` on mutating
  requests, and require a per-process review token in a custom header. Do not
  put the token in URLs or logs.
- Resolve the nested data root through the existing repository environment
  helper. Resolve the PHB PDF only from the verified source manifest. Requests
  select an allowlisted queue/item/source id and never submit a filesystem path.
- Serve the pinned PDF with the byte-range behavior required by PDF.js while
  keeping the absolute source path out of API responses.
- Do not import production server routes, Prisma clients, SQLite drivers, or
  deployment configuration.
- Resolve the public data-tools service entry under the actual local launcher,
  tests, and production-like local build/start path from a clean checkout. A
  package export, source condition, or built artifact may follow the
  repository's chosen module convention, but the supported package subpath is
  the sole runtime boundary; a TypeScript-only alias is insufficient.

## Decision Write Contract

Every decision request contains only:

- queue id and stable item id;
- the fingerprint observed by the reviewer;
- `accepted` or `rejected` status;
- non-empty reviewer and decision note;
- an allowed queue-specific selection such as a MinerU target block.

Before writing, the data-tools review service must:

1. serialize writes inside the local process;
2. reload the current source artifacts and decision JSONL;
3. rebuild the current candidate with the existing candidate/fingerprint logic;
4. reject a missing row, stale fingerprint, invalid status/note, or ineligible
   target without changing any file;
5. merge the decision and validate the complete resulting queue;
6. write the complete JSONL to a same-directory temporary file, flush it, and
   atomically replace the target while preserving row order and all unrelated
   decisions;
7. return the newly current row plus an explicit `canonicalRerunRequired`
   state.

An optimistic-concurrency failure returns `409` with the refreshed current row
and does not retry the old decision automatically. Two tabs submitting from
the same fingerprint must result in one accepted write and one stale response.

The console must not silently refresh downstream manifests or acceptance
reports. A saved `mineru-layout` decision invalidates the derived English
review chain. Its canonical rerun must begin with the full
`npm run -w data-tools phb:source:extract` command, then continue through
`phb:source:compare`, `phb:srd:adjudicate`, and `phb:srd:apply`. Starting at
compare or adjudication is not an accepted shortcut after a layout write.

Until that chain has been regenerated and the data-tools freshness check
passes, the service must mark `english-residual` unavailable. The client must
disable its queue entry, discard any previously loaded residual rows, and show
the required rerun start command. Direct English queue/detail/write requests
must fail closed with a stable `409 stale-queue` response carrying
`requiredRerunFrom: "phb:source:extract"`; a UI warning alone is insufficient.
No separate console-owned freshness flag becomes authority: availability is
derived from current manifests, artifacts, and fingerprints through the
data-tools service. Once the chain is current, the regenerated English queue
may reopen; `phb:source:report` still remains blocked until all current
residual decisions are terminal.

## Review Experience

- Use a dense split workspace: PDF page and overlays on the left; evidence,
  diff, decision, and navigation on the right. Stack the panes coherently on a
  narrow viewport without turning this into a general mobile product.
- Render the actual PDF page and provide independent toggles for MinerU blocks,
  PDF.js items, and the selected/eligible target block.
- Show PHB, SRD, and DB component differences, errata/evidence references,
  current fingerprint, reviewer, and decision note without hiding raw evidence
  behind summary-only labels.
- Provide queue/status/kind/category filters, previous/next navigation, and a
  stable position/total indicator.
- Require explicit save. Disable submission until required target selection,
  reviewer, note, and current fingerprint are present. A stale response keeps
  the user's draft note visible while refreshing the evidence for a new
  decision.
- Keep first-release copy and styling local to the internal tool. Do not add it
  to public app navigation, frontend i18n, collections, settings, or the public
  design system.

## Plan

### Slice 1: Data-Tools Review Service

Owner: `data-pipeline`.

- Extract a narrow reusable service over the existing MinerU layout and full
  row review builders, fingerprints, merges, and validators.
- Publish that service through the documented `data-tools/phb-review` package
  subpath (or the final equivalently named public subpath recorded in the
  implementation docs). Add a correspondence/runtime test that rejects deep
  source imports and proves the public entry resolves under supported local
  execution paths.
- Define the two allowlisted queue/detail/action DTOs and the stale-decision
  result without exposing arbitrary paths or generic JSONL mutation. Include a
  server-derived queue-availability result that detects the stale English
  dependency chain.
- Add atomic queue replacement and process-local write serialization.
- Prove the service against synthetic fixtures for both queue types before any
  browser implementation begins.

Validation: focused portable tests cover stale fingerprints, invalid targets,
validation failure, concurrent writes, atomic replacement failure, preserved
row ordering, zero mutation outside the selected decision JSONL, package-entry
runtime resolution, and English queue invalidation/re-enablement across a
layout decision and canonical rebuild.

### Slice 2: Local API And Workspace Shell

Owner: `data-pipeline`.

- Add the private `review-console/` workspace, local Node launcher, shared DTO
  boundary, allowlisted read/write routes, PDF range route, and session token.
- Depend on the public data-tools review-service package subpath only. Add a
  lint/correspondence check that fails on `data-tools/src/**` deep imports from
  `review-console/`, and keep the Node runtime out of the Vite browser graph.
- Keep the API same-origin and loopback-only with no CORS, host override,
  filesystem path parameter, SQLite access, or deploy target.
- Wire focused typecheck/test/build commands into root portable validation with
  synthetic fixtures only; real PDFs and nested data remain local acceptance.

Validation: API integration tests prove loopback binding, host/origin/token
rejection, unknown queue/item rejection, path non-disclosure, PDF range
behavior, stale-fingerprint handling, `409 stale-queue` handling, and no-write
failures. A clean-checkout launch/build smoke proves the package runtime entry
resolves without pre-existing generated output.

### Slice 3: React Review Consumer

Owner: `frontend-design`, after Slice 2's API contract is accepted.

- Implement queue filters/navigation, PDF rendering and overlays, joined
  PHB/SRD/DB evidence, layout target selection, and explicit decision forms.
- Keep all candidate and validation decisions server-owned. Client state owns
  only display, navigation, filters, draft form values, and stale-response UX.
- Disable and unload the English queue while the API reports stale upstream
  layout evidence; never continue displaying cached residual rows during the
  canonical rebuild.
- Add focused component/pure-logic tests for filtering, stable navigation,
  required controls, target selection, and stale refresh behavior.

Validation: review-console tests, typecheck, build, and a local desktop/narrow
viewport smoke using one MinerU layout row and one English residual row.

### Slice 4: End-To-End Gate 2 Handoff

Owners: `data-pipeline` for rerun evidence; `main-gate` for acceptance.

- Run both current queues through the console, preserving the current 131-row
  layout inventory and presenting exactly the current 75 residual exceptions.
- After any layout decision, restart the canonical full chain at
  `phb:source:extract`, then run compare, SRD adjudication, and SRD apply before
  reopening English review. After the regenerated residual decisions are
  terminal, run `phb:source:report`; do not treat console save responses as
  pipeline acceptance.
- Confirm zero stale/proposed residual decisions before producing the English
  handoff. Keep the console local and source-bearing outputs in the nested data
  repo.

Validation: current data acceptance, source-free aggregate report, Gate 2
main-gate review, and the standard v1.4 data/portable checks.

## Acceptance Criteria

- `review-console/` is a private workspace and cannot bind outside
  `127.0.0.1`, enable CORS, join deployment builds, or appear in public app
  navigation.
- The API accepts only the two named queues, verified source ids, and stable
  item ids; no endpoint accepts or returns an arbitrary absolute path.
- The client does not implement PHB candidate, fingerprint, eligible-target,
  terminal-state, or JSONL write rules.
- The console's Node API consumes one documented public data-tools package
  subpath. No review-console file deep-imports `data-tools/src/**`, copies its
  queue/validation rules, or bundles the Node review runtime into the browser.
- Every write revalidates the current fingerprint and complete queue before an
  atomic replacement. Stale, invalid, concurrent-loser, or simulated I/O
  failures preserve the previous file unchanged.
- The console never writes SQLite, source/extraction artifacts, manifests,
  accepted content, search indexes, parent-repo fixtures, or production state.
- Both current queues render their required PDF/evidence/diff context and
  support filter, previous/next, accept/reject, decision note, and required
  layout target selection.
- Saving a layout decision makes `english-residual` unavailable immediately.
  It stays disabled, including direct API access and cached UI rows, until a
  canonical rerun beginning at full `phb:source:extract` regenerates and
  validates extraction, comparison, adjudication, and apply artifacts.
- Saving any decision clearly leaves final canonical acceptance pending;
  `phb:source:report` succeeds only after every current residual row is
  terminal.
- Portable CI passes without local source files. Focused data service, API,
  frontend, typecheck, and build checks pass, followed by real local smoke and
  Gate 2 data acceptance.

## Doc Updates

- Implementation adds `review-console/README.md` with start, build, local-data,
  security, and validation commands.
- Update the root workspace map, `docs/modules/README.md`, and a focused module
  doc when the workspace exists; do not describe an unimplemented workspace as
  current truth before then.
- Update `data-tools/README.md` and `docs/operations/import-workflow.md` when
  the service, queue files, commands, and post-decision rerun become durable.
- Update `docs/roadmap.md` only when review-console acceptance changes the next
  Gate 2 work order.
- Do not update [integrated-plan.md](./integrated-plan.md) for ordinary
  implementation progress. This plan PR updates it once because the new
  prerequisite changes v1.4 sequence and cross-role ownership.

## Open Questions

No product or authority question remains open for the first release. The final
public package-subpath spelling, component names, and default loopback port may
follow repository conventions as long as the package/runtime, stale-queue, and
acceptance boundaries above remain unchanged.

## Follow-Up Candidates

- Extend the console to Chinese translation/proofreading QA only after the PHB
  Gate 2 workflow proves the two-queue design.
- Consider a generic review/annotation platform only after at least one other
  corpus demonstrates shared semantics; do not generalize from PHB alone.
- Defer bulk acceptance, multi-user/network access, authentication, deployment,
  and non-PHB sources outside v1.4.

## Completion Notes

Use this section only after implementation review. Link merged data/API and
frontend PRs plus Gate 2 validation evidence instead of copying logs or source
rows into the public repo.
