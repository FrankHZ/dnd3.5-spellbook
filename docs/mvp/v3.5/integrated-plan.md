# v3.5 Integrated Plan

Status: planning coordination surface.

This plan ties the v3.5 child plans together and records the current
cross-plan conflict review. It is not an implementation checklist. Use it to
decide sequencing, ownership, and handoff boundaries before starting a v3.5
implementation branch.

## Objective

v3.5 should turn the project from a local MVP app backed by legacy rules data
and app-owned overlays into a more maintainable content platform:

- content data has a rebuildable DB boundary
- future user/app-state data has a separate preservation boundary
- legacy rules data becomes an upstream source, not the permanent runtime schema
- normalized rules facets can power finer Browse/Search behavior
- frontend consumers add those facets deliberately
- docs and CI/CD make agent work safer instead of more ceremonial

Large content-release goals such as bulk Chinese/English translation QA,
`data/spells-full` completion imports, static/offline HTML artifacts, and
versioned content packs remain long-term roadmap targets, not v3.5 deliverables.

## Child Plans

Read these in order:

1. [db-ownership-boundary-plan.md](./db-ownership-boundary-plan.md)
2. [rules-content-normalization-plan.md](./rules-content-normalization-plan.md)
3. [normalized-rules-frontend-consumer-plan.md](./normalized-rules-frontend-consumer-plan.md)
4. [rulebook-display-labels-plan.md](./rulebook-display-labels-plan.md)
5. [ci-cd-and-module-docs-plan.md](./ci-cd-and-module-docs-plan.md)
6. [agent-guide-review-plan.md](./agent-guide-review-plan.md)

The integrated plan owns sequencing and cross-plan boundaries. Child plans own
their detailed acceptance criteria. If a boundary changes, update this file and
the affected child plan together.

## Delivery Sequence

### 0. Freeze Inputs

Start v3.5 only after accepted v3.4 short-description and data-harness docs are
merged or deliberately rebased into the v3.5 planning branch.

Required state:

- no unreviewed v3.4 schema assumptions copied by hand
- `docs/roadmap.md` points at the accepted v3.4 state
- local data assumptions are documented as local-only when they cannot enter CI

### 1. Split DB Ownership

Implement the content DB and app-state DB boundary before moving runtime reads
away from the legacy rules DB.

Primary plan:

- `db-ownership-boundary-plan.md`

Expected output:

- `CONTENT_DATABASE_URL`
- `APP_STATE_DATABASE_URL`
- transitional compatibility notes for `APP_DATABASE_URL`, if needed
- clearly named Prisma clients or equivalent DB access modules
- docs explaining which DBs are rebuildable content artifacts and which are
  preserve-sensitive app-state data

### 2. Generate Normalized Rules Content

Generate normalized rules-derived tables into the content DB. Keep the cleaned
legacy rules DB as a source input and audit trail.

Primary plan:

- `rules-content-normalization-plan.md`

Expected output:

- normalized schema for spell-facing runtime content
- generator owned by `data-tools`
- parity reports against current Browse/Search/detail behavior
- review queues for dirty or ambiguous source values
- raw source value preservation where normalization is incomplete

### 3. Normalize Rulebook Display Metadata

Fold rulebook label decisions into the content metadata path so UI labels do not
depend on legacy source abbreviations.

Primary plan:

- `rulebook-display-labels-plan.md`

Expected output:

- source identifiers remain stable for import and matching
- English display abbreviations are curated
- Chinese primary labels use Chinese full names where available
- frontend uses a single display helper rather than ad hoc label fallbacks

### 4. Stabilize API Contracts

Expose normalized facets through typed contracts and backend API filters before
shipping broad frontend controls.

Primary plans:

- `rules-content-normalization-plan.md`
- `normalized-rules-frontend-consumer-plan.md`

Expected output:

- explicit query params and DTO fields
- metadata vocabularies for accepted facets
- backend API contract tests
- existing behavior parity tests for representative Browse, Search, detail,
  batch, and resolve flows

### 5. Add Frontend Consumers In Slices

Add controls and displays only after the contract and metadata vocabulary are
stable.

Primary plan:

- `normalized-rules-frontend-consumer-plan.md`

Expected order:

1. contract and URL foundation
2. taxonomy filters
3. mechanics filters
4. detail display polish

Browse remains filter-first. Search remains name-first. Settings owns broad
preferences, not ordinary URL-scoped facet selections.

### 6. Make CI Portable

Add CI once the validation spine can run from a clean checkout. Do not make CI
depend on ignored runtime DB files.

Primary plan:

- `ci-cd-and-module-docs-plan.md`

Expected output:

- portable fixture or DB preparation strategy for backend API tests
- `npm run verify` or equivalent CI spine
- GitHub Actions on pull requests and pushes to `main`
- browser E2E still deferred

### 7. Keep CD Script-Backed

Keep deployment behavior in the tracked scripts and add only thin wrappers or
manual dispatch around them.

Primary plan:

- `ci-cd-and-module-docs-plan.md`

Expected output:

- `docs/deployment-scripts/*` remain deployment source of truth
- workflow wrappers do not duplicate deployment logic
- automatic deploy waits until secrets, host targeting, and rollback behavior
  are explicit

### 8. Clean Up Agent And Module Docs

After the structural work is planned clearly, shrink `AGENTS.md` back toward an
execution guide and add merge-to-main module-doc automation.

Primary plans:

- `agent-guide-review-plan.md`
- `ci-cd-and-module-docs-plan.md`

Expected output:

- `AGENTS.md` keeps durable safety rules, not a full plan catalog
- feature branches update focused docs and tests near the change
- a non-blocking doc agent opens docs-only module-doc updates after `main`
  merges when broad module docs need refresh

## Conflict Review

| Boundary | Child Plans | Current Review |
| --- | --- | --- |
| Content DB vs app-state DB | DB ownership, rules normalization | No conflict. Normalized rules-derived runtime tables belong in `CONTENT_DATABASE_URL`; future user data belongs in `APP_STATE_DATABASE_URL`. |
| Legacy rules DB vs normalized rules content | DB ownership, rules normalization, rules DB notes | No conflict. Legacy `rules-clean` remains a read-only source input once normalized runtime content exists. Existing v3.3 patches remain source-correction history. |
| Rulebook source ids vs UI labels | rules normalization, rulebook labels, frontend consumer | No conflict. Stable ids, legacy slugs, and legacy abbrs remain source identity; display labels are content metadata consumed through helpers. |
| Backend facets vs frontend controls | rules normalization, frontend consumer | No conflict. Backend contract and metadata vocabulary land before broad UI controls. Frontend does not parse legacy DB strings. |
| Search semantics vs Browse semantics | frontend consumer, features map | No conflict. Browse stays filter-first; Search stays name-first while accepting the same structured scope. |
| Settings vs URL state | frontend consumer | No conflict. Settings owns broad defaults. Ordinary Browse/Search facet selections stay in URL state. |
| CI vs local data | CI/CD, rules normalization, data harness | No conflict, but implementation must create portable fixtures or preparation commands before enabling backend API tests in CI. Ignored local DBs cannot be CI inputs. |
| CD vs deploy scripts | CI/CD, deployment docs | No conflict. CD wrappers call tracked scripts; deploy logic stays in `docs/deployment-scripts/`. |
| AGENTS vs docs index | agent guide, CI/CD module docs, this plan | No conflict. `docs/README.md` is the map, this plan is v3.5 coordination, and `AGENTS.md` should shrink after the review. |
| v3.5 vs long-term content artifacts | roadmap, stable backlog | No conflict. Bulk translation QA, `data/spells-full` completion imports, static/offline HTML artifacts, content packs, and offline search indexes stay long-term unless explicitly pulled into a later version plan. |

## Review Notes By Child Plan

### DB Ownership Boundary

Reviewed against the other plans. The plan correctly makes the content/app-state
split a v3.5 target and allows normalized rules-derived tables to land in the
content DB. No change needed unless implementation chooses a transitional env
var strategy that affects rules normalization.

### Rules Content Normalization

Reviewed against the DB and frontend plans. The plan correctly treats legacy
rules data as source input and gives frontend control rollout to the frontend
consumer plan. No conflict with rulebook labels because labels are content
metadata, not source identity.

### Normalized Rules Frontend Consumer

Reviewed against design notes and rules normalization. The plan keeps frontend
parsing out of UI code, preserves Browse/Search roles, and scopes Settings to
broad defaults. No conflict with CI because validation is pure frontend tests,
API contract tests, and manual smoke rather than browser E2E first.

### Rulebook Display Labels

Reviewed against rules normalization. The plan should be implemented as content
metadata, likely in the content DB, and should not mutate legacy `slug` or
`abbr`. It can ship before or after normalized spell facets as long as UI helper
fallback behavior is tested.

### CI/CD And Module Docs

Reviewed against DB/content plans. CI must wait for portable DB fixtures or
preparation commands. CD remains script-backed and should not become a parallel
deployment implementation. Module-doc automation should be non-blocking and
docs-only.

### Agent Guide Review

Reviewed against this integrated plan. `AGENTS.md` can temporarily link v3.5
plans during planning, but the final review should keep only durable routing and
safety rules. Detailed sequencing belongs here, not in `AGENTS.md`.

## Acceptance Criteria

- This integrated plan is linked from the v3.5 README, docs index, and roadmap.
- Each child plan has a clear role in the delivery sequence.
- Cross-plan boundaries are reviewed and have no unresolved ownership conflict.
- Long-term content artifact goals remain outside v3.5 scope.
- Future v3.5 implementation branches can choose a slice by reading this file
  first, then the relevant child plan.
