# Spell Compendium Material, Target and Effect Review

This source-free handoff addresses [#268](https://github.com/FrankHZ/dnd3.5-spellbook/issues/268)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). Three complete
Chinese bodies are validation candidates with retained original-source issues;
the fourth body remains deferred after complete review exposed an additional
historical-source dependency. Main-gate explicitly adopted this disposition in
the owning issues. This implementation does not accept its own proposals.

## Exact Revisions and Private Evidence

Public base: `4f3c74a01dfda8f9cbbd5fc2d0cb03649cc838f6`.
Private local-only base: `7f6a143e3b48cd9484c79176e60c7f2d71befb2e`.
Private evidence commit: `a05a226f5f4e21982195cf67f365ff5f55644f47`.
Only `dice-qa/books/86/issue-268/` was added to the shared private repository;
it was not pushed. Existing unrelated untracked files were preserved.

Start the private review at `dice-qa/books/86/issue-268/README.md` and `review.md`.
The directory contains exact complete current English/HTML/mechanics and Chinese
text/HTML bindings, complete proposed text/escaped HTML/diffs, original PDF
pages/spans, independent review rows, source-issue statements, reproducible
commands and actual command results. No original text or translated body is
included in this public report.

| Target | Chinese disposition | Original-source issues |
| --- | --- | --- |
| 3893 | `accepted-with-source-issues` candidate | `unspecified-material` remains `source-unresolved` |
| 4117 | `accepted-with-source-issues` candidate | `target-magic-item` remains `source-unresolved` |
| 4539 | `accepted-with-source-issues` candidate | `balance-save` remains `source-unresolved` |
| 4691 | `deferred`; no accepted export | `healing-cost` and `save-application` remain `source-unresolved` |

Target 4691 also has a separately recorded `historical-source` gap, discovered
in the complete existing Chinese body. The actual applicable historical book,
printing and errata are unavailable in the known local PDF inventory. Existing
compiler English, old QA and the current SC entry cannot substitute for that
source. `historical-source-gap.json` binds the exact old shared header and
historical paragraphs; `pendingSourceEvidence` blocks acceptance. The frozen
#264 inventory is unchanged, and the new gap is assigned to parent #263.
All existing paragraphs and the effective fallback remain intact. Its separate
SC-only correction/reader-note draft is explicitly unaccepted and cannot be
consumed as a replacement for the mixed body.

## Maintained Validation and Preservation

The existing `accepted-with-source-issues`/`retainedSourceIssues`, full-body audit,
formal dice QA and supplemental PDF verifier were sufficient. No public schema,
tooling, fixture or runtime behavior changed.

Actual complete SC entries, printing information and the applicable complete
errata were re-read and visually checked. Only the necessary existing material
rule and wind gloss were checked against two explicit PHB pages and its applicable
three-page errata. This bounded source read did not resume the suspended PHB
PDF/MinerU/SRD queue or expand another book's QA.

| Check | Result and private evidence |
| --- | --- |
| Readonly disposable rules-copy comparison | Passed all 315 accepted patch operations, unlisted spell fields/relationships/raw bytes and 56 unchanged tables; `joint-copy-verification.json` |
| Complete readonly current inputs and frozen predecessor binding | Passed four complete bindings and 13 relevant predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Maintained formal QA CLI | Exit 0, four dispositions, three candidate exports/full-body audits and one deferred body; `formal-verification.json`, `formal-check/` |
| Actual supplemental PDF verification | Passed 12 pages, 1,355 spans and four effective field bindings; 16 real-source counterexamples rejected; `pdf-verification.json` |
| Separate original-source issue catalogue | Five unresolved issues, 10 exact statements; deferred SC draft checked as evidence, not accepted content; `source-unresolved-evidence.json` |
| Targeted freshness and rejection checks | 18 checks passed, including source/mechanics/English HTML/old Chinese HTML freshness, missing notes, unavailable sources and forced deferred promotion; `counterexample-results.json` |
| Formal CLI locator counterexamples | Duplicate statement refs and reordered identical opposing locator sets both rejected with nonzero exit and no accepted output |
| Frozen outputs and disjoint union | Passed; #259/#264/#265 unchanged, native accepted/fallback identical; `scope-verification.json` |
| `npm run -w data-tools typecheck` | Exit 0 |
| `npm run -w data-tools dice:qa:test` | Exit 0; maintained 45 rejection checks and readonly CLI tests passed |
| PDF extractor unittest discovery | Exit 0; all 17 tests passed with Python 3.13 and PyMuPDF 1.28.2 |
| Scoped private/public diff checks | Passed |

`reproduction-verification.json` records the complete nine-command private
reproduction sequence and successful exits. Its runtime HEADs describe when
checks ran; the evidence commit above identifies the commit containing outputs.
Existing source font/ICC warnings did not prevent span verification or visual
reading; no source file was repaired. Full remote `ci:portable` and independent
PDF tests remain the PR merge gate; their current results are owned by PR checks.

The existing 658 native and 119 independent fields remain untouched. All four
target bodies are absent from that accepted baseline. These three new independent
fields have zero overlap; a future consumer must retain the old set and union the
increment, yielding 122 independent fields only after main-gate acceptance.
Frozen #259 is `7777cb7016ecb115acc7426c25759528593215f9`; #264 is
`3ccda19e2e5e483696cf305374fc9343703525af`; #265 is the private base above.

## Remaining Authority and Operational Boundaries

All five SC source issues remain unresolved. Candidate Chinese fidelity and
reader-note quality are separate from original-rule adjudication; remarks are
explicitly project explanations, not official errata. The historical gap requires
actual source evidence and a subsequent explicit mixed-body disposition.

Names, IDs, canonical English/mechanics and unselected fields are not changed.
No operator DB, app-state, shared manifest, writer, production deployment or
activation was touched. Private sources were not published or sent externally.
[#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121) owns any future
consumer/import integration; this report does not implement or authorize it.
