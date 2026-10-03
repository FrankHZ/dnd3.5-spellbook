# Spell Compendium directory summary additions, batch 03

[Issue #440](https://github.com/FrankHZ/dnd3.5-spellbook/issues/440) proposes
49 missing language fields for [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435)
and the class directory in [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-03.json)
lists all 45 assigned IDs and field dispositions. Main-gate owns acceptance and
integration. All candidate rows retain `reviewStatus: proposed`.

## Source and field boundary

Private candidate/helper revision `d5b824b4d4d64491ff95ff82c24df4dc3b5dbeb5`
owns `dice-qa/books/86/issue-440/`. Gap proof is fixed at
`84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`; existing 6,572 summaries at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`; final bilingual name/body and
original English/mechanics at `0688739d92a2aa9fb3eceeb444daa7260e711058`.
The preceding batches' 97 proposals remain unchanged and separate.

All 45 targets have original SC short descriptions, with 64 class-list
occurrences. Fresh PDF replay checks 2,149 entry/list spans on 42 bounded pages.
All 44 corresponding full Poppler pages, including December 2005 printing and
complete official errata, were inspected. Two independent school labels on
SC261/269 are excluded by exact line coordinates, preserving wrapped content.
These are extraction boundary repairs, not rules corrections. Complete Slide,
Snowshoes, Lesser Spell Matrix and Stunning Breath parents accompany their
inheriting entries. Historical external-book references remain context only.

Each paired packet preserves complete original English/mechanics, final accepted
Chinese name/body and reader notes, existing summaries, all list occurrences,
original entry and full errata spans, a distinct reason and explicit errata
judgment. Steeldance's official target-line revision is checked; existing
mechanics and Chinese already apply it. Additions are EN/imarvin 43 and ZH/chm 6.
Owner keys identify consumers; provenance identifies PDF and direct translation.

Main-gate permits seven missing EN fields to use primary SC text: sacred AC
bonus (4170), attacks before the next turn (4186), competence bonus and
Charisma-based viewer check (4191), duration-cap clarification (4219), unattended
object destruction versus creature damage (4237), sphere diameter (4238), and
immobilization terminology (4244). Original table wording and full primary text
remain beside these project corrections. They are not official table errata.
All six Chinese additions translate original list rows directly. Existing engine,
sequence-inheritance and close-range ambiguities and notes remain unchanged.

## Reproduction and protection

From public root or `data-tools`, use explicit roots and distinct run labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-440/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision d5b824b4d4d64491ff95ff82c24df4dc3b5dbeb5 --run review-root
```

Replay checks committed helper/context/proposal text, regenerates deterministically,
reopens bounded PDFs and exercises the maintained summary parser/import step.
Actual proposed candidates reject the accepted parser. A transient format-only
shape check establishes no acceptance. Only synthetic texts enter the in-memory
rehearsal: 43 existing rows plus 49 additions, including unrelated books.
Readonly check preserves state; apply inserts 49; retry writes nothing. Existing
values/timestamps and every other table remain intact. Thirteen source controls
and seven importer controls reject missing, duplicate, stale, cross-target,
cross-book, owner, provenance and acceptance-status substitutions.

Existing 6,572 canonical summaries and 41 scoped fields remain unchanged.
No actual complete accepted union is generated. Operator/stable/app-state DB
access, canonical body/mechanics/relationships/notes changes, private push and
deployment remain outside this slice. #435/#346 owns later accepted composition
and authorized activation. Source PDF inspection does not satisfy the separate
HTML/browser/export visual gate. Exact public head, root/package proof refs and
complete remote `ci:portable` results are recorded in the PR.
