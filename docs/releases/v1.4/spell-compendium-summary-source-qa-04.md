# Spell Compendium summary source QA, slice 04

[Issue #363](https://github.com/FrankHZ/dnd3.5-spellbook/issues/363) delivers the
fourth frozen summary slice under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-04.json)
records exact keys, dispositions and validation boundaries. Main-gate owns
acceptance and maintained integration through #346.

## Scope and evidence

The scope is `suggestedSummarySlices[3]` from frozen audit commit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 92 existing EN/ZH
summary rows. Canonical summaries remain frozen at private commit
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. No missing row is created.
The public branch incorporates main through
`a5a15c4d3656cfed4710797469af8bbcc2348ef5`.

Private handoff/helper commit `07ac95421f8cfc2661ffd73f1a6611d1f9a16629` owns
`dice-qa/books/86/issue-363/`. It adapts the accepted #353 bounded contract and
contains complete frozen input rows, 92 individual source-bound decisions,
50 bilingual/mechanical context comparisons, fresh original page geometry and
27 actual original-layout inspections. Complete official SC and PHB errata and
necessary direct parents were read. Source-bearing material stays private.

There are 17 proposed corrections (12 EN, 5 ZH) on 15 targets and 75 retentions.
Corrections address unsupported effects, wrong conditions, modifiers, area and
translation meaning, plus one spelling error. Concise accurate summaries remain
unchanged; omission alone is not a defect. The narrow authored
`corrections.jsonl` is the handoff source. The full
`summaries.proposed.jsonl` is a derived, line-preserving review mirror.

Existing accepted `4047:missing-header` remains source-only context, with its
original evidence unchanged. Neither assigned summary asserts the missing
header parameters. There is no new source question or unresolved summary row.

## Validation and replay

Private verification replays all 5,152 cited span references against fresh
original page geometry. Exact scope, current-input equality, complete correction
rows, bilingual values, and stale/missing/out-of-scope negative controls pass.
Repeated-prose, placeholder, Unicode and whitespace checks find no residue.
These prose summaries have no fixed byte budget or control-token syntax.

The maintained summary parser and actual `importRows` receive only the 17 narrow
corrections in a tiny command-created summary-only database. Dry-run leaves all
rows exact; apply updates 17 without inserts; repeat updates none. Every persisted
proposal field agrees. All 6,555 other rows, including accepted #323's 29,
identities and variants remain unchanged. An unrelated sentinel table is
preserved, and the disposable database is removed after success.

Run from the public root and again from `data-tools`, using absolute paths and
the authorized existing runtime checkout. The helper text must match the exact
private commit. Choose a fresh label for each invocation:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-363/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 07ac95421f8cfc2661ffd73f1a6611d1f9a16629 --run review-root
```

Private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
record the actual public head and caller directory. Runtime reuse requires no
dependency installation or worktree link. Complete remote `ci:portable` on the
exact PR head remains the merge gate.

Canonical summaries, old evidence, PDFs, operator databases and app-state are
unchanged. No name, body, mechanics, missing identity, effective-writer baseline,
private push or production activation is part of this delivery. Main-gate/#346
owns acceptance, maintained merging and final local application.
