## Appendix: Rules DB Corrections (v2.0)

These corrections are considered part of the canonical rules_clean.sqlite used by v2.0 and later.

### Context

During v2.0 development and Chinese import pipeline work, several **encoding / text corruption issues** were discovered in the original `dnd.sqlite` data and were **manually corrected** in the derived `rules_clean.sqlite`.

These fixes were required to:

- prevent parser failures
- ensure stable spell name matching
- avoid malformed text rendering
- allow deterministic i18n imports

The corrections are **data-level fixes**, not schema changes.

---

### A) Corrected Spell Entries

The following spell records had encoding or text issues (e.g. malformed quotes, duplicated entries, or corrupted characters) and were corrected in `rules_clean.sqlite`:

| Spell Name                 | Spell ID |
| -------------------------- | -------- |
| Detect Aberration          | 4912     |
| Desiccate                  | 3164     |
| Hero's Blade               | 4887     |
| Ironguard, Lesser          | 3926     |
| Protege                    | 429      |
| Protege                    | 4664     |
| Solipsism                  | 4190     |
| Vecna's Malevolent Whisper | 815      |

**Notes**

- Issues were primarily related to:
  - single-quote / apostrophe encoding
  - duplicated or malformed name fields

- Spell IDs were preserved
- No mechanical data (levels, components, effects) were altered

---

### B) Corrected Rulebook Entries

The following rulebooks had encoding issues (notably apostrophes / special characters) and were corrected:

| Rulebook Name                          | Rulebook ID |
| -------------------------------------- | ----------- |
| Monster Compendium: Monsters of Faerûn | 21          |
| Player's Guide to Faerûn               | 22          |

**Notes**

- Fixes were limited to text normalization
- Rulebook IDs, abbreviations, and relationships were preserved

---

### C) Reproducibility Guidance (v2.0 milestone)

If `rules_clean.sqlite` needs to be regenerated in the future:

1. Start from the original legacy `dnd.sqlite`
2. Apply schema cleanup / normalization (as documented earlier)
3. Apply the **rules_clean patch SQL** (maintained under v2.0 docs)
4. Verify:
   - spell and rulebook names render correctly in SQLite browsers
   - no unexpected BLOB fields appear in text columns
   - parser pipeline produces identical match results (IDs + counts)

> **Milestone note (important):** “v2.0” here is a _documentation milestone_, not a frozen release artifact yet.
> During the MVP phase, additional cleanup fixes may still be appended to the patch list and documented here.
> Once MVP is declared complete, this v2.0 dataset build process will be frozen and formal versioning will begin (e.g., v2.1+).

---

### D) Why this matters

- Chinese CHM parsing relies on exact or near-exact English spell names
- Encoding artifacts silently break matching and cause false “missing spell” cases
- Recording these fixes avoids future “why does this spell fail to match” archaeology

---

### Status

- Applied in current `rules_clean.sqlite`
- Not yet automated (manual patch list documented here)
- Eligible for future scripting if full reproducibility becomes necessary
