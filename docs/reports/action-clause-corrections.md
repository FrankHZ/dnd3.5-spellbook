# Fixed action-clause correction delivery

[#629](https://github.com/FrankHZ/dnd3.5-spellbook/issues/629) consumes the
independently accepted local decisions from #626: seven clauses over four
non-SC targets. The public deliverable contains code, synthetic tests and this
aggregate report; source-bearing predecessors, composed bodies and original
provenance remain in the private data repo. No operator DB write, full DB copy,
CHM edit, queue resumption or deployment was performed.

## Behavior and authority

The fixed maintained owner binds semantic revision
`f20065908448ad3835f34dc5401616a9c189b4d4` and prepared handoff
`626ad56d837dac8063b55d44b0db10052ada8737`. It composes four disjoint clauses
against one original body for 84, replaces one local clause each for 523/2165,
and inserts an effective overlay for 2474 only when absent. Each text/HTML edit
has a complete predecessor and one exact occurrence; no individual full-body
proposal overwrites another correction. Names, original ownership and prior
review remain distinct from the accepted new clause changes.

The existing accepted-overlay stage required absent effective predecessors and
its older acceptance/provenance owners. That cannot represent these three
present-row corrections. The change adds one fixed owner and complete prior-row
guards to the existing transaction/SQL/protection/search path. It preserves the
older refusal behavior rather than building a caller-selectable patch service.
Unknown source chains and altered build annotations reject. SC retains its
original source-bound guard; normalized generation/import history remains intact.

API `clauseReview` explicitly has `wholeBodyReviewed: false` and safely preserves
prior review metadata. A retained CHM name is marked unreviewed reference. The
API exposes no private locators, before-bodies or raw evidence. The historical
mechanical unknowns and held-out denominators from #626 are unchanged; terminology
clarification does not retroactively establish a mistranslation or full-body QA.

## Resources and readonly operator evidence

Pre-scan estimates: under 200 KiB composed handoff, under 5 MiB reports and
512 MiB peak memory. The operator content file is about 257 MiB but was opened
readonly without a copy. The maintained full-search check is inventory work,
not manual corpus QA; it must examine existing documents to prove current FTS.

Preparation emitted 161,539 bytes in 119 ms at about 155 MiB peak RSS. Actual
readonly rules/content preflight reported exactly three updates plus one absent
insert, zero accepted names/whole bodies and seven accepted clauses. It verified
15,808 search documents as current in 1.7 seconds at 344 MiB peak RSS. File
identity, size and modification metadata stayed unchanged. The output and memory
were within budget; no model API or paid bulk processing was used.

## Validation and limits

The small synthetic full-build fixture exercises the maintained materializer,
immediate transaction, DB-role/path guards and actual SQLite FTS. Portable checks
cover composition, input/source/predecessor drift, partial sets, late drift after
preflight, protected-name rollback, interrupted search, failed FTS rollback,
exact-after recovery and zero-write repeat. The fixture preserves SC, non-target
rows, original name fields and schema. Root/package cwd checks use the same
owner entry; no operator fixture is copied.

HTTP tests prove detail/batch/browse/full-text behavior for default and explicit
effective, unchanged explicit CHM/English, safe clause/prior metadata, retained
name references and rejection of forged revisions/whole-body claims/unknown
prior authority/source-bound substitutions. Existing Cityscape/closeout tests
guard older owner behavior. Contracts build before server consumers; remote
exact-head `ci:portable` remains required and is recorded in the PR.

Synthetic rehearsal proves control flow and consumer behavior on a small schema
compatible fixture. Readonly operator preflight proves current applicability,
not operator application or full-scale write performance. Body commit and search
commit are distinct stages; interruption is reported and recovered only from
reauthenticated exact-after. Applying to operator databases and production needs
separate explicit authorization on the reviewed merged delivery.
