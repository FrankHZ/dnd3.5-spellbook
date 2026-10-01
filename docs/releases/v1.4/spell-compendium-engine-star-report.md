# Spell Engine and Holy Star Handoff

This source-free report addresses [#280](https://github.com/FrankHZ/dnd3.5-spellbook/issues/280)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). It proposes
two complete Chinese descriptions and escaped HTML. Their source dispositions
remain distinct: one missing explanation is unresolved; the other inherited
question has an applicable official correction. Main-gate must independently
accept the Chinese proposals. This task does not merge or activate content.

## Revisions and Private Review

Public base: `8431f788744b8863b1efe11a83bd06c96105e4ae`.
Private local-only base: `57f5afea0fdacd192e6de9161f03dd8c78322c1f`.
Private evidence commit: `616df1d60a80f5706bc27aab50543bba7db20b20`.
Only `dice-qa/books/86/issue-280/` was added to the private repository. It was
not pushed; unrelated untracked files were preserved.

Start private review at that directory's `README.md` and `review.md`. Complete
current English/HTML/mechanics, old and proposed Chinese text/HTML, diffs,
full-body audits, fresh original PDF pages/spans, exact frozen predecessor
records and actual check results are retained there. Public files contain no
source text or translations. The complete source-question checklist remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`, with 33 unanswered
questions and one official resolution. Chinese acceptance does not resolve the
remaining questions.

| Target | Chinese candidate | Source disposition |
| --- | --- | --- |
| 4204 | `accepted-with-source-issues` | `undefined-engine`, `missing-explanation`, `source-unresolved` |
| 4709 | `accepted` | Prior `touch-spell-turning` remains `official-errata-resolved`; no new actual unresolved evidence |

Target 4204 preserves its complete header, flavor, preparation replacement
conditions, empty-slot restriction, preparation benefit and costs. Definite
translation errors are corrected from the actual page, including a header line
from an adjacent entry whose provenance is directly visible on that page. The
duration and resistance references and preparation benefit remain present.
No missing duration, resistance recipient/timing or illumination parameter is
invented. Its reader note explains the statements, evidence, practical effect
and unanswered conditions. The existing name residual remains frozen and outside
this description-only proposal.

Target 4709 preserves the complete header, flavor, illumination, three functions,
action and turn restriction, capacity depletion, protection, fire attack and
limits. Its own capacity and other SC terms are not replaced by the inherited
PH baseline. Complete inherited rules, partial resolution and the original
resonance table were reviewed visually. The actual uncorrected local page and
the applicable official correction are recorded separately. The correction
settles the old example problem while preserving the exclusion it illustrates.
The old negative search conclusion is not reused. No new actual source blocker
was found, so this body uses the existing ordinary candidate path without
`retainedSourceIssues` or a fabricated unanswered question. Its reader explanation
distinguishes official correction, inherited scope and version limits.

Repair history and internal QA details stay in the private audit. No unknown
historical block was removed or accepted through a note. No new historical-source
deferral was required; existing historical gaps remain deferred.

## Evidence and Checks

The existing source-bound review, retained missing-explanation, full input/HTML
freshness, full-body audit and formal QA mechanisms are reused without public
tool or schema changes. Durable operation boundaries remain in
[import-workflow](../../operations/import-workflow.md).

Actual bounded reads cover complete SC198 and SC115 entries, SC printing
information and the full single-page SC errata; necessary inherited PH282–283
text and table; and the full 2006-02-17 three-page PHB errata. SC is the December
2005 first printing. PHB v3.5 July 2003 printing information was visually confirmed
from its scanned title page without claiming extracted text verification for
that scan. All nine text-bearing evidence pages and the scan were visually
checked. Later printings have not all been certified. These reads do not resume
PHB/MinerU/SRD queues or establish whole-book acceptance.

| Check | Actual result and private evidence |
| --- | --- |
| Readonly patched-rules provenance | All 315 accepted operations, unlisted fields/relationships/raw bytes and 56 unchanged tables passed; `joint-copy-verification.json` |
| Complete inputs and exact predecessors | Two full input bindings and 15 frozen records; `current-inputs.json`, `prior-bindings.json` |
| Complete maintained formal QA CLI | Exit 0, two exports/full-body audits with distinct statuses; native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Actual PDF re-verification | Nine pages, 1,638 spans, two fields, three exact missing-explanation statements; ten real-source counterexamples rejected; `pdf-verification.json` |
| Visual full-context review | Complete entry columns, inherited table, printing and full errata; `review.md`, reproducible `inspect_sources.py` |
| Contract rejection checks | 17 passed, including five actual formal CLI failures with no accepted export; `counterexample-results.json` |
| Frozen scope and disjoint union | Old 658 native and 135 independent fields preserved; two new bodies with zero overlap; `scope-verification.json` |
| Data-tools typecheck | Exit 0 |
| `dice:qa:test` | Exit 0, 72 maintained synthetic rejection checks and readonly CLI tests |
| PDF extractor tests | All 17 passed with Python 3.13/PyMuPDF 1.28.2 and explicit current-worktree source |
| Complete reproduction | Twelve commands, all exit 0; argv/cwd/output/results in `reproduction-verification.json` |
| Scoped diffs and report links | Passed |

Rules input is the specified disposable copy containing all 315 accepted #259
patches. Its provenance was verified before use; no unpatched baseline was
substituted. Content inputs are readonly. Command records identify execution-time
HEADs; the evidence commit above contains the final private handoff. Existing PDF
ICC warnings did not prevent text/span or visual checks, and no PDF was repaired.
Remote `ci:portable` and the independent PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274/#276/#278 is unchanged. After independent
main-gate acceptance, future consumption must union these two bodies with the
old set, yielding 137 independent fields alongside 658 native fields. All prior
accepted content and fallback remain preserved. Target 4691 and other historical
source gaps remain deferred. Target 4204's name residual is not corrected here.

Names, IDs, canonical English/mechanics, unselected fields, source authority,
provenance and import order are unchanged. No operator DB, app-state, shared
manifest, production writer, deployment, activation or external source delivery
was performed. [#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns later consumer integration and gains no write authorization here.
