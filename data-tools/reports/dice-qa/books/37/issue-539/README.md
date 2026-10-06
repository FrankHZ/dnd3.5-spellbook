# Book 37, slice A: DB-English Chinese QA proposal

Refs #539; parent #151. Targets 122–191 have complete semantic review of names,
all nonblank English body lines, English HTML, candidate references and normalized
mechanics. The proposal supplies 70 Chinese names and 66 Chinese bodies. Four
reviewed bodies retain the complete current English fallback. No fields remain
unreviewed. This is DB-English QA, without original-book/PDF verification.

`qa-report.json` records scope, exact private revisions, review checks, residual
categories, resources and state preservation. `coverage.json` is the maintained
formal slice validator's source-free output. Validator acceptance means a
validated proposal; independent main-gate semantic acceptance is still pending.

## Private handoff

- Evidence: `f9ca820cb86f227e4e3223a3c4fa71c2d8c866f2`.
- Formal exports and receipt: `015132ffa10fe8bbdefa8d1089b435926f1c76e9`.
- Root: `dice-baselines/issue-520/qa/books/37/slices/issue-539/` in the configured
  private data repository. Neither private commit was pushed.
- `target-inputs.jsonl` contains complete input snapshots; `candidate-inputs.jsonl`
  preserves all occurrences. The six native evidence ledgers and `scope.json`
  bind the handoff.
- `clause-review.jsonl` maps all 407 nonblank English lines to actual effective
  afters. `actual-afters.jsonl` includes final proposed HTML and retained English
  HTML; fallback translation drafts are explicitly unapplied.
- `mechanics-review.jsonl` has per-entry findings. `unresolved.jsonl` records
  concrete gaps. Numeric, repeated-line and HTML checks are separate evidence.

## Reviewed residuals

| Target | Body disposition | Remaining gap |
| --- | --- | --- |
| 130 | English retained | Required outcome table absent from DB text and HTML |
| 140 | English retained | Material-to-drug mapping table absent from DB text and HTML |
| 158 | English retained | Stated caster-level ranges leave level 5 undefined |
| 189 | English retained | Required random lycanthropy table absent from DB text and HTML |

Candidate-only tables and guessed boundaries were not used to repair these gaps.
Their names have Chinese proposals. Other unchanged residuals are recorded by ID
in the JSON report: absent normalized corrupt levels, referenced external rules,
body-embedded headers absent from normalized fields, and an unspecified material
detail. Those residuals do not prevent translating the supplied coherent bodies.
Distinct conditional save rules and inherited spell rules were preserved.

## Reproduce formal validation

Run from the assigned code checkout using existing dependencies. The output path
must be fresh; choose another owned subdirectory if this example already exists.

```powershell
npm run -w data-tools dice:qa -- `
  --data-root G:/spell-book/data `
  --baseline-dir G:/spell-book/data/dice-baselines/issue-520 `
  --rules-db G:/spell-book/dnd3.5-spellbook/server/db/local/rules-clean.sqlite `
  --content-db G:/spell-book/dnd3.5-spellbook/server/db/local/content.sqlite `
  --rulebook-id 37 `
  --slice-scope G:/spell-book/data/dice-baselines/issue-520/qa/books/37/slices/issue-539/scope.json `
  --slice-revision f9ca820cb86f227e4e3223a3c4fa71c2d8c866f2 `
  --report-dir G:/spell-book/data/dice-baselines/issue-520/qa/books/37/slices/issue-539/out/revalidation
```

The formal run used the maintained validator and output APIs with those arguments,
without `--check-incomplete`. It replayed all 105 source files / 5,606 occurrences,
then validated the exact slice. Results: 70 name proposals, 66 body proposals,
four English body fallbacks, zero pending fields and zero pending full-body audits.
Elapsed time was 1.256 seconds, peak RSS 398.46 MiB, private evidence plus outputs
1,677,073 bytes, against limits of 60 seconds, 512 MiB and 8 MiB. The complete
candidate ledger is 22,292,460 bytes. Processing used one process and no paid
external API calls.

All 10 numeric flags and 12 repeated-line groups were inspected. Numeric flags
are reordered values or spelled numbers translated as digits; repeated lines
match identical English or pronoun-only variants in related spells. All English
HTML visible text matches the body baseline; supplied HTML has no tables or
links. No template contamination, visible placeholders or missing line bindings
were found. Actual session metadata verifies GPT-6.1 Sol / high.

The private raw index's 9,198 unrelated mode/blob/stage/path entries, all 1,480
unrelated status entries and all 1,441 unrelated untracked paths compare exactly
with the initial snapshots. The 39 unrelated staged deletions remain staged.
All private commits touch only the owned slice. The assigned public checkout
contains only this source-free report change; existing ignored outputs, `.env`
and shared dependency runtime are retained.

No import, activation, FTS/API consumption, operator write, deployment or parent
reconciliation was performed. Canonical English, mechanics and summaries remain
unchanged; #529 remains paused. Parent reconciliation follows acceptance of slice
B under the [slice contract](../../../../../../docs/operations/import-workflow.md#independently-reviewable-qa-slices)
and [DB-English authority](../../../../../../docs/operations/db-content-workflow.md#source-of-truth).
