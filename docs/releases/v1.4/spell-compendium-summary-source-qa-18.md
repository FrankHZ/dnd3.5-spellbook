# Spell Compendium summary source QA, slice 18

[Issue #403](https://github.com/FrankHZ/dnd3.5-spellbook/issues/403) owns
`suggestedSummarySlices[17]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-18.json)
lists exact keys and dispositions. Main-gate/#346 owns acceptance and integration.

## Scope and source review

The frozen audit is `e793ff09a38060c5c6b336d28690353bd0d96909`:
50 targets / 73 existing rows (30 EN / 43 ZH). Canonical summary input remains
private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. The assigned public base is
`38d54617704056134fedf57424b75e8423eba447`; synchronized main is `38d54617704056134fedf57424b75e8423eba447`.

Private handoff/helper commit `2c51023142c7833966a5f776dc284e98b2a978a2` owns
`dice-qa/books/86/issue-403/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), strengthened
[#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md),
and accepted final-context #386/#389 contracts at the revisions recorded in the report.
Each of the 73 actual current values has an independent reason and disposition;
50 paired comparisons read complete English, mechanics, and final Chinese.
Final candidate `0688739d92a2aa9fb3eceeb444daa7260e711058` binds all 100 complete
assigned name/body records, including body HTML and full origin/review records.
Historical #329/#335 context remains source/mechanics evidence, not final Chinese
or authority above the original PDFs. No missing summary is created.

The proposal corrects 33 rows (16 EN / 17 ZH) across 25 targets and retains 40.
Demonstrated errors concern fixed damage versus dice, one-way communication,
creature and attack triggers, independent rules misrepresented as parent
inheritance, limits on effects or quantities, dispelling and escape conditions,
and an extra attack requiring a full attack. Accurate concise summaries stay
unchanged when the full body correctly supplies omitted detail.

The original SC first printing (December 2005) and applicable official errata
govern. All entries and continuations were read; 39 bounded original pages were
freshly extracted and visually inspected. Necessary direct parents and explicit
comparison references include silence, tree travel, the sword variant, symbol
rules, magic fang, targeted dispelling, dimension door/disguise, restoration,
death ward, animal handling and haste. Full PHB domination, creation and
telepathic-bond entries establish differences from the independent SC spells.
Complete official SC errata contains no specific change to scoped entries.
PHB Area Dispel errata changes the parent area's radius, not the targeted check
used by Thunderlance; its applicability is recorded as parent context only.
Broad PHB/other-book queues remain paused. Unavailable external evidence is
unverified, including prior class/reference limitations.

Existing `4322:water-speed` stays separate source-only context. The full final
reader note is preserved without inventing a water speed or deciding the
water-to-land discrepancy. No new summary-relevant unresolved question is
introduced. Older unverified CON/HP commentary is not substituted for the
actual final Veil of Undeath body.

## Validation and handoff

Verification binds frozen scope, full canonical rows, locators, complete
accepted contexts, final name/body/HTML/origin/review records, and fresh PDF
text/geometry. It replays 9,556 span references. Negative controls reject
stale, missing, duplicate, extra or cross-target decisions, handoffs, pages,
locators and contexts, including changed HTML/origin/review and same-count
corrections. All correction rows equal their decisions and derived mirror.
Unicode, whitespace, placeholder and repeated-prose checks pass without an
invented byte budget or token syntax.

`corrections.jsonl` alone is the narrow authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All other 6,539 canonical
lines and accepted #323 rows stay byte-preserved; accepted #353/#361 packets
stay unchanged. Other summary packets are not composed here.

The maintained parser and real `importRows` consume only the 33 corrections on
a disposable summary-only SQLite DB seeded with 6,572 summaries. Dry-run
changes nothing; apply updates 33/inserts 0; repeat updates 0. Every persisted
field, including the importer execution timestamp, is compared. All untouched
rows and an unrelated sentinel remain unchanged; the DB is removed. Importer
CLI `main` is disabled so operator DB defaults cannot open.

Replay from public root and `data-tools` with explicit absolute roots and
distinct run labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-403/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 2c51023142c7833966a5f776dc284e98b2a978a2 --run review-root
```

Each helper must match its committed revision. Replay regenerates deterministic
preparation/context/decisions/handoff/mirror/paired records, freshly reopens PDFs,
and executes the narrow importer. Private replay records bind caller cwd and
exact public head. Dependencies are reused without installation, links or full
corpus/DB copies. Final-head replay records and exact-head full remote
`ci:portable` results are linked in the PR; CI success does not replace semantic
acceptance.

Canonical summaries, names/bodies/mechanics, missing rows, operator DBs,
app-state, private push and production activation remain outside this slice.
