# Tome and Blood DB-English QA

Issue [#158](https://github.com/FrankHZ/dnd3.5-spellbook/issues/158), v1.4,
rulebook51, targets3376–3431. [qa-report.json](./qa-report.json) records exact
private evidence revision, resources, boundaries and reproducible commands.
[coverage.json](./coverage.json) is the maintained source-free formal result.

All 56 names, complete available bodies and mechanics received individual semantic
review, including 40 targets without matched candidates. All 25 owned occurrences
were reviewed, including 9 unmatched occurrences with independent full-input
identity/body comparisons. No duplicate groups or unparsed boundaries exist.

Formal proposals contain 16 names and 15 bodies. Private unactivated evidence holds
40 complete no-match name/body translations and 1 additional guarded body (3395,
candidate missing fields). All 56 authored bodies are Chinese and bind 346 nonblank
English lines to 341 exact after segments. The 81 current whole-field English
fallbacks remain unchanged. Maps, aliases and writer behavior are unchanged.

Activation gaps are separate from actual source questions: 1 formula-scope problem
(3376), 1 recipient-scope conflict (3406), 18 incomplete inherited normalized
headers, 2 specific missing normalized fields and 1 unspecified save type (3405),
plus 1 structured-header/body savingThrow conflict (3412). Its normalized header
remains None; the body separately requires a conditional selected-side fear Will
save and a passing-through Fortitude save. None is not a claim that these
conditional saves do not apply. These 24 recorded items preserve
canonical English/mechanics and fallback. The ambiguous formula is translated
literally with its existing example; no arithmetic repair is asserted. There are
no missing body tables. Three nonblocking notes cover2 context-supported
typographical renderings and the distinction between concealment grade and
avoidance probability; no speculative conflict is introduced.

Complete formal QA revalidated 105 source files and 5606 occurrences with zero
pending fields/body audits. Exact current 56 English/name/mechanics/HTML/CHM inputs,
25 occurrences and prepared intake were replayed. Input/after, all-nonblank-line,
HTML, reference, numerical/conditional/negative-scope, placeholder and repetition
checks passed. The 12 numeric miss-finder differences are individually reviewed
word-numeral/fraction renderings. Four repeated groups have identical English
clauses. Maintained portable QA tests passed.

Single-Node formal validation used 0.790 seconds and 278568960 bytes peak working set;
the prescribed npm command used 1.124 seconds. Private committed evidence is
1430433 bytes in 30 files, below 5 MiB. No new executable stack was committed. Complete
raw index records prove 39 unrelated staged deletions unchanged; 1441 unrelated
untracked paths remain. Actual local rollout metadata confirms gpt-6.1-sol/high.
The final 3412 note changes no input, translation, formal proposal or fallback;
its private receipt binds all 56 exact inputs and after values to private revision
4fb3144e1264cd8c9750c17ca63793f240693319. Protected source/input, translation,
decision, correction, audit, accepted, unactivated and fallback files were checked
byte-for-byte against their pre-revision working files.

Formal accepted denotes a validated proposal awaiting independent main-gate
acceptance. This is DB-English QA, with no PDF/original-book or human verification
claim. Operator DBs were readonly/query_only; no app-state access, canonical
English/mechanics/summary writes, private push, consumer rehearsal or deployment.
All book QA precedes separately authorized unified writer/FTS/API rehearsal;
paused #529 is not a prerequisite. No self-merge or issue closeout.
