# Spell Compendium Condition Interpretation Handoff

This source-free handoff addresses [#274](https://github.com/FrankHZ/dnd3.5-spellbook/issues/274)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). It proposes
three complete Chinese bodies with explicit unofficial notes, while retaining
three unresolved original-source interpretation questions. Implementation does
not accept its own proposals, decide the rules or activate content.

## Revisions and Private Review Entry

Public base: `a909b6483c90facb9aed71f157716e651b99c00b`.
Private local-only base: `2ee22e46e12eb4b1ade5556ab09f7f568f549c62`.
Private evidence commit: `b508697599a0b66122f4bf227c669ac1f746e391`.
Only `dice-qa/books/86/issue-274/` was added to the private repository; it was
not pushed. Unrelated untracked files were preserved.

Start private review at `dice-qa/books/86/issue-274/README.md` and `review.md`.
The directory contains complete current English/HTML/mechanics and Chinese
text/HTML bindings, complete proposed Chinese/escaped HTML/diffs, actual
original page/spans, full-body audits, exact frozen predecessor bindings and
reproducible commands with actual results. Sources and translations stay private.
The current complete question checklist remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`; Chinese acceptance
does not reduce its original-source questions.

| Target | Chinese proposal | Original-source question |
| --- | --- | --- |
| 4120 | `accepted-with-source-issues` | `entry-intent`, `interpretation`, `source-unresolved` |
| 4216 | `accepted-with-source-issues` | `duration-choice`, `interpretation`, `source-unresolved` |
| 4756 | `accepted-with-source-issues` | `scaling-example`, `interpretation`, `source-unresolved` |

The notes distinguish potentially coordinated readings from confirmed
translation repairs. They do not invent opposing citations, decide duration or
scaling thresholds, or claim that compatible statements prove a numerical error.
The complete old bodies were checked for inherited and historical rules.
Target 4120's existing exception has a specific Sanctuary source, recorded
separately from the SC wording. Target 4216's extra parenthetical assertion is
documented as a textual mismatch against its actual complete entry; the related
acquisition rule remains. Named creature references are retained without
expanding their external statistics. No newly unavailable historical evidence
was found. Target 4756's already accepted name is outside this write scope.

## Validation and Evidence

The existing `interpretation` contract is reused unchanged. It retains complete
input/HTML freshness, full-body audits, source pages, explicit project notes,
duplicate/reordered-location rejection and refusal of unavailable external
evidence. No public tool, schema, runtime behavior or import writer changed.
Durable usage remains in [import-workflow](../../operations/import-workflow.md).

All three complete SC entries, the December 2005 first-printing information and
the full applicable local SC errata were re-read and visually checked. Only
necessary Sanctuary/PH274 inheritance and the complete three-page local
2006-02-17 PHB errata were additionally consumed. No applicable special
correction for these three questions was found. This bounded read does not
resume the PHB/MinerU/SRD queue or certify all later printings.

| Check | Actual result and private evidence |
| --- | --- |
| Readonly rules-copy provenance | All 315 accepted patch operations passed, exact unlisted fields/relationships/raw bytes and 56 unchanged tables; `joint-copy-verification.json` |
| Full inputs and predecessor bindings | Three complete input bindings and 16 frozen predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Complete maintained formal QA CLI | Exit 0, three candidate exports/full-body audits; native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Supplemental actual PDF verification | Eleven pages, 1,134 spans, three fields, seven exact issue statements; 18 real-source counterexamples rejected; `pdf-verification.json` |
| Targeted contract rejection checks | 35 passed, including five actual formal CLI failures with no accepted export; `counterexample-results.json` |
| Frozen scope and disjoint union | Old 658 native and 126 independent fields preserved; three new bodies have no overlap, accepted name retained; `scope-verification.json` |
| `npm run -w data-tools typecheck` | Exit 0 |
| `npm run -w data-tools dice:qa:test` | Exit 0, 72 maintained synthetic rejection checks and readonly CLI tests |
| PDF extractor unittest discovery | Exit 0, all 17 tests with Python 3.13/PyMuPDF 1.28.2 and this worktree's explicit source path |
| Complete private reproduction | Twelve commands, all exit 0; argv/cwd/output/results in `reproduction-verification.json` |
| Scoped private/public diff checks | Passed |

Command evidence records HEADs at execution time; the private commit above
identifies the commit containing those results. The reproduction explicitly
sets the current Python source path to avoid the reused environment's old
editable installation. Existing PDF ICC warnings did not prevent text/span or
visual verification; source PDFs were not repaired. Remote `ci:portable` and
independent PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272 evidence is unchanged. After main-gate
accepts the exact private revision, future consumption must union the three new
bodies with the prior set, yielding 129 independent fields. Target 4691 and
other historical-source gaps remain deferred; existing fallback is preserved.

Names, IDs, canonical English/mechanics, unselected fields and source authority
are unchanged. No operator DB, app-state, shared manifest, production writer,
deployment or activation was written. Private sources were not published or
sent externally. [#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns later consumer/import integration and gains no write authorization here.
