# Spell Compendium directory summary additions, batch 02

[Issue #438](https://github.com/FrankHZ/dnd3.5-spellbook/issues/438) proposes
48 missing language fields for [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435)
and the class directory in [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-02.json)
lists all 45 assigned IDs and field dispositions. Main-gate owns acceptance and
integration. All candidate rows retain `reviewStatus: proposed`.

## Source and field boundary

Private candidate/helper revision `4a2d4bd8d78b9b5b0c722ac6d54364d9773b4e25`
owns `dice-qa/books/86/issue-438/`. Gap proof is fixed at
`84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`; existing 6,572 summaries at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`; final bilingual name/body and
current English/mechanics at `0688739d92a2aa9fb3eceeb444daa7260e711058`.
The preceding batch's 49 accepted proposals remain unchanged and separate.

All 45 targets have complete original SC short descriptions, with 63 repeated
class-list occurrences. Fresh original PDF replay checks 2,098 spans on 40
bounded entry/list pages. All 42 corresponding full Poppler pages, including
December 2005 printing and complete official errata, were individually inspected.
Three illustration captions and two separate school labels are excluded from
wrapped list rows by exact source-line coordinates. These exclusions repair
extraction boundaries; they are not rules corrections. Complete Resurgence and
Sign of Sealing parents are read with their mass/greater entries. Historical
external-book references remain context and do not receive a new QA pass.

Each paired review preserves complete current English/mechanics, final accepted
Chinese name/body and reader notes, existing summaries, complete list occurrences,
original entry pages/spans, a distinct reason and an explicit errata decision.
Official changes for 4133 and 4149 are checked without altering existing content.
The proposal adds EN/imarvin 44 and ZH/chm 4 only. Owner keys identify consumers;
actual provenance identifies original SC and direct translations.

Main-gate permits nine targets' eleven proposed fields to correct original-table
overstatements using primary SC text: energy resistance (4096), ferrous objects
(4117), sanctuary comparison (4123), affected senses (4138), concealment against
one opponent (4144), conditional fear (4150), qualified shadow-native damage
(4151), initial sacred bonus plus scaling (4160), and surprise-round/next-check
limits (4163). Original list text and body evidence remain alongside each change;
these are project corrections, not official table errata. Four Chinese additions
are direct translations; the two corrected targets' translation provenance says
so explicitly. Existing source ambiguities and notes remain intact.

## Reproduction and protection

From public root or `data-tools`, use explicit roots and distinct run labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-438/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 4a2d4bd8d78b9b5b0c722ac6d54364d9773b4e25 --run review-root
```

Replay checks committed helper/context/proposal text, regenerates deterministic
files, reopens bounded PDFs and exercises the maintained summary parser/import
step. Actual proposed candidates reject the accepted parser. A transient shape
check establishes no acceptance. Only synthetic texts enter the in-memory import
rehearsal: 44 existing rows plus 48 additions, including sibling language owners
and unrelated books. Readonly check preserves state; apply inserts 48; repeat
makes no writes. Existing values/timestamps and every other table remain intact.
Eleven source controls and seven importer controls reject missing, duplicate,
stale, cross-target, cross-book, owner and acceptance-status substitutions.

The existing 6,572 canonical summaries and 42 scoped fields remain unchanged.
No actual complete accepted union is generated. Operator/stable/app-state DB
access, canonical body/mechanics/relationships/notes changes, private push and
deployment remain outside this slice. #435/#346 owns later accepted composition
and authorized integration. Source PDF inspection does not satisfy the separate
HTML/browser/export visual gate. Exact public head, root/package proof refs and
complete remote `ci:portable` results are recorded in the PR.
