# Website-visible class source review (#618)

[#618](https://github.com/FrankHZ/dnd3.5-spellbook/issues/618) accounts for 17
previously uninvestigated targets under
[#598](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598): **15 supported
class-entry proposals and two retained CHM source gaps**. Independent main-gate
acceptance remains required. Source association does not certify complete class
text, mechanics or spell lists, and does not authorize DB import or publication.

## Exact outcomes

| Publication | Class | Class ID / variant ID | Proposed outcome |
| --- | --- | --- | --- |
| 98 Dragonlance Campaign Setting | Mystic | 37/26 | retained source gap |
| 53 CityScape | Ebonmar Infiltrator | 221/261 | accepted class-entry |
| 27 Champions of Ruin | Justice of Weald and Woe | 244/284 | accepted class-entry |
| 92 Draconomicon | Hoardstealer | 355/406 | accepted class-entry |
| 7 Dragonmarked | Cyre Scout | 363/414 | accepted class-entry |
| 63 Dungeonscape | Trapsmith | 382/433 | accepted class-entry |
| 68 Frostburn | Disciple of Thrym | 448/501 | accepted class-entry |
| 30 Lost Empires of Faerun | Cultist of the Shattered Peak | 482/540 | accepted class-entry |
| 72 Lords of Madness | Beholder Mage | 498/557 | accepted class-entry |
| 31 Power of Faerun | Court Herald | 584/655 | accepted class-entry |
| 31 Power of Faerun | Merchant Prince | 585/656 | accepted class-entry |
| 22 Player's Guide to Faerun | Hathran | 462/669 | retained source gap |
| 79 Planar Handbook | Fatemaker | 612/692 | accepted class-entry |
| 81 Races of Destiny | Chameleon | 624/705 | accepted class-entry |
| 85 Sandstorm | Walker in the Waste | 673/754 | accepted class-entry |
| 34 Underdark | Prime Underdark Guide | 793/902 | accepted class-entry |
| 28 Champions of Valor | Knight of the Weave | 810/920 | accepted class-entry |

Scanner and retained-gap keys are disjoint, their union equals the issue's exact
17 keys, and none overlaps the prior 161 scanner proposals or five gap records.
The two manual gaps are not scanner-emitted proposals and are not verified
coverage. They preserve publication/class/variant/edition, source revision,
metadata search terms and scope, observed insufficient leads and next evidence.
The relevant book headings point to filler pages; no attributable formal entry
for these exact versions was located. Broad or homonymous references are
insufficient. This bounded search does not prove nonexistence. An attributable
formal class entry in the exact DnD 3.5 book is still needed; no broader online,
PDF, OCR or paid-API collection was performed.

The frozen candidate scope remains 69 classes / 84 DnD 3.5 version leads.
Previously accepted coverage is 47/69 classes and 47/84 relationships. If all
15 proposals are independently accepted, coverage becomes **62/69 classes and
62/84 relationships**, leaving **seven classes and 22 version leads**. The 13
ECS/Sandstorm relationships assigned to a later slice and existing MH/Compendium
gaps are untouched; another accepted version does not resolve them.

## Binding repair and identity evidence

Several real book headings have no `Local`, or point to an appendix filler,
despite having genuine book-local child entries. Requiring the heading itself
to point into its book directory rejected these sources. Main-gate authorized
the narrow repair in #618 after independently checking the directory structure.

The scanner retains direct publication-page binding and also verifies an
existing in-prefix descendant under the exact `Contents.hhc` publication
heading, with matching publication context and ancestry. The descendant route
requires the existing bracketed publication-code convention. Index-only,
unrelated sibling, missing-file, cross-book and generic magazine-group evidence
cannot establish this route. Direct binding also requires a real Contents node
and existing target. No schema, new acceptance channel or fabricated binding
was added. See the current [binding contract](../operations/class-sources.md).

The repair enables six targets in five books: Champions of Ruin, Lost Empires
of Faerun, Power of Faerun, Underdark and Champions of Valor. They use normal
scanner proposals after identity comparison. All 15 selected directory entries
have existing book-local targets and class-entry context. The private final
comparison artifact records 30 bounded DB-English/CHM identity anchors,
including distinguishing class abilities and progression. Court Herald is
identified as its own modified-loremaster class, not generic Loremaster;
Cyre Scout retains its infusion identity.

Exact directory/page locators and normalized body anchors/offsets accompany
comparisons where Word formatting splits a heading or the scanner omits it.
Chameleon's ability headings, for example, are not emitted as scanner heading
rows. Final locators use scanner sitemap ordinals; raw OBJECT ordinals used in
manual gap searches are explicitly distinguished from those evidence IDs.

Observed limits remain explicit: Hoardstealer's Chinese container ability
body omits the English unlock level; Justice's Chinese lucky-shot passage omits
the bonus type; Knight of the Weave's introduction is explicitly abbreviated.
No text or mechanics correction is included. Readonly DB snapshots retain
replacement characters in existing malformed text rather than silently repair it.

## Reproduction, protection and resources

Private evidence commit `748aa82e5548001b22e2e132d097a159935366da` contains
`class-sources/issue-618/` in the configured data repo. Final review inputs are
`scope-final.json`, `entry-locators-final.json`, `all-comparisons-final.json`,
`proposed-decisions.json`, `retained-source-gaps.json` and `verification.json`.
Initial directory/entry scans are retained separately from the final 15-target
replays. CHM remained clean at
`7aed6890d88a6472f5fe9a857050a3823bdbf8ca`.

Use the existing scanner command with explicit readonly CHM/rules/content inputs,
this slice's `scope-final.json` and `proposed-decisions.json`, and a fresh private
output directory. Run from the code root with `npm run -w data-tools
class-sources:scan -- ...`, or from `data-tools/` with `npm run
class-sources:scan -- ...`; all relative paths resolve from the code root.
The private `compare.py <chm-root> <new-output-json>` regenerates all 30 bounded
excerpts from the recorded snapshot. `verify.py <chm-root>` checks delivered
parity, exact keys, locators, protection, source cleanliness and budgets.

Validation:

- `class-sources:test` and data-tools `typecheck` pass. Synthetic tests exercise
  no-Local/filler parents and reject Index-only, missing ancestry, sibling,
  missing-file, cross-book and generic magazine bindings.
- Root/package final replays have identical six artifacts: scope, identities,
  evidence, matches, candidates and proposals. Resource reports are measured
  separately. Fresh #612/#614/#616 replays match all 18 corresponding historical
  artifacts byte-for-byte after the scanner change.
- All versioned #610/#612/#614/#616 evidence remains unchanged against private
  #616 commit `bcdfc66187854922f72865f0e5893fdea739dcf0`. Reviewer outputs are
  untouched. The private commit preserves the unrelated staged diff byte-for-byte.
- Selected-body estimates were 1,008,090 bytes for the initial nine pages and
  210,614 bytes for the additional six, before their reads. Final replays read
  4,634,520 directory/page bytes. The 5,958-file / 224,887,688-byte inventory is
  metadata only. Root/package runs took 938/931 ms and peaked at 280.10/280.02
  MiB RSS. Historical replays peaked at 365.89 MiB; total slice output before
  verification was 8,088,267 bytes, within 512 MiB process / 50 MiB slice budgets.
- Diff/link checks pass; full remote `ci:portable` remains the exact-head merge
  gate. No DB, app-state, source, content import or production writes occurred.
