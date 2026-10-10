# Fixed action rollout patch

The successor owner for [#637](https://github.com/FrankHZ/dnd3.5-spellbook/issues/637)
binds exactly 40 independently accepted local clauses across 37 targets:
20 effective updates and 17 absence-guarded inserts. The fixed target/book/
operation/proposal set is in `contracts/src/action-rollout.ts`. Acceptance is
the coordinator record for the immutable #633/#635 inputs, whose proposal flags
remain false; an editable flag or generated report cannot grant acceptance.

It consumes private #633 revision
`d3688512802bc9321d7c695005da7bb0b201e325`, #635 revision
`3e5ba3d5c7a86a67b41a54461eebb968c26fc8be`, and composed handoff revision
`028c0654bc50c5e6f0a570fbc254a72d6c09734c` under `term-qa/issue-637/`.
Each target retains complete canonical/mechanical and selected/effective
predecessors, rules English, facets/components, original names/ownership and
field-specific text/HTML edits. Multiple clauses compose against one original.
The existing [#629 owner](action-corrections.md) keeps its original four targets
and seven clauses; neither owner accepts caller-selected files or targets.

## Fixed order and readonly check

The only activation order is completed #629, then this successor. Before the
successor opens a writer, it authenticates #629's exact corrected rows, retained
fields, fixed build annotation and current search. Its own prior build must
equal the authenticated expected #629-after build. Foreign, partial, stale or
unsupported states fail during readonly preflight and open no writer.

```powershell
npm run -w data-tools action:rollout -- --data-root '<private-data-root>' --rules-db '<rules-clean.sqlite>' --content-db '<content.sqlite>' --report-dir '<private-data-root>/dice-handoffs/issue-637/check-new'
```

Use explicit DB paths and a fresh private report directory. Relative arguments
follow the executing CLI directory, as with #629; root `npm run -w data-tools`
executes in `data-tools/`. The shared path/role/alias/hard-link/app-state guards
apply. Optional `--accepted-revision` must equal the fixed #633 revision above;
the #635 input and handoff are always independently bound too.

Current operator data are still #629-before. Readonly preparation can derive the
expected completed predecessor from authenticated evidence, but this does not
apply #629 or satisfy the prerequisite. The maintained successor command fails
preflight honestly in that state; its error reports no body/search attempt.
No operator DB copy or rehearsal is required or authorized.

## Apply, recovery and older-owner refusal

Only after separate explicit operator authorization for the ordered workflow,
use the existing #629 apply/recovery route until it is complete, then append
`--apply` to the successor command with a fresh report directory. All 37 body
changes and the successor annotation commit atomically in the existing
immediate transaction. Protected-state comparison preserves #629, SC, canonical
English/mechanics, summaries, relationships, all other rows and build fields.

| State | Successor behavior |
| --- | --- |
| #629-before, partial, foreign or search incomplete | Reject before writer opens |
| Exact completed #629, successor-before | Readonly applicable; authorized apply commits bodies/note, then FTS |
| Failure inside body transaction | Roll back all successor bodies and note |
| Exact successor-after, FTS stale/failed | Verify exact after, rebuild FTS without body writes |
| Exact successor-after, FTS current | Zero body and zero FTS writes |
| Successor-after with source, body, retained field or note drift | Reject; do not rebuild or overwrite |

After the successor commits, retry only its own exact-after recovery route.
#629 and earlier owners reject the later annotated state rather than overwrite
it. Do not strip annotations, downgrade bodies or add bidirectional migration.
The earlier #629 note and corrected rows remain exact through successor apply
and recovery. Report a failed FTS stage as committed body state; reports do not
authorize resume or operator writes.

## API authority and validation

Default/explicit-effective detail and search use corrected bodies; batch and
browse use their existing name-only overlay DTOs. Explicit English and CHM
remain unchanged. Body metadata exposes `clauseReview` with the correct accepted
revision/proposal IDs, DB-English clause scope and `wholeBodyReviewed: false`.
Safe prior review remains under `clauseReview.prior`; no new whole-body review
is asserted. Effective names retain their existing metadata. Inserted CHM names
are unreviewed references, with original names and raw source keys retained in
the DB. New CHM API metadata uses `chm-reference:<stable-id>` instead of stored
locators, including nested relative CHM references. Private paths, full
predecessors and source text do not escape through metadata. Unsupported
provenance fails visibly.

Run `npm run -w data-tools action:rollout:test` and the existing
`action:corrections:test`. Build contracts before server consumers; affected
HTTP tests are `spells.action-rollout.test.ts` and
`spells.action-corrections.test.ts`. Synthetic fixtures exercise all 37 new
targets plus #629 through actual materializer/search paths, HTML-specific and
multi-clause edits, owner/field drift, atomic rollback, protected data, app-state
refusal, ordered activation, FTS failure/recovery and zero-write repeats.
The [source-free preparation report](../reports/action-rollout-patch.md)
separates these rehearsals from readonly actual-input evidence. Remote exact-head
`ci:portable` remains the merge gate; operator/production activation is separate.
