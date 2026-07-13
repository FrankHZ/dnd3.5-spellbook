# v1.2 Release Plan

Status: in progress. Publications page and minimum metadata are accepted;
full-spell source review and mechanics localization remain.

v1.2 is a focused post-v1.1 release. It starts from the accepted full corpus
runtime state and improves source confidence, bounded mechanics localization,
and publication/rulebook scope management without starting the full spell-body
translation project or a sitewide redesign.

## Release Boundary

v1.2 owns three acceptance tracks:

1. **Full-spell source review**

   Inventory the local `data/spells-full/v6.01/` source package, review the
   existing `data/spells-full/spells-parsed.json` quality from the v6.00 source,
   and produce a source/parse QA report that is useful for later import,
   translation, and provenance decisions.

2. **Mechanics localization**

   Translate the normalized mechanics vocabulary into Chinese, run the
   translation and QA loop end-to-end on that bounded corpus, document the
   reusable workflow as repo-local skill guidance or an equivalent durable agent
   playbook, and make the frontend render mechanics in Chinese wherever
   mechanics appear in Chinese UI.

3. **Publications page and minimum metadata**

   Add a user-facing publication/rulebook page for browsing and managing
   publication scope. Add only the DB/API metadata needed to make the page and
   rulebook grouping robust enough that frontend grouping no longer depends on
   heuristic labels. Settings should keep general app preferences.

These tracks may be implemented by separate specialist agents. Source review
can proceed independently. Mechanics localization should establish the data/i18n
workflow before frontend copy display is accepted. The Publications page should
not expand into the v1.3 sitewide redesign.

## Track Order

1. **Full-spell source review**

   Planned in
   [full-spell-source-review-plan.md](./full-spell-source-review-plan.md). This
   owns source inventory, parsed JSON quality review, report shape, and
   follow-up classification for later corpus work.

2. **Mechanics localization**

   Planned in
   [mechanics-localization-plan.md](./mechanics-localization-plan.md). This owns
   normalized mechanics translation, QA workflow, durable agent handoff, and
   frontend mechanics display in Chinese.

3. **Publications page and minimum metadata**

   Accepted in [publications-page-plan.md](./publications-page-plan.md). This
   owns the publication/rulebook user surface, Settings boundary, and minimum
   metadata contract required for robust grouping. PR #65 shipped the page and
   Settings boundary; PR #66 closed the metadata refresh and row sorting
   follow-up.

4. **Release acceptance and freeze**

   After full-spell source review and mechanics localization are accepted,
   create `FREEZE.md` as the as-built v1.2 snapshot.

Do not create an integrated plan unless these tracks start conflicting on
delivery sequence, ownership, or accepted release scope.

## Non-Goals

- Do not make full spell-body, spell-name, or short-description translation and
  proofreading part of v1.2 acceptance.
- Do not import new full-spell source data into the production content DB
  solely because the source review found usable data.
- Do not redesign the sitewide UI, spell cards, or complete filter experience.
- Do not perform a broad publication schema redesign beyond what the
  Publications page needs.
- Do not add automatic content DB upload to CD.

## Plans

- [full-spell-source-review-plan.md](./full-spell-source-review-plan.md)
- [mechanics-localization-plan.md](./mechanics-localization-plan.md)
- [publications-page-plan.md](./publications-page-plan.md)

## Release Acceptance

v1.2 release acceptance should include:

- Full-spell 6.01 source inventory and v6.00 parsed JSON quality report are
  committed as reviewable docs or generated reports with stable instructions.
- Full-spell source review identifies accepted, blocked, deferred, and
  follow-up categories without changing production content by accident.
- Normalized mechanics have Chinese display strings and QA evidence.
- Mechanics translation workflow is documented as reusable agent guidance or an
  equivalent durable playbook.
- Frontend Chinese UI renders localized mechanics where mechanics appear, while
  English display and comparison behavior remain intact.
- Publications page supports browsing and managing publication/rulebook scope.
- Settings no longer acts as the primary publication-management surface.
- Publication/rulebook grouping uses accepted metadata instead of frontend-only
  heuristic labels for the page's supported grouping model.
- Focused tests, i18n checks, data-tool checks, and frontend smoke checks pass
  for the changed surfaces.
- `FREEZE.md` records the final as-built release state.

## Expected Documentation Updates

- `docs/operations/import-workflow.md`: update if source review changes the
  accepted full-spell review workflow.
- `docs/operations/rules-db-notes.md`: update if minimum publication metadata
  changes rulebook/content patch semantics.
- `docs/i18n.md`: update mechanics localization workflow and QA handoff.
- `docs/features.md`: update Publications page and mechanics display behavior
  after implementation is accepted.
- `docs/design.md`: update only if the Publications page introduces durable
  layout guidance.
- `docs/modules/server.md`, `docs/modules/web.md`, or `docs/modules/data-tools.md`:
  update only when module ownership or validation boundaries change.
- `docs/roadmap.md`: update when v1.2 becomes frozen or when the next release
  track changes.

## Handoff Rule

v1.2 is active planning. Implementation branches should update their owning
child plan and affected topic/operations docs. Use `docs/roadmap.md` for
current work ordering after a pause, and do not edit frozen v1.1 docs to
describe v1.2 behavior.
