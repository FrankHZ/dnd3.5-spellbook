# DB Ownership Boundary Plan

Status: planned v3.5 architecture review.

## Problem

The current `server/prisma-app/schema.prisma` is named "app DB", but in practice
it is currently an app-owned content DB. It stores imported/local content
overlays such as Chinese names and descriptions. It also has placeholder
user/app-state models (`User`, `FavoriteSpell`, `SpellNote`) that are not the
current product's active user-data surface.

That is workable while the app has no server-side user data. It becomes
dangerous once generated content overlays, imported short descriptions,
rulebook display labels, notes, favorites, accounts, or syncable user state all
start sharing the same DB lifecycle.

## Goals

- Decide whether to split generated content data from future user/app-state data.
- Keep rules DB, generated content overlays, and user-owned state in explicitly
  named ownership domains.
- Make DB reset/rebuild commands safe: generated content can be rebuilt; user
  state must not be casually dropped by content import workflows.
- Keep server code clear enough that future agents know which Prisma client can
  be modified by data-tools and which client is user-data sensitive.

## Non-Goals

- Do not move rules DB ownership into the app DB.
- Do not introduce user accounts or syncable server-side user data as part of the
  boundary review.
- Do not block v3.4 short-description import on a DB split if v3.4 still only
  writes generated content.
- Do not perform destructive local DB migration without an explicit restore or
  rebuild path.

## Current Interpretation

- `rules DB`: legacy imported rules dataset and rules patches.
- current `app DB`: app-owned content overlay DB, despite the name.
- future `app-state DB`: user-owned state, if server-side users, notes, synced
  collections, or favorites become real runtime features.

## Candidate Shapes

### Option A: Keep One App DB, Rename The Boundary In Docs

Keep `APP_DATABASE_URL` and the existing `prisma-app` schema. Treat content and
future user tables as table-level ownership domains.

This is lowest migration cost, but it keeps a risky reset boundary: content
import and user data would still share one physical SQLite file.

### Option B: Split Content DB And App-State DB

Create two app-owned SQLite schemas:

- `CONTENT_DATABASE_URL`: generated/imported content overlays
- `APP_STATE_DATABASE_URL`: future user/app-state data

Move or keep these model families by ownership:

- content DB: `I18n*Text`, spell summaries, rulebook display labels, curated
  aliases that are generated or imported
- app-state DB: `User`, `FavoriteSpell`, `SpellNote`, future syncable
  collections or user preferences

This is the preferred long-term boundary before real user data ships. It keeps
content rebuilds and user-state retention from depending on agent discipline.

## Review Steps

1. Inventory every Prisma model in `server/prisma-app/schema.prisma`.
2. Classify each model as generated content, user/app-state, or obsolete
   placeholder.
3. Inventory all server/data-tools scripts that read or write app DB tables.
4. Decide whether v3.5 should split schemas immediately or only rename/document
   ownership until a user-data feature starts.
5. If splitting, create a concrete migration plan:
   - schema files and generated client paths
   - env vars
   - reset/import commands
   - server service ownership
   - local DB rebuild instructions
   - rollback path

## Acceptance Criteria

- A single doc states which DB owns rules, generated content, and user/app-state.
- Data-tools commands cannot accidentally delete user/app-state tables.
- Server code uses clearly named clients for content versus user/app-state if a
  split is implemented.
- Local setup docs explain which DB files can be rebuilt from source and which
  must be preserved.
- `AGENTS.md`, `docs/data-setup.md`, and workspace READMEs point to the final DB
  ownership decision before implementation.
