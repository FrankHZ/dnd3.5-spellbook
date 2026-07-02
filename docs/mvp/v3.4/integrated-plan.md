# v3.4 Integrated Plan

Status: frozen supporting plan. v3.4 has been accepted and frozen in
`docs/mvp/v3.4/FREEZE.md`.

Use this file as the v3.4 planning history and cross-plan rationale. The freeze
document owns the final as-built interpretation.

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

v3.4 is now closed. New work should start from `docs/roadmap.md` and the v3.5
plans rather than adding active scope here.

## Scope Decision

Treat v3.4 as:

1. short-description pipeline delivery
2. data harness hardening for the pipeline and rules DB preparation workflow
3. release/freeze documentation for the current content and validation state

The following are follow-up tracks, not v3.4 freeze blockers:

- broad translation/proofreading QA
- content DB versus future user app-state DB split
- static HTML/offline artifact work
- importing remaining `data/spells-full` spell rows
- full CI/CD and release automation

The frontend design refresh and i18next semantic-key migration landed before
freeze and are summarized in `FREEZE.md`.

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

- Keep the focused plan as implementation rationale.
- Use `FREEZE.md` for final commands and counts.
- Do not add more fuzzy reuse paths to the frozen v3.4 scope.

### B. Data Harness Hardening

Owner doc:

- `docs/mvp/v3.4/data-harness-hardening-plan.md`

Current status:

- Implemented portable v3.4 slice.
- `test:portable` covers the fixture-only helper layer.
- `acceptance:local` bundles local rules manifest, summary QA, and import
  dry-run checks.

Frozen v3.4 slice:

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

- Implemented as a small reference-style frontend polish pass.

Frozen handling:

- Keep this as the accepted v3.4 styling boundary.
- Leave any broader whole-site redesign for a later explicit project.

### D. i18next Convention Hardening

Owner doc:

- `docs/mvp/v3.4/i18next-conventions-plan.md`

Current status:

- Implemented.
- Frontend UI copy now uses semantic i18next keys and `npm run i18n:check`
  enforces extractor drift plus audit rules.

Frozen handling:

- Keep UI copy in `web/public/locales/{en,zh}/`.
- Keep spell/content summaries out of frontend locale JSON.

### E. Release Documentation

Owner docs:

- this integrated plan
- `docs/mvp/v3.4/acceptance-checklist.md`
- `docs/mvp/v3.4/FREEZE.md`

Closeout tasks:

- Complete. Use `FREEZE.md` for final validation commands, observed counts, and
  deferred backlog.

## Completed Sequence

1. **Plan integration**

   Landed this integrated plan and navigation updates.

2. **Data harness hardening**

   Implemented the smallest durable harness slice from
   `data-harness-hardening-plan.md`. Prefer portable tests and explicit local
   acceptance commands over broad end-to-end rebuilds.

3. **v3.4 acceptance pass**

   Ran and recorded:

   ```bash
   npm run verify
   npm run -w data-tools test:portable
   npm run -w data-tools acceptance:local
   ```

   The local acceptance bundle includes:

   ```bash
   npm run -w data-tools summaries:qa
   npm run -w data-tools summaries:import -- --dry-run
   npm run -w data-tools rules:manifest:verify
   ```

4. **Freeze docs**

   Created the v3.4 acceptance checklist and `FREEZE.md`. The freeze should
   describe the as-built state, not every planning branch detail.

5. **Post-freeze handoff**

   Updated `docs/roadmap.md` to make v3.5 planning the active next track.

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

v3.4 freeze criteria are met:

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
