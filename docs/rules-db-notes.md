# Rules DB Notes

This document records practical observations about the local rules SQLite
database. It is a working reference for v3.3 data-import planning, especially
new spell imports.

For current database roles and local paths, see `docs/data-setup.md`.
For planned rules DB preparation command ownership, see
`docs/mvp/v3.3/rules-db-prep-workflow-plan.md`.
For planned structured missing-spell patch data, see
`docs/mvp/v3.3/structured-spell-patch-plan.md`.

## Inspection Tool

Use the read-only inspection command from the `server` workspace:

```bash
npm run -w data-tools inspect:rules
npm run -w data-tools inspect:rules -- tables spell
npm run -w data-tools inspect:rules -- schema dnd_spell
npm run -w data-tools inspect:rules -- sample dnd_spell 5
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools inspect:rules -- spell fireball
```

The tool opens `RULES_DATABASE_URL` in read-only mode and only supports known
SQLite tables or views from `sqlite_master`.

The server workspace keeps a compatibility wrapper at
`npm run -w server tool:inspect-rules`.

## Current Counts

Snapshot from the local `server/data/db/rules-clean.sqlite`:

| Table                    |  Rows |
| ------------------------ | ----: |
| `dnd_spell`              |  4915 |
| `dnd_spellclasslevel`    | 12257 |
| `dnd_spelldomainlevel`   |  1549 |
| `dnd_spell_descriptors`  |  2290 |
| `idx_spell_class_level`  | 12257 |
| `idx_spell_domain_level` |  1549 |
| `dnd_rulebook`           |   110 |
| `dnd_characterclass`     |   878 |
| `dnd_domain`             |   177 |
| `dnd_spellschool`        |    26 |
| `dnd_spellsubschool`     |    20 |
| `dnd_spelldescriptor`    |    45 |

The matching row counts between legacy level tables and `idx_spell_*_level`
suggest the index tables are derived lookup tables that must stay synchronized
with class/domain level imports.

## Spell-Centric Tables

`dnd_spell` is the canonical spell row. It contains source, mechanics, base
English description, slug, school/subschool, component flags, and verification
metadata.

Important required fields include:

- `id`
- `added`
- `rulebook_id`
- `name`
- `school_id`
- component booleans
- `description`
- `slug`
- `meta_breath_component`
- `true_name_component`
- `description_html`
- `corrupt_component`
- `verified`

Spell list membership lives outside `dnd_spell`:

- `dnd_spellclasslevel`: legacy class-level rows keyed by its own integer `id`
- `dnd_spelldomainlevel`: legacy domain-level rows keyed by its own integer `id`
- `dnd_spell_descriptors`: descriptor join rows keyed by its own integer `id`

Browse/search performance uses derived index tables:

- `idx_spell_class_level`
- `idx_spell_domain_level`

Those index tables include `spell_id`, class/domain id, `level`, `rulebook_id`,
`edition_id`, and `extra`. Their primary keys include `extra`, so importer
validation should preserve extra labels such as school or class variants.

## Import Implications

Adding a spell that is missing from the rules DB should be treated as a rules DB
patch, not an app DB overlay.

A new spell import must account for:

- one `dnd_spell` row
- zero or more `dnd_spell_descriptors` rows
- one or more `dnd_spellclasslevel` or `dnd_spelldomainlevel` rows when the
  spell should appear in Browse
- matching `idx_spell_class_level` and `idx_spell_domain_level` rows derived
  from the class/domain level rows
- existing rulebook, school, subschool, descriptor, class, and domain ids

The existing CHM workflow still only imports Chinese overlay text into the app
DB. It expects matched records to already have `spellId` values from the rules
DB, so it cannot create new base spells by itself.

Historical SQL patch assets live under
`data/rules-patches/legacy-sql/`. Use data-tools dry-run/apply
commands rather than manual sqlite shell steps:

```bash
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:sql:apply -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Structured missing-spell patch assets live under
`data/rules-patches/spells/`. Use JSONL and the spell-specific
validator/apply commands instead of authoring new ad hoc SQL:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

The first supported operation is `insertSpell`. It writes one `dnd_spell` row,
optional `dnd_spell_descriptors` rows, class/domain level rows, and then
rebuilds `idx_spell_class_level` and `idx_spell_domain_level`.

## Verified Manual Fixes

The local `rules-clean.sqlite` already reflects the manual fixes listed in
`server/data/db/fixes.txt` and `rules-clean-v2.0.patch.sql`.

Verified spell names:

| ID     | Name                         | Rulebook |
| ------ | ---------------------------- | -------- |
| `4912` | `Detect Aberration`          | `ECS`    |
| `3164` | `Desiccate`                  | `Sa`     |
| `4887` | `Hero's Blade`               | `ECS`    |
| `3926` | `Ironguard, Lesser`          | `Sc_`    |
| `429`  | `Protege`                    | `CAd`    |
| `4664` | `Protege`                    | `Sc_`    |
| `4190` | `Solipsism`                  | `Sc_`    |
| `815`  | `Vecna's Malevolent Whisper` | `CM`     |

Verified rulebook names:

| ID   | Name                                     | Abbr  |
| ---- | ---------------------------------------- | ----- |
| `21` | `Monster Compendium: Monsters of Faerûn` | `Mon` |
| `22` | `Player's Guide to Faerûn`               | `PG`  |

`Blood Wind` is not missing from the current rules DB. It exists as:

| ID     | Name         | Rulebook |
| ------ | ------------ | -------- |
| `3202` | `Blood Wind` | `SS`     |
| `3975` | `Blood Wind` | `Sc_`    |

## Current Missing Candidates

`server/data/db/missing.txt` originally listed five candidates. Local rules DB
inspection now shows:

| Candidate                   | Listed Book | Current DB Status                                 |
| --------------------------- | ----------- | ------------------------------------------------- |
| `Resistance Item`           | `ECS`       | added as spells-full patch id `4917`             |
| `Shield Of Faith, Legion's` | `ECS`       | CHM source maps to existing `MH` id `1945`        |
| `Skill Enhancement`         | `ECS`       | added as spells-full patch id `4918`             |
| `Spider Poison`             | `Sc_`       | added as structured patch id `4919`              |
| `FIERY ASSAULT`             | `ToB`       | added as structured patch id `4916`              |

`Fiery Assault` was added through
`data/rules-patches/spells/missing-spells.jsonl` with source text
from Tome of Battle page 53. It imports as ToB / Desert Wind / Stance,
Swordsage 6, descriptor Fire. The CHM overlay import now creates a zh/chm row
for spell id `4916` with name `烈焰诀`.

`Resistance Item` and `Skill Enhancement` were then generated from local
`spells-full` parsed JSON and applied through
`data/rules-patches/spells/spells-full-known-misses.jsonl`.

| ID     | Name                | Rulebook | CHM zh name |
| ------ | ------------------- | -------- | ----------- |
| `4917` | `Resistance Item`   | `ECS`    | `抗力物品`  |
| `4918` | `Skill Enhancement` | `ECS`    | `技能强化`  |

Remaining candidate status:

- `Shield Of Faith, Legion's`, `ECS`: verified against the Miniatures Handbook
  row exposed at
  `https://dnd.arkalseif.info/spells/miniatures-handbook--75/shield-faith-legions--1945/index.html`.
  The page also lists Eberron Campaign Setting as another appearance, so the CHM
  ECS label now maps to the existing `MH` row instead of creating a duplicate
  ECS spell.

`Spider Poison` was added as a Spell Compendium row through
`data/rules-patches/spells/spider-poison-sc.jsonl` after PDF source
verification. It intentionally reuses the existing `spider-poison` slug already
used by the older `Mag` row because the rules DB commonly uses repeated slugs
for cross-book spell rows.

| ID     | Name            | Rulebook | CHM zh name |
| ------ | --------------- | -------- | ----------- |
| `4919` | `Spider Poison` | `Sc_`    | `蜘蛛之毒`  |

Current CHM parser unmatched output also includes label/source cleanup items
that should not be treated as missing base rows until investigated:

- `Death Dragon`, `Defenestrating Sphere`, `Delay Death`, and
  `Phantasmal Thief` include combined or note-like labels.
- `Summon` comes from `召唤列表-summon.htm` and is likely an index/list heading,
  not a spell row.

`Otiluke's Suppressing Field` is covered by local CHM source cleanup. The clean
CHM title uses the published spelling, while the local CHM alias map resolves it
to the rules DB's historical `Otiluke's Supressing Field` spelling.

## Open Questions For v3.3 Importer

- Should the importer allocate ids by `MAX(id) + 1`, or should ids come from a
  checked-in source file?
- Should index tables be rebuilt wholesale from legacy level tables, or patched
  incrementally for imported spells?
- Which source format should be canonical for new spell patches: JSON, JSONL,
  or a richer authoring format with generated JSON?
- How should imported records preserve source provenance without changing the
  current rules DB schema?
- Future local rules DB patch files should live under
  `data/rules-patches/`; decide later whether a redacted schema-safe
  patch format can be committed.

