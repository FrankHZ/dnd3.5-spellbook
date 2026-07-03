# v3.6 Integrated Plan

Status: planning coordination surface.

This plan ties the v3.6 child plans together and records the current
scope split. It is not an implementation checklist. Use it to decide
sequencing, ownership, and handoff boundaries before starting a v3.6
implementation branch.

## Objective

v3.6 should make the v3.5 content platform easier to verify, easier to use, and
easier for future agents to maintain:

- remote DB activation is visible through a read-only API instead of manual SSH
  inspection
- Browse/Search/Spell Card display becomes more configurable and polished
- docs structure stops relying on every agent knowing project history
- broader normalized rules facets are reviewed before they become UI controls

Large content-release goals such as bulk translation QA, `data/spells-full`
completion imports, static/offline HTML artifacts, and versioned content packs
remain later roadmap targets unless explicitly promoted.

## Child Plans

Read these in order:

1. [db-status-api-plan.md](./db-status-api-plan.md)
2. [ui-ux-display-update-plan.md](./ui-ux-display-update-plan.md)
3. [docs-structure-cleanup-plan.md](./docs-structure-cleanup-plan.md)
4. [normalized-rules-review-plan.md](./normalized-rules-review-plan.md)

The integrated plan owns sequencing and cross-plan boundaries. Child plans own
their detailed acceptance criteria. If a boundary changes, update this file and
the affected child plan together.

## Scope Classification

### Committed For v3.6

1. **Server DB status API**

   Add a read-only endpoint that reports active read source, content DB file
   role, latest `RulesContentBuild` metadata, relevant hashes, and minimal row
   counts. This is the first implementation slice because v3.5 made DB upload
   manual and operator-owned.

2. **UI/UX display update**

   Add user-facing display settings, update spell card/list presentation, and
   continue the reference-tool styling pass without turning the app into a
   broad redesign. This work should be owned by the frontend/design lane.

3. **Docs structure cleanup**

   Review and reorganize `docs/` enough that durable topic docs, module docs,
   version planning, freeze snapshots, and historical records are easier to
   distinguish. Frozen version folders remain immutable records.

### Review Before Implementation

1. **Broader normalized filter contracts**

   Review component flags, mechanics facets, range categories, casting-time
   categories, duration, saving throws, and spell resistance before exposing
   more query controls.

2. **Taxonomy normalization**

   Review school/subschool/descriptor vocabulary before broadening UI semantics
   beyond the first v3.5 taxonomy filters. Tome of Battle disciplines and
   maneuver categories need an accepted source-kind/category boundary before
   grouping in UI.

3. **Normalized detail display**

   Revisit Spell Detail only after mechanics/category vocabulary is reviewed.
   Raw source text must remain the fallback.

4. **TypeScript module config cleanup**

   Review the server CommonJS / contracts ESM boundary before removing the
   current TypeScript deprecation suppression.

### Deferred

- bulk Chinese/English translation and proofreading QA
- source-backed short-description expansion
- `data/spells-full` completion imports
- static/offline HTML artifacts
- automatic DB release artifacts and rollback automation
- HTTPS / TLS and host hardening

## Delivery Sequence

1. **Plan v3.6 and assign lanes**

   This branch creates the version plan surface and classifies committed scope
   versus review candidates.

2. **Build DB status API**

   Land the server endpoint and minimal frontend/operator documentation before
   more DB artifact or deployment work.

3. **Run UI/UX display update**

   Use the frontend-design lane for display settings, spell cards, filter
   summary density, and styling polish. Keep behavior grounded in
   `docs/features.md` and `docs/design.md`.

4. **Clean docs structure**

   After the freeze/docs context is stable, reorganize docs navigation and
   ownership with a focused docs branch. Do not rewrite frozen history.

5. **Review normalized rules follow-ups**

   Run the normalization review before selecting the next backend/frontend
   filter implementation slice.

## Agent Orchestration

Use the main thread as the v3.6 planning, review, and merge gate.

Use the existing dedicated agents where they fit:

- `frontend-design`: UI/UX display update, spell card presentation, styling,
  mobile density, and design consistency.
- `i18n`: copy added by display settings, localized setting labels, and future
  translation/proofreading QA rules.
- `short-desc`: only if display changes expose new summary coverage or source
  quality questions.

Use subagents for bounded scans:

- DB status endpoint field inventory and meta report comparison
- docs directory inventory and proposed move map
- normalized facet dirty-value reports
- spell card component/test surface inventory

## Conflict Review

| Boundary | Current Review |
| --- | --- |
| DB status API vs DB deployment | No conflict. The endpoint is read-only and reports current artifact state; it does not upload, migrate, or activate DB files. |
| UI display settings vs app-state DB | No conflict. v3.6 display settings should stay browser-local unless a separate app-state feature is accepted. |
| Spell cards vs normalized mechanics | No conflict if spell cards consume existing fields first. New mechanics display should wait for the normalized rules review. |
| Filter density vs broader filters | No conflict. UI density work can improve current summaries before more filters are exposed. |
| Docs cleanup vs frozen history | No conflict if `FREEZE.md` files and historical plan content remain immutable records. |
| TypeScript config vs feature work | Potential conflict. Do the module config cleanup in a focused maintenance branch only after checking server/contracts packaging. |

## Acceptance Criteria

- This integrated plan is linked from the v3.6 README, docs index, and roadmap.
- Committed v3.6 scope is distinct from review candidates and stable backlog.
- UI/UX update is represented as a first-class v3.6 workstream.
- DB status API, docs cleanup, and normalized rules review have separate owner
  plans.
- Future v3.6 implementation branches can choose a slice by reading this file
  first, then the relevant child plan.
