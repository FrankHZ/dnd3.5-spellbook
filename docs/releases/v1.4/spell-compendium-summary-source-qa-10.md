# Spell Compendium summary source QA, slice 10

[Issue #380](https://github.com/FrankHZ/dnd3.5-spellbook/issues/380) reviews
the tenth frozen summary slice under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-10.json)
lists all exact keys and dispositions. Main-gate/#346 owns acceptance and integration.

## Scope and source review

Scope is `suggestedSummarySlices[9]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets / 94 existing EN/ZH rows.
Public base is `071cf8b13246a05971326095548aef91880b0fe2`, synchronized with main
`70eff96c77223dd6e1c05206de549b80407b5423`. Canonical input remains private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`.

Private handoff/helper commit `f96f981e92d4b0adc3d49a2e668d7c265b18682f` owns
`dice-qa/books/86/issue-380/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md)
and [#361 narrow importer](./spell-compendium-summary-source-qa-02.md) contracts.
It contains 94 independent actual-value reasons, 50 bilingual comparisons, full
current-row and accepted body/mechanical context locks, fresh PDF text/geometry,
original printed/physical pages and span locators. Source text, decisions,
helpers and detailed evidence remain private.

The proposal corrects 22 rows (9 EN / 13 ZH) on 19 targets and retains 72.
Corrections address spell-versus-arbitrary-ability transfer, pooled bonus limits,
one-use damage protection, named creature identity, visibility exceptions,
ability recipients, one-check choice, bounded triggers, message targeting,
single natural weapon scope, unsupported ability categories, initial finding
counts, reincarnation mechanics, corrupted wording, and range/size distinctions.
Accurate concise summaries stay unchanged even when the body contains more detail.

All original entries and necessary direct parents were read jointly with accepted
English, Chinese and mechanics. Twenty-eight bounded pages were freshly extracted
and visually inspected, including complete SC and PHB official errata. The SC
target substitution applies to one reviewed entry; no specific PHB errata replaces
the directly read parents. Direct parents include the spell variants, invisibility,
telepathic bond including its continuation, reincarnate and holy sword; feint,
music and projectile range rules supply necessary context. A retained maximum
range and corrected increment describe compatible quantities proved by the
directly read original weapon rule. Broad PHB and other-book queues stay paused.

Existing `3893:unspecified-material`, `3906:beard-tail` and `4336:missing-m-flag`
remain unchanged source-only context. The summaries do not adjudicate components
or inherited attacks. External creature/disease rules remain unexpanded and
unadjudicated. No new summary-relevant unresolved question is introduced.

## Validation and handoff

The verifier checks exact audit scope, full current rows, frozen source locators,
complete accepted contexts, original PDF roots and freshly reopened text/geometry,
and replays 7,485 span references. Twelve negative controls reject stale rows,
context, locators and PDF evidence; missing, duplicate or extra decisions/handoff
rows; unrelated line changes; and same-count altered corrections. Every full
correction row equals its decision and mirror. Unicode, whitespace, placeholder
and long repeated-prose checks pass without an invented byte budget/token syntax.

`corrections.jsonl` is the only narrow authored handoff; the full
`summaries.proposed.jsonl` is a derived review mirror. All other 6,550 canonical
lines and accepted #323 rows are byte-preserved. Accepted #353/#361 packets stay
unchanged; other proposed slices are not composed here.

The maintained parser and actual summary importer consume only the 22-row
handoff on a tiny disposable summary-only SQLite DB seeded with 6,572 summaries.
Dry-run changes nothing; apply updates22/inserts0; repeat updates0. Every
persisted field, identity, untouched row and unrelated sentinel is compared.
The DB is removed, and importer CLI `main` is disabled to prevent operator DB
selection from environment defaults.

Replay from public root and `data-tools` with absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-380/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision f96f981e92d4b0adc3d49a2e668d7c265b18682f --run review-root
```

Replay verifies every helper's working text at that exact revision, regenerates
deterministic context/decisions/mirror and records caller cwd and public head.
Dependencies are reused without installs or links. Full exact-head remote
`ci:portable` remains the merge gate; green checks do not replace semantic review.

Canonical summaries, names/bodies/mechanics, missing summaries, operator DBs,
app-state, private push and production activation remain outside this slice.
Main-gate/#346 reviews and integrates accepted narrow rows.
