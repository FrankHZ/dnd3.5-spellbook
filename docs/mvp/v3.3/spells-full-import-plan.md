# Spells Full Import Plan

This plan defines how to use the local `spells-full` source data to fill missing
English base spell records without turning the full source dump into a tracked
project artifact.

## User Outcome

Maintainers and agents should be able to compare the local rules DB against the
parsed `spells-full` data, generate reviewable structured spell patch
candidates, and apply selected missing English records through the existing
rules DB patch workflow.

Start with the known missing candidates that were not fully resolved by the
manual Tome of Battle patch:

- `Resistance Item`, `ECS`
- `Skill Enhancement`, `ECS`
- `Spider Poison`, `Sc_`
- `Shield Of Faith, Legion's`, `ECS`

`Fiery Assault`, `ToB` is already represented by the structured patch in
`data/rules-patches/spells/missing-spells.jsonl`.

## Source Data Policy

Local source files live under:

```text
data/spells-full/
```

Current local files:

- `Spells v6.00 - Full.txt`
- `spells-parsed.json`

These files are local-only source inputs. Do not commit them to the parent
project repo. The directory is ignored for the public repo baseline and may be
versioned in the nested local `data/` repo.

Generated comparison reports should go under:

```text
data-tools/out/spells-full/
```

Reviewable structured patch output should go under:

```text
data/rules-patches/spells/
```

## Current Findings

The parsed JSON contains 5411 spell entries.

Known candidate lookup status from the parsed JSON:

| Candidate                   | Parsed JSON Status                                      |
| --------------------------- | ------------------------------------------------------- |
| `Resistance Item`           | exact match, source `Eberron Campaign Setting`, page 114 |
| `Skill Enhancement`         | exact match, source `Eberron Campaign Setting`, page 115 |
| `Spider Poison`             | resolved from Spell Compendium PDF text, page 201         |
| `Shield Of Faith, Legion's` | resolved through existing Miniatures Handbook id `1945`  |
| `Fiery Assault`             | no parsed JSON match; already patched manually           |

The `spells-full` source can directly produce candidates for `Resistance Item`
and `Skill Enhancement`. `Spider Poison` was resolved from user-confirmed Spell
Compendium PDF text rather than generated directly from the combined
`spells-full` source row.
`Shield Of Faith, Legion's` was verified as the existing Miniatures Handbook
row id `1945`, with Eberron Campaign Setting listed as another appearance by
D&D Tools and confirmed against the PDF. It should not become an ECS
`insertSpell` duplicate.

## Command Plan

Add a read-only comparison/generation tool under `data-tools`:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses
```

Rules:

- read `data/spells-full/spells-parsed.json`
- open `RULES_DATABASE_URL` read-only
- report exact matches, fuzzy/name-normalized matches, source matches, and
  already-existing rules DB rows
- generate candidate `insertSpell` JSONL output, but do not apply it
- write generated reports under `data-tools/out/spells-full/`
- only write patch JSONL under `data/rules-patches/spells/` when
  explicitly requested by the command or user

The generated patch must still pass:

```bash
npm run -w data-tools rules:spells:validate -- <patch.jsonl>
npm run -w data-tools rules:spells:apply -- --dry-run <patch.jsonl>
```

before any real apply.

## Mapping Rules

For the first implementation, use a small explicit source-to-rulebook map:

- `Eberron Campaign Setting` -> `ECS`
- `Spell Compendium` -> `Sc_`
- `Forgotten Realms: Magic of Faerûn` -> `Mag`

When a parsed source lists multiple books, require the generator target to pick
one rulebook. Do not infer a clone across books unless the operation is
explicitly represented in structured patch data.

Class/domain/school/descriptor names must resolve through the existing rules DB
lookups. Unresolved names should block generation for that row and appear in the
report.

## Data Conversion Rules

Map parsed JSON into `insertSpell` as follows:

- `name` -> `spell.name`
- selected source rulebook -> `source.rulebook`
- selected source page -> `source.page`
- `school` -> `spell.school`
- `subschool`, when non-empty -> `spell.subschool`
- `descriptors` -> `descriptors[]`
- `class` object -> `levels.classes[]`
- `domain` object, if present -> `levels.domains[]`
- `components.V/S/M/DF/XP` -> component booleans
- parsed attributes -> casting time, range, target, effect, area, duration,
  saving throw, and spell resistance
- `description[]` -> plain-text paragraphs plus generated paragraph HTML

IDs should stay explicit. For generated candidates, allocate from the current
rules DB max id plus one and include the allocation in the generated report.

## Acceptance Criteria

- `spells-full` local source files are ignored by the parent repo and may be
  committed only to the nested local `data/` repo.
- Known missing candidates can be inspected against parsed JSON and the current
  rules DB.
- Generated candidates are reviewable structured spell patches, not direct DB
  writes.
- The first generated patch covers `Resistance Item` and `Skill Enhancement`
  when lookup validation succeeds.
- `Spider Poison` is either generated for explicit `Sc_` import or documented
  as needing a clone/source decision.
- `Shield Of Faith, Legion's` is documented as unresolved unless a reliable
  source row is found.

## Implementation Status

Implemented in v3.3:

- `data-tools/src/spells-full.ts`
- `npm run -w data-tools spells-full:inspect -- known-misses`
- `npm run -w data-tools spells-full:generate -- known-misses --write-patch <patch.jsonl>`
- generated and applied
  `data/rules-patches/spells/spells-full-known-misses.jsonl`

Current applied records:

- `4917` `Resistance Item`, `ECS`
- `4918` `Skill Enhancement`, `ECS`
- `4919` `Spider Poison`, `Sc_`

Resolved non-insert decisions:

- `Shield Of Faith, Legion's`, `ECS` is resolved by mapping the CHM source to
  existing Miniatures Handbook id `1945`.

