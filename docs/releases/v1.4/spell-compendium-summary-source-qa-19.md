# Spell Compendium summary source QA, slice 19

[Issue #404](https://github.com/FrankHZ/dnd3.5-spellbook/issues/404) owns
`suggestedSummarySlices[18]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-19.json)
lists every existing key and disposition. Main-gate/#346 owns acceptance and integration.

## Scope and evidence

Frozen audit `e793ff09a38060c5c6b336d28690353bd0d96909` assigns exactly
50 targets / 79 existing rows (32 EN / 47 ZH). Canonical summary input remains
private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public base
`c0b8c7de854b17deb2e92275ee0fd622239393c9` is synchronized with main
`3cc489e254ccb596af6f20137b4234749f3ab0df`. Actual turn metadata verifies
`gpt-6.1-sol`, high effort.

Private handoff/helper commit `72cdcf5e9ea086a892b7b0fc27d458d6d609c194` owns
`dice-qa/books/86/issue-404/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), strengthened
[#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md)
contracts and #386/#389 final-context bindings at the report's revisions.
Reuse does not confer semantic acceptance. All 79 full current values and
independently authored actual-value reasons, 50 paired comparisons, full context
and original spans remain private.

Final context `0688739d92a2aa9fb3eceeb444daa7260e711058` binds all 100 assigned
name/body records from `dice-qa/books/86/issue-365/field-dispositions.jsonl`, including
actual text/HTML, origin and review. Lesser Vigor and Earthbind add four separately
bound direct-parent records. English descriptions/mechanics and historical
#329/#335 inputs remain separately frozen. Target 4736 retains active #347 at
`00e3c9836be40c878fafe74eb1ad0d915f6d4028`: prior #335 removal of commentary is
followed by #347's corrected rising/fading flavor, matching final text and HTML.
This context check authorizes no body edit; PDF/official errata govern.

The proposal corrects 21 rows (7 EN / 14 ZH) across 16 targets and retains 58.
Demonstrated errors concern template-transformation claims, alignment-dependent
energy resistance, save-checked alignment-wall passage, unrestricted passage
through a sight barrier, dazzled passers, capture versus grapple terminology,
full-round sand-wall passage, charge-only bonuses and panic, overland travel and
12-hour duration, ranged +5 competence and doubled range increments, special-mount
eligibility, grammar and raw footnote residue. Accurate concise summaries remain
unchanged; missing rows stay outside scope.

Complete original SC entries and continuations were freshly read together with
full accepted English/mechanical and final Chinese values. Thirty-three bounded
pages were reopened and visually inspected as original Poppler layouts. Necessary
PHB references cover splash miss direction, overland movement, fear states,
dispel and greater dispel, harm/heal, suggestion, water breathing, force-wall and
whirlwind comparisons. Fresh PHB246 Keen Edge and PHB308 entangled passages resolve
specific summary analogies. Direct SC parents and appendix references were read.
SC is December 2005 first printing. Complete SC and three-page PHB official errata
were inspected; none changes these summaries. The PHB area-dispel radius erratum
was considered for the dispel walls and does not alter their targeted checks.
Unavailable MM/DMG statistics, suffocation/rubble rules and historical other-book
originals remain unverified. Broad extraction/translation queues stay paused.

Three existing reader notes remain separate source-only context. `4735:summoned-count`
preserves the original header/body discrepancy without a count ruling in the
summary. `4756:scaling-example` preserves actual final scaling explanation and
unresolved minimum/threshold edge cases; the examples are compatible with the
stated four-level progression and are not relabeled as a new contradiction.
`4743:omitted-time-source` retains the absent casting-time note without certifying
the historical mechanics value. No new summary-relevant unresolved question is introduced.

## Validation and handoff

`corrections.jsonl` is the sole authored handoff; `summaries.proposed.jsonl` is
derived review evidence. All other 6,551 canonical lines and accepted #323 rows
stay byte-preserved, as do accepted #353/#361 packets. Other slices are not composed.

Verification binds frozen full rows, audit scope, locators, complete contexts,
notes, errata and fresh PDF geometry/text, replaying 6,356 span references.
Negative controls reject stale, missing, duplicate, extra and cross-target
records and evidence. Final text, HTML, origin and review are checked, along with
the active #347 amendment chain and separate direct-parent context. Full handoff
rows equal decisions and mirror. Unicode, whitespace, placeholder and repeated-prose
checks pass without invented byte budgets or format-token syntax.

The maintained parser and actual `importRows` consume only the 21 corrections on
a tiny disposable summary-only SQLite DB seeded with 6,572 baseline rows. Dry-run
changes nothing; apply updates21/inserts0; repeat updates0/unchanged21. Every
persisted field and execution timestamp is compared, alongside untouched rows
and an unrelated sentinel. The temporary DB is removed. Importer CLI `main` is
disabled to prevent environment-selected operator DB access.

Replay the fixed committed helper from public root and `data-tools`, using
absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-404/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 72cdcf5e9ea086a892b7b0fc27d458d6d609c194 --run final-root
```

Replay checks committed helper text and regenerates identical inputs, fresh PDF
extraction, context, decisions, handoff, mirror and paired comparisons. Caller cwd
and exact public head are recorded. Shared dependencies are reused without installs,
links or large data copies. Final public head, private proof revision and full
remote `ci:portable` results are supplied in PR delivery; passing checks do not
replace semantic review.

Canonical content, names/bodies/mechanics, operator DBs, app-state, private push
and production activation remain outside the write boundary. Main-gate reviews
and integrates accepted narrow rows.
