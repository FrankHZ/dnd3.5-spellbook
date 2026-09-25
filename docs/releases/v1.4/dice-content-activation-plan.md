# v1.4 Dice Content Activation Plan

> Plan maintenance rule: implementation branches update this owning plan and
> affected topic docs. Update roadmap only when active ordering changes; update
> integrated-plan only for scope, sequence, ownership, or cross-plan decisions.

Status: planned; no activation authorized by this documentation-only session.

## Purpose And Ownership

Backend-db consumes accepted Chinese replacements while preserving uncovered
CHM content, English behavior, stable spell IDs, and Search. Data-pipeline owns
prepared data; frontend-design verifies existing consumers. Main-gate accepts
local evidence, followed by a separately authorized operator activation.

## Agent Context

- Read `AGENTS.md`, `.agents/roles/backend-db.md`, this plan, accepted intake/QA
  handoffs, `docs/operations/db-content-workflow.md`, `import-workflow.md`, and
  the language/detail/Search sections of `docs/features.md`.
- Future edit surface: maintained import/projection logic, minimum necessary
  overlay/query compatibility, fixtures/tests, operations docs, and this plan.
  Shared DTO changes require contracts rebuild before server/web validation.
- Non-goals: source decisions, new rules/spells/books, app-state mutation,
  UI redesign, automatic remote DB writes, or activating unmerged PHB work.
- Handoff: main-gate with dry-run, parity, provenance, rollback, and API/browser
  evidence. No specialist may merge its own PR.

## Existing Behavior And Concrete Risk

`server/scripts/import-zh-chm.ts` currently consumes parser matched.json and
transactionally deletes all `lang=zh` and legacy `lang=zh-chm` spell text before
creating `variant=chm` rows. It is a complete CHM replacement workflow, not a
safe selective dice updater. Running it after a new import can erase the new
text. Plan and test the complete import order, including future CHM rebuilds.

Existing content queries and web requests use `chm` as the default/explicit
Chinese variant. Adding a new variant alone will not change what users see.
The activation contract must cover both existing default and explicit requests
without adding a user-facing source selector or silently mislabeling provenance.

## Slices

### 1. Accepted Projection And Compatibility Contract

Reuse current overlay tables, sourceKey/provenance facilities, and import/build
workflow where sufficient. Before writes, document the exact storage/variant
mapping and import order in the owning operations doc, with counterexample tests.
A legacy request label may remain a compatibility key; it is not evidence that
dice text came from CHM. Do not add a new schema or variant-selection layer
without demonstrating why existing mechanisms cannot satisfy the contract.

Prepare one deterministic effective Chinese result per target/field from the
accepted replacement set plus retained CHM. Preserve missing/rejected/deferred
fields and entities explicitly; an incomplete candidate must not hide valid
current text. Keep raw source and decisions separate from generated projection.
Consumers perform normal content lookup, not source-quality adjudication.

Preserve canonical English, structured mechanics/filter values, spell IDs,
book relationships/publication metadata, current English and Chinese summaries,
and application/user state. In-body Chinese stat text may change through QA;
this does not authorize changing normalized rules facets.

### 2. Disposable Build And Dry-Run

Validate target identity, accepted state, actual source/decision alignment,
unique target keys, and required fields before preparing a write. Stale,
proposed, rejected, duplicate, or mismatched candidates must fail closed.

First build against a disposable copy, never an operator-owned DB by default.
Report expected replacements, retained fallbacks, inserts into missing Chinese
coverage for existing targets, removals (normally none), and unchanged protected
surfaces. Confirm intended parent/data revisions without requiring the paused
PHB branch or manifests as source authority.

Make the chosen replacement operation transactional and repeatable. A failed
validation or interrupted transaction must not leave partially deleted Chinese
text. Preserve the prior content artifact and record how to restore it through
the existing deployment/content handoff; no new backup system is required.

### 3. Search And Consumer Acceptance

Use the maintained content import/generate/parity/meta workflow. Run Search
index rebuild after final text imports. Verify body search, Chinese name lookup,
Browse/detail display, and selected-source provenance all reflect the same
accepted text. Check removed old terms do not survive solely through a stale
index, while explicitly retained CHM text remains searchable.

API fixtures and EN/ZH browser smoke must cover accepted dice rows, CHM
fallback, English fallback, partial-field retention, duplicate names across
books, tables, and existing explicit/default variant requests. Exercise
spellbook and prepared spell references to prove stable IDs and names.

### 4. Operator Handoff

Only after main-gate accepts the local artifact and code merge, regenerate from
intended parent/data commits and prepare the separate operator activation
handoff in db-content-workflow/deployment. Production is not modified by CI or
this plan. Verify remote DB provenance and public samples only if later
activation is explicitly authorized.

## Acceptance And Validation

- Accepted dice replacements are visible through existing Chinese requests.
- Uncovered/rejected/stale candidates cannot erase working Chinese text.
- Source metadata is truthful; old CHM imports cannot silently undo the result.
- No changes to English, normalized mechanics, IDs, summaries, or app-state.
- Dry-run/apply parity, transaction failure, rerun stability, and previous-artifact
  restoration have relevant fixture-backed evidence.
- Search, API DTOs, name/detail consumers, and EN/ZH browser smoke pass.
- Use focused importer tests, `npm run test:server`, data-tools checks as needed,
  and web tests/builds for changed consumers. Remote portable CI is the merge
  gate; local data acceptance is explicit, not routine overhead for planning.

## Doc Updates

Update import-workflow with the actual variant/projection and command order,
db-content-workflow with handoff details if changed, workspace READMEs with
implemented commands, and features/i18n only when shipped behavior changes.
Update this child plan with evidence; integrated-plan changes only if the
accepted authority, fallback, or ownership contract changes.
