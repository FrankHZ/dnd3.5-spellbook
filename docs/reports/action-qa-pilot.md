# Action QA Pilot Evaluation

Owning scope: [#622](https://github.com/FrankHZ/dnd3.5-spellbook/issues/622),
first readonly slice of [#597](https://github.com/FrankHZ/dnd3.5-spellbook/issues/597).
This report evaluates candidate retrieval against canonical DB English. It does
not certify original-book rules or Chinese content and grants no write authority.

## Sample And Resources

The final pilot reads 100 real entries from a 5,097-entry content DB. Deterministic
round-robin strata cover seven body-action families and no-body-action controls,
with the required anchor forced in. Rare actions and early stable IDs are favored;
this is neither a random sample nor a corpus precision/recall estimate. Final
selection has 90 effective rows, eight CHM fallbacks and two missing Chinese rows.
Seven effective bodies retain English fallback; their provenance identifies them
as English. Exact identities, field sources and texts are private.

Estimate before the pilot: under 20 MiB input working data, under 5 MiB output,
under 512 MiB peak memory; runtime and human review cost initially unknown.
Actual final process: 0.790 seconds for inventory, selection, reads and analysis
(excludes npm/tsx startup), 98.7 MiB peak RSS and 660,387 evidence bytes, plus a
small aggregate JSON report. Inventory English occupies 3,812,237 UTF-8 bytes.
The process performed zero model API calls, DB copies or content writes. Main DB
size/mtime stayed unchanged; synthetic tests also compare complete DB bytes.
SQLite readonly access may use ordinary WAL/SHM coordination; this is not a claim
that no filesystem access occurs. Shared dependencies were reused.

Runtime is O(text length × a fixed rule count), including bounded repeated seed
classification during sample selection. Working memory includes the small English
inventory and selected evidence; output grows with selected full-body context.
A 1,000-entry limit and 50 MiB evidence guard bound this pilot command. Scaling to
all entries is not established by these measurements.

## Provisional Context Review

There are 182 current-view occurrence records: two candidates and 180 unknowns.
Unknowns include lexical support, absent headers/text and English fallback; none
is automatically cleared. The implementing agent reviewed both candidate entries,
20 deterministic non-candidate body-action entries, and all 12 no-body-action
controls: 34 distinct current entries. The other 66 current entries remain
unreviewed. Review was limited to action semantics and their conditions/counts,
not full-text QA. Both current candidates are phrasing false positives: 0/2
provisional candidate precision; no action discrepancy was observed in the 20
non-candidate entries or 12 controls. A zero observed miss count does not establish
recall, especially when the detector emits unknown instead of passing entries.

The separate CHM contrast produced 15 candidates in 14 entries. All were reviewed:
two clear omitted action clauses, ten alternate-phrasing false positives and three
unresolved occurrences (two implicit full-attack costs and one ambiguous action
label). Decidable-only provisional precision is 2/12 (16.7%); the full denominator
is 15, with three unknowns, not discarded successes. The two clear omissions
include the required anchor and an independent ending-action omission. Current
effective counterparts retain both actions. These findings do not imply that
current effective composition removed them.

Initial discovery exposed missing-header/English-fallback false candidates and
move-equivalent, fullround and coordinated-list extraction gaps. Focused rules
and synthetic regressions cover those discoveries; earlier private runs remain
intact. The final deterministic IDs changed as extraction improved. Evaluation
above uses the final run only; reviewed non-candidate/control identities are
bound to its private evidence.

The context review is **agent review**, not a human precision measurement. The
recorded wall interval between first candidate-context inspection and final
control inspection was 74.678 seconds, including tool calls and rule iteration;
it is not active human reading time or a billing measurement. Human entries
reviewed: zero. Human review time, model-token cost and independent acceptance
remain unmeasured/pending; no paid bulk API was dispatched.

## Decision And Follow-up

These rules are useful for retrieving bounded missing-clause candidates and
keeping variant/provenance confusion visible. Current-view precision and the
large unknown fraction do not justify an all-corpus correction queue. Freeze
this slice for independent review, then select a small immediate/free action
family batch with bilingual activation/ending context and explicit independent
review decisions. Resolve historical action-label synonyms and implicit costs
before expanding that batch. Improved context retrieval should be evaluated with
new held-out negatives, rather than relabeling lexical matches as passed QA.
Other terminology families, NLP infrastructure, correction writers and production
activation remain outside this slice. Human review cost must be measured in the
next accepted review batch before estimating a wider workload.

Private evidence: configured `term-qa/issue-622/pilot-final/` contains complete
contexts, raw field provenance, exact selection and provisional review decisions.
Earlier `pilot-01/`, `pilot-02/` and `pilot-03/` retain discovery evidence.
Reproduce through the [readonly command](../operations/action-qa.md) into a fresh
directory against an explicitly supplied current DB; changed content can change
selection and findings.
