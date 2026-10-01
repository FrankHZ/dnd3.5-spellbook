# Spell Compendium Interpretation Question Handoff

This source-free handoff addresses [#272](https://github.com/FrankHZ/dnd3.5-spellbook/issues/272)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). Four complete
Chinese bodies are validated proposals with explicit project notes; their four
original-source interpretation questions remain unresolved. Implementation does
not accept its own proposals, decide the rules or activate content.

## Revisions and Review Entry

Public base: `40bfc7a1d42013f0b07c827b2db54bb00b3d1bac`.
Private local-only base: `c6cc9a8d6b887ffaffbdcd1ecec08b3444e3ced2`.
Private evidence commit: `2ee22e46e12eb4b1ade5556ab09f7f568f549c62`.
Only `dice-qa/books/86/issue-272/` was added to the private repository; it was not
pushed. Existing unrelated untracked files were preserved.

Start private review at `dice-qa/books/86/issue-272/README.md` and `review.md`.
The directory contains complete current English/HTML/mechanics and Chinese
text/HTML inputs, complete proposed Chinese/escaped HTML/diffs, actual original
page/spans, full-body audits, frozen predecessor bindings and reproducible
commands with actual results. Source text and translations stay private.

| Target | Chinese proposal | Original-source question |
| --- | --- | --- |
| 3795 | `accepted-with-source-issues` | `sphere-motion`, `interpretation`, `source-unresolved` |
| 3828 | `accepted-with-source-issues` | `material-quantity`, `interpretation`, `source-unresolved` |
| 3870 | `accepted-with-source-issues` | `material-quantity`, `interpretation`, `source-unresolved` |
| 4085 | `accepted-with-source-issues` | `push-distance`, `interpretation`, `source-unresolved` |

Each water question binds one actual statement. The other questions each bind
three distinct statements. Notes identify the preserved wording, possible
coordinated readings and unresolved application, explicitly label the project
explanation as unofficial and request external review. Confirmed Chinese
translation errors are corrected without adding a rule interpretation. Target
3870 uses the already accepted applicable official alignment correction; its
material question remains separate.

## Contract and Validation

The maintained independent review contract adds only kind `interpretation`.
It allows one real statement for an interpretation question. Existing `conflict`
still requires at least two statements; `missing-explanation` still allows one.
All kinds retain duplicate-ref and reordered-identical-location rejection,
complete input/HTML freshness, full-body audit, required notes, source pages and
the rejection of unavailable external evidence. No new platform, import writer,
runtime behavior or source authority was introduced. Durable usage is in
[import-workflow](../../operations/import-workflow.md).

The complete four SC original entries, first-printing information and complete
applicable local errata were re-read and visually checked. Only the necessary
general material rule on PH174 and its three-page applicable errata were added.
This bounded read did not resume the PHB/MinerU/SRD queue or another book's QA,
and does not claim to certify all later printings.

| Check | Actual result and private evidence |
| --- | --- |
| Readonly rules-copy provenance | Passed all 315 accepted patch operations, exact unlisted fields/relationships/raw bytes and 56 unchanged tables; `joint-copy-verification.json` |
| Complete inputs and predecessor bindings | Four complete input bindings and 24 frozen predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Maintained complete formal QA CLI | Exit 0; four candidate exports/full-body audits, native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Supplemental actual PDF verification | Ten pages, 1,060 spans, four fields and eight exact issue statements; 24 real-source counterexamples rejected; `pdf-verification.json` |
| Targeted rejection checks | 45 passed; five actual formal CLI failures, no accepted export on failure; `counterexample-results.json` |
| Frozen scope and disjoint union | Passed; old 658 native and 122 independent fields preserved, four new independent body fields have no overlap; `scope-verification.json` |
| `npm run -w data-tools typecheck` | Exit 0 |
| `npm run -w data-tools dice:qa:test` | Exit 0; 72 maintained synthetic rejection checks and readonly CLI tests |
| PDF extractor unittest discovery | Exit 0; all 17 tests with Python 3.13/PyMuPDF 1.28.2 and this worktree's explicit source path |
| Complete private reproduction | Twelve commands, all exit 0; argv/cwd/output/results in `reproduction-verification.json` |
| Scoped private/public diff checks | Passed |

Runtime HEADs in command evidence describe when checks ran; the private commit
above identifies the commit containing the evidence. Reusing the PDF environment
initially selected its old editable-install module; setting `PYTHONPATH` to this
worktree's source resolved the test failure. The documented reproduction fixes
that path explicitly. Existing source ICC warnings did not prevent original
span verification or visual reading; no source file was repaired. Full remote
`ci:portable` and independent PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270 evidence remains unchanged. The four new fields
must be unioned with the prior accepted set only after main-gate accepts the
exact private revision, yielding 126 independent fields. Target 4691 and other
historical-source gaps remain deferred; existing fallback is preserved.

Names, IDs, English/mechanics, unselected fields and source authority are
unchanged. No operator DB, app-state, shared manifest, production writer,
deployment or activation was written. Private sources were not published or
sent externally. [#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns subsequent consumer/import integration and does not gain authorization
from this handoff.
