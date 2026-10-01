# Spell Compendium Inheritance Handoff

This source-free report addresses [#278](https://github.com/FrankHZ/dnd3.5-spellbook/issues/278)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). It proposes
three complete Chinese descriptions and escaped HTML with explicit unofficial
interpretation notes. All three source questions remain unresolved. The task
does not accept its own proposals, decide the rules, merge or activate content.

## Revisions and Private Review

Public base: `96caf88d34a636ca393710017ebc6e6d61aa7173`.
Private local-only base: `ab61f604534ce06c80adabd41110f11680099936`.
Private evidence commit: `57f5afea0fdacd192e6de9161f03dd8c78322c1f`.
Only `dice-qa/books/86/issue-278/` was added to the private repository. It was
not pushed, and unrelated untracked files were preserved.

Start private review at `dice-qa/books/86/issue-278/README.md` and `review.md`.
Complete current English/HTML/mechanics, old Chinese text/HTML, proposed text,
escaped HTML, diffs, full-body audits, fresh source pages/spans, exact frozen
predecessor records and actual command results are retained there. Source text
and translations remain private. The complete source-question checklist remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`; Chinese acceptance
does not reduce its 33 unanswered questions.

| Target | Chinese candidate | Source question |
| --- | --- | --- |
| 3906 | `accepted-with-source-issues` | `beard-tail`, `interpretation`, `source-unresolved` |
| 4209 | `accepted-with-source-issues` | `sequence-inheritance`, `interpretation`, `source-unresolved` |
| 4394 | `accepted-with-source-issues` | `dispel-order`, `interpretation`, `source-unresolved` |

Every complete entry was reviewed through its header, any flavor, all rules,
components and necessary inheritance. Target 3906 retains the Lesser reference
and all higher-form exceptions; its additional attack and disease-inheritance
question remains explicit. Creature appearance does not grant a complete monster
stat block or silently cancel an inherited ability. Target 4209 preserves the
actual inheritance target, capacity, insertion window, damage, trigger recipient,
conditions and focus. The ordinary version is comparison evidence, with no
unsupported sequence construction added. Target 4394 preserves its own dispel
cap, eligibility, exclusions, stopping condition, summons, area/effect handling,
resolution order and choice concerning self-cast spells. Its ordering parameter
remains unqualified, with the interpretation question in the reader note.

Definite translation errors were repaired from the actual pages, including
references, the condition-setting time and the distinction between triggering
stored spells and casting their container, and effect resolution. Necessary
inherited headers agree with the unchanged canonical mechanics. Repair details
remain in the private audits; reader notes contain source statements, possible
coordinated readings, impact, unanswered questions and edition/errata limits.
No unknown historical rule block was removed or accepted through a note. No new
historical-source deferral was needed for these three bodies; existing gaps
remain deferred.

## Evidence and Checks

The existing source-bound reviews, retained interpretations, full input/HTML
freshness, full-body audits, source-page bindings and formal QA are reused without
public tool or schema changes. Missing or stale evidence continues to fail.
Durable operation boundaries remain in
[import-workflow](../../operations/import-workflow.md).

The actual source reads cover complete SC122 higher/Lesser entries, all three
SC199 Matrix entries, SC67, SC printing information and its full local errata.
Necessary inherited rules are the complete PH98 feat and PH223 spell, with the
complete local 2006-02-17 three-page PHB errata. The printed PH correction and
the already-corrected local page are distinguished; that correction does not
settle the SC ordering question. Named references do not imply whole-book QA.

SC is the December 2005 first printing. PH v3.5 July 2003 printing information
was visually confirmed from its scanned title page, without claiming extracted
text verification for that scan. All ten text-bearing evidence pages and that
scan were visually checked. Later printings have not all been certified, and
these bounded reads do not resume PHB/MinerU/SRD queues.

| Check | Actual result and private evidence |
| --- | --- |
| Readonly patched-rules provenance | All 315 accepted operations, unlisted fields/relationships/raw bytes and 56 unchanged tables passed; `joint-copy-verification.json` |
| Full inputs and frozen predecessors | Three complete input bindings and 19 exact predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Complete maintained formal QA CLI | Exit 0, three exports/full-body audits, native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Actual PDF re-verification | Ten pages, 1,671 spans, three fields, six exact issue statements; 18 real-source counterexamples rejected; `pdf-verification.json` |
| Visual full-context review | All evidence pages and scanned PH printing page; `review.md`, reproducible `inspect_sources.py` |
| Contract rejection checks | 35 passed, including five actual formal CLI failures with no accepted export; `counterexample-results.json` |
| Frozen scope and disjoint union | Old 658 native and 132 independent fields preserved, three new bodies with zero overlap; `scope-verification.json` |
| Data-tools typecheck | Exit 0 |
| `dice:qa:test` | Exit 0, 72 maintained synthetic rejection checks and readonly CLI tests |
| PDF extractor tests | All 17 passed with Python 3.13/PyMuPDF 1.28.2 and explicit current-worktree source |
| Complete reproduction | Twelve commands, all exit 0; argv/cwd/output/results in `reproduction-verification.json` |
| Scoped diffs and report links | Passed |

The rules input is the specified disposable copy containing all 315 accepted
#259 patches. Its provenance is verified before use; an unpatched operator
baseline is not substituted. Content inputs are read only. Command records
identify execution-time HEADs; the evidence commit above contains the final
private handoff. Existing PDF ICC warnings did not prevent text/span or visual
checks, and no source PDF was repaired. Remote `ci:portable` and independent
PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274/#276 is unchanged. After independent
main-gate acceptance, future consumption must union these three bodies with the
old set, yielding 135 independent fields alongside 658 native fields. All prior
accepted content and fallback remain preserved. Target 4691 and other historical
source gaps remain deferred.

Names, IDs, canonical English/mechanics, unselected fields, source authority,
provenance and import order are unchanged. No operator DB, app-state, shared
manifest, production writer, deployment, activation or external source delivery
was performed. [#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns later consumer integration and gains no write authorization here.
