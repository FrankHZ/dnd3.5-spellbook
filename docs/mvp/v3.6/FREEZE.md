# v3.6 Freeze

## Status

**v3.6 FROZEN**

This document records the final canonical documentation state for the v3.6
handoff.

v3.6 is frozen as a lightweight post-v3.5 stabilization stage around remote DB
status visibility, browser-local display settings, spell-card and filter-summary
polish, documentation structure cleanup, and normalized rules follow-up review.

## Canonical Source Order

When v3.6 documents conflict, treat this freeze document as authoritative over
earlier v3.6 planning documents.

Use this precedence order for v3.6:

1. `docs/mvp/v3.6/FREEZE.md`
2. current focused topic docs changed by v3.6:
   - `docs/features.md`
   - `docs/design.md`
   - `docs/frontend-map.md`
   - `docs/i18n.md`
   - `docs/modules/`
3. current operational docs changed by v3.6:
   - `docs/operations/data-setup.md`
   - `docs/operations/deployment.md`
   - `docs/operations/repo-conventions.md`
4. focused v3.6 plan documents:
   - `docs/mvp/v3.6/integrated-plan.md`
   - `docs/mvp/v3.6/db-status-api-plan.md`
   - `docs/mvp/v3.6/ui-ux-display-update-plan.md`
   - `docs/mvp/v3.6/docs-structure-cleanup-plan.md`
   - `docs/mvp/v3.6/normalized-rules-review-plan.md`

Reason:

- the plan documents describe intended scope and implementation rationale.
- focused topic and operational docs own current behavior and workflows.
- this freeze document records the shipped interpretation after acceptance.

## Frozen Deliverables

v3.6 is frozen with these deliverables complete:

1. Read-only `GET /api/status/db` for runtime DB provenance and content DB
   activation checks.
2. Browser-local display settings, compact/full-detail spell-card modes,
   Chinese display comparison controls, and shared Browse/Search scope summary
   density updates.
3. Spell-card styling and special-component marker polish across shared
   Browse/Search and spell-id collection list surfaces.
4. Documentation structure cleanup: operations docs, versioned-doc guidance,
   reusable acceptance/freeze templates, and updated agent navigation rules.
5. Read-only normalized rules review inventory with readiness decisions for
   current taxonomy filters, component flags, mechanic facets, and Tome of
   Battle taxonomy boundaries.
6. v3.7 security and dependency-maintenance planning in place as the next active
   planning track.

## Final As-Built Summary

### 1. DB Status API

Shipped behavior:

- `GET /api/status/db` reports the active spell read source, sanitized database
  role status, content DB file role, latest `RulesContentBuild` metadata, and
  minimal normalized content table counts.
- The endpoint distinguishes rules, content, transitional content alias, and
  app-state DB roles without exposing full local paths.
- Operator docs explain how to compare remote status output with local
  `rules:content:meta` after manual DB upload.

Accepted evidence:

- PR [#11](https://github.com/FrankHZ/dnd3.5-spellbook/pull/11).
- `npm run ci:portable` passed with server tests covering disposable DB
  fixtures.

Frozen clarification:

- The endpoint is read-only.
- It does not upload DB files, activate artifacts, run migrations, expose raw
  source text, or make DB upload part of CD.

### 2. UI/UX Display Update

Shipped behavior:

- Browse/Search expose browser-local display settings for list density and
  summary/full-detail spell cards.
- Summary spell cards are scan-only; favorite and prepared-spell actions live
  in full-detail card mode.
- Chinese-mode display preferences support compact English comparison and
  localized rulebook/source-label choices where surfaced.
- Shared spell cards show compact special-component markers without turning
  every list row into a detail view.
- Browse/Search use a shared compact scope summary for class, domain, level,
  taxonomy, and rulebook selections.

Accepted evidence:

- PR [#12](https://github.com/FrankHZ/dnd3.5-spellbook/pull/12).
- `npm run i18n:check` passed.
- `npm run ci:portable` passed with web tests, typecheck, and build.

Frozen clarification:

- Display settings remain browser-local, not app-state DB data.
- v3.6 does not add new backend filter contracts.
- Broader visual redesign remains deferred; `docs/design.md` owns durable UI
  direction.

### 3. Docs Structure Cleanup

Shipped behavior:

- `docs/README.md` is the canonical documentation map.
- `docs/operations/` owns deployment, data setup, import workflow, rules DB
  notes, public-repo notes, repo conventions, and remote bootstrap docs.
- `docs/mvp/README.md` explains version folder roles and frozen snapshot
  precedence.
- `docs/templates/acceptance-checklist.md` and
  `docs/templates/freeze-snapshot.md` provide reusable closeout shapes.
- `AGENTS.md` stays compact while recording main-gate, librarian, specialist,
  and subagent boundaries.

Accepted evidence:

- PR [#14](https://github.com/FrankHZ/dnd3.5-spellbook/pull/14).
- `git diff --check` passed on the freeze branch.

Frozen clarification:

- Frozen version folders remain historical records.
- Durable current behavior belongs in focused topic and operational docs, not in
  old MVP history.

### 4. Normalized Rules Review

Shipped behavior:

- `npm run -w data-tools rules:content:review` is the read-only inventory
  command for normalized taxonomy, component, and mechanic facets.
- Existing school/subschool/descriptor query vocabulary remains stable for the
  v3.5 Browse/Search filters.
- Base component flags are accepted as the safest next backend contract
  candidate, but no component filter UI ships in v3.6.
- Tome of Battle disciplines and maneuver categories need a source-kind or
  category boundary before UI grouping changes.
- Casting time, range, target/effect/area, duration, saving throw, and spell
  resistance facets remain deferred until fallback semantics are accepted.

Accepted local review snapshot:

| Metric | Value |
| ------ | ----: |
| `SpellContent` | 4926 |
| `SpellTaxonomyFacet` | 8658 |
| `SpellComponent` | 44474 |
| `SpellMechanicFacet` | 39408 |
| `RulesContentIssue` | 3523 |
| taxonomy review rows | 0 |
| component review rows | 6 |
| mechanic review rows | 3511 |

Accepted evidence:

- PR [#15](https://github.com/FrankHZ/dnd3.5-spellbook/pull/15).
- `npm run -w data-tools rules:content:review` passed against
  `server/db/local/content.sqlite`.
- Report:
  `data-tools/out/rules-content/2026-07-04T01-58-21-613Z-normalized-rules-review.json`.

Frozen clarification:

- Review rows are known normalization debt, not freeze blockers.
- v3.6 reviewed the candidate vocabulary and deliberately did not broaden the
  public query contract.

### 5. v3.7 Handoff

Shipped behavior:

- v3.7 has an active planning folder for security review and dependency
  maintenance.
- Security follow-up starts with operator/status endpoint exposure and
  production-safe error behavior.
- Dependency follow-up owns major/risky upgrades and the TypeScript
  server/CommonJS versus contracts/ESM boundary.

Accepted evidence:

- PR [#16](https://github.com/FrankHZ/dnd3.5-spellbook/pull/16) merged before
  this freeze.

Frozen clarification:

- v3.7 planning docs are not v3.6 shipped behavior. They are the explicit home
  for deferred follow-up work after this freeze.

## Final Validation Evidence

Commands run on `codex/docs-v3-6-freeze` after PR #16 was merged:

```bash
npm run ci:portable
npm run i18n:check
npm run -w data-tools rules:content:review
git diff --check
```

Accepted results:

- `npm run ci:portable`: passed
  - contracts build and runtime import passed
  - Prisma clients generated for rules-clean, content, and app-state schemas
  - server build passed
  - server tests passed: 16 files, 58 tests
  - data-tools typecheck passed
  - portable data-tools tests passed: 9 checks
  - web tests passed: 24 files, 90 tests
  - web typecheck passed
  - web build passed
  - React Router v8 future-flag warnings were emitted
  - existing Vite sourcemap warnings were emitted for local UI wrappers
- `npm run i18n:check`: passed
  - extractor dry-run reported no file updates
  - i18n audit passed for 12 namespaces
- `npm run -w data-tools rules:content:review`: passed
  - taxonomy review rows: 0
  - component review rows: 6
  - mechanic review rows: 3511
  - report:
    `data-tools/out/rules-content/2026-07-04T01-58-21-613Z-normalized-rules-review.json`
- `git diff --check`: passed

## Known Deferred Work

These items are explicitly outside the v3.6 freeze gate:

- Base component filter contract implementation.
- Tome of Battle source-kind/category boundary and UI grouping.
- Casting-time, range, target/effect/area, duration, saving throw, and spell
  resistance query vocabularies.
- Normalized mechanics display on Spell Detail.
- v3.7 security hardening and production-safe error/status exposure.
- Major/risky dependency upgrades and the TypeScript server/CommonJS versus
  contracts/ESM boundary.
- Automatic DB release artifacts and CD-managed DB upload.
- Bulk Chinese/English translation and proofreading QA.
- `data/spells-full` completion workflow for remaining source-backed English
  spell imports.
- Static HTML/offline artifact generation and offline search/index artifacts.
- Rollback playbook, HTTPS/TLS, and host hardening.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Use `docs/mvp/v3.7/README.md`,
  `docs/mvp/v3.7/security-review.md`, and
  `docs/mvp/v3.7/dependency-upgrade-plan.md` for active v3.7 work.
- Use `docs/mvp/v3.6/normalized-rules-review-plan.md` when choosing the next
  post-v3.6 data/contract slice.
- Do not treat older plan documents as newer than this snapshot.
