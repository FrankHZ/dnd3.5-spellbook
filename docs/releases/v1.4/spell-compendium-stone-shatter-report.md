# Stone Shatter Cross-Source Review Handoff

This source-free report addresses [#282](https://github.com/FrankHZ/dnd3.5-spellbook/issues/282)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). Target 4237
has one complete Chinese description and escaped HTML proposal, with the SC
original statement in its body and the PH comparison in a clearly unofficial
reader note. `close-range` remains a `conflict` with status `source-unresolved`.
No exception or printing-error ruling is made. Main-gate independently reviews
the translation and evidence; this task does not accept, merge or activate it.

## Revisions and Private Evidence

Public base: `dbb15f3b0b57b74850c8c81be2ed2afdfdec9d0e`.
Tool implementation: `8ff10862631fa5ea733603d6ef65b55761a5f7a7`.
Private base: `616df1d60a80f5706bc27aab50543bba7db20b20`.
Private local-only evidence commit: `82acae9380b41bece09efcd200f8464616e954b2`.
Only `dice-qa/books/86/issue-282/` was added in the private repository; no private
push occurred and all unrelated untracked files were preserved.

Start with that directory's `README.md` and `review.md`. They expose complete
current English/HTML/mechanics, old and proposed Chinese text/HTML, diff,
full-body audit, two real source statements with Chinese content positions,
fresh original-page spans and six exact predecessor records. Full flavor,
header, object/creature branches, weight restrictions, damage and saving throws
were reviewed across the original column/page boundaries. A definite creature
translation error and unattended-object wording were corrected from the source;
no historical-source block was deleted or accepted through a note.

Actual bounded reads include SC208–209, SC printing information and its entire
single-page errata; PH174–175's complete distance rules, its scanned printing
page and all three pages of the 2006-02-17 PHB errata. SC is the December 2005
first printing and PHB v3.5 is the July 2003 first printing. The scanned PH
printing page was checked visually without claiming extracted text spans.
All nine text-bearing pages and the scan were visually checked. Later printings
have not all been certified; the known distance conflict remains unanswered.

## Minimal Contract Extension and Checks

The actual proposal first reproduced the old same-source and complete-body
rejections against the public base. The maintained validator now permits only
explicit `comparisonSourceIds` bound in `sourcePages`; their conflict statements
must use `contentLocation: "note"` and match the issue's audited note text.
The conflict retains a primary-source body statement. Primary statements keep
the old implicit body location, so existing records need no migration.
Comparisons cannot be copied into the primary body or relabeled as omissions
or interpretations. Exact page/span binding, duplicate/ref-order rejection,
source-input freshness, pending-evidence gates and full text/note/HTML projection
remain enforced. Actual quotes are independently re-read using the existing PDF
verifier and explicit PDF source paths. A declaration alone proves neither
source identity nor a source ruling. Durable usage is documented in
[import-workflow](../../operations/import-workflow.md).

| Check | Actual result and private evidence |
| --- | --- |
| Prior contract failure | Both actual-proposal failures reproduced from the public base; `prior-contract-failure.json` |
| Patched-rules provenance | All 315 operations, unlisted fields/relationships/raw bytes and 56 unchanged tables passed; `joint-copy-verification.json` |
| Content provenance | Existing generation record and original rules/manifest fingerprints matched; `content-provenance.json` |
| Maintained formal QA CLI | Exit 0, one complete body/audit, native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Actual PDF re-verification | Nine pages, 1,398 spans, both source quotes verified; 15 real-source counterexamples rejected; `pdf-verification.json` |
| Actual contract/CLI failures | 21 cases rejected by both validator and formal CLI, with no accepted export; `counterexample-results.json` |
| Existing independent proposals | All 137 exact frozen rows passed against current readonly inputs; `prior-contract-verification.json` |
| Frozen scope and disjoint union | 658 native and 137 independent fields preserved, one new body with no overlap; `scope-verification.json` |
| Data-tools typecheck and dice QA tests | Exit 0; 104 maintained synthetic rejection checks and readonly CLI coverage |
| PDF extractor tests | All 18 passed with Python 3.13/PyMuPDF 1.28.2 and explicit current-worktree source |
| Complete reproduction | All 15 commands exited 0; exact argv/cwd/output/results in `reproduction-verification.json` |
| Scoped diffs and links | Passed |

Rules input was only the specified disposable copy containing the accepted
315-patch baseline, verified before use. Content was opened readonly. Existing
PDF ICC warnings did not prevent verification or visual review; no PDF was
repaired. Execution-time heads are recorded in the command reports; the private
evidence commit above contains the final handoff. Remote `ci:portable` and the
independent PDF tests remain the PR merge gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274/#276/#278/#280 is unchanged. Future
consumption after main-gate acceptance must union this one body with the prior
set, yielding 138 independent fields alongside 658 native fields. Names, IDs,
canonical English/mechanics, unselected fields, source authority, provenance,
fallback and import order are unchanged. The 4691 historical-source gap and
4204 name residual remain unchanged.

The current complete external-review entry remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`: 33 unanswered questions
and one official resolution. Chinese proposal acceptance does not reduce the
unanswered count. Repair history and internal QA remain in the private audit;
reader notes describe only rule evidence, impact, unanswered questions and
version limits. No PHB/MinerU/SRD queue, other-book full QA, operator DB write,
app-state change, shared manifest update, production writer, deployment,
activation or external source delivery occurred.
