# Stronghold Builder's Guidebook DB-English QA

Issue [#157](https://github.com/FrankHZ/dnd3.5-spellbook/issues/157), rulebook49,
IDs3374–3375. [qa-report.json](./qa-report.json) pins the local private revision,
boundaries and reproduction commands; [coverage.json](./coverage.json) records
complete maintained formal QA.

Both names, complete bodies, English HTML and normalized mechanics were reviewed
against current read-only DB inputs and both owned candidates. Neither target has
CHM Chinese. Two names and two complete paragraph bodies are formally proposed;
six nonblank English lines bind to six exact Chinese after segments. No missing
English, unresolved scope, unactivated proposal, duplicate or boundary remains.
Canonical English, mechanics and summaries remain unchanged.

Formal QA revalidated105 source files and5606 occurrences with zero pending fields
or body audits. Current inputs and exact formal/correction/audit/after equality,
all clauses, numeric/conditional/negative scope, HTML, references, placeholders and
repetition checks passed. Maintained dice QA portable tests passed. The unattended
object save benefit was checked separately from the spell's own saving throw.

Single-process formal QA used0.887seconds and sampled
peak working set277196800bytes at20ms polling.
Private evidence is1134318bytes in19files,
within the2MiB estimate and5MiB cap. Complete original raw index/status evidence
proves39 unrelated staged deletions and1441 old untracked paths unchanged.
Local rollout metadata verifies gpt-6.1-sol/medium.

Formal accepted means a validated proposal awaiting independent main-gate review.
This is DB-English QA without original-book/PDF or human verification. No operator
DB writes, app-state access, private push, shared-input changes, consumer rehearsal,
writer/FTS/API work or deployment occurred. #529 remains paused. No self-merge or
issue closeout; full remote ci:portable at final public head remains the gate.
