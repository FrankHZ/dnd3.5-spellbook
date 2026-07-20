# v1.4 PHB Content Activation Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned; blocked on integrated Gates 2 and 3.

## Purpose

Apply only accepted PHB English corrections and accepted Chinese reviewed
overlays to the generated content artifact, preserve provenance and fallback,
rebuild search, and prove the current API/frontend consumes the result without
adding a UI redesign or automatic DB deployment.

## Ownership

- Owning version: v1.4.
- Owning domain: `backend-db`.
- Primary implementation branch: a focused `codex/db-phb-content-activation`
  branch created after accepted handoff artifacts exist.
- Upstream plans: [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md)
  and [phb-translation-qa-plan.md](./phb-translation-qa-plan.md).
- Related docs: `docs/operations/db-content-workflow.md`,
  `docs/operations/import-workflow.md`, `server/README.md`,
  `docs/modules/server.md`, and `docs/modules/contracts.md`.
- Downstream consumer: existing web spell detail/card/summary and Search paths.

## Agent Context

- Main gate outcome: a reproducible local content DB containing only accepted
  PHB corrections/overlays with correct per-spell fallback and search behavior.
- Required reading: `AGENTS.md`, `.agents/roles/backend-db.md`, this plan,
  [integrated-plan.md](./integrated-plan.md), both accepted upstream handoffs,
  and `docs/operations/db-content-workflow.md`.
- Expected edit surface: accepted patch/import schemas, content migrations and
  fixtures when required, server/contracts read behavior and tests, data-tool
  apply/parity commands, and affected operations docs. A bounded web consumer
  compatibility change requires a named `frontend-design` handoff.
- Validation: dry-run/apply parity, provenance, DB integrity, search rebuild,
  server/contracts/web tests, and representative English/Chinese smoke.
- Non-goals: no translation decisions, source extraction, non-PHB activation,
  visual redesign, automatic remote DB upload, or app-state mutation.
- Handoff owner: `main-gate`, then operator deployment only if separately
  authorized.

## Accepted Data Semantics

- Accepted substantive English corrections use the maintained structured rules
  patch -> rules manifest -> content generate/import path. Exact or
  formatting-only comparisons do not create needless English mutations.
- Accepted English PHB short descriptions use the maintained normalized
  summary import shape with `lang=en`, `variant=phb35-reviewed`, and
  source/decision provenance.
- Accepted Chinese spell names/bodies and summaries use the provenance-bearing
  `lang=zh`, `variant=phb35-reviewed` overlay.
- Server resolution prefers the accepted PHB reviewed overlay per covered
  spell, then falls back to the currently requested/default Chinese CHM row.
  It must not make an incomplete PHB overlay hide valid CHM content for another
  spell.
- English reviewed PHB summaries are preferred per covered spell over the
  existing IMarvin summary, with current fallback preserved elsewhere.
- The frontend continues to request normal English/Chinese content. v1.4 does
  not add a visible source/variant selector; response provenance may expose the
  actual selected variant through the existing DTO shape.

## Plan

### Slice 1: Import And Provenance Contract

- Validate the accepted English and Chinese handoff schemas and reject any row
  lacking accepted state, source hashes, page provenance, or matching upstream
  manifest identity.
- Decide whether existing content tables are sufficient; add only the minimum
  migration/index/provenance fields needed for deterministic import and
  fallback.
- Record PHB PDF hash, errata hash, data repo commit, accepted artifact hashes,
  parent repo commit, and import/generator version in content build metadata or
  linked import state.

### Slice 2: Dry-Run And Local Apply

- Validate and dry-run accepted English structured patches before any rules DB
  mutation.
- Apply accepted patches to a temporary rules DB first, then follow the normal
  manifest/content generation path after main-gate approval.
- Import accepted English/Chinese summaries and Chinese reviewed spell overlays
  with replacement scope limited to their exact language/variant and accepted
  PHB spell ids.
- Rebuild the FTS index only after all content imports are complete.

### Slice 3: Read And Fallback Behavior

- Add focused repository/service tests for reviewed-PHB preference, per-spell
  CHM/IMarvin fallback, missing reviewed body/summary, English behavior, and
  content DB unavailable behavior.
- Keep URL, query, language, and user preference contracts unchanged unless a
  contract defect blocks accepted consumption.
- Ensure list/card summaries and Spell Detail body resolve independently so a
  missing reviewed summary cannot hide an accepted reviewed body, or vice
  versa.

### Slice 4: Consumer And Artifact Acceptance

- Verify representative accepted PHB spells in Chinese show reviewed name/body
  and short description.
- Verify an uncovered/non-PHB spell still uses existing Chinese fallback.
- Verify English PHB detail/summary, Browse, Search, collections, and full-text
  behavior remain sound.
- Produce source-free local artifact counts and provenance evidence.
- Keep remote DB update as an explicit post-merge operator step with
  `GET /api/status/db` and representative content smoke if authorized.

## Acceptance Criteria

- Import rejects unaccepted, stale-source, unproofread, malformed, or
  provenance-incomplete rows.
- English corrections and summaries use maintained patch/import boundaries.
- Reviewed PHB Chinese overlays win only for covered spell/field data; existing
  CHM and English-summary fallback remains intact elsewhere.
- Content regeneration, FTS rebuild, parity, integrity, and metadata checks
  pass and record both source hashes.
- API DTOs and existing frontend consumers display accepted PHB Chinese body
  and short description without a new UI setting or broad component rewrite.
- No app-state DB changes and no automatic production DB activation occur.
- Focused contracts/server/data/web tests, `npm run verify`, and relevant local
  data acceptance pass.

## Doc Updates

- Update `docs/operations/db-content-workflow.md` and
  `docs/operations/import-workflow.md` with the accepted PHB handoff/apply
  commands.
- Update `server/README.md`, module docs, and contracts docs only if runtime
  ownership or DTO behavior changes.
- Update `docs/features.md` after accepted reviewed PHB content becomes
  user-visible.
- Update `docs/harness.md` for accepted-only/fallback regression gates.
- Update `docs/roadmap.md` only when release ordering or activation state
  changes.

## Open Questions

The stored reviewed variant is fixed as `phb35-reviewed`. Implementation must
still decide whether the current schema needs an import-state table. The
user-visible contract is fixed: no new variant setting, per-spell reviewed
preference, and existing fallback.

## Follow-Up Candidates

- A future provenance UI or source-comparison surface requires separate product
  scope; v1.4 only preserves machine-readable provenance.

## Completion Notes

Record accepted artifact hashes/counts, migration/apply behavior, validation,
representative smoke, and merged PR links after review. Record remote activation
only after it actually occurs.
