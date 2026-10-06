# Deities and Demigods DB-English QA

Issue [#153](https://github.com/FrankHZ/dnd3.5-spellbook/issues/153), v1.4,
rulebook39, IDs980–992. [qa-report.json](./qa-report.json) pins the private
revision, reviewed coverage, residuals, resources and reproducible commands.
[coverage.json](./coverage.json) is the complete maintained formal result.

All13 names, available full English bodies/HTML and normalized mechanics were
individually reviewed against current read-only DB inputs. All14 formally owned
occurrences were compared, including both982 duplicates. Current CHM name/body/
HTML is absent for every target.86 nonblank English lines bind to84 exact Chinese
after segments; broken sentences/references are joined naturally.

Formal proposals contain13 names and12 complete bodies, with12 exact corrections
and12 full-body audits.982's explicit duplicate resolution selects the occurrence
with the DB English supersession note; both complete candidate comparisons remain
private. The other occurrence is excluded as a reviewed duplicate. Shared source,
map, aliases, intake and writer behavior remain unchanged.

989's damage table is absent from both DB English text and HTML. Its3 available
clauses are translated and bound to actual after, saved as an unactivated body
proposal. Candidate-only damage categories, dice and caps are not adopted. The
body remains deferred with English fallback; complete damage rules are unresolved.
982's normalized class/domain levels are also absent; candidate-only level data
is not inserted. These2 specific evidence gaps preserve canonical fields and
fallback. Pending0 reports completed review, not resolution of the missing table.

Target-specific checks cover meaning, conditions, numbers, negation, header
mechanics and component wording. Distinct durations, permanence versus casting
duration, and initial versus later saves are kept distinct. Complete input/after/
line, HTML, references, placeholders and repetition checks passed. All3 digit-only
differences are individually explained by English number words becoming Chinese
numerals. No repeated after groups or unexpected Latin residue remain.

Complete formal QA revalidated105 source files and5606 occurrences with zero
pending fields/body audits. Exact current DB inputs, owned candidates and prepared
intake were replayed. Maintained dice QA portable tests passed; no incomplete-check
result is used as acceptance. No per-book executable stack is committed.

Single-Node formal validation used0.8767234seconds; sampled OS peak working set
was277340160bytes at20ms polling. Private evidence is1658643bytes in27 files,
within the initial2MiB estimate and5MiB cap. Full original index records prove39
unrelated staged deletions unchanged and1441 old untracked paths preserved after
selective private commit. Actual local rollout metadata verifies gpt-6.1-sol/high.

Formal accepted means a validated proposal awaiting independent main-gate
acceptance. This is DB-English QA; no PDF/original-book or human verification is
claimed. Operator DBs were readonly/query_only. No app-state access, canonical
English/mechanics/summary writes, private push, DB copies, new environments,
consumer rehearsal or deployment occurred. All book QA precedes separately
scoped unified writer/FTS/API work; paused #529 is not a prerequisite. No self-merge
or issue closeout. Retain the assigned checkout for main-gate acceptance/release.
