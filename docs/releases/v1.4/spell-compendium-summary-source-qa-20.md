# Spell Compendium summary source QA, slice 20

[Issue #405](https://github.com/FrankHZ/dnd3.5-spellbook/issues/405) owns
`suggestedSummarySlices[19]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-20.json)
lists every assigned key and disposition. Main-gate/#346 owns acceptance and integration.

## Scope and evidence

Frozen audit `e793ff09a38060c5c6b336d28690353bd0d96909` assigns 17 targets /
32 existing rows (17 EN / 15 ZH). Canonical summaries remain private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`; public base is
`997b1008843053763f407e01268bc29b84331500`.

Private handoff/helper commit `94cd57946ce59f69000b1b7efefa1f8f958803dd` owns
`dice-qa/books/86/issue-405/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), strengthened
[#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md),
and final-context [#386](./spell-compendium-summary-source-qa-12.md)/[#389](./spell-compendium-summary-source-qa-13.md)
contracts at the revisions in the report. All 32 complete current values have
independent reasons and dispositions; 17 paired comparisons jointly read full
English/mechanics and all 34 final name/body records, including text, HTML,
origin and review at `0688739d92a2aa9fb3eceeb444daa7260e711058`.
Historical #329/#335 records remain context; final records do not override PDFs.

The proposal corrects 7 rows (2 EN / 5 ZH) across 6 targets and retains 25.
Demonstrated errors concern plant damage versus destruction, cumulative cold
damage before fatigue/exhaustion, alignment mistranslation, universal attack
triggers, deity-relative successful-hit activation and preexisting portal exceptions.
Accurate concise descriptions remain when omitted qualifications correctly stay
in the complete body. Missing Chinese summaries remain absent.

Complete SC entries and continuations on printed pages 241–244 were read.
Twelve bounded original pages were freshly extracted and inspected individually
as Poppler renders, including December 2005 first-printing credits, PHB printed
pages 174–175 and 223, complete SC official errata and all three PHB errata pages.
The Wrack substitution removes the printed touch requirement; both retained
summaries and final bodies agree with it. The PHB area-dispel radius correction
was read with the complete Dispel Magic parent and does not change the SC
successful-targeted-dispel/higher-caster restoration condition.

Existing `4785:close-range` stays a separate source-only question: the SC entry's
Close label and per-level formula differ from PHB's normal per-two-level formula.
The final body's actual reader note is preserved; neither summary states a range
or resolves that ambiguity. DMG page 150 definitions and external creature,
spell and historical other-book rules remain unverified; summaries use only
effects explicitly supplied by SC. Those limitations do not become QA passes.
Broad PHB/other-book queues remain suspended.

## Replay and handoff

`corrections.jsonl` is the only authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All other 6,565 canonical
lines, accepted #323 rows and accepted #353/#361 packets stay preserved.

Verification binds frozen scope, complete rows, locators, exact final records,
paired judgments and fresh PDF text/geometry, replaying 2,534 spans.
Source `pageIndex` is zero-based; physical PDF page is `pageIndex + 1`, alongside
the separately recorded printed page. Negative controls reject stale, missing,
duplicate, extra and cross-target context/evidence/decision/handoff substitutions,
including final HTML, origin and review changes and same-count correction edits.
Unicode, whitespace, placeholder and repeated-prose checks pass with 32 distinct
reasons; no byte budget or token syntax is invented.

The maintained parser and actual `importRows` consume only the seven corrections
on a tiny disposable summary-only DB seeded with 6,572 rows. Dry-run changes
nothing; apply updates 7/inserts 0; repeat updates 0. Every persisted field and
execution timestamp is compared, including all untouched rows and an unrelated
sentinel. The DB is removed. Importer CLI `main` is disabled before loading code.

Run from both public root and `data-tools`, using absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-405/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 94cd57946ce59f69000b1b7efefa1f8f958803dd --run final-root
```

Replay checks every helper against that fixed private revision, regenerates
deterministic preparation/context/decisions/handoff/mirror/paired records, reopens
PDFs and executes the narrow importer. Private replay records bind exact public
head and caller cwd; final proof refs and complete exact-head remote `ci:portable`
results belong in the PR. Dependencies use the existing external runtime without
installation, links or large corpus/DB copies.

Canonical summaries, name/body/mechanics, operator DBs, app-state, private push
and production activation remain outside this slice. This final frozen summary
slice does not accept all SC content or close unresolved external relationship QA.
