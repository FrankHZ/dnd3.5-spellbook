# Spell Compendium summary source QA, slice 07

[Issue #373](https://github.com/FrankHZ/dnd3.5-spellbook/issues/373) reviews the
seventh frozen summary slice under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-07.json)
records each exact key and disposition. Main-gate/#346 owns acceptance and
maintained integration; these are guarded proposals awaiting review.

## Scope and source evidence

Scope is `suggestedSummarySlices[6]` at frozen audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 90 existing EN/ZH
summary rows. Canonical input remains private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Missing rows are not created.
Public work starts from `e3f8fccfbc026871c15ee99e6ba86f67d4e2741f` and is
synchronized with main `52bf0b725d3f16dde1eac7aeec172d14d8a05d96`.

Private handoff/helper commit `fd9c4f0ddcbe4598c594192f6159eada9f25c62b` owns
`dice-qa/books/86/issue-373/`. It reuses the accepted
[#353 provenance contract](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer contract](./spell-compendium-summary-source-qa-02.md).
It contains full frozen inputs, 90 individual actual-value decisions, 50 paired
semantic comparisons, fresh original spans/geometry and read-only accepted
English, mechanics and Chinese contexts at explicit Git revisions.
Source-bearing texts, reasons, helpers and evidence remain private.

The outcome is 28 proposed corrections (17 EN, 11 ZH) on 21 targets and 62
retentions. Corrections address incorrect grammatical recipients, unsupported
ability/creature-size claims, overly broad movement/attack/immunity scope,
omitted creation triggers and attack limits, target-versus-area confusion,
burst quantity-versus-radius confusion and suppression-versus-extinguishing.
Accurate concise omissions and meaningful analogies remain unchanged.

Complete original SC entries and necessary direct parents were read with both
languages and mechanics. Thirty-eight bounded pages were freshly extracted and
visually inspected, including all official SC/PHB errata and a supplemental
PHB37 wild-shape read. Applicable saving-throw and wild-shape errata are recorded;
contextual attached-spell and pain-effect changes are distinguished from summary
changes. A comparator spell was read to confirm a retained shorthand, without
turning that analogy into a new parent contract. Broad PHB/other-book queues stay
paused.

Existing `4469:close-range` stays unchanged source-only context; this slice makes
no range ruling. Missing external creature-stat and historical-publication
sources remain unadjudicated in their frozen contexts. Direct SC identities and
explicit effects support the summaries, without claiming those external details
have passed review. No new or summary-relevant unresolved question is introduced.

## Validation and replay

The verifier checks exact audit scope, full current rows, frozen locators and
complete accepted contexts, all 5,376 cited span references, original PDF roots
and freshly reopened geometry/text. Twelve negative controls reject stale rows,
context, locators and PDF evidence; missing, duplicate and out-of-scope decisions
and handoff rows; unrelated line changes; and same-count altered corrections.
Every full correction row equals its decision and derived mirror. Unicode,
whitespace, placeholders and long repeated-prose checks pass, without an invented
byte budget or token syntax.

`corrections.jsonl` is the narrow authored handoff. The line-preserving full
`summaries.proposed.jsonl` is a review mirror and does not grant final-writer
authority. All other 6,544 canonical lines and accepted #323 rows are
byte-preserved; accepted #353/#361 packets remain unchanged.

The maintained summary parser and actual `summaries:import` implementation
consume only the narrow 28-row file on a tiny command-created summary-only
SQLite DB seeded with 6,572 summaries. Dry-run leaves the DB unchanged; apply
updates 28 with no inserts; repeat updates zero. Every persisted proposal field,
identity, other row and unrelated sentinel are compared. The disposable DB is
removed. Import CLI `main` is disabled so it cannot choose an operator DB from
environment defaults.

Run from the public root and from `data-tools` with absolute roots, the existing
runtime checkout and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-373/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision fd9c4f0ddcbe4598c594192f6159eada9f25c62b --run review-root
```

Replay verifies every helper's working text against that exact private revision,
regenerates deterministic contexts/decisions/mirror and records caller directory
and actual public head in private replay, verification and importer records.
Dependencies are reused without local installation or links. Full exact-head
remote `ci:portable` remains the merge gate.

Canonical summaries, prior evidence and original PDFs remain unchanged. No
names, bodies, mechanics, operator DBs, app-state, private push or production
activation are part of this slice. Main-gate/#346 integrates accepted narrow
rows after review.
