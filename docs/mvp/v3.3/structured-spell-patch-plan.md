# Structured Spell Patch Plan

This plan defines the v3.3 workflow for adding missing English base spell rows
to the local rules DB without hand-writing ad hoc SQL.

## User Outcome

Maintainers and agents should be able to add or review missing rules DB spell
records from a structured source file, then run deterministic validation,
dry-run, apply, and CHM overlay import steps.

The first target set is the current `missing.txt` candidates:

- `Resistance Item`, `ECS`
- `Shield Of Faith, Legion's`, `ECS`
- `Skill Enhancement`, `ECS`
- `Spider Poison`, `Sc_`
- `FIERY ASSAULT`, `ToB`

## Scope

In scope:

- Define a structured patch source format.
- Add validation for required spell, lookup, and level data.
- Add dry-run/apply commands under `data-tools`.
- Rebuild derived spell indexes after writes.
- Re-run CHM parser and app DB CHM import after base rows exist.

Out of scope:

- Running rules DB patch logic from server startup.
- Editing app DB overlay tables directly to fake missing base spells.
- Replacing the existing rules DB schema.
- Moving Prisma schema/client ownership.
- Solving every historical parser unmatched item in the first pass.

## Source Format

Use JSONL for authored patch inputs:

```text
data-tools/data/rules-patches/spells/missing-spells.jsonl
```

One line is one operation. Start with `insertSpell`.

```json
{
  "op": "insertSpell",
  "id": 4912,
  "source": {
    "rulebook": "ToB",
    "page": 53,
    "provenance": "manual"
  },
  "spell": {
    "name": "Fiery Assault",
    "slug": "fiery-assault",
    "school": "Desert Wind",
    "subschool": "Stance",
    "components": {
      "verbal": false,
      "somatic": false,
      "material": false,
      "arcaneFocus": false,
      "divineFocus": false,
      "xp": false,
      "metaBreath": false,
      "trueName": false,
      "corrupt": false
    },
    "castingTime": "1 swift action",
    "range": "Personal",
    "target": "You",
    "effect": "",
    "area": "",
    "duration": "Stance",
    "savingThrow": "",
    "spellResistance": "",
    "extraComponents": "",
    "description": "Plain-text English description.",
    "descriptionHtml": "<p>Plain-text English description.</p>",
    "verified": false
  },
  "levels": {
    "classes": [{ "class": "Swordsage", "level": 6, "extra": "" }],
    "domains": []
  },
  "descriptors": ["Fire"]
}
```

Prefer lookup names and abbrs in authored data. The validator resolves them to
ids before writing.

## Operation Types

Start with:

- `insertSpell`: creates a new `dnd_spell` row plus optional class/domain levels
  and descriptors.

Add later only when needed:

- `cloneSpellToRulebook`: copies an existing spell row to another rulebook with
  explicit overrides.
- `updateSpell`: fixes a known existing row by id.

Do not infer clone behavior just because a spell exists in another book. Current
examples such as `Shield Of Faith, Legion's` and `Spider Poison` need an explicit
decision before they become inserts or clones.

## Validation Rules

Validate before writing:

- `id` is present, positive, and absent from `dnd_spell`.
- `name + rulebook_id` is absent from `dnd_spell`.
- `slug` is present and normalized. Existing cross-book slug collisions should
  warn but not block a patch; `name + rulebook_id` remains the hard uniqueness
  guard.
- `rulebook` resolves to one `dnd_rulebook.abbr`.
- `school` resolves to one `dnd_spellschool.name`.
- `subschool`, when present, resolves to one `dnd_spellsubschool.name`.
- all descriptors resolve to `dnd_spelldescriptor.name`.
- all class levels resolve to `dnd_characterclass.name`.
- all domain levels resolve to `dnd_domain.name`.
- at least one class or domain level exists for browse visibility unless the
  patch explicitly sets `"browseVisible": false`.
- required `dnd_spell` not-null fields are provided or defaulted.
- `description` and `descriptionHtml` are both non-empty.
- level rows do not duplicate existing `(class/domain, spell)` pairs.
- generated derived index rows would match legacy level rows after rebuild.

## ID Policy

Use explicit ids in the patch source for the first implementation.

Reason:

- Existing rules DB ids are stable external references.
- Explicit ids make dry-run diffs reviewable.
- Automatic `MAX(id) + 1` allocation can be added later, but it should write the
  chosen ids back into a generated patch file before apply.

The validator should still report:

- current `MAX(dnd_spell.id)`
- any gaps near the requested id
- collisions with existing rows

## Command Plan

Add commands:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

Rules:

- patch paths resolve under `data-tools/data/rules-patches/`
- dry-run copies `RULES_DATABASE_URL` to a temp DB
- apply prints the target DB path before writing
- apply rebuilds `idx_spell_class_level` and `idx_spell_domain_level` after
  successful writes
- both validate and apply write reports under `data-tools/out/rules-patches/`

## Write Order

For each `insertSpell`:

1. insert `dnd_spell`
2. insert `dnd_spell_descriptors`
3. insert `dnd_spellclasslevel`
4. insert `dnd_spelldomainlevel`
5. rebuild derived spell index tables using `rules:index:rebuild`

Use one transaction for all inserts in a patch apply. If any row fails, roll back
the patch.

## Reports

Generate a report containing:

- patch file path
- target DB path or temp DB path
- operation count
- inserted spell ids and names
- inserted descriptor/class/domain level row counts
- validation warnings
- before/after table counts for:
  - `dnd_spell`
  - `dnd_spellclasslevel`
  - `dnd_spelldomainlevel`
  - `dnd_spell_descriptors`
  - `idx_spell_class_level`
  - `idx_spell_domain_level`

Reports should be machine-readable JSON plus concise console output.

## CHM Overlay Follow-Up

After applying missing spell base rows:

```bash
npm run -w data-tools rules:index:rebuild
npm run -w data-tools zh:parse
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-chm
npm run verify
```

Acceptance for the first Tome of Battle case:

- `Fiery Assault` either matches a new ToB base row, or is documented as a source
  typo/non-row.
- ToB parser unmatched count does not grow.
- app DB CHM import writes a zh overlay for the new spell id when applicable.

## Documentation Updates

When implementing:

- add the source format to `data-tools/README.md`
- update `docs/rules-db-notes.md` with current missing candidate status
- update `docs/data-setup.md` with the new spell patch commands
- retire or archive `server/data/db/missing.txt` after its contents are
  represented in structured patch data or documented as non-actions

## Acceptance Criteria

- Missing spell patch input is structured and reviewable.
- Validation can run without mutating the rules DB.
- Dry-run can apply the patch to a temp DB and produce a report.
- Real apply is explicit and write-capable.
- Derived spell indexes are rebuilt after writes.
- Server runtime remains read-only with respect to rules DB preparation.

## Implementation Status

Implemented in v3.3:

- `data-tools/src/rules-spells.ts`
- `npm run -w data-tools rules:spells:validate -- <patch.jsonl>`
- `npm run -w data-tools rules:spells:apply -- --dry-run <patch.jsonl>`
- `npm run -w data-tools rules:spells:apply -- <patch.jsonl>`

The implementation currently supports only `insertSpell`. Future
`cloneSpellToRulebook` or `updateSpell` behavior should get a new concrete plan
before being added.
