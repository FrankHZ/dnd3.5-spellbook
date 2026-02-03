# v2.0 – Database Changes (App DB & i18n Overlay)

## Overview

v2.0 introduces a new **App Database (`app.sqlite`)** to support internationalization (i18n) and app-owned data, while keeping the legacy **rules database (`rules_clean.sqlite`) read-only and authoritative**.

The App DB is managed via Prisma migrations under `/prisma-app`.

---

## Databases in v2.0

### 1) Rules DB (`rules_clean.sqlite`)

- Read-only
- Contains canonical D&D 3.5 rules data:
  - spells
  - rulebooks
  - classes
  - domains
  - schools / subschools
  - descriptors

- IDs from this DB are used as **foreign references (by value)** in the App DB
- No Prisma migrations are run against this DB

### 2) App DB (`app.sqlite`)

- Owned by the application
- Created and migrated via Prisma
- Stores:
  - i18n text overlays
  - user-related data (favorites, notes)

- No cross-database foreign keys (SQLite limitation)

---

## Design Principles

- **Rules DB = structure + mechanics**
- **App DB = language + user state**
- i18n data is additive and replaceable
- Multiple language variants are supported **in parallel**
- Fallback to English (rules DB) is handled at runtime

---

## Language Model

All i18n tables use the same pattern:

- `lang`: UI-facing language key
  Examples:
  - `zh` (Chinese)

- `variant`: parallel versions within the same language
  `chm` Spell translations extracted from chm
  `ai-XXXX` AI translated spells (future plan)
  Defaults to `"default"` for other entities like character class

Uniqueness is enforced via `(entityId, lang, variant)`.

---

## App DB Schema (Current)

### A) User & App State

#### `User`

Stores application users (auth details may expand later).

#### `FavoriteSpell`

Maps users to favorited spells (`spellId` from rules DB).

#### `SpellNote`

Free-form user notes per spell.

---

### B) Spell i18n

#### `I18nSpellText`

Localized spell name and description.

- Key: `UNIQUE(spellId, lang, variant)`
- Fields:
  - `name`
  - `descriptionHtml`
  - `descriptionText`
  - `sourceKey` (used for CHM provenance/debugging)

This table is the **primary source of localized spell content**.

#### `I18nSpellNameAlias`

Stores alternative spell names per language.

- Key: `UNIQUE(spellId, lang, aliasName)`
- Used for:
  - community variants
  - legacy translations
  - search support

Example:

- 主名：牛之力量
- 别名：蛮力术

---

### C) Common Entity i18n (Dictionary-style)

These tables localize entity names that appear across the UI.

#### `I18nCharacterClassText`

Localized character class names and short descriptions.

- Key: `UNIQUE(classId, lang, variant)`

#### `I18nDomainText`

Localized domain names.

- Key: `UNIQUE(domainId, lang, variant)`

#### `I18nSpellSchoolText`

Localized spell school names.

- Key: `UNIQUE(schoolId, lang, variant)`

#### `I18nSpellSubschoolText`

Localized spell subschool names.

- Key: `UNIQUE(subschoolId, lang, variant)`

#### `I18nDescriptorText`

Localized spell descriptor names.

- Key: `UNIQUE(descriptorId, lang, variant)`

#### `I18nRulebookText`

Localized rulebook names and descriptions.

- Key: `UNIQUE(rulebookId, lang, variant)`
- Fields currently supported:
  - `name`
  - `descriptionText`

---

## Import & Data Lifecycle

### CHM-derived Chinese (v2.0 baseline)

- Parsed via external pipeline
- Imported via dedicated scripts (not Prisma `seed.ts`)
- Written into:
  - `I18nSpellText (lang = 'zh-chm')`
  - `I18nSpellNameAlias` (when multiple names exist)
  - Corresponding i18n tables for classes, domains, etc.

### Future AI translations

- Stored in parallel using:
  - `lang = 'zh'`
  - `variant = 'ai'` or `'ai-XXX'` if needed

- No existing data is overwritten

---

## Runtime Merge Behavior

When serving data with a selected `lang`:

1. Load base entity data from **rules DB**
2. Load localized overlays from **app DB**
3. Merge:
   - use i18n name/description if present
   - fallback to English from rules DB if missing

Spell mechanical fields (range, components, duration, etc.) remain English in rules DB and are localized in the frontend when needed.

---

## What Did Not Change

- No schema changes to `rules_clean.sqlite`
- No mechanical fields duplicated into App DB
- No hard foreign keys between databases

---

## Operational Notes

- App DB is migrated via:

  ```bash
  npx prisma migrate dev --schema ./prisma-app/schema.prisma
  ```

- Import scripts use a shared Prisma client singleton
- Environment variables use absolute SQLite paths to avoid path resolution issues

---

**Status:** Implemented (schema + import scripts)
**Version:** v2.0
**Applies to:** `app.sqlite` (new), `rules_clean.sqlite` (unchanged)
