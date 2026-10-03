# Spell Compendium directory summary additions, batch 05

[Issue #447](https://github.com/FrankHZ/dnd3.5-spellbook/issues/447) proposes
47 missing fields across 45 complete SC spell reviews: EN/imarvin 30 and ZH/chm 17.
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-05.json)
lists exact field identities. Candidates remain `proposed`; main-gate owns
independent acceptance. [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435)
and [#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346) own later
accepted composition, source binding, rehearsal and authorized activation.

Private helper/candidate revision `9a880ccf2a221e09a20646e7f1772be2eb175d1d`
owns `dice-qa/books/86/issue-447/`. Gap input is fixed at
`84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`, the 6,572-summary baseline at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`, and final Chinese name/body plus
original English/mechanics at `0688739d92a2aa9fb3eceeb444daa7260e711058`.
There is no overlap with the previous four batches' 193 fields.

Each packet pairs original English/mechanics, accepted Chinese name/body/notes,
existing summaries, original table/body/parent/errata spans and its own decision.
Fresh PDF replay verifies 61 class-list occurrences and 2,106 entry/list spans
across 56 pages. All 59 full Poppler pages were individually inspected, including
printing evidence, the preceding class heading and complete official errata.
Four additional complete SC parents accompany inherited entries; in-scope
parents are also complete. Existing extraction and geometry helpers suffice.
Historical external-book references retain their status and are not new QA.

The [bounded proposal decision](https://github.com/FrankHZ/dnd3.5-spellbook/issues/447#issuecomment-5970671939)
permits minimum primary-text corrections or precision clarifications for
13 targets/15 missing fields. Private evidence retains both original table
wording and complete primary text, the decision and its required refinements.
Project clarifications are distinguished from named official errata. The two
applicable entry-specific official errata were checked separately. All 17
Chinese additions are direct translations with clarified translations marked
explicitly. Existing ambiguities, reader notes and opposite-language summaries
are preserved.

From public root or `data-tools`, supply explicit roots and distinct run labels:

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-16'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$dataRoot = 'G:/spell-book/data'
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-447/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 9a880ccf2a221e09a20646e7f1772be2eb175d1d --run review-root
```

Replay authenticates committed helpers, context, decision and proposal bytes,
regenerates deterministically, reopens original PDFs and exercises the maintained
summary schema/import step. Actual proposed rows reject the accepted parser;
transient format adaptation confers no acceptance. Only synthetic texts enter
the in-memory rehearsal: 45 old rows plus 47 additions. Readonly check and retry
make zero SQL writes; apply adds 47 rows. Old values/timestamps and every other
table are preserved. Thirteen source and seven importer controls reject coverage,
duplicate, identity, owner, stale, provenance and status drift. Targeted summary
import-step and normalization portable tests pass. The PR records exact public
head, root/package replay evidence and full remote `ci:portable` results.

The 6,572 canonical summaries, 43 existing scoped fields and previous batches
remain unchanged. Private commits use only this issue's explicit paths and
preserve unrelated staged/untracked work; there is no private push. No operator,
stable or app-state DB is opened/copied/written, no actual complete summary union
is generated, and no canonical body/mechanics/relationships/notes, deployment
or credential is changed. PDF source review does not satisfy the separate
HTML/browser/export visual gate.
