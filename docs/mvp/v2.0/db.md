> **Status:** MVP milestone document (not yet frozen).
> This document may be updated until the MVP baseline is finalized.

---

# v2.0 – Database Changes (App DB + i18n Overlay)

## Overview

v2.0 adds an **App Database (`app.sqlite`)** for i18n overlays and app-owned data, while keeping the legacy **Rules Database (`rules_clean.sqlite`)** as the read-only source of truth for game rules.

A key v2.0 constraint is **preserving existing API response contracts**. We do not redesign spell response shapes in v2.0; breaking/contract changes are deferred to v2.1.

---

## Databases

### 1) Rules DB (`rules_clean.sqlite`)

- Read-only
- Canonical rules data (spells, rulebooks, classes, domains, schools/subschools, descriptors)
- IDs from this DB are referenced by value in the App DB
- No Prisma migrations against this DB

### 2) App DB (`app.sqlite`)

- Owned by the app
- Managed by Prisma migrations under `/prisma-app`
- Stores:
  - i18n text overlays
  - user app state (favorites/notes)

- No cross-DB foreign keys (SQLite limitation + operational simplicity)

---

## Design Principles

- **Rules DB = structure + mechanics**
- **App DB = localized text + user state**
- i18n is implemented as an **overlay** keyed by `(entityId, lang, variant)`
- Runtime merge behavior:
  - prefer i18n text if present
  - fallback to English in rules DB if missing

- v2.0 specifically avoids “hydrating” spell responses with new localized fields (contract preserved)

---

## Language Model

All i18n tables follow:

- `lang`: natural language, e.g. `zh`
- `variant`: version/source within the language, default `"default"`

In v2.0:

- Spells may later use different `variant` values (e.g., `chm`, `ai`) but **the core DB model supports it now**.
- Common entities currently use `lang="zh"`, `variant="default"`.

---

## App DB Schema Additions (v2.0)

### A) User & App State

- `User`
- `FavoriteSpell` (user ↔ spellId)
- `SpellNote` (user ↔ spellId + note content)

---

### B) Spell i18n (text overlay)

#### `I18nSpellText`

Stores localized spell name + description (HTML + plain text).

- Unique: `(spellId, lang, variant)`
- Fields include:
  - `name`
  - `descriptionHtml`
  - `descriptionText`
  - `sourceKey` (provenance/debugging for CHM pipeline)

#### `I18nSpellNameAlias`

Stores alternative spell names in the same language.

- Unique: `(spellId, lang, aliasName)`
- Used for multiple community names (e.g., 牛之力量 / 蛮力术)

> Note: Spell mechanical fields (range, components, duration, etc.) remain in rules DB and are not duplicated into App DB.

---

### C) Common entity i18n (dictionary overlay)

v2.0 includes i18n overlay tables for common entities. These are primarily used by frontend mapping and future meta endpoints.

- `I18nCharacterClassText`
- `I18nDomainText`
- `I18nRulebookText`
- `I18nSpellSchoolText`
- `I18nSpellSubschoolText`
- `I18nDescriptorText`

All follow:

- Unique: `(entityId, lang, variant)`
- `name` is nullable and falls back to rules DB English name at runtime

---

## v2.0 API Contract Rule

### Spell responses remain unchanged

For v2.0, spell endpoints continue returning the same joined entity objects as before (e.g., `school`, `subschool`, `descriptors`), using the existing rules DB data.

We **do not** add localized names into spell response payloads in v2.0 to avoid breaking changes.

### New meta endpoint for i18n mapping

To support Chinese display without changing spell response contracts, v2.0 introduces a new meta endpoint that provides i18n lookup maps for:

- spell schools
- spell subschools
- spell descriptors

Frontend uses existing IDs returned in spell responses and maps them to zh names via this meta response, falling back to English if missing.

**Example usage**

- Spell response provides `school.id`, `subschool?.id`, `descriptors[].id`
- Frontend calls meta once and renders:
  - zh name if exists
  - otherwise existing English name from spell response

This is the minimal, contract-preserving bridge for v2.0.

---

## Import & Data Lifecycle

### CHM-derived Chinese (baseline)

- Parser pipeline outputs matched spell entries with `spellId`, `rulebookId`, `zhName`, `zhDescriptionHtml`, `sourceKey`, etc.
- Import scripts write into App DB:
  - `I18nSpellText` (primary)
  - `I18nSpellNameAlias` (optional)
  - common entity i18n tables (classes/domains/rulebooks/schools/subschools/descriptors) as JSON-driven imports

### Future AI translations

- Stored in parallel using the same tables:
  - `lang="zh"`, different `variant` values (e.g., `ai_v1`)

- No overwrites required; UI can switch variants later

---

## Operational Notes

- App DB migrations:

  ```bash
  npx prisma migrate dev --config ./prisma-app/prisma.config.ts
  npx prisma generate --config ./prisma-app/prisma.config.ts
  ```

- Import scripts:
  - use shared Prisma client singletons from `src/lib`
  - run as batch jobs (wipe+reinsert per lang/variant scope)

- Environment variables:
  - `RULES_DATABASE_URL`
  - `APP_DATABASE_URL`
  - scripts must load env (e.g., `import "dotenv/config"`)

---

## What Did Not Change

- No schema changes to `rules_clean.sqlite` in v2.0
- No breaking changes to existing spell API response contracts
- No mechanical-field duplication into App DB

---

**Status:** Implemented (schema + import scripts; meta endpoint planned/implemented depending on backend progress)
**Version:** v2.0
**Applies to:** `app.sqlite` (new/managed), `rules_clean.sqlite` (corrections, see appendix)

---
