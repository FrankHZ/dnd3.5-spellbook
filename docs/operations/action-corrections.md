# Accepted local action corrections

The fixed owner for [#629](https://github.com/FrankHZ/dnd3.5-spellbook/issues/629)
consumes seven independently accepted clauses from private revision
`f20065908448ad3835f34dc5401616a9c189b4d4` and the composed predecessor handoff
at `626ad56d837dac8063b55d44b0db10052ada8737`. Acceptance covers these local
DB-English changes, not original-book verification or whole-body reacceptance.
Neither this command nor an accepted PR grants operator-write authorization.

| Stable ID / book | Operation | Clauses |
| --- | --- | ---: |
| 84 / 52 | Replace effective body | 4 |
| 523 / 55 | Replace effective casting-header wording | 1 |
| 2165 / 79 | Replace effective commanding-action wording | 1 |
| 2474 / 6 | Insert effective overlay from exact CHM reference | 1 |

The 84 edits compose disjoint replacements against one complete original body
in both text and HTML. Their individual full after-bodies are never sequentially
overwritten. The three updates preserve row IDs, creation times, names, name
provenance, source keys and unrelated fields. The insert requires effective-row
absence and preserves the CHM row and name; it does not resume suspended PHB
PDF/MinerU/SRD queues. No other target, language, variant, schema, summary,
relationship, canonical English/mechanic, publication metadata or app-state is
owned by this correction stage. Existing derived search is the subsequent stage.

## Readonly check

Run from the repository root or use `npm run action:corrections` in `data-tools/`:

```powershell
npm run -w data-tools action:corrections -- --data-root '<private-data-root>' --rules-db '<rules-clean.sqlite>' --content-db '<content.sqlite>' --report-dir '<private-data-root>/dice-handoffs/issue-629/check-new'
```

Use explicit DB paths. Relative paths follow the executing CLI's working
directory; `npm run -w data-tools` executes in the package directory, as in the
existing accepted-overlay owner. Reports require a fresh child of
private `dice-handoffs/issue-629/`, never overwrite evidence, and do not authorize
resume. Alias, role, hard-link, input/output collision and app-state guards are
shared with the maintained overlay entry. `--accepted-revision`, if supplied,
must equal the fixed semantic revision above. There are no caller-selected
proposal files, target lists, handoff revisions or SQL overrides.

Every invocation binds both committed inputs, reconstructs the accepted edits
and checks complete canonical identity/English/mechanics, rules-English
mechanics, selected predecessors, source chain and normalized build annotations.
Unknown/partial/foreign states fail closed. Fixed original SC authority remains
under its existing validator; the prior closeout build note remains unchanged
part of the committed baseline, not an editable authorization substitute.

`state: before` means applicable, with `complete: false` and no DB writes.
`state: after` requires the exact four corrected rows, preserved predecessor
fields and the fixed correction build note. Full completion also requires
current FTS. Source drift or a partial set is not interpreted as an after-state.

## Authorized apply and recovery

Only after separate explicit operator-write authorization, append `--apply` to
the same command with a fresh report directory. The route reruns readonly
preflight before opening a writer and authenticates again after obtaining the
immediate transaction. All four body changes and the build annotation commit
atomically, using the existing SQL materializer and protected-state comparison.

FTS uses the maintained `contentSearchStep` after the body commit. A search
failure reports the committed body stage honestly. Reinvoke against verified
exact-after inputs to rebuild search without rewriting bodies. Exact-after plus
current FTS is a zero-content-write, zero-search-write retry. Old accepted owners
retain their absent-predecessor/annotation rules and reject the newly annotated
state instead of overwriting corrections with old bodies.
The [fixed rollout successor](action-rollout.md) requires completed #629 first.
After that successor, retry its own recovery route; #629 deliberately rejects
the later annotation and must not be rerun to downgrade it.

## API metadata and evidence

Corrected effective bodies expose `clauseReview` with `kind: DB-English`,
`scope: clauses`, accepted revision, exact proposal IDs and
`wholeBodyReviewed: false`. Safe prior review metadata remains under
`clauseReview.prior`; original field ownership remains `origin`. The current
body does not acquire a new whole-body `review` label. The newly retained 2474
name exposes `retainedReference: {kind: CHM, reviewed: false}` with no semantic
name review. Existing effective name metadata is unchanged.

Private input/evidence paths, predecessors, raw provenance and source texts are
never returned by the API. Default/explicit effective detail, batch, browse and
full-text consumers receive the new overlay; explicit CHM and English remain
unchanged. Unsupported provenance, source-bound substitutions and invented
clause acceptance fail rather than silently losing metadata.

Run `npm run -w data-tools action:corrections:test` for the portable transaction,
drift, protection and FTS recovery checks. Build contracts and server before
the affected HTTP tests. The [source-free delivery report](../reports/action-clause-corrections.md)
records readonly operator preflight and the narrow synthetic rehearsal; source
evidence stays under private `term-qa/issue-629/`. Remote `ci:portable` is the
merge gate; production activation remains a separate decision.
