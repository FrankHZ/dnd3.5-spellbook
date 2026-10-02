# Spell Compendium summary source QA, slice 16

[Issue #395](https://github.com/FrankHZ/dnd3.5-spellbook/issues/395) owns
`suggestedSummarySlices[15]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-16.json)
lists every assigned key and disposition. Main-gate/#346 owns acceptance and integration.

## Scope and evidence

The frozen audit is `e793ff09a38060c5c6b336d28690353bd0d96909`:
50 targets / 73 existing rows (25 EN / 48 ZH). Canonical summary input remains
private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public base
`2fa4d2be871bce40e2c240690cd58483fa3ca1db` is synchronized with main `c0b8c7de854b17deb2e92275ee0fd622239393c9`.

Private handoff/helper commit `8478c7a9bdfb2704b32194f345be50157cf899ea` owns
`dice-qa/books/86/issue-395/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), and strengthened
[#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md)
contracts with final-context binding from [#386](./spell-compendium-summary-source-qa-12.md)
and [#389](./spell-compendium-summary-source-qa-13.md). Exact revisions are in the report.
All 73 actual summary values have independent reasons and dispositions; 50 paired
comparisons jointly read complete English, mechanics and accepted Chinese context.
Final context `0688739d92a2aa9fb3eceeb444daa7260e711058` binds all 100 full assigned
name/body records, including text, HTML, origin and review. Older #329/#335 inputs
remain historical context. PDF and official errata retain authority above either.
Missing summary rows remain outside this slice.

The proposal corrects 24 rows (7 EN / 17 ZH) across 20 targets and retains 49.
Demonstrated errors concern trigger and target scope, forced movement, force/shadow
identity, sniper distance and attack window, a damage formula, hallucination effects,
Charisma-check scope, animal deterrence, maintained concentration versus checks,
next-spell selection, same-plane communication, prepared-spell replacement, automatic
sphere attacks, attack bonuses, duration caps and two stray format markers. Accurate
concise summaries remain unchanged when fuller details correctly remain in the body.

All scoped original SC entries and continuations were read with necessary direct
parents. The original first printing (December 2005), complete SC official errata and
complete PHB official errata were read; 36 bounded original pages were freshly
extracted and individually inspected as Poppler renders. Direct references include
variant bases, fire interaction, corpse-animation control and its continuation,
whip/two-weapon rules, communication, matrix/Quicken eligibility, spell resistance,
disintegration, grapple/pin continuation, force-wall interaction and special mount.
SC Spiritjaws errata applies to target switching and attacks; its accurate core
summary remains unchanged. PHB Special Mount errata is prerequisite context for
chariot, without altering its summary. Unrelated errata on the same pages are not
accepted as scoped content. Broad PHB and other-book queues stay paused; unavailable
external references and historical limitations are not adjudicated.

Existing `4196:attack-type` and `4204:undefined-engine` questions and actual current
reader notes stay unchanged as separate source-only context. The animal-deterrence
summary does not decide disputed range/attack details, and the engine summary
supplies no missing duration, resistance or light-ray parameters. No new
summary-relevant unresolved question is introduced.

## Replay and handoff

Verification binds frozen scope, full canonical values, locators and exact accepted
contexts. It freshly reopens original PDFs to compare full text and geometry, replays
5,867 decision span references plus 524 nested final origin/review
evidence records with 25,227 span references. Negative controls reject stale, missing,
duplicate and extra decisions, handoffs, source pages, locators and contexts, including
cross-target final-body substitution and altered same-count corrections. Full
correction rows equal decisions and the derived mirror. Unicode, whitespace,
placeholder and repeated-prose checks pass without invented byte budgets/token syntax.

`corrections.jsonl` is the only narrow authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All other 6,548 canonical
lines and accepted #323 rows stay byte-preserved; accepted #353/#361 packets stay
unchanged. Other summary packets are not composed here.

The maintained parser and real `importRows` consume only the 24 corrections on a
tiny disposable summary-only SQLite DB seeded with 6,572 summaries. Dry-run changes
nothing; apply updates 24/inserts 0; repeat updates 0. Every persisted field matches
the proposal, including `updatedAt` within the actual execution interval. All
untouched rows and an unrelated sentinel stay unchanged; the temporary DB is removed.
Importer CLI `main` is disabled before execution to prevent operator defaults opening.

Replay from public root and `data-tools` with absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-395/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 8478c7a9bdfb2704b32194f345be50157cf899ea --run review-root
```

Replay requires every helper's working text to equal the committed revision,
regenerates deterministic input/context/decision/handoff/mirror/paired records,
freshly reopens PDFs and executes the narrow importer. It records caller cwd and
exact public head. Dependencies are reused without installs, links or corpus/DB
copies. Full exact-head remote `ci:portable` is the merge gate; its success does
not replace semantic acceptance.

Canonical summaries, names/bodies/mechanics, missing rows, operator DBs, app-state,
private push and production activation remain outside this slice.
