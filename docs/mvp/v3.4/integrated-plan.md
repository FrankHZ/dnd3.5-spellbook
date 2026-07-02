# v3.4 Integrated Plan

Status: active v3.4 coordination plan after the short-description pipeline
branch was reviewed and merged into local `main`.

Use this file as the v3.4 planning hub. The focused topic docs still own
implementation detail; this document owns scope, sequencing, cross-plan
boundaries, and freeze criteria.

## Current Review

v3.4 has grown from early planning into a mostly data/content-centered release.
The major completed deliverable is the spell short-description pipeline:

- Chinese summary extraction from local CHM overview sources.
- English IMarvinTPA source-index workflow for local-only short descriptions.
- QA, normalization, source-gap reuse, same-name reuse, punctuation cleanup, and
  coverage reporting commands under `data-tools`.
- Structured rules DB gap patch support for reviewed short-description misses.
- Rules DB manifest write/verify support.
- App DB `I18nSpellSummaryText` schema and importer.
- Contract, server, and frontend consumption through `spell.i18n.summary`.
- Search, Browse, batch, resolve, and detail response coverage.

The current local app DB import baseline is `6,532` accepted spell summary rows.
The reviewed import dry-run reports `0` inserted, `0` updated, and `6,532`
unchanged. Low-risk English source-gap reuse has been exhausted for the current
core plus supplemental scope; further coverage should be source/PDF-backed.

The remaining v3.4 work should be a closeout pass, not a new expansion phase.

## Scope Decision

Treat v3.4 as:

1. short-description pipeline delivery
2. data harness hardening for the pipeline and rules DB preparation workflow
3. release/freeze documentation for the current content and validation state

Keep the following as parallel or follow-up tracks, not blockers for v3.4
freeze unless the user explicitly promotes them:

- frontend design refresh
- frontend i18next semantic-key migration
- broad translation/proofreading QA
- content DB versus future user app-state DB split
- static HTML/offline artifact work
- importing remaining `data/spells-full` spell rows
- full CI/CD and release automation

This keeps v3.4 solid and shippable while preserving the larger ideas for v3.5
or later.

## Workstreams

### A. Short-Description Pipeline

Owner doc:

- `docs/mvp/v3.4/short-description-pipeline-plan.md`

Current status:

- Implementation and first consumer path are complete.
- API/frontend tests and `npm run verify` pass.
- `summaries:qa`, `summaries:import -- --dry-run`, and
  `rules:manifest:verify` have been reviewed against the current local state.
- Remaining coverage gaps are known content backlog, not current import
  blockers.

Closeout tasks:

- Keep the plan as the detailed source of truth for the pipeline.
- Add a v3.4 acceptance checklist or freeze summary that records the final
  commands and counts.
- Do not add more fuzzy reuse paths in v3.4.

### B. Data Harness Hardening

Owner doc:

- `docs/mvp/v3.4/data-harness-hardening-plan.md`

Current status:

- Still planned.
- Most of the needed commands now exist because of short-description work, but
  portable data-tools tests and local-data acceptance commands are still the
  missing stability layer.

Target v3.4 slice:

- Add a portable `data-tools` test command that does not require ignored local
  source data.
- Cover source-label mapping, parser helper behavior, and small pure matching
  utilities first.
- Add or document local acceptance checks for:
  - `zh:qa`
  - `zh:summaries:extract`
  - `summaries:qa`
  - `summaries:import -- --dry-run`
  - `rules:manifest:verify`
- Keep root `npm run verify` portable. Do not make it depend on raw CHM, local
  source dumps, or mutable SQLite write paths.

### C. Frontend Design Refresh

Owner doc:

- `docs/mvp/v3.4/design-refresh-plan.md`

Current status:

- Valid plan, but not required for the short-description/data release.

Recommended handling:

- If pursued before freeze, keep it to one small visual polish branch and verify
  Browse, Search, Spell Detail, collections, Settings, English, Chinese, mobile,
  and desktop.
- If not pursued immediately, carry it forward as a v3.5 or general frontend
  polish track.

### D. i18next Convention Hardening

Owner doc:

- `docs/mvp/v3.4/i18next-conventions-plan.md`

Current status:

- Valid plan, but independent from spell/content short descriptions.

Recommended handling:

- Do not mix semantic-key migration into data harness or freeze work.
- If started, use a specialist branch and migrate one small namespace first.
- It can safely move to v3.5 if v3.4 freeze is otherwise ready.

### E. Release Documentation

Owner docs:

- this integrated plan
- future `docs/mvp/v3.4/acceptance-checklist.md`
- future `docs/mvp/v3.4/FREEZE.md`

Closeout tasks:

- Record the final v3.4 validation commands and observed counts.
- Record which v3.4 plans shipped, which remain planned, and which moved to
  later work.
- Update `docs/roadmap.md`, `docs/README.md`, `README.md`, and `AGENTS.md` when
  the freeze snapshot is created.

## Sequencing

1. **Plan integration**

   Land this integrated plan and navigation updates.

2. **Data harness hardening**

   Implement the smallest durable harness slice from
   `data-harness-hardening-plan.md`. Prefer portable tests and explicit local
   acceptance commands over broad end-to-end rebuilds.

3. **v3.4 acceptance pass**

   Run and record:

   ```bash
   npm run verify
   npm run -w data-tools summaries:qa
   npm run -w data-tools summaries:import -- --dry-run
   npm run -w data-tools rules:manifest:verify
   ```

   Add any new harness command once implemented.

4. **Freeze docs**

   Create the v3.4 acceptance checklist and `FREEZE.md`. The freeze should
   describe the as-built state, not every planning branch detail.

5. **Post-freeze handoff**

   Update `docs/roadmap.md` to make v3.5 planning the active next track.

## Cross-Plan Boundaries

- Short descriptions are content overlays, not frontend UI copy. Do not move
  spell summaries into i18next locale files.
- The current app DB acts as app-owned content storage for v3.4. Do not force a
  content DB/app-state DB split into v3.4 closeout.
- Rules DB patching remains a data-prep workflow. Do not perform rules DB
  writes from server runtime or root verification.
- `summaries:normalize` writes the base normalized source rows. Final import
  snapshots also require the reviewed post-normalize source-gap, reuse, and
  punctuation layers when intentionally regenerating
  `data/short-desc-normalized/summaries.generated.jsonl`.
- `data-tools/out/` remains generated. Durable source indexes, patch inputs,
  normalized import JSONL, and review decisions belong in the nested `data/`
  repo.
- Design refresh can touch `SpellCard` and `SpellDetailPage`, but it should not
  change summary fallback semantics.
- i18next cleanup can change UI-copy keys, but not API `lang`/`variant`
  behavior or content overlay ownership.

## Branch And Agent Strategy

- Use this main thread for scope decisions, review, and freeze docs.
- Use focused specialist branches for data harness, design refresh, or i18next
  migration.
- Keep implementation branches narrow:
  - `codex/data-tools-harness`
  - `codex/design-refresh`
  - `codex/i18n-semantic-keys`
- Review each branch against this integrated plan before merge.
- Avoid combining freeze docs with unrelated implementation changes.

## Freeze Criteria

v3.4 can freeze when:

- short-description app DB import dry-run is idempotent against the current
  local app DB
- `rules:manifest:verify` passes against the current local rules DB and nested
  rules patch inputs
- `npm run verify` passes
- the accepted data harness hardening slice passes and is documented
- short-description coverage gaps are recorded as backlog, not hidden blockers
- no active v3.4 doc says an unfinished optional track blocks release
- `docs/mvp/v3.4/FREEZE.md` records the final as-built behavior and validation
  evidence

## Deferred Backlog

Move or keep these outside the v3.4 freeze gate:

- content DB versus user app-state DB split
- normalized rules content schema and fine-grained frontend consumers
- rulebook abbreviation/display-label review
- large-scale Chinese/English translation QA
- static HTML/offline artifact generation
- remaining `data/spells-full` imports
- full CI/CD
- deployment automation beyond the current tracked scripts
- broad frontend design refresh if it has not already landed as a small branch
- full semantic-key i18next migration if it has not already landed incrementally
