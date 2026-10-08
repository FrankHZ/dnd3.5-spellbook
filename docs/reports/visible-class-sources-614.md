# Website-visible class source review (#614)

[#614](https://github.com/FrankHZ/dnd3.5-spellbook/issues/614) proposes 21 new
book/class mappings from six CHM books within
[#598](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598)'s narrower candidate
scope. Each exact DB variant has a formal book-local entry and two distinguishing
ability anchors. All 21 proposed dispositions are `accepted`, with relation
`class-entry`; independent main-gate review remains required. This is source
identity evidence, not complete class-text or spell-list certification.

## Candidate reconciliation and review boundary

The current website class selector exposes 80 distinct class IDs across all
selectable DnD 3.5 books when prestige classes are enabled. Requiring an existing
3.5 class version and excluding Ardent leaves 69 candidates: 32 non-prestige and
37 prestige. Artificer infusions and the three Tome of Battle martial classes
remain included. The private inventory records the query, exact IDs, exclusions,
and 84 corresponding 3.5 version leads. These are eligibility leads; index
presence does not prove a correct or complete list.

Previously reviewed evidence covers 19 candidate classes / 19 mappings. This
slice reviews exactly 21 previously uncovered classes and versions:

| Publication | Class ID / variant ID |
| --- | --- |
| 54 Complete Adventurer | 14/3, 161/200 |
| 56 Complete Divine | 18/7, 19/8, 20/9, 138/253, 201/240, 203/242, 205/244, 217/257, 219/259 |
| 61 Complete Warrior | 30/19, 277/317, 281/321 |
| 70 Heroes of Horror | 60/74, 61/75, 474/531 |
| 88 Tome of Battle: The Book of Nine Swords | 78/115, 79/116, 80/117 |
| 12 Eberron Campaign Setting | 44/36 |

If main-gate accepts all 21 proposals, candidate coverage becomes **40 of 69
classes**, with **29 classes** and **44 of 84 version leads** still lacking an
accepted proposal. One established source does not confirm every version of a
class. In particular, Complete Divine evidence for Favored Soul does not resolve
the older MH version gap.

All prior #610/#612 evidence and 133 baseline proposals are preserved, including
reviewer-owned directories. Other classes in these six books are unreviewed in
this slice. The machine directory inventory does not assign them a disposition.

## Identity findings and limits

Directory-first inspection located all 21 target entries. Explicitly reading 22
pages supplied titles and distinguishing abilities, including one additional
Artificer progression page. The 42 private comparison anchors bind exact DB
variants to revision-bound CHM heading locators and bounded body excerpts.
Nineteen targets gained exact name/alias hits; the other two required manual
identity comparison rather than acceptance from name matching alone.

- Holy Liberator's CHM English title uses a different name. Its formal prestige
  section and unique ability progression identify the existing DB variant; the
  source label remains preserved without renaming canonical content.
- Consecrated Harrier lacks an English class title, but its book-local entry and
  English-labelled distinguishing abilities identify the exact variant.
- The Hexblade comparison excludes the appended designer enhancement.
- Blighter and Death Delver contain specific body discrepancies. Private notes
  retain them while distinguishing clear class identity from text accuracy.
- Some legacy DB body fields contain malformed UTF-8. The private snapshot and
  comparison preserve replacement markers; the identifying anchors remain
  readable. No repair or text import was performed.

No source gap required web lookup. No claim of original-book verification or
full mechanics QA is made. The three martial identities are supported as martial
classes; their inclusion does not turn their lists into ordinary spells.

## Narrow scanner change

The existing book-wide candidate default could not express the exact 21-key
review boundary. Optional scope `variantIds` now selects particular existing DB
variants. Omitting it retains the prior behavior; empty, duplicate, unknown or
wrong-book selections are rejected. Selected proposals must completely cover
the selected set, and off-target proposal keys are rejected. Probes still cannot
duplicate an existing class/book variant, even when that variant is not selected.

Book bindings, publication metadata, directory evidence, source checks and the
proposal schema remain the existing mechanisms. See the
[scanner contract](../operations/class-sources.md).

## Private evidence and reproduction

Evidence resides in `class-sources/issue-614/` under `DATA_REPO_PATH`:

Private evidence commit: `3006c334f6158ba17e4faed51b5496c8afaee462`.

- `candidate-reconciliation.json`: frozen 69-class / 84-version inventory and SQL.
- `targets.json`, `entry-locators.json`: exact 21 identities and directory locators.
- `entry-comparisons.json`, `reviews.json`: 42 bounded identity anchors and caveats.
- `scope.json`, `proposed-decisions.json`: selected, revision-bound replay inputs.
- `replay-root/`, `replay-package/`: final proposed evidence and measurements.
- `legacy-compat/`: fresh default-mode replay of the unchanged 133-row baseline.
- `compare.py`, `verify.py`: read-only reproduction and preservation checks.

The CHM revision is `7aed6890d88a6472f5fe9a857050a3823bdbf8ca`. Protected private
baselines are #610 commit `16b5b8676d6853e1c59f64c609732a8b79a32a0b` and #612 commit
`18dbd1695a7bcaac9cfc5a82e1423d7780835d07`.

From the checkout root, set the operator input paths and shell `DATA_REPO_PATH`
to the existing private repository. Root `.env` is used by the scanner, but does
not export PowerShell variables:

```powershell
$slice = Join-Path $env:DATA_REPO_PATH 'class-sources/issue-614'
npm run -w data-tools class-sources:scan -- --chm-root $chmRoot --rules-db $rulesDb --content-db $contentDb --scope "$slice/scope.json" --proposals "$slice/proposed-decisions.json" --out "$slice/reviewer-root"
python -X utf8 "$slice/compare.py" $chmRoot $rulesDb "$slice/reviewer-comparisons.json"
python -X utf8 "$slice/verify.py" $env:DATA_REPO_PATH $rulesDb $contentDb
```

From `data-tools`, omit `-w data-tools` and use another new output directory.
Compare the fresh artifacts with `replay-root`; `verify.py` validates the saved
delivery pair, candidate reconciliation and protected baselines. Every output
must be new and confined to the private slice. Paths resolve from explicit roots,
so removing a code worktree does not remove independent data or DB inputs.

## Validation and resources

- `class-sources:test` and `typecheck:data-tools` passed. Synthetic tests cover
  selection validation, exact selected coverage, off-target rejection, root and
  package parity, default behavior and byte-preserved read-only DBs.
- Six final artifacts are byte-identical between root and package replays.
- Six fresh default-mode artifacts are byte-identical to the #612 baseline,
  including all 133 emitted proposals. Versioned inputs and unchanged protected
  Git diffs are also checked directly; no change-detection hashes were added.
- Source estimate and actual selected page bytes both total 3,421,782 bytes for
  22 pages. Directory plus page reads total 6,837,598 bytes per final replay.
  The full inventory remains 5,958 HTML files / 224,887,688 bytes.
- Root/package final replay: 914/907 ms, 365.55/364.84 MiB peak RSS, and 992,471
  output bytes before each report. Legacy replay: 1,081 ms / 303.50 MiB.
  Total private slice was approximately 6.25 MB at verification, below 50 MiB.
- Processing was sequential. No dependency installs, DB/source copies, operator
  writes, app-state access, import, deployment, whole-PDF collection or UI work
  occurred. Remote `ci:portable` remains the PR merge gate.

Subsequent scope, acceptance and dispatch decisions remain in #598/#614; this
static report does not publish mappings or authorize another batch.
