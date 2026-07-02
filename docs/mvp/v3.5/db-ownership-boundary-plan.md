# DB Ownership Boundary Plan

Status: first v3.5 implementation slice in progress.

## Problem

The previous `server/prisma-app/schema.prisma` was named "app DB", but in
practice it was an app-owned content DB. It stored imported/local content
overlays such as Chinese names and descriptions. It also has placeholder
user/app-state models (`User`, `FavoriteSpell`, `SpellNote`) that are not the
current product's active user-data surface.

That is workable while the app has no server-side user data. It becomes
dangerous once generated content overlays, imported short descriptions,
rulebook display labels, notes, favorites, accounts, or syncable user state all
start sharing the same DB lifecycle.

v3.5 should not leave this as a later judgment call. The target is to split the
current app-owned content overlays from any future user/app-state database before
real server-side user data exists.

## Goals

- Split generated content data from future user/app-state data.
- Keep rules DB, generated content overlays, and user-owned state in explicitly
  named ownership domains.
- Rename the current "app DB" responsibility into a content DB responsibility,
  even if compatibility env vars or transitional file names remain temporarily.
- Introduce a separate app-state DB boundary for future server-side users,
  synced collections, notes, preferences, or account data.
- Make DB reset/rebuild commands safe: generated content can be rebuilt; user
  state must not be casually dropped by content import workflows.
- Keep server code clear enough that future agents know which Prisma client can
  be modified by data-tools and which client is user-data sensitive.

## Non-Goals

- Do not mutate or collapse the legacy rules DB into app-state. The normalized
  rules content plan may promote rules-derived runtime tables into
  `CONTENT_DATABASE_URL`, while preserving the legacy rules DB as a source
  input.
- Do not introduce user accounts or syncable server-side user data as part of the
  split.
- Do not block v3.4 short-description import on a DB split if v3.4 still only
  writes generated content.
- Do not perform destructive local DB migration without an explicit restore or
  rebuild path.

## Current Interpretation

- `rules DB`: legacy imported rules dataset and rules patches; v3.5 should
  treat this as a source input once normalized rules content exists.
- previous `app DB`: app-owned content overlay DB, despite the name.
- current `content DB`: generated/imported app-owned content overlays and,
  after rules normalization, canonical rules-derived runtime tables.
- current `app-state DB`: user-owned state, if server-side users, notes, synced
  collections, or favorites become real runtime features.

## Decision

v3.5 should implement the split into separate content and app-state database
boundaries. Keeping one physical app DB is no longer the preferred target.

### Rejected Shape: Keep One App DB, Rename The Boundary In Docs

Keep `APP_DATABASE_URL` and the existing `prisma-app` schema. Treat content and
future user tables as table-level ownership domains.

This is lowest migration cost, but it keeps a risky reset boundary: content
import and user data would still share one physical SQLite file.

### Target Shape: Split Content DB And App-State DB

Create two app-owned SQLite schemas:

- `CONTENT_DATABASE_URL`: generated/imported content overlays
- `APP_STATE_DATABASE_URL`: future user/app-state data

Move or keep these model families by ownership:

- content DB: `I18n*Text`, spell summaries, rulebook display labels, curated
  aliases that are generated or imported, and normalized rules-derived tables
  when `rules-content-normalization-plan.md` is implemented
- app-state DB: `User`, `FavoriteSpell`, `SpellNote`, future syncable
  collections or user preferences

The app-state DB may start empty or contain only placeholder/future-ready schema
after the split. The important v3.5 deliverable is the physical and tooling
boundary: content rebuilds must not share the same reset path as future user
state.

## Implementation Steps

1. Inventory every Prisma model in the previous `server/prisma-app/schema.prisma`.
2. Classify each model as generated content, user/app-state, or obsolete
   placeholder.
3. Inventory all server/data-tools scripts that read or write app DB tables.
4. Create concrete schema and client ownership:
   - `server/prisma-content/schema.prisma`
   - `server/prisma-app-state/schema.prisma`
   - `CONTENT_DATABASE_URL`
   - `APP_STATE_DATABASE_URL`
   - transitional fallback from `APP_DATABASE_URL` to the content DB
5. Move generated/imported overlay models to the content DB schema.
6. Move placeholder user/app-state models to the app-state schema as future
   scaffolding.
7. Update data-tools and import commands so write-capable content workflows only
   target the content DB.
8. Update server services so content reads and future app-state reads use clearly
   named clients.
9. Update local DB rebuild/setup docs and deployment docs.
10. Do not perform destructive local DB migration in this slice. Existing local
    or remote content DB files can stay under the old `app.sqlite` / `app.db`
    filename while env vars move to `CONTENT_DATABASE_URL`.

Coordinate this split with `rules-content-normalization-plan.md` so normalized
rules runtime tables land in the content DB boundary rather than creating a
third long-lived runtime DB by accident.

## Acceptance Criteria

- A single doc states which DB owns rules, generated content, and user/app-state.
- `CONTENT_DATABASE_URL` and `APP_STATE_DATABASE_URL` are documented, or any
  transitional env-var compatibility is explicitly called out with an end state.
- Data-tools commands cannot accidentally delete user/app-state tables.
- Server code uses clearly named clients for content versus user/app-state.
- Local setup docs explain which DB files can be rebuilt from source and which
  must be preserved.
- Deployment docs explain which DB files are content artifacts and which are
  user/app-state data.
- `AGENTS.md`, `docs/data-setup.md`, and workspace READMEs point to the final DB
  ownership decision before implementation.

## Implementation Notes

The first implementation slice establishes the physical and code ownership
boundary without migrating local SQLite files:

- `server/prisma-content/` owns generated/imported content overlay models.
- `server/prisma-app-state/` owns future user/app-state models.
- `server/src/lib/content-prisma-client.ts` reads `CONTENT_DATABASE_URL`, with
  `APP_DATABASE_URL` as a temporary compatibility fallback.
- `server/src/lib/app-state-prisma-client.ts` reads `APP_STATE_DATABASE_URL`.
- Content import commands and short-summary import tooling target the content
  DB boundary.
- Deployment still treats the existing remote `app.db` file as the content DB
  artifact until the deferred DB deployment redesign lands.
