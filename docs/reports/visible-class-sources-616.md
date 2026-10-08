# Website-visible class source review (#616)

[#616](https://github.com/FrankHZ/dnd3.5-spellbook/issues/616) proposes seven
Book of Exalted Deeds class-entry relationships and retains five Dragon
Compendium source gaps under
[#598](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598). All 12 assigned
keys have an explicit outcome. Independent main-gate review remains required;
this evidence does not authorize content import or certify complete class text,
mechanics, or spell lists.

## Exact targets and outcomes

| Publication | Class | Class ID / variant ID | Proposed outcome |
| --- | --- | --- | --- |
| 52 Book of Exalted Deeds | Apostle of Peace | 102/141 | accepted class-entry |
| 52 | Emissary of Barachiel | 104/143 | accepted class-entry |
| 52 | Exalted Arcanist | 105/144 | accepted class-entry |
| 52 | Slayer of Domiel | 113/152 | accepted class-entry |
| 52 | Vassal of Bahamut | 118/157 | accepted class-entry |
| 52 | Beloved of Valarian | 121/160 | accepted class-entry |
| 52 | Champion of Gwynharwyf | 123/162 | accepted class-entry |
| 109 Dragon Compendium | Death Master | 860/974 | retained CHM source gap |
| 109 | Jester | 861/975 | retained CHM source gap |
| 109 | Savant | 863/977 | retained CHM source gap |
| 109 | Sha'ir | 864/978 | retained CHM source gap |
| 109 | Urban Druid | 865/979 | retained CHM source gap |

The seven scanner keys and five manually retained gap keys are disjoint and
their union equals the issue's exact 12 keys. None overlaps the preceding
154 proposal keys. Main-gate approved this representation exception in #616:
the scanner requires a genuine local Contents book binding; none was located
for publication 109. The five gap records are **not scanner-emitted proposals**
and **do not count as verified coverage**. No binding was fabricated and no
scanner or schema change was needed.

The frozen scope remains 69 website-eligible classes and 84 DnD 3.5 version
leads, including martial classes and infusions. Previously reviewed coverage
is 40 classes / 40 relationships. If main-gate accepts these seven proposals,
coverage becomes **47/69 classes and 47/84 relationships**, leaving **22 classes
and 37 version leads** without accepted coverage. Eligibility is not complete
spell-list certification, and one accepted version does not cover other versions.

## Identity findings and retained limits

Directory inspection preceded reading the seven selected formal class pages.
Titles, introductions and distinguishing abilities support the seven identities;
the private comparison artifact contains 14 bounded English/Chinese anchors.
These include the peaceful touch and healing conversion, celestial calling and
conversion, exalted spontaneous spell progression, evil-only death touch,
platinum armor and dragon wounds, unicorn companion progression, and the
champion's furious casting and fearsome fury progression.

Champion of Gwynharwyf's DB feature body contains its spell list but lacks the
distinguishing ability descriptions. Its DB advancement table supplies the
level-2/level-4 identity comparison. This is disclosed in the private review;
the association does not imply a complete DB feature body. No index or content
repair is included.

Concrete translation differences remain outside this identity review: the
Chinese healing-conversion passage omits a spell-level restriction; Exalted
Arcanist's spell-choice wording is narrower than the DB English; and Vassal of
Bahamut's retaliation wording omits an alignment restriction. These findings
prevent treating source association as full mechanics acceptance. Neither CHM
nor canonical DB content was changed.

For Dragon Compendium, GBK-decoded Contents and Index metadata and repository
filenames were searched using the book name, English class names, DB Chinese
aliases and supplementary Chinese terms. The unbound magazine heading and
numbered magazine articles establish no Compendium book-local authority. Jester
searches also encounter another book's prestige class and a monster; Savant's
broad Chinese terms encounter unrelated scholarly classes. Those hits are
recorded as insufficient context, not promoted into this book's relationships.

Each of the five private gaps preserves its book/class/variant/edition, actual
CHM revision, search terms and scope, observed hits, limitation and next needed
evidence: an attributable **Dragon Compendium DnD 3.5 formal class entry** with
book identity and distinguishing features. A magazine-origin version or external
index alone is insufficient. The metadata search is not proof that a class or
book does not exist. No external collection, PDF acquisition, broad body scan,
OCR or paid API was performed.

## Evidence, reproduction and validation

CHM stayed clean at `7aed6890d88a6472f5fe9a857050a3823bdbf8ca`.
Private evidence is versioned at commit
`bcdfc66187854922f72865f0e5893fdea739dcf0`, under
`class-sources/issue-616/` in the configured data repository. It contains the
exact DB snapshots, selected scope and locators, source comparisons, seven
proposed decisions, five retained gaps, root/package replays and verification.
DB snapshots retain replacement characters where existing text is malformed;
they are evidence snapshots, not corrected content.

Reproduce with the existing [scanner workflow](../operations/class-sources.md)
and explicit readonly CHM/rules/content inputs. Use this slice's `scope.json`
and `proposed-decisions.json`, and a new private output directory for each run.
From the code checkout root:

```powershell
npm run -w data-tools class-sources:scan -- --chm-root <chm-root> --rules-db <rules-db> --content-db <content-db> --scope <data-root>/class-sources/issue-616/scope.json --proposals <data-root>/class-sources/issue-616/proposed-decisions.json --out <data-root>/class-sources/issue-616/review-root
```

From `data-tools/`, use the same arguments with `npm run class-sources:scan`.
Six artifacts (`scope.json`, `identities.json`, `evidence.jsonl`, `matches.jsonl`,
`candidates.jsonl`, `proposals.jsonl`) match byte-for-byte between the delivered
root/package runs. Resource reports are measured separately, not expected to
match byte-for-byte. The private `verify.py <chm-root>` checks those delivered
replays, exact-key union/no overlap, 14 comparisons, prior evidence preservation,
source cleanliness and budgets. The private `compare.py <chm-root>
<new-output-json>` regenerates bounded excerpts from the recorded target snapshot.

Before body reading, seven pages were estimated at 700,689 bytes. Both replays
read 4,116,505 directory/page bytes; the 5,958-file / 224,887,688-byte HTML
inventory is metadata only. Root/package runs took 643/627 ms and peaked at
266.98/275.87 MiB RSS. Each wrote 256,489 bytes before its report; the slice was
1,354,780 bytes before the verification output. These measurements satisfy the
512 MiB process and 50 MiB slice limits, with sequential processing and no
dependency installation.

All versioned #610/#612/#614 evidence compares unchanged against the frozen
#614 private commit `3006c334f6158ba17e4faed51b5496c8afaee462`. Reviewer-owned
outputs were untouched. The private commit preserved the unrelated staged diff
byte-for-byte. The unchanged scanner was validated through both actual replays
and focused evidence checks; full remote `ci:portable` remains the merge gate.
There were no DB, app-state, CHM, production or publication writes.
