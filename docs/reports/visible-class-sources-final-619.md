# Final candidate class-source handoff (#619)

[#619](https://github.com/FrankHZ/dnd3.5-spellbook/issues/619) completes the
bounded investigation for
[#598](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598)'s frozen **69
website-eligible classes / 84 DnD 3.5 version leads**. Every key is accounted
for exactly once in the private handoff; independent main-gate acceptance of
this final slice and aggregate remains required.

| Final evidence category | Version relationships |
| --- | ---: |
| Supported formal class/variant/reprint relationships | 64 |
| Evidence-backed exclusions of whole-class source relationships | 11 |
| Inherited source-uncertain relationships | 9 |
| Total investigated version leads | 84 |

**62 of 69 classes have at least one supported source; seven do not.** The nine
uncertain relationships include two versions of already-supported classes,
so class and version unknown counts differ. Investigated means each lead has a
disposition, not that every source or text has passed quality review.

## Final 13-target review

All 13 ECS/Sandstorm sections were located through genuine book bindings. Two
chapter contexts were also read to distinguish standard-class discussion from
explicit variants. All 13 DB version feature and advancement bodies are empty;
the review therefore establishes source nature from the CHM definitions and
chapter context, not aligned DB-English mechanics correctness.

| Exact key | Class | Proposed result and source nature |
| --- | --- | --- |
| 12:3:38 | Bard | not-applicable: setting discussion and optional music-feature substitutions |
| 12:2:39 | Cleric | not-applicable: known setting-wide rule adaptations without independent whole-class identity |
| 12:6:40 | Druid | not-applicable: regional companion options and existing PHB rules |
| 12:7:43 | Paladin | not-applicable: mount choices and race-specific healing adaptation |
| 12:5:44 | Ranger | not-applicable: setting discussion and regional companion reference |
| 12:4:46 | Sorcerer | not-applicable: setting discussion and recommended options |
| 12:1:47 | Wizard | not-applicable: setting discussion and recommended options |
| 85:2:105 | Cleric | not-applicable: deity/pantheon and domain options |
| 85:6:106 | Druid | accepted variant: explicitly PHB-inheriting Wasteland Druid |
| 85:7:107 | Paladin | not-applicable: additional special-mount choices |
| 85:5:108 | Ranger | accepted variant: explicitly PHB-inheriting Wasteland Ranger |
| 85:4:109 | Sorcerer | not-applicable: added familiar option |
| 85:1:110 | Wizard | not-applicable: familiar-option reference |

The two accepted Sandstorm variants expressly retain the standard class except
enumerated replacements. Druid changes sand movement, heat protection and vermin
shape progression; Ranger changes heat protection, sand movement and its later
favored-enemy choice. Their association is a **variant identity by inheritance**,
not a complete base-class reprint or full mechanics certification. A single
replacement feature was not used to certify an entire class version.

The 11 exclusions use existing `not-applicable` / `cross-book-reference`
proposal fields. They reject the generic whole-class source association, not
the existence or validity of the book's specific options. In particular, ECS
Cleric explicitly changes alignment-spell restrictions and loss of class powers
after transgressions. Main-gate settled that these are known setting-wide rules
without a separately defined class/variant identity under this ticket's boundary.
The private review and excluded-relationship handoff preserve that distinction;
the result is neither absent evidence nor merely flavor text.

## Inherited uncertain relationships

| Exact key | Class | Required next evidence |
| --- | --- | --- |
| 75:18:76 | Favored Soul | attributable Miniatures Handbook version text and book/edition identity |
| 75:16:79 | Warmage | attributable Miniatures Handbook version text and book/edition identity |
| 109:860:974 | Death Master | attributable Dragon Compendium formal class entry |
| 109:861:975 | Jester | attributable Dragon Compendium formal class entry |
| 109:863:977 | Savant | attributable Dragon Compendium formal class entry |
| 109:864:978 | Sha'ir | attributable Dragon Compendium formal class entry |
| 109:865:979 | Urban Druid | attributable Dragon Compendium formal class entry |
| 98:37:26 | Mystic | attributable Dragonlance Campaign Setting formal class entry |
| 22:462:669 | Hathran | attributable Player's Guide to Faerun formal class entry |

These are inherited exact-version uncertainties; no broad searches were repeated.
The two MH rows remain scanner-emitted ambiguous proposals. The other seven
are manual retained-gap records, clearly marked as not scanner-emitted and not
verified coverage. The needed formal entries must establish DnD 3.5 book/version
identity and distinguishing class features. Another book's version, magazine
origin, spell-list mention or third-party index alone does not resolve a gap.

## Private handoff and future consumer boundary

Final evidence is in the configured data repo under `class-sources/issue-619/`:

- Source-review commit `6e395a33a397f2a9825d50a9210119695a6e180a` records the
  13 proposals, exact DB snapshots, 15 source contexts and root/package replays.
- Handoff commit `efe2083c0f5049aabce561517f3f02b9901ba07b` records
  `final-handoff.json`, `final-supported-relationships.json`,
  `final-excluded-relationships.json`, `final-source-uncertain.json`,
  `final-classes.json` and `verification.json`.

Each of the 84 relationship rows preserves stable publication/class/variant
IDs, edition and CHM revision and points to its authoritative slice, immutable
private commit, proposal/gap file and exact key. Accepted, excluded and uncertain
rows are separate. Each of the 69 class rows lists its supported, excluded and
uncertain version keys; martial classes and infusion classes remain distinct.
The frozen scope is read from private #614 commit
`3006c334f6158ba17e4faed51b5496c8afaee462`, without recalculating membership.
The latest #612 adjudication is authoritative for the preserved #610/#612
baseline rows; the original source evidence remains intact.

This is a small static evidence handoff for future
[#599](https://github.com/FrankHZ/dnd3.5-spellbook/issues/599) review, not a new
runtime schema, importer or source registry. It covers only these 69 eligible
identities and 84 existing 3.5 leads. It does **not** prove complete class
inventories for every book, or zero classes for books with unknown/out-of-scope
entries. The 112 preserved prior pilot rows outside this final scope are not
silently added to candidate coverage. No #599/#600 implementation was started.

## Validation and resources

The unchanged scanner's actual root/package replays produce identical six
artifacts: scope, identities, evidence, matches, candidates and proposals. Use
the [scanner workflow](../operations/class-sources.md) with explicit readonly
CHM/rules/content inputs, this slice's `scope.json` and `proposed-decisions.json`,
and a new private output directory. `extract.py <chm-root> <new-output-json>`
regenerates all 15 bounded contexts; the delivered contexts reproduce
byte-for-byte. `verify.py <chm-root> <rules-db>` checks the delivered handoff,
replay parity, original provenance, IDs and protection. The bounded private
`assemble.py <source-review-commit>` creates new handoff artifacts from pinned
slice inputs and refuses overwrites.

Checks prove all 13 current keys, all 84 frozen keys and all 69 classes occur
exactly once, with no overlap, dropped IDs or live DB variant-key drift. Every
handoff row resolves back to its versioned proposal/gap. Existing 176 proposals,
seven manual gaps, all old versioned evidence and reviewer outputs are protected;
the two MH ambiguous rows already belong to those 176 proposals. Both private
commits preserve the unrelated staged diff byte-for-byte and exclude
reviewer-owned files.

Before reading, 15 selected pages were estimated at 96,581 bytes. Replays read
3,512,397 directory/page bytes, took 706/697 ms and peaked at 276.13/274.71 MiB
RSS. Slice output before verification was 2,187,120 bytes, within the sequential
512 MiB process / 50 MiB slice budgets. The 5,958-file / 224,887,688-byte HTML
inventory remains metadata, not complete body review. CHM stayed clean at
`7aed6890d88a6472f5fe9a857050a3823bdbf8ca`.

Diff/link checks pass; exact-head remote `ci:portable` remains the merge gate.
No DB, app-state, CHM, content import, dependency installation, deployment or
production writes occurred. Investigation and reviewed proposals do not
authorize runtime activation or certify complete translation/mechanics quality.
