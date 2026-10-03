# Spell Compendium directory summary additions, batch 06

[Issue #449](https://github.com/FrankHZ/dnd3.5-spellbook/issues/449) proposes
25 missing fields across 23 complete SC spell reviews: EN/imarvin 21 and ZH/chm 4.
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-06.json)
lists exact identities. Candidates remain `proposed`; main-gate owns independent
acceptance. [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435) and
[#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346) own later accepted
composition, source binding, rehearsal and authorized activation.

Private helper/candidate revision `3d6ce98eb72b1bda28dc84ecd8c059fac25b21e1`
owns `dice-qa/books/86/issue-449/`. Gap input is fixed at
`84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`, the 6,572-summary baseline at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`, and final Chinese name/body plus
original English/mechanics at `0688739d92a2aa9fb3eceeb444daa7260e711058`.
The previous five fixed packets contain 240 unique fields. This packet has
zero overlap and its 25 keys complete the frozen 265-field inventory. Key
coverage does not confer acceptance or generate an accepted content union.

Each packet pairs original English/mechanics, accepted Chinese name/body/notes,
existing summaries, original table/body/parent/full errata spans and independent
reasoning. Fresh PDF replay verifies 40 class-list occurrences and 1,380 spans
across 33 entry/list pages. All 38 full Poppler pages were opened individually,
including printing, complete official errata and class-heading context.
Complete Wings of Air accompanies its inherited entry; in-scope Vigor and Wall
parents are also complete. Historical external-book references retain their
status and are not new QA.

The four alignment walls intentionally share a grouped printed table row,
while their IDs, descriptors and full save-dependent bodies remain distinct.
An exact school-label exclusion using the existing helper keeps the following
school label out of that row. Two grammatical variants of the dispel wall row
are retained as evidence; the cleric occurrence supplies its English proposal.
All four Chinese additions directly translate original table rows. No substantive
table/body correction or applicable named entry-specific erratum is proposed.
Existing original ambiguities and reader notes remain unchanged.

From public root or `data-tools`, supply explicit roots and distinct run labels:

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-16'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$dataRoot = 'G:/spell-book/data'
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-449/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 3d6ce98eb72b1bda28dc84ecd8c059fac25b21e1 --run review-root
```

Replay authenticates committed helpers/context/proposal bytes, regenerates
deterministically, freshly opens source PDFs and exercises maintained summary
schema/import code. Actual proposed rows reject the accepted parser; transient
shape adaptation grants no acceptance. Only synthetic texts enter the in-memory
rehearsal: 23 old rows plus 25 additions. Readonly and retry make zero SQL writes;
apply adds 25 rows. Old values/timestamps and every other table are preserved.
Thirteen source and seven importer negative controls reject coverage, duplicate,
identity, owner, stale, provenance and status drift. Targeted summary import-step
and normalization portable tests pass. The PR records exact public head,
root/package replay evidence and full remote `ci:portable` results.

Canonical summaries, 21 existing scoped fields and previous packets remain
unchanged. Private commits use only explicit own paths and preserve unrelated
39 staged deletions and 403 untracked status rows; there is no private push.
No operator/stable/app-state DB is opened/copied/written, no real accepted union
is generated, and no canonical body/mechanics/relationships/notes, PHB workflow,
deployment or credentials change. PDF source review does not satisfy the
separate HTML/browser/export visual gate.
