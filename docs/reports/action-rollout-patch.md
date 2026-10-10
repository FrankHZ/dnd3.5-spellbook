# Action rollout patch preparation

[#637](https://github.com/FrankHZ/dnd3.5-spellbook/issues/637) prepares a fixed
successor to [#629](../operations/action-corrections.md), after independent local
clause acceptance for #633/#635. High rigor covers annotation ordering,
provenance, retained predecessors, search recovery and overwrite risk. This is
software/handoff preparation; no operator activation has occurred.

The accepted scope is 37 disjoint targets and 40 local clauses: 20 updates
(14 recovered native DB-English owners, six independent DB-English owners) and
17 CHM-reference inserts. Immutable source inputs remain at #633 revision
`d3688512802bc9321d7c695005da7bb0b201e325` and #635 revision
`3e5ba3d5c7a86a67b41a54461eebb968c26fc8be`. The composed handoff and preparation
are frozen at `028c0654bc50c5e6f0a570fbc254a72d6c09734c` under private
`term-qa/issue-637/`; their accepted=false flags are preserved. The coordinator
accepts exact clauses, not whole bodies.
Readonly consumer/check evidence is frozen at
`ef88221e18798544549c3b55445e24731e72aa55` in that same directory.

## Actual readonly evidence

All 40 committed proposals bind to 37 exact current canonical/mechanical and
selected/effective predecessors. Independent Python/readonly SQLite checks
verify 80 text/HTML field edits and 37 compositions, complete facets/components,
effective-row presence/absence and exclusion of #629's four targets. Rules
English is checked by the maintained authenticator. All 37 resulting body and
name envelopes also pass the real built API mapper with no private locators.

Actual #629 remains authenticated **before**, with complete=false. Therefore
the new stage is **not applicable now**: its maintained readonly entry rejects
the unmet completed-body prerequisite and opens no writer. Expected #629-after
build metadata is derived from its authenticated handoff, without copying or
applying either operator DB. The fixed [operation/recovery contract](../operations/action-rollout.md)
requires completed #629, then the successor, then successor-only retries.

## Synthetic behavior and protection

The bounded synthetic full build contains the 37 new target/owner classes,
#629's four targets and retained controls. Both stages use the same maintained
transaction, materializer, annotation validation and FTS helpers as operator
entry points. Tests prove rejection before #629, rejection after its body-only
commit, successful #629 completion followed by the new stage, all-or-nothing
rollback, committed-body FTS failure, exact-after FTS recovery and zero-write
completed repeats. Older owners reject the later annotation.

Validation includes actual stale/partial predecessors, source/mechanic drift,
foreign/unaccepted proposals, wrong book/owner/annotation, late transaction
drift, HTML-specific replacements and disjoint multi-clause composition.
Protected-state checks retain canonical/mechanics, summaries, relationships,
SC and unrelated data. A separate synthetic app-state sentinel remains exact,
and the maintained CLI rejects it as a content target. #629 rows and note stay
exact through new apply/recovery.

HTTP tests cover all 37 default and explicit-effective details, safe clause/prior
metadata and unchanged names, English/CHM/control/SC reads. Batch and browse
retain their name-only DTO contract and select effective overlays; full search
finds new text only in default/effective contexts. Nested CHM locators are
retained internally and projected to stable API reference identities. Foreign
acceptance, invented whole-body/name review and invalid prior/path metadata
fail visibly. Existing #629 portable and HTTP regressions remain passing.

## Resources and remaining boundary

Fixed input files total about 1.2 MiB. The prepared handoff is about 875 KiB;
readonly preparation took about two seconds at 367 MiB peak RSS. The bounded
synthetic suite took about 14 seconds at 189 MiB peak RSS. These are processing
measurements, not model review billing. Initial budgets were 512 MiB memory and
50 MiB new output; paid bulk-model calls, operator writes and DB copies are zero.
The shared protected-state comparison scales with the full content database;
these readonly/synthetic measurements do not establish operator-apply peak RAM.
The 39 unrelated private staged deletions and all earlier/reviewer evidence
remain untouched. Model/effort verified from turn metadata: gpt-6.1-sol/high.

The current prerequisite remains unmet pending explicit operator authorization.
Passing tests, fixed acceptance and remote CI do not grant that authorization.
No edits address source/version conflicts, later invocation cost, SC terminology
or non-action geometry residuals; detector ticket #638 is separate. Canonical
English/mechanics, summaries and CHM are unchanged, SC authority is preserved,
and PHB extraction/translation queues remain suspended. Independent main-gate
review and exact-head `ci:portable` govern merge readiness.
