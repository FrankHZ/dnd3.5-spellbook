# Word of Binding and Spider Shapes Review Handoff

This source-free report addresses [#284](https://github.com/FrankHZ/dnd3.5-spellbook/issues/284)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263). Targets 4785
and 4215 have complete Chinese description and escaped HTML proposals. Each
keeps the SC original in its body and binds PH comparisons separately in an
explicitly unofficial reader note. Both original source conflicts remain
`source-unresolved`; translation validation does not adjudicate their rules.
Main-gate must independently review this handoff before accepting or merging it.

## Revisions and Evidence

Public base and validation code:
`e5919843428cfc253ecff1985ce2752ab09eca8e`.
Private accepted base: `29796e7e0166ad2d8be7a00f39c4a97415f0fa5f`.
Final helper/proposal source revision:
`91fd0599784c3a841bccfd72e0830f07dbdc2c8c`.
Private local-only evidence head: `5c32522938888eb053cc5fa8a0dd8e4804bccdfe`.

Only `dice-qa/books/86/issue-284/` was added in the private repository. Start
with its `README.md` and `review.md`, which expose complete current English,
HTML and mechanics, old and proposed Chinese text/HTML, diffs, full-body audits,
original SC entries, actual PH inheritance, and 13 precise predecessor records.
Current inputs and source-page evidence were generated independently for this
slice. Earlier conclusions serve as exact predecessor references, not fresh
verification. No private push occurred; unrelated untracked files were preserved.

The public change is this report alone. It reuses the accepted
`comparisonSourceIds` / `contentLocation` contract and the actual physical PDF
alias guard from #282/#283 without extending contracts or adding infrastructure.
The PR records the final public commit; execution reports record the exact code
and private source heads used for each command.

## Complete Semantic Review

Word of Binding was read completely in SC242's right column: header, flavor,
target size/type, formation and saving throw, escape checks, manacle properties,
automatic fitting, action/movement limits and lock. The proposal corrects the
material and the flavor action from the original and preserves the explicit SC
Close category/formula. The ordinary PH175 definition appears only in the
comparison note. The unusual formula is not declared an exception or an error;
canonical English and mechanics remain unchanged.

Spider Shapes was read from its SC201 middle-column title through its
right-column final sentence. The complete proposal restores the omitted flavor
and dismissible-duration marker, and preserves voluntary targets, their mutual
spacing, the maximum quantity, caster-chosen size range, common size, poisonous
bite, expiration, caster dismissal for all subjects, and an individual's
full-round return ending only that creature's spell. Neighboring spells'
statistics and rules are not incorporated.

The original PH283 reference and the comparison with Polymorph are retained.
Its reader note separately identifies the actual PH263 locator and the poison
rule difference. Correcting a locator does not resolve that comparison. Actual
PH283 headings, complete PH263 Polymorph and complete PH197 Alter Self were
read; the inheritance sentence, inherited restriction and poison paragraph are
separately bound to real spans. No alternate edition is guessed, and PH rules
are not inserted into the SC body. MM288 remains a named reference, without
invented spider statistics or a whole-MM QA requirement. No expanded historical
rule block lacking its applicable source was found in either complete body.

Both publications' actual printing pages were inspected: SC December 2005
first printing and PHB v3.5 July 2003 first printing. PH's scanned printing page
was checked visually without fabricated extracted spans. The entire single-page
SC errata and all three pages of the 2006-02-17 PHB errata were read. PHB
Polymorph substring matches belong to Baleful Polymorph, Polymorph Any Object
and their text/list; corrections for another spell on the same page do not
apply to Polymorph. Class-feature and Animal Shapes inheritance corrections
also do not amend standalone Polymorph or Alter Self. These files supply no
dedicated resolution of the two conflicts. All later printings have not been
certified.

Reader notes contain rule evidence, impact, unanswered questions and version
limits. Search details, internal fields and repair history stay in the private
audit.

## Validation

| Check | Result and private evidence |
| --- | --- |
| Specified patched-rules baseline | All 315 operations, unlisted columns/raw bytes, relationships and 56 unchanged tables verified; `joint-copy-verification.json` |
| Existing content provenance | Generation metadata and original rules/manifest fingerprints matched; `content-provenance.json` |
| Fresh current inputs and predecessors | Two complete readonly inputs and 13 exact frozen records; `current-inputs.json`, `prior-bindings.json` |
| Maintained formal QA CLI | Two full-body audits and two retained conflicts passed; native accepted/fallback byte-identical; `formal-verification.json`, `formal-check/` |
| Actual source PDFs | 12 pages, 2,409 spans and all source quotes reverified; 30 actual-proposal evidence counterexamples rejected; `pdf-verification.json` |
| Visual original-page review | 12 text pages and one scanned printing page rendered with Poppler and inspected; `render-verification.json`; images remain local |
| Direct validator and formal CLI failures | 42 cases rejected by both paths, with no accepted export; `counterexample-results.json` |
| Existing independent outputs | All 138 exact frozen fields validate against actual current readonly inputs; `prior-contract-verification.json` |
| Frozen scope and disjoint union | 658 native plus 138 independent fields preserved; two new bodies have no overlap; future independent union is 140; `scope-verification.json` |
| Data-tools checks | Typecheck and dice QA passed, including 104 maintained synthetic rejection checks and readonly CLI coverage |
| PDF extractor and alias compatibility | All 18 tests passed; the existing dual-layer physical-alias reproducer rejected aliases and retained its distinct-PDF control |
| Complete committed-source reproduction | All 17 commands passed against the helper/proposal revision above; `reproduction-run-02.json` records argv/cwd/heads/output/exit codes |
| Scoped diffs and links | Passed |

The initial `reproduction-run-01.json` is preserved. Its helper source snapshot
is `9f943d28fb05d905bbc1c845f3236e4ad493c592`; it predates the final reader-note
and inherited-rule bindings. It is not presented as validation of that final
revision. Run 02 uses the committed final helper/proposal source; neither run
overwrites an earlier audit. Existing PDF ICC warnings did not block extraction,
rendering or verification, and no original PDF was repaired.

Rules were read only from the specified disposable accepted 315-patch copy,
verified before use. Operator content was opened readonly. Remote `ci:portable`
and the configured PDF tests remain the PR merge gate; local targeted checks
do not replace that gate.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274/#276/#278/#280/#282 is unchanged.
Future consumption after main-gate acceptance must union these two bodies with
the old independent set. Names, IDs, canonical English/mechanics, other fields,
accepted source authority, provenance, fallback and import order are preserved.
The 4691 BoED source gap remains deferred and the 4204 name residual remains.

The complete review entry remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`: 33 unanswered questions
and one official resolution. The two Chinese proposals do not reduce that count.
No operator DB, app-state, shared manifest, production writer, deployment,
activation or external source delivery was written. PHB/MinerU/SRD queues and
other-book full QA remain suspended or outside this slice.
