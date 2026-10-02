# Spell Compendium summary source QA, slice 01

[Issue #353](https://github.com/FrankHZ/dnd3.5-spellbook/issues/353) delivers the
first frozen summary slice under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-01.json)
records the exact keys, dispositions and validation boundaries. Main-gate owns
acceptance and maintained integration; this delivery does not activate summaries.

## Scope and evidence

The scope is `suggestedSummarySlices[0]` from audit commit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 95 existing EN/ZH
summary rows. The exact canonical summary input is private commit
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Missing rows are not filled.

Private handoff/helper commit `e154c69e817c81d7e48da105c46daba83a4da8c4` owns
`dice-qa/books/86/issue-353/`. It includes full frozen input rows, 95 individual
decisions with reasons and original spans, 50 bilingual/context comparisons,
fresh original-page extraction/geometry, 30 authored correction rows and a
line-preserving proposed input. All source-bearing content remains private.
The original SC entries, necessary direct parents and complete official errata
were freshly read. Twenty-seven bounded original pages were visually inspected.

The outcome is 30 proposed corrections (12 EN, 18 ZH) on 21 targets and 65
retentions. The corrections address unsupported effects, wrong or misleading
conditions, target/area limits and translation meaning. Concise accurate
summaries remain concise; omission alone is not classified as an error.
Existing accepted `3854:fire-mitigation` is reused faithfully in both languages,
with the original note unchanged. There is no new source question or ruling.

## Validation and replay

The private replay verifies exact scope and input equality, all 5,227 cited span
references and fresh page geometry, paired semantic coverage, and stale/missing/
out-of-scope negative controls. Prose heuristics find no long repeated verdict or
summary template, visible placeholder, corrupt character or whitespace damage.
These are prose summaries with no fixed byte budget or control-token syntax.

The existing summary schema and `summaries:import` implementation are exercised
on a small command-created summary-only database, with no operator database
copied or opened. Dry-run changes nothing; application updates exactly 30 rows
without inserts; repeat application changes nothing. All 6,542 other rows,
identities, variants, and the 29 accepted #323 corrections remain unchanged.
The disposable database is removed after verification.

Run from the public root and again from `data-tools`, using absolute paths and
an existing runtime checkout. The exact private helper commit is verified
before execution. Choose a fresh run label for each invocation:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-353/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision e154c69e817c81d7e48da105c46daba83a4da8c4 --run review-root
```

The private `replay-<run>.json`, `verification-<run>.json` and
`importer-<run>.json` record actual public head and caller directory. The runtime
is reused explicitly; no dependency installation or worktree link is required.
Remote full `ci:portable` remains the merge gate.

Shared canonical input, old evidence, source PDFs, rules/content operator DBs
and app-state are unchanged. No name, body, mechanics, missing Chinese identity,
effective-writer baseline, private push or production boundary is changed.
Maintained merge and final local application belong to #346/main-gate.
