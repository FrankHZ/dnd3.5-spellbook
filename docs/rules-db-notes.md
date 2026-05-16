# Rules DB Notes

This document records practical observations about the local rules SQLite
database. It is a working reference for v3.3 data-import planning, especially
new spell imports.

For current database roles and local paths, see `docs/data-setup.md`.

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
| `dnd_spell`              |  4911 |
| `dnd_spellclasslevel`    | 12249 |
| `dnd_spelldomainlevel`   |  1549 |
| `dnd_spell_descriptors`  |  2289 |
| `idx_spell_class_level`  | 12249 |
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
  `data-tools/data/rules-patches/`; decide later whether a redacted schema-safe
  patch format can be committed.
