# Masters of the Wild DB-English QA

Issue [#154](https://github.com/FrankHZ/dnd3.5-spellbook/issues/154), v1.4,
rulebook44, targets1874–1937. [qa-report.json](./qa-report.json) records the exact
private evidence revision, checks, resources and reproducible command.
[coverage.json](./coverage.json) is the source-free formal validator result.

All64 names, complete available bodies and mechanics received individual semantic
review. All38 owned occurrences were reviewed:33 matched name/body proposals,
5 explicitly excluded unmatched occurrences with private identity/full-body
comparisons. There are no duplicate groups or unparsed boundaries. The maintained
map and aliases remain unchanged.

The31 targets without matched candidates have complete private input/after-bound
unactivated translations:29 fully Chinese bodies and2 mixed bodies.1930 retains
its ambiguous penalty-formula sentence;1936 retains a capacity dependency whose
data is absent in both DB text and HTML. These2 actual DB-English body gaps are
separate from31 activation gaps. All62 current whole-field English fallbacks
remain unchanged. Additional source wording conflicts and incomplete normalized
headers are recorded without canonical repair.

Private evidence binds416 nonblank English lines to209 exact after segments.
Formal QA revalidated105 source files and5606 occurrences; pending fields and
body audits are zero. Strict bindings, HTML, references, numeric/negation/limit
review, placeholder and repeated-translation checks passed. Single-Node formal
validation used0.859seconds and278327296bytes peak working set; committed private
evidence is1252632bytes.39 unrelated staged deletions and1434 unrelated untracked
paths were preserved, verified using complete raw index records.

Formal accepted means validated proposal pending independent main-gate acceptance.
This is DB-English QA, with no claim of PDF/original-book verification or human
review. Operator DBs, app-state, canonical English, mechanics and summaries were
not written. All book QA precedes separately authorized unified writer/FTS/API
rehearsal; paused #529 is not a prerequisite. No self-merge or issue closeout.
