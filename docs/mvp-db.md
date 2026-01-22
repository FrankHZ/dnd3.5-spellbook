## MVP Spell Search Semantics

### Inputs

* `rulebookIds: number[]`

  * default: all rulebooks in edition “3.5”
* `classIds: number[]` **required**
* `level?: number` (0–9)
* Advanced filters (only applied after scope is satisfied):

  * `schoolId?: number`
  * `subSchoolId?: number`
  * `descriptorIds?: number[]`
  * `components?: { V?: boolean; S?: boolean; M?: boolean; AF?: boolean; DF?: boolean; XP?: boolean; metabreath?: boolean; truename?: boolean; corrupt?: boolean }`
  * `savingThrowContains?: string`
  * `spellResistanceContains?: string`
  * `nameContains?: string`

### Scope rule (mandatory)

A spell is eligible only if:

1. `spell.rulebook_id ∈ rulebookIds`
2. AND spell has **at least one** class-level row in `dnd_spellclasslevel` where
   `character_class_id ∈ classIds`

If `classIds` is empty → request is invalid for MVP (no results or 400; your choice).

### Level rule (optional)

If `level` is provided:

* A spell is eligible only if it has **at least one** matching class-level row where:

  * `character_class_id ∈ classIds`
  * AND `level = level`

(OR semantics across multiple selected classes)

### Advanced filters semantics

All advanced filters are applied **in addition** to the scope/level rule.

#### School / Subschool

* If `schoolId` is set: `spell.school_id = schoolId`
* If `subSchoolId` is set: `spell.sub_school_id = subSchoolId`
* If both set: both must match (AND)

#### Descriptors

* If `descriptorIds` is provided and non-empty:

  * AND semantics: spell must have **all** selected descriptors
    (i.e., for each descriptorId, there exists a row in `dnd_spell_descriptors`)

(Reason: multi-select descriptors typically means “must include Fire AND Evocation-like constraints”.)

#### Components

* For each component flag set to `true`, spell must have the corresponding column = 1.
* If a component flag is `false` or missing, it imposes no constraint.
* (MVP does not support “must NOT have V”, etc.)

#### Saving Throw / Spell Resistance

* If `savingThrowContains` is set: case-insensitive substring match against `spell.saving_throw`
* If `spellResistanceContains` is set: case-insensitive substring match against `spell.spell_resistance`
* Nulls are treated as empty strings (do not match unless filter string is empty)

#### Name search

* If `nameContains` is set: case-insensitive substring match against `spell.name`
* (MVP does not include full-text search over description)

### Output shape (what the DB query should return)

For each returned spell, return enough to render list results without additional DB calls:

* Spell core: `id, slug, name, rulebook(abbr), page, school, subschool`
* Descriptors (names or slugs) — optional for list view, but useful
* **Class-level entries only for the selected classes**:

  * `[{ classId, classSlug, className, prestige, level, extra }]`
* (Optional) Domain levels excluded from list results unless you want them in list view

### Deduping / grouping rule (important)

The result list is a list of **spells** (one row per `dnd_spell.id`), not one row per class-level mapping.

* If a spell matches multiple selected classes, it still appears once.
* Its `matchedClassLevels[]` can contain multiple entries.

### Pagination and sorting (MVP default)

* Pagination: `page`, `pageSize`
* Default sort: `spell.name ASC`
* Optional sort: if `level` is set, still sort by `name ASC` (keep MVP simple)
