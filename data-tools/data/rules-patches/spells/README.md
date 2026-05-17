# Structured Spell Patches

Place authored missing-spell JSONL patches in this directory.

Typical commands:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

The first supported operation is `insertSpell`.

Keep patch files reviewable and source-backed. Do not use this directory for
generated parser output or app DB overlay data.
