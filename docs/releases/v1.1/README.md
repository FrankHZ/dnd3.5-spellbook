# v1.1 Release Plan

Status: planned.

v1.1 is the first post-v1.0 production hardening release. It should keep the
public site stable while tightening the production security posture and
expanding the content corpus through the maintained data harness.

## Release Boundary

v1.1 owns two independent implementation tracks plus a focused frontend
acceptance pass:

1. **Production hardening**

   Review and apply accepted Cloudflare/AWS security changes for the existing
   production topology. The goal is least privilege and clear operator
   visibility, not a server re-architecture.

2. **Full spell corpus**

   Import the remaining source-backed spell corpus through the maintained
   rules/content DB workflow, with provenance and review evidence clear enough
   for production content DB activation.

3. **Frontend content pass**

   Verify the user-facing frontend after hardening and full-corpus activation.
   This is a focused Browse/Search/Detail/About/Status/display-settings pass,
   not the broad v1.3 sitewide redesign.

These tracks may be implemented by separate specialist agents. Production
hardening and full spell corpus should remain independently reviewable so a
security finding does not block corpus readiness, and a corpus issue does not
block security acceptance. The frontend content pass should run after enough
corpus/runtime state is available to inspect the release as users see it.

## Track Order

1. **Production hardening plan**

   Planned in
   [production-hardening-plan.md](./production-hardening-plan.md). This owns
   the CF/AWS security checklist, accepted configuration changes, operator
   notes, and smoke evidence for frontend, API, CORS, deploy, and private
   status/admin paths.

2. **Full spell corpus plan**

   Planned in [full-spell-corpus-plan.md](./full-spell-corpus-plan.md). This
   owns corpus source intake, data-tool import/review workflow, content DB
   artifact update, production activation evidence, and DB status validation.

3. **Frontend content pass**

   Planned in
   [frontend-content-pass-plan.md](./frontend-content-pass-plan.md). This owns
   focused frontend smoke and small content-display fixes for the accepted v1.1
   runtime state.

4. **Release acceptance and freeze**

   Create acceptance evidence after the two implementation tracks and frontend
   content pass are accepted. Then create `FREEZE.md` as the as-built v1.1
   snapshot.

Do not create an integrated plan unless the two tracks start conflicting on
delivery sequence, ownership, or accepted release scope.

## Non-Goals

- Do not redesign the sitewide UI or spell card system.
- Do not start the large-scale Chinese/English translation and proofreading
  project.
- Do not add static HTML/offline artifact generation.
- Do not add automatic content DB upload to CD without a separate accepted
  content artifact and rollback model.
- Do not use v1.1 to perform a broad app DB/schema redesign.
- Do not migrate away from the existing Cloudflare Workers frontend plus
  Express/SQLite backend topology.

## Plans

- [production-hardening-plan.md](./production-hardening-plan.md)
- [full-spell-corpus-plan.md](./full-spell-corpus-plan.md)
- [frontend-content-pass-plan.md](./frontend-content-pass-plan.md)

## Release Acceptance

v1.1 release acceptance should include:

- Production hardening checklist records enabled items, deferred items, and
  reasons.
- Cloudflare changes are verified against current production frontend and API
  behavior.
- AWS/server changes are verified without widening SSH, Nginx, or deploy
  exposure.
- Production smoke passes for frontend routes, API status, CORS allow/reject,
  backend deploy, and private db-status/admin-only behavior.
- Full corpus import produces reviewable data-tool reports and a content DB
  artifact with provenance.
- Content DB activation is verified through DB status and representative
  Browse/Search/Detail API checks.
- Focused frontend pass verifies updated content visibility, route layout,
  mobile behavior, display settings, language mode, and About/Status metadata.
- Documentation updates explain changed operator workflow, data workflow,
  security posture, and remaining follow-up candidates.
- `FREEZE.md` records the final as-built release state.

## Expected Documentation Updates

- `docs/operations/deployment.md`: update operator steps if security or deploy
  smoke behavior changes.
- `docs/operations/data-setup.md`: update local/production DB role notes if
  corpus artifact handling changes.
- `docs/operations/import-workflow.md`: document the accepted full corpus
  import path and validation reports.
- `docs/operations/rules-db-notes.md`: update rules/source patch notes when
  corpus import adds or resolves source-backed spells.
- `docs/modules/delivery.md`: update delivery boundaries only if production
  hardening changes deploy responsibilities.
- `docs/features.md`: update user-visible content coverage only after corpus
  import is accepted.
- `docs/design.md` and `docs/i18n.md`: update only if the frontend pass changes
  durable design guidance or copy workflow.
- `docs/roadmap.md`: update when v1.1 becomes frozen or when the next release
  track changes.

## Handoff Rule

v1.1 is active planning. Implementation branches should update their owning
child plan and affected topic/operations docs. Use `docs/roadmap.md` for
current work ordering after a pause, and do not edit older MVP history to
describe v1.1 behavior.
