# Book 37, slice B: DB-English Chinese QA proposal

Refs #540; parent #151. All 71 targets (192–262) have actual semantic review of
names, complete English bodies/HTML, candidate references and normalized mechanics.
The proposal supplies 71 Chinese names and 65 Chinese bodies; six reviewed bodies
retain complete English fallback. All 395 nonblank English lines bind to actual
afters: 343 translated lines and 52 retained lines. No fields remain unreviewed.
This is DB-English QA, without PDF/original-book verification.

`qa-report.json` contains source-free scope, checks, exact private revisions,
residuals, resource measurements and private state protection. `coverage.json`
is the maintained formal slice validator's output. Validator acceptance means a
validated proposal; independent main-gate semantic acceptance remains separate.

## Private handoff

- Evidence: `c6c3de2b12a080731e34f6eafe5faa6fb4161944`.
- Formal exports and receipt: `68a42e52547bcd3f7713005ed24ed74901bb490b`.
- Directory: `dice-baselines/issue-520/qa/books/37/slices/issue-540/` in the
  configured private data repo. Both private commits remain local.
- Complete inputs: `target-inputs.jsonl` and `candidate-inputs.jsonl`, including
  HTML, normalized mechanics and all absent current CHM fields.
- Native contract: `scope.json` and six explicit JSONL ledgers, preserving intake
  classifications and using the correction ledger for changed translations.
- Actual outputs: `actual-afters.jsonl`, `clause-review.jsonl` and
  `full-body-audit.jsonl`. Fallback drafts are explicitly unapplied.
- Review findings: `mechanics-review.jsonl`, `unresolved.jsonl`, numeric/repeat/
  HTML checks and `qa-checks.json`. All 71 entries also have complete Chinese
  drafts in `translations.txt`.

## Reviewed residuals

| Target | Body after | Remaining gap |
| --- | --- | --- |
| 219 | English retained | Dead recipient in body versus living normalized target |
| 227 | English retained | Exactly twenty times the affected area has no dilution case |
| 232 | English retained | Referenced local size/damage table missing |
| 233 | English retained | New-claw damage values by size missing |
| 243 | English retained | Local random outcome mapping missing |
| 246 | English retained | Hand travel/control boundary unspecified |

Candidate-only tables and guessed boundaries do not repair these gaps. Target
246's Personal casting range and hand control radius are different concepts;
no zero-foot or guessed radius is imposed. Explicit external inheritance is
preserved for other coherent entries and distinguished from missing local tables.
The report lists nonblocking missing corrupt-level/component details separately.
Canonical English, mechanics and summaries remain unchanged.

## Reproduce formal validation

Run from the assigned checkout with its existing dependencies. Use a fresh output
directory; if the example exists, choose another owned subdirectory.

```powershell
npm run -w data-tools dice:qa -- `
  --data-root G:/spell-book/data `
  --baseline-dir G:/spell-book/data/dice-baselines/issue-520 `
  --rules-db G:/spell-book/dnd3.5-spellbook/server/db/local/rules-clean.sqlite `
  --content-db G:/spell-book/dnd3.5-spellbook/server/db/local/content.sqlite `
  --rulebook-id 37 `
  --slice-scope G:/spell-book/data/dice-baselines/issue-520/qa/books/37/slices/issue-540/scope.json `
  --slice-revision c6c3de2b12a080731e34f6eafe5faa6fb4161944 `
  --report-dir G:/spell-book/data/dice-baselines/issue-520/qa/books/37/slices/issue-540/out/revalidation
```

The recorded run used maintained validation/output APIs with these arguments,
without `--check-incomplete`. It replayed all 105 source files and 5,606 occurrences
before selecting this exact slice. Results: 71 name proposals, 65 body proposals,
six English body fallbacks, zero pending fields and zero pending full-body audits.
Formal exports were compared with complete actual afters, not only draft counts.

Time: 1.300 seconds. Peak RSS: 397.52 MiB. Private evidence and outputs:
1,633,610 bytes. Limits: 60 seconds, 512 MiB, 8 MiB; initial storage estimate was
3–5 MiB. The full candidate ledger is 22,292,460 bytes; slice text is 39,422 English
characters and 17,083 candidate characters. Longest/complex samples were inspected
first. Processing used one process, existing runtime/dependencies, no DB copies
and no paid external API calls. Actual session metadata verifies GPT-6.1 Sol/high.

All 31 numeric flags and six repeated-line groups were inspected against actual
outputs. Repetitions have identical English inputs. Numbers are reordered,
spelled out, rendered as digits or moved within joined source wraps. Complete
input HTML matches English visible text; target 228 has only a text-list-marker
versus HTML-list difference. Input HTML has no tables or links. No missing IDs,
placeholders or template contamination were found. Proposed HTML has balanced
escaped paragraphs; candidate-only headers are excluded.

Private state protection compared all 9,222 unrelated raw mode/blob/stage/path
index entries, 1,480 status entries and 1,441 untracked paths exactly. The 39
unrelated staged deletions remain staged. Both local commits touch only this
slice. Raw audit snapshots remain ignored; full unrelated path lists are not
included in these reports. Existing `.env`, ignored output and dependency runtime
were retained.

No import, activation, writer/FTS/API consumption, operator write, deployment or
parent reconciliation was performed; #529 remains paused. The public PR's final
exact head requires full remote `ci:portable`. Main-gate owns review and merge;
slice acceptance grants no production write authority. See the
[slice contract](../../../../../../docs/operations/import-workflow.md#independently-reviewable-qa-slices)
and [DB-English authority](../../../../../../docs/operations/db-content-workflow.md#source-of-truth).
