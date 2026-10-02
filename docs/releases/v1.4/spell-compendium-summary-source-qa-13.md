# Spell Compendium summary source QA, slice 13

[Issue #389](https://github.com/FrankHZ/dnd3.5-spellbook/issues/389) owns
`suggestedSummarySlices[12]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-13.json)
lists the exact keys and dispositions. Main-gate/#346 owns acceptance and integration.

## Scope and evidence

The frozen audit is `e793ff09a38060c5c6b336d28690353bd0d96909`:
50 targets / 82 existing rows (32 EN / 50 ZH). Canonical summary input remains
private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public base
`ae076ce82c34b1a1daae26db84ece9d3b746068b` is synchronized with main
`d285533327c5990ab72d4d6814cba1c166cd43df`.

Private handoff/helper commit `24ee6b817d4f490026d87518f0b0475acba6eef1` owns
`dice-qa/books/86/issue-389/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), and the
strengthened [#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md)
contracts at the revisions recorded in the report. Its 82 independent reasons
review full actual summary values; 50 paired comparisons jointly read complete
English, mechanics, and current accepted Chinese. Final candidate
`0688739d92a2aa9fb3eceeb444daa7260e711058` binds all 100 assigned name/body rows,
including complete origin/review records. The older snapshot remains frozen
source/mechanics input; neither snapshot nor candidate replaces PDF authority.
The final bodies match the already-read accepted text after HTML presentation
wrappers are removed. No missing summary row is created.

The proposal corrects 15 rows (3 EN / 12 ZH) across 13 targets and retains 67.
Demonstrated differences concern damage amounts and per-projectile units,
flanking scope, creature identity, single-creature exchange choices, limited
traits versus a full type change, actual alarm/recipient functions, the explicit
Hit Dice condition, nonmagical-fire scope, unsupported poison, and line-shaped
multi-energy damage. Accurate concise summaries remain unchanged when omitted
details are correctly retained in the complete body.

The original SC first printing (December 2005) and applicable official errata
govern. All entries and continuations were read; 32 bounded original pages were
freshly extracted and visually inspected. Direct parents include the variant
bases, planar protection, thorn skin, vine control, the feast, corpse-animation
restrictions including their continuation, planar travel, prismatic effects,
bard music/knowledge and component definitions. Complete SC and PHB official
errata contain no specific change to these scoped entries or necessary parents.
Broad PHB and other-book queues remain paused; external references and monster
rules are not expanded or accepted without evidence.

Existing `3958:hd-effect-scope-source` and `4057:material-focus` questions stay
unchanged as separate source-only context. The revised summary preserves the
original conjunction without ruling on effects above the stated Hit Dice, and
no summary decides whether the disputed component is consumed. No new
summary-relevant unresolved question is introduced.

## Replay and handoff

Verification binds frozen scope, full canonical rows, locators, complete
accepted contexts, exact final name/body/origin/review records, and fresh PDF
text/geometry. It replays 9,025 span references. Negative controls reject
stale, missing, duplicate or out-of-scope decisions, handoffs, source pages,
locators and contexts, including cross-target final-body substitution and
altered same-count corrections. Full correction rows equal their decisions and
mirror. Unicode, whitespace, placeholder and repeated-prose checks pass without
invented byte budgets or token syntax.

`corrections.jsonl` is the only narrow authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All other 6,557 canonical
lines and accepted #323 rows stay byte-preserved; accepted #353/#361 packets
stay unchanged. Other summary packets are not composed here.

The maintained parser and real `importRows` consume only the 15 corrections on
a tiny disposable summary-only SQLite DB seeded with 6,572 summaries. Dry-run
changes nothing; apply updates 15/inserts 0; repeat updates 0. Every persisted
field is checked, including the importer execution timestamp. All untouched
rows and an unrelated sentinel stay unchanged; the temporary DB is removed.
Importer CLI `main` is disabled to prevent operator DB defaults from opening.

Replay from public root and `data-tools` with absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-389/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 24ee6b817d4f490026d87518f0b0475acba6eef1 --run review-root
```

Replay requires every helper's working text to equal that committed revision,
regenerates deterministic preparation/context/decisions/handoff/mirror/paired
records, freshly reopens PDFs and executes the narrow importer. It records
caller cwd and exact public head. Dependencies are reused without installation,
links or corpus/DB copies. Full exact-head remote `ci:portable` is the merge gate;
its success does not replace semantic acceptance.

Canonical summaries, names/bodies/mechanics, missing rows, operator DBs,
app-state, private push and production activation remain outside this slice.
