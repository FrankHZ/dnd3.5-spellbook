# Saving clause patch preparation

[#645](https://github.com/FrankHZ/dnd3.5-spellbook/issues/645) prepares the fixed
accepted #641/#643 saving clauses after the existing #629/#637 action chain.
High rigor covers full predecessor ownership, annotation order, atomic content
mutation, FTS recovery and API authority. This is reviewed software/handoff
preparation; operator activation is outside scope.

Exactly nine targets contain fifteen accepted clauses: seven effective updates
and two absent-effective CHM inserts (2717/3606). Thirteen clauses are clarity
changes; two are confirmed saving-condition changes on 3606. Its inclusive-zero
wording remains clarity and its negative-total magnitude is DB-English
interpretation. 906 HD and 3606 adjacent effect wording remain unresolved.
There is no whole-body or original-book acceptance.

The fixed #641 and #643 revision-02 source bindings are recorded in the
[operation contract](../operations/save-corrections.md). Handoff/preparation is
frozen at private `edfeac515ed6df13cc5b1c573792af5df279bc11`, under
`term-qa/issue-645/`. Mutable proposal flags remain false. Readonly consumer/check/verification evidence
is frozen at private `5b417c6d3e8c7e1129a4bdbda3d6a81349684f1f` in that directory.

## Actual readonly evidence

The maintained authenticator binds all fifteen accepted clauses, complete
canonical identity/English/mechanics, aligned rules English, facets/components,
selected/effective rows, names, ownership and exact separate text/HTML edits.
Independent Python/readonly SQLite verification confirms all nine live
predecessors and thirty unique nonoverlapping field spans, composing every
accepted after body against one original. All eighteen resulting name/body
envelopes pass the built API mapper without leaking private locators.

The actual operator baseline is authenticated #629-before. Expected completed
#637 metadata is derived from immutable evidence without applying either prior
stage. Root/package maintained readonly calls both reject the unmet prerequisite
before opening a writer; body/search are not attempted. DB sizes and modification
times remain unchanged. Operator writes and DB copies are zero.

## Synthetic execution and consumers

The suite extends the existing four-target #629 and thirty-seven-target #637
fixtures with all nine saving targets and retained controls. Invented data run
through the real materializer/annotation/search path. Tests cover exact input
normalization, independent HTML spans, multi-clause composition, absent inserts,
stale/partial/foreign predecessors, target/book/owner drift, current canonical
and annotation guards, and transaction-time drift. Both body-only prerequisite
states reject; complete #629 then #637 permits saving apply.

Failures inside the body transaction roll back all nine bodies and the note.
Protected-state checks preserve prior actions, SC, canonical/mechanical rows,
summaries, relationships, names, CHM and unrelated data. FTS failure reports
committed bodies separately; exact-after retry repairs only search, and completed
repeat writes neither bodies nor search. Older owners reject the saving
annotation. Maintained path/revision/alias/app-state refusal is exercised, and a
synthetic app-state sentinel remains exact.

HTTP tests exercise every target's default/explicit-effective detail, safe
clause/prior metadata, unchanged names and English/CHM reads, batch/browse
selection, and corrected-text full search. CHM insert names remain unreviewed
references with stable public locators. Invented acceptance, whole-body/name
review, unsupported prior metadata and unsafe locators fail visibly. Prior action
portable and HTTP suites protect existing consumers.

## Resource measurements and remaining boundary

Estimated inputs are about 1.6 MiB including the existing chain; output and peak
RSS budgets are 50 MiB and 512 MiB. Prior-stage timings informed the bounded
readonly and synthetic approach. The prepared handoff is about 300 KiB; actual
readonly preparation took 2.14 seconds at 394 MiB peak RSS. The expanded synthetic
suite took 23.98 seconds at 273 MiB peak RSS. No paid bulk-model calls were used.
Protected-state/search operations scale linearly with content size; operator-apply
peak memory remains unmeasured. Readonly/synthetic results do not establish that
measurement or authorize activation.

The thirty-nine unrelated staged private deletions and earlier/reviewer evidence
remain intact. Actual model/effort was verified from session metadata as
gpt-6.1-sol/high. SC authority, canonical English/mechanics, summaries and CHM
remain unchanged; PHB extraction/translation remains suspended. Independent
main-gate review and exact-head remote `ci:portable` govern merge readiness.
