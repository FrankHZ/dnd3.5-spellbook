# Complete Adventurer DB-English QA

Issue [#161](https://github.com/FrankHZ/dnd3.5-spellbook/issues/161), v1.4,
rulebook54, IDs363–432. [qa-report.json](./qa-report.json) pins the private
evidence revision, coverage, boundaries and reproducible commands.
[coverage.json](./coverage.json) is the complete maintained formal result.

All70 names, complete English bodies and normalized mechanics were individually
reviewed against current read-only DB inputs, including61 targets without matched
candidates.339 nonblank English lines bind to337 exact Chinese after segments.
All70 complete Chinese bodies are saved privately.69 existing names are retained;
one inaccurate no-match name has a reviewed correction awaiting activation.
CHM/candidate comparisons identify concrete scope, numerical, action, header and
contamination differences, while preserving canonical English and mechanics.

Formal proposals contain9 complete bodies and no name replacements. The9 matched
names equal current CHM names and remain retained.61 complete no-match proposals
remain unactivated, with full inputs/after/segments saved independently; current
fallback is61 CHM bodies and70 CHM names. Shared maps, aliases, intake and writer
behavior are unchanged. Unactivated work has completed semantic review.

All11 owned occurrences are reviewed using formal candidateRulebook ownership,
including2 unmatched occurrences with full independent input comparisons.31 has
an identity spelling discrepancy and a candidate/normalized class-level mismatch;
66 corresponds to a target owned by rulebook60. Neither is forcibly mapped or
activated. There are no duplicate groups or unparsed boundaries.

The only substantive English/mechanics information gap is419's unspecified
normalized save kind. Its complete body supplies no kind, and Chinese reference
text is insufficient authority to infer it. Canonical mechanics and fallback
remain fixed.429's two non-UTF8 accent bytes affect only the spell self-reference;
both original DB text/HTML BLOBs are retained privately. All rules are intact,
and the reviewed after uses a natural self-reference without repairing English.
Two further nonblocking notes concern word spacing.

Complete formal QA revalidated105 source files and5606 occurrences with zero
pending fields/body audits. Current English/name/mechanics/HTML/CHM inputs,
owned candidates, unmatched hints and prepared intake were replayed. Exact
input/after/all-nonblank-line, HTML, references, numerical/conditional/negative
scope, placeholder and repetition checks passed. All11 digit-only differences
have individual dispositions;6 repeated groups contain4 identical clauses and2
spacing-equivalent clauses. Maintained dice QA portable tests passed.

Single-Node formal validation used0.821seconds; sampled OS peak working set was
278093824bytes at20ms polling. Private evidence is2931509bytes in31 files, above
the initial2MiB estimate and within the5MiB cap. Complete original raw index records
prove39 unrelated staged deletions unchanged and1441 unrelated untracked paths
preserved after selective private commits. Actual local rollout metadata verifies
gpt-6.1-sol/high. No per-book executable stack is committed.

Formal accepted means a validated proposal awaiting independent main-gate
acceptance. This is DB-English QA with no PDF/original-book or human verification
claim. Operator DBs were readonly/query_only; no app-state access, canonical
English/mechanics/summary writes, private push, consumer rehearsal or deployment.
All book QA precedes separately authorized unified writer/FTS/API work; paused
#529 is not a prerequisite. No self-merge or issue closeout.
