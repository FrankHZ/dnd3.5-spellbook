# Book 37: complete parent QA reconciliation

Refs #151. The maintained formal `dice:qa --reconcile-slices` command revalidated
the exact main-gate accepted #539/#542 and #540/#543 evidence, required identical
parent/baseline/source/map and disjoint complete IDs 122–262, merged their existing
ledgers, and ran the full-book validator. No translation or semantic review was
repeated. The review basis remains DB English, without original-book/PDF validation.

The actual accepted and fallback rows equal the accepted slice export union in
every field, including source identity and Chinese HTML. All 141 names are Chinese;
131 bodies are Chinese. Bodies 130, 140, 158, 189, 219, 227, 232, 233, 243 and 246
retain the complete current English text and HTML. Pending fields and full-body
audits are zero. The 407 + 395 existing nonblank English line records still bind
the matching English inputs and actual after text/HTML.

`coverage.json` is the maintained full-book validator's source-free output.
`qa-report.json` records exact evidence/export revisions, field/ID equality,
resource measurements, state protection and the complete source-free residual
index. These are proposals for main-gate review, not writer authority.

The 42 original residual records (A: 15; B: 27) concern **40 distinct targets**.
Ten body gaps retain English; 19 concern normalized corrupt levels, two concern
normalized component details, and 11 original records have no explicit field.
Original fields/categories and child issue, evidence revision and ledger-row
locators remain intact; missing original fields are not inferred. The private
`unresolved.jsonl` preserves each complete original record plus those locators.
Completing this QA execution does not resolve the gaps or authorize closing
#539, #540 or #151.

Private delivery is restricted to
`dice-baselines/issue-520/qa/books/37/reconciliation/issue-151/` in the configured
external data repository: scope/reference manifests, fresh formal `out/`, residual
ledger, report and receipt. All slice evidence/exports and shared prepared inputs
remain read-only. No complete input/translation stack or database is copied.
The private proposal commit remains local; its exact revision is recorded in the
public report.

To reproduce with the existing runtime, substitute absolute roots:

```powershell
npm run -w data-tools dice:qa -- --data-root <private-data-root> --baseline-dir <private-data-root>/dice-baselines/issue-520 --rules-db <readonly-rules-clean.sqlite> --content-db <readonly-content.sqlite> --rulebook-id 37 --reconcile-slices <private-data-root>/dice-baselines/issue-520/qa/books/37/reconciliation/issue-151/slice-references.json --report-dir <fresh-owned-output-directory>
```

Reference paths resolve relative to `slice-references.json`; other arguments use
absolute paths. See the maintained [slice and reconciliation contract](../../../../../../docs/operations/import-workflow.md#independently-reviewable-qa-slices).

The formal command measured 3.47 seconds and 393,988 KiB peak RSS for a single
Node process. It preserved all 48 slice file bytes and operator DB size/mtime.
The command opens rules/content inputs read-only with query-only enabled. Raw NUL
index/status/untracked snapshots stay only in ignored worktree output; all 39
unrelated staged deletions and 1,441 untracked files remain unchanged.

There are no operator/app-state writes, canonical changes, writer/FTS/API or
consumer rehearsals, deployment, PDF work, paid external calls or private push.
#529 remains paused. #197 ownership/coverage requires later review, and this book
does not establish completion of QA for the project. Remote exact-head portable
CI and independent main-gate acceptance remain the review gates.
