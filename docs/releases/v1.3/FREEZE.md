# v1.3 Freeze

## Status

**v1.3 FROZEN**

This document records the final canonical documentation state for the v1.3
sitewide UX/style and platform-deployment handoff. Root release metadata is
`v1.3.0`.

The accepted implementation baseline is merged `main` commit
`1e89afa15877d57a668d777eb4ff2a83da7a11db`. This freeze records code and
acceptance state; it does not claim that the post-freeze `v1.3.0` metadata has
already been activated in production.

## Canonical Source Order

When v1.3 documents conflict, treat this freeze document as authoritative over
earlier v1.3 planning wording.

Use this precedence order for v1.3:

1. `docs/releases/v1.3/FREEZE.md`
2. current `docs/design.md`, `docs/features.md`, and `docs/frontend-map.md`
3. current `docs/operations/deployment.md`, `docs/modules/delivery.md`, and
   `docs/harness.md`
4. `docs/releases/v1.3/sitewide-ux-redesign-plan.md`
5. `docs/releases/v1.3/platform-deploy-prerequisite-plan.md`
6. `docs/releases/v1.3/README.md`

## Frozen Deliverables

1. A sitewide modern rulebook-inspired interface vocabulary applied across
   lookup, reading, collection, preparation, publication, settings, and status
   surfaces without changing accepted product semantics.
2. A secure GitHub Actions backend deployment path using GitHub OIDC and a
   temporary runner `/32` Lightsail SSH rule, with strict host identity and
   mandatory firewall restoration.
3. Deterministic deploy checkout/ref metadata, preserved SQLite preflight, and
   a real main-branch Actions deployment proving the platform path end to end.

## Final As-Built Summary

### 1. Sitewide UX And Style

Shipped behavior:

- Shared neutral-paper, raised-surface, ink, fine-rule, and restrained binding-
  accent roles now ground the app in a modern rules-reference visual language.
- TopBar, `PageHeader`, side controls, index/list surfaces, reading surfaces,
  status treatments, metadata, and common controls use one coherent hierarchy.
- Browse, Search, Spell Detail, Publications, spellbooks, Favorites, Prepared,
  Settings, and About / Status share the accepted vocabulary while preserving
  their workflow-specific layouts.
- Browse/Search filters, name-first versus explicit full-text Search, URL and
  rulebook scope, display preferences, collections, and prepared-spell state
  retain their accepted contracts.
- Summary spell cards remain scan-only; favorite and prepare actions remain in
  full-detail card mode.

Accepted evidence:

- PR #96 merged the completed frontend-design track at main commit `1e89afa`.
- `npm run verify`, `npm run i18n:check`, and the production web build passed
  during specialist acceptance.
- English and Chinese browser smoke covered `1440 x 900` and `390 x 844`
  viewports across all scoped routes, expanded filter states, empty Favorites,
  short-query validation, and missing-spell error states.
- Acceptance found no horizontal document overflow, clipped interactive
  labels, duplicate page titles, mobile default-collapse regression, or
  remaining cohesion blocker.

### 2. Platform Deployment Prerequisite

Shipped behavior:

- GitHub Actions uses OIDC to assume a narrowly scoped AWS deploy role.
- Each deploy snapshots the current Lightsail firewall, adds only the current
  GitHub-hosted runner IPv4 `/32` for SSH, rejects unrestricted public SSH, and
  restores plus verifies the original firewall state during cleanup.
- SSH host identity is pinned; trust-on-first-use is no longer the production
  fallback.
- `deploy-backend.sh` defaults to the production checkout's `origin` remote,
  verifies an explicit full commit, and reports logical ref `main` instead of
  `origin/HEAD` for main deployments.
- Existing bootstrap and deploy preflight remain aligned on `sqlite3`, and
  missing-tool coverage proves failure before deploy mutation.
- Content DB upload and activation remain manual and operator-owned.

Accepted evidence:

- PR #95 merged the platform track at main commit `3ed3f4b`.
- GitHub Actions deploy run `29669906495` passed portable validation, OIDC/AWS
  access, temporary firewall authorization, strict SSH, remote preflight,
  exact-commit deployment, local service smoke, public metadata smoke, and
  firewall restoration.
- The accepted production response reported backend commit
  `3ed3f4bc6272ca409e6c7d7bd02f46f05c785e05`, logical ref `main`, GitHub run
  `29669906495`, and healthy content status.
- The previous failed run `29656374979` remains historical diagnostic evidence,
  not the accepted connection model.

### 3. Release Metadata

Shipped behavior:

- Root `package.json` and `package-lock.json` define release version `1.3.0`.
- Release metadata tests expect `v1.3.0`; workspace package versions remain
  unchanged because they are not independently released.
- Production frontend and backend metadata must be activated from merged main
  after this freeze lands. Until then, live backend metadata correctly remains
  `v1.2.2` at `3ed3f4b`; this snapshot does not relabel that deployment.

## Validation Evidence

| Check                                       | Result | Notes                                                                                         |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Main CI run `29704940782`                   | Pass   | Portable validation on merged UX main commit `1e89afa`                                        |
| `npm run ci:portable`                       | Pass   | Freeze branch, including contracts, runtime, server/data/web tests, typechecks, and web build |
| `npm run i18n:check`                        | Pass   | All 16 namespaces, no extraction drift                                                        |
| `node scripts/release-metadata.mjs --label` | Pass   | `v1.3.0`                                                                                      |
| `npm run test:release-metadata`             | Pass   | Root version and deploy-helper metadata wiring                                                |
| UX browser matrix                           | Pass   | English/Chinese desktop/mobile plus expanded and error/empty states                           |
| Actions deploy run `29669906495`            | Pass   | Portable, OIDC/AWS, SSH, deploy, smoke, metadata, and firewall restore                        |

## Known Deferred Work

- Review whether the raw source-locator string shown above some Spell Detail
  rule text belongs in the public reading surface. This is a separate content/
  display decision and is parked in `docs/stable-backlog.md`.
- Full spell-body, spell-name, and short-description translation/proofreading QA
  remains the next promoted product candidate, but no numbered release plan
  exists yet.
- Broader rollback drills, automatic DB deployment, static/offline artifacts,
  and deeper architecture work remain in `docs/stable-backlog.md`.
- After this freeze merges, activate `v1.3.0` from merged `main` through the
  accepted frontend and backend deployment paths, then verify About / Status
  reports the exact label, ref, and commit before tagging the release.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Use this snapshot for v1.3 as-built UI and platform behavior; use live status
  endpoints and deployment records for current production activation state.
- Do not add active scope to this frozen folder.
- Do not treat older v1.3 plan wording as newer than this snapshot.
