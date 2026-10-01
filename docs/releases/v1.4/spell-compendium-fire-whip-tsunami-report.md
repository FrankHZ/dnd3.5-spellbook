# Spell Compendium Fire, Whip and Tsunami Handoff

This source-free handoff addresses [#276](https://github.com/FrankHZ/dnd3.5-spellbook/issues/276)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). It proposes
three complete Chinese bodies and explicit unofficial interpretation notes.
All three original-source questions remain unresolved. Implementation does not
accept its own proposals, decide the rules, merge or activate content.

## Revisions and Private Review Entry

Public base: `c383dd27bf82a547b977bfdf453b84751d4990c4`.
Private local-only base: `c6624878b4bba676690b0e27c7f2faf151004457`.
Private evidence commit: `ab61f604534ce06c80adabd41110f11680099936`.
Only `dice-qa/books/86/issue-276/` was added to the private repository; it was
not pushed. Unrelated untracked files were preserved.

Start private review at `dice-qa/books/86/issue-276/README.md` and `review.md`.
The directory contains complete current English/HTML/mechanics and old Chinese
text/HTML, complete proposed Chinese/escaped HTML/diffs, full-body audits,
actual source pages/spans, exact frozen predecessor records and reproducible
commands with actual results. Sources and translations remain private.
The complete question checklist remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`; a Chinese proposal
does not reduce the original-source questions.

| Target | Chinese proposal | Original-source question |
| --- | --- | --- |
| 3854 | `accepted-with-source-issues` | `fire-mitigation`, `interpretation`, `source-unresolved` |
| 4196 | `accepted-with-source-issues` | `attack-type`, `interpretation`, `source-unresolved` |
| 4322 | `accepted-with-source-issues` | `water-speed`, `interpretation`, `source-unresolved` |

Every entry was reviewed through its complete header, flavor, rules, components
and necessary inheritance. Target 3854 separates mitigation from extinguishing
conditions and retains the inherited-frequency and scaling questions. Its
contact and prepared-counterspell rules and success/failure outcomes are complete.
Target 4196 retains the distinct animal attack and ordinary-weapon statements;
the necessary ordinary weapon rules were read through their page continuation.
Target 4322 retains all damage, size, save, carriage, movement, rescue, obstruction,
water/land and material conditions, including the unresolved movement parameter.
No unavailable historical rule block was removed or accepted through a note.

Reader notes contain the source question, possible coordinated readings, impact
and version/errata limits. Translation repair history and audit procedure remain
in private review records. No note is represented as an official correction or
inserted into canonical English/mechanics.

## Validation and Evidence

The existing source-bound fallback and `interpretation` contracts are reused
unchanged, including full input freshness, old/new HTML, complete body audits,
source pages, explicit project notes and refusal of unavailable evidence.
No public tool, schema, runtime behavior or writer changed. Durable usage remains
in [import-workflow](../../operations/import-workflow.md).

The three complete SC entries, December 2005 first-printing information and full
local SC errata were re-read and visually checked. Necessary PH272, PH223,
PH170–171 and PH121–122 inheritance and the complete three-page local
2006-02-17 PHB errata were additionally consumed. The PH v3.5 July 2003 printing
was visually read from its scanned title page; its printing text is not claimed
as extractor-verified text. The applicable PHB correction is distinguished from
the unaffected inherited uses. No special correction resolving these three
questions was found. This bounded read does not resume PHB/MinerU/SRD queues or
certify all later printings.

| Check | Actual result and private evidence |
| --- | --- |
| Readonly rules-copy provenance | All 315 accepted operations, exact unlisted fields/relationships/raw bytes and 56 unchanged tables passed; `joint-copy-verification.json` |
| Full inputs and predecessor records | Three complete input bindings and 16 frozen predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Maintained complete formal QA CLI | Exit 0, three candidate exports/full-body audits; native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Supplemental actual PDF verification | 16 text-bearing pages, 2,237 spans, three fields and six exact issue statements; 18 actual-source counterexamples rejected; `pdf-verification.json` |
| Visual source review | Those 16 pages and the scanned PH printing page; reproducible renders via `inspect_sources.py`, private review audit |
| Contract rejection checks | 35 passed, including five actual formal CLI failures with no accepted export; `counterexample-results.json` |
| Frozen scope and disjoint union | Old 658 native and 129 independent fields preserved; three new bodies have no overlap; `scope-verification.json` |
| `npm run -w data-tools typecheck` | Exit 0 |
| `npm run -w data-tools dice:qa:test` | Exit 0, 72 maintained synthetic rejection checks and readonly CLI tests |
| PDF extractor unittest discovery | Exit 0, all 17 tests with Python 3.13/PyMuPDF 1.28.2 and this worktree's explicit source path |
| Complete private reproduction | Twelve commands, all exit 0; argv/cwd/output/results in `reproduction-verification.json` |
| Scoped private/public diff and report-link checks | Passed |

Command records identify HEADs at execution time; the private commit above
contains the final evidence. Explicit current Python source paths avoid the
reused environment's old editable installation. Existing PDF ICC warnings did
not prevent text/span or visual verification; source PDFs were not repaired.
Remote `ci:portable` and independent PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274 evidence is unchanged. After main-gate
accepts the exact private revision, future consumption must union the three new
bodies with the prior set, yielding 132 independent fields. Target 4691 and other
historical-source gaps remain deferred; existing accepted content and fallback
are preserved.

Names, IDs, canonical English/mechanics, unselected fields and source authority
are unchanged. No operator DB, app-state, shared manifest, production writer,
deployment, activation or external source delivery was performed.
[#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121) owns later consumer
integration and gains no write authorization here.
