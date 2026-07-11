# Rules DB Notes

This document records practical observations about the local rules SQLite
database. It is a working reference for v3.3 data-import planning, especially
new spell imports.

For current database roles and local paths, see `docs/operations/data-setup.md`.
For planned rules DB preparation command ownership, see
`docs/mvp/v3.3/rules-db-prep-workflow-plan.md`.
For planned structured missing-spell patch data, see
`docs/mvp/v3.3/structured-spell-patch-plan.md`.
For the v3.5 direction that replaces legacy runtime reads with a normalized
project-owned content model, see
`docs/mvp/v3.5/rules-content-normalization-plan.md`.

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

## Local Manifest

The local rules DB has no internal semantic version table. Track the current
local `rules-clean.sqlite` state with the nested data repo manifest instead:

```bash
npm run -w data-tools rules:manifest:write
npm run -w data-tools rules:manifest:verify
```

`data/rules-db-manifest.json` records the current DB fingerprint, SQLite pragma
values, table counts, rules patch file hashes, index-table consistency checks,
and structured rulebook/spell patch presence checks. Generated command reports
live under `data-tools/out/rules-manifest/`.

The current manifest verifies all maintained structured spell patch operations:
`189` total spell JSONL operations, `189` verified, `0` missing, and `0`
mismatched. It also verifies `41` structured rulebook JSONL operations, `41`
verified, `0` missing, and `0` mismatched. Legacy SQL patch files are recorded
by hash, and their durable runtime effect is checked through the presence and
row-count consistency of `idx_spell_class_level` and
`idx_spell_domain_level`.

## Current Counts

Snapshot from the local `server/db/local/rules-clean.sqlite`:

| Table                    |  Rows |
| ------------------------ | ----: |
| `dnd_spell`              |  5097 |
| `dnd_spellclasslevel`    | 13766 |
| `dnd_spelldomainlevel`   |  1549 |
| `dnd_spell_descriptors`  |  2371 |
| `idx_spell_class_level`  | 13766 |
| `idx_spell_domain_level` |  1549 |
| `dnd_rulebook`           |   151 |
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

Applied historical SQL patch assets live under
`data/rules-patches/applied/legacy-sql/`. New SQL patch candidates should start
under `data/rules-patches/pending/legacy-sql/`. Use data-tools dry-run/apply
commands rather than manual sqlite shell steps:

```bash
npm run -w data-tools rules:sql:dry-run -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:sql:apply -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Applied structured missing-spell patch assets live under
`data/rules-patches/applied/spells/`. New candidates should start under
`data/rules-patches/pending/spells/`. Use JSONL and the spell-specific
validator/apply commands instead of authoring new ad hoc SQL:

```bash
npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- pending/spells/example.jsonl
```

Structured rulebook patches live under
`data/rules-patches/applied/rulebooks/` after apply. The supported operation is
`insertRulebook`; it inserts a `dnd_rulebook` row after validating the edition
id and duplicate id/name/abbr/slug collisions. Apply reviewed rulebook rows
before regenerating full-corpus spell patches that reference new rulebook
abbreviations.

Publication display and grouping metadata is not a rules DB patch concern. The
rules DB owns base rulebook identity and has partial publication fields
(`year`, `published`, `official_url`, `image`), but the maintained local source
for API-facing publication metadata is
`data/rulebook-publications/publications.jsonl`. Seed that file with
`rulebooks:publications:seed`, then review it in the data repo. The content
generation pipeline imports `RulebookContent` publication fields for API
grouping and display: `publicationCategory`, `publicationFamily`,
`publicationSourceKind`, `publicationDisplayOrder`, `publicationYear`,
`publicationDate`, `publicationUrl`, `publicationImage`, and
`publicationReviewStatus`. Review-stage rows can preserve rules-clean
year/date/URL/image values for QA, but generated content only exposes those
detail fields after a row is marked `accepted`. `publicationDisplayOrder` is a
manual/fallback ordering field, not a publication chronology field: the seed
default is only the publication category bucket plus the rules-clean legacy
rulebook id. Consumers should use accepted `publicationDate` / `publicationYear`
for chronological publication ordering before falling back to display label or
id, unless a reviewed metadata row explicitly assigns a special display order.
Store external publication provenance, such as Open Library edition pages or
other ISBN-backed sources, in the data repo `isbn10`, `isbn13`, and
`metadataSources` fields.

Local content DB acceptance for the v1.2 minimum publication metadata contract
has been verified on 2026-07-10 after content migrations/import: `RulebookContent`
has 151 rows, 37 rows marked `accepted`, and 37 rows with `publicationDate`.
The remaining exact-date gaps are `Web` plus Dragon Magazine issue rows; review
those with issue-specific sources rather than the book ISBN enrichment workflow.

The first supported operation is `insertSpell`. It writes one `dnd_spell` row,
optional `dnd_spell_descriptors` rows, class/domain level rows, and then
rebuilds `idx_spell_class_level` and `idx_spell_domain_level`.

For v3.4 short-description work, reviewed English rules DB gaps can be
cross-checked against local `data/spells-full/spells-parsed.json` and converted
into a reviewable structured patch draft:

```bash
npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch pending/spells/short-desc-rules-gaps.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/short-desc-rules-gaps.generated.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/short-desc-rules-gaps.generated.jsonl
```

This generator is intentionally conservative: rows with missing parsed source
data, unresolved local class/domain levels, unresolved spell metadata, existing
slugs, or existing target spell rows stay in the generated report rather than
being written into the patch file. Running `rules:spells:apply` without
`--dry-run` is still the write-capable step.

Reviewed strict-3.5 English short-description rows that become ready after
later rules DB work are tracked separately from rules DB patches:

```bash
npm run -w data-tools summaries:strict35-ready
```

This writes a ready ledger under `data/short-desc-review/qa/` and pending
normalized summary rows under `data/short-desc-normalized/pending/`. Those rows
target the content DB `I18nSpellSummaryText` import path after DB/content
review; they are not structured `insertSpell` patch operations and should not
be passed to `rules:spells:apply`.

For v1.1 full-corpus data-pipeline work, use `corpus-inventory` to produce a
rebuildable source-appearance inventory and a ready-only structured JSONL handoff:

```bash
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
```

The generated JSONL is a pending review artifact in the nested local `data/`
repo. It is not an applied rules DB patch until a DB/content maintainer runs
the normal structured patch apply workflow. The inventory groups entries as
`ready`, `duplicate`, `mismatch`, `manual-review`, or `deferred`; only `ready`
entries are written to the patch JSONL. The same generate command writes
row-level rejected and ambiguous review JSONL under `data/spells-full/`; these
files are explicit non-apply review artifacts. The rulebook JSONL summarizes
deferred source labels for scope review and is not an insert/update patch. Its
companion ambiguous source-label JSONL contains only `manual-review-source`
labels. Rows marked `candidate-import-rulebook` are in-scope D&D 3.5 sources
that still need a rules DB rulebook mapping before spell rows can validate.
The July 9, 2026 rulebook-backed apply consumed the reviewed
`candidate-import-rulebook` set except the malformed
`Dragon Magazine 344 82, Eberron: Sharn` source label, which remains in
manual source review.

The v1.1 ready full-corpus patch was applied locally on July 9, 2026:

- patch file:
  `data/rules-patches/applied/spells/full-corpus-ready.generated.jsonl`
- operation count: 33 `insertSpell` rows
- validation before apply: 0 warnings, 0 errors
- manifest after apply: 51 verified spell JSONL operations, 0 missing, 0
  mismatched
- resulting spell count: 4959

The v1.1 rulebook-backed full-corpus patch was applied locally on July 9,
2026:

- rulebook patch file:
  `data/rules-patches/applied/rulebooks/full-corpus-rulebooks.generated.jsonl`
- spell patch file:
  `data/rules-patches/applied/spells/full-corpus-rulebook-spells.generated.jsonl`
- operation count: 41 `insertRulebook` rows and 138 `insertSpell` rows
- validation before apply: 0 warnings, 0 errors for both patches
- manifest after apply: 41 verified rulebook JSONL operations and 189 verified
  spell JSONL operations, 0 missing, 0 mismatched
- resulting rulebook count: 151
- resulting spell count: 5097

## Verified Manual Fixes

The local `rules-clean.sqlite` already reflects the manual fixes listed in
`server/db/local/fixes.txt` and `rules-clean-v2.0.patch.sql`.

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

`server/db/local/missing.txt` originally listed five candidates. Local rules DB
inspection now shows:

| Candidate                   | Listed Book | Current DB Status                                 |
| --------------------------- | ----------- | ------------------------------------------------- |
| `Resistance Item`           | `ECS`       | added as spells-full patch id `4917`             |
| `Shield Of Faith, Legion's` | `ECS`       | CHM source maps to existing `MH` id `1945`        |
| `Skill Enhancement`         | `ECS`       | added as spells-full patch id `4918`             |
| `Spider Poison`             | `Sc_`       | added as structured patch id `4919`              |
| `FIERY ASSAULT`             | `ToB`       | added as structured patch id `4916`              |

`Fiery Assault` was added through
`data/rules-patches/applied/spells/missing-spells.jsonl` with source text
from Tome of Battle page 53. It imports as ToB / Desert Wind / Stance,
Swordsage 6, descriptor Fire. The CHM overlay import now creates a zh/chm row
for spell id `4916` with name `烈焰诀`.

`Resistance Item` and `Skill Enhancement` were then generated from local
`spells-full` parsed JSON and applied through
`data/rules-patches/applied/spells/spells-full-known-misses.jsonl`.

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
`data/rules-patches/applied/spells/spider-poison-sc.jsonl` after PDF source
verification. It intentionally reuses the existing `spider-poison` slug already
used by the older `Mag` row because the rules DB commonly uses repeated slugs
for cross-book spell rows.

| ID     | Name            | Rulebook | CHM zh name |
| ------ | --------------- | -------- | ----------- |
| `4919` | `Spider Poison` | `Sc_`    | `蜘蛛之毒`  |

Current CHM parser hard misses are clear: `unmatched`, `unknownBookLabel`, and
`missingSpellInDb` are all `0` in the latest local parser run.

The last cleanup was source-only:

- `Death Dragon` and `Phantasmal Thief` no longer expose note text as book
  labels.
- `Defenestrating Sphere` and `Delay Death` now use separate CHM book labels
  instead of comma-joined labels.
- `Summon` from `召唤列表-summon.htm` is preserved as a page title, not a spell
  header.

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

