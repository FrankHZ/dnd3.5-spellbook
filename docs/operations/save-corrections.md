# Fixed saving clause patch

The owner for [#645](https://github.com/FrankHZ/dnd3.5-spellbook/issues/645)
consumes exactly nine targets and fifteen accepted local clauses: seven effective
updates and two absence-guarded CHM-reference inserts (2717/3606). The immutable
acceptance bindings and target/book/operation/proposal set live in
`contracts/src/save-corrections.ts`. The coordinator records for
[#641](https://github.com/FrankHZ/dnd3.5-spellbook/issues/641#issuecomment-6093788149)
and [#643](https://github.com/FrankHZ/dnd3.5-spellbook/issues/643#issuecomment-6093938297)
accept exact clauses; source proposal flags remain false and reports cannot grant
acceptance. The superseded #643 eleven-clause input is excluded.

Private input revisions are `bba02ad6aead7609682588e1a193cb8160681c48` (#641)
and `c66684fdb3b87d92e92081a0974e88c81f25a5e1` (#643 revision-02).
The composed handoff is bound to `edfeac515ed6df13cc5b1c573792af5df279bc11`
at `term-qa/issue-645/composed-handoff.json`. Normalization mechanically expresses
accepted text/HTML spans through the existing clause composer, preserving one
original full body, canonical English/mechanics, rules alignment, facets,
components, names and complete selected/effective predecessors.

3606 includes two confirmed saving-condition changes and one clarity change.
Its inclusive-zero wording is clarity; the negative-total magnitude remains
DB-English interpretation. 906 HD and 3606 adjacent effect wording remain
unresolved and unchanged. No whole-body or original-book acceptance is asserted.

## Ordered readonly check

The supported order is completed [#629](action-corrections.md), completed
[#637](action-rollout.md), then this saving stage. Both earlier bodies, retained
fields and annotations must be exact, with current search before a new body
commit. Expected build metadata is derived from authenticated #637 evidence;
preparation does not apply predecessors or satisfy their prerequisites.

```powershell
npm run -w data-tools save:corrections -- --data-root '<private-data-root>' --rules-db '<rules-clean.sqlite>' --content-db '<content.sqlite>' --report-dir '<private-data-root>/dice-handoffs/issue-645/check-new'
```

Use explicit DB paths and a fresh private report directory. Relative paths use
the executing CLI directory; root `npm run -w data-tools` runs in `data-tools/`.
The existing role/alias/hard-link/app-state guards apply. Optional
`--accepted-revision` must equal the fixed #641 revision; the #643 input, handoff
and earlier stage inputs are independently bound. Caller-selected files, targets
and acceptance flags are unsupported. Any stale/foreign/partial input fails
readonly preflight before opening a writer.

Actual operator data remain before #629. This command currently rejects the
unmet prerequisite and reports no body/search attempt. No DB copy or operator
rehearsal is needed. Code acceptance and CI do not authorize operator writes.

## Authorized apply and recovery

After separate explicit operator authorization for the ordered workflow, finish
#629 and #637 including their search stages, then append `--apply` to the saving
command with a fresh report directory. All nine body changes and the
`saveClauseCorrections` annotation commit atomically through the existing
materializer transaction. Search rebuild follows as a separate stage.

| State | Saving owner behavior |
| --- | --- |
| Either prerequisite before, partial, foreign or search incomplete | Reject before writer opens |
| Exact completed prerequisites, saving-before | Check applicable; authorized apply commits bodies/note then FTS |
| Failure inside body transaction | Roll back all saving bodies and note |
| Exact saving-after, FTS stale/failed | Verify after state and repair FTS without rewriting bodies |
| Exact saving-after, FTS current | Zero body and zero FTS writes |
| Source, body, retained field, canonical or annotation drift | Reject without overwrite or search repair |

After saving bodies commit, retry this owner only. #629, #637 and earlier owners
retain strict refusal of later annotations. Do not remove notes or downgrade
bodies. A search failure reports committed bodies separately; a generated report
never authorizes retry. Protected-state comparison preserves prior overlays, SC,
canonical rows, summaries, relationships, names, CHM and non-target content.

## Consumer authority and checks

Default/explicit-effective detail and search consume corrected text. English and
CHM remain unchanged. Names and existing effective name provenance remain exact;
inserted CHM names are unreviewed references. Body DTOs expose exact accepted
revision/proposal IDs under `clauseReview`, with DB-English clause scope and
`wholeBodyReviewed: false`. Safe old review is retained under `clauseReview.prior`.
The public CHM locator is `chm-reference:<stable-id>`; raw private keys stay inside
the DB envelope. Metadata contains no private paths, full predecessors or source
text. Unsupported provenance fails visibly.

Build contracts before consumers. Run `npm run -w data-tools save:corrections:test`
and affected server `spells.save-corrections.test.ts`; prior action suites verify
unchanged consumers. Reused synthetic #629/#637 fixtures include all nine saving
targets, separate HTML edits, multi-clause composition, ordering, rollback,
protected rows, FTS failure/recovery, exact repeats and old-owner refusal.
See the [source-free preparation report](../reports/save-corrections-patch.md).
Remote exact-head `ci:portable` remains the merge gate. Operator activation and
production deployment require separate authorization.
