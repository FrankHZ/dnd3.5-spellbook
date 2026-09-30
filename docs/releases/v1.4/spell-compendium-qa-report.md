# Spell Compendium source QA

This report records the source review and guarded correction proposal for
[issue 259](https://github.com/FrankHZ/dnd3.5-spellbook/issues/259) and
[PR 260](https://github.com/FrankHZ/dnd3.5-spellbook/pull/260). Main-gate owns
independent review and acceptance. Production activation is a separate workflow.
Source paragraphs, Chinese proposals, exact PDF spans and decisions remain in
the nested private data repository.

## Source review

The reviewed universe is 1,001 original Spell Compendium entries, using the
2005 printing and the complete official errata. Each entry has separate English
plain text/HTML, mechanics and relationships, Chinese name, and effective Chinese
body dispositions. Necessary Player's Handbook references were read narrowly;
the suspended PHB extraction and translation queues were not resumed.

Fresh original extraction verified 311 pages and 48,094 exact spans, including
text, font, geometry, origin, flags and extractor settings. Complete frozen
English/mechanics/HTML and current Chinese input bindings passed for all entries.
The resulting review dispositions are proposals:

| Consumer | Source-correct | Corrected | Unresolved | English fallback |
| --- | ---: | ---: | ---: | ---: |
| English text/HTML | 775 | 210 | 16 | 0 |
| Mechanics/relationships | 841 | 124 | 36 | 0 |
| Chinese name | 954 | 31 | 13 | 3 |
| Chinese body | 271 | 611 | 116 | 3 |

An unresolved entry can retain a definite local correction while preserving its
unresolved dependency or printed conflict. These counts do not authorize writes.

The database has 1,002 SC targets. Extra target 4837 is absent from the original
entry universe and retains its entire English, mechanics, relationships and
fallback. Thirteen unmapped candidate occurrences retain null identities rather
than guessed mappings. Three entries with no effective Chinese retain English
fallback; reviewed absence is not a Chinese quality pass.

Observed foreign links do not establish foreign-source acceptance. The only
authorized cross-book change is the local English text/HTML link in target 3817,
from Miniatures target 1982 to the SC base spell 3804. Target 1982 remains intact.
Untraced extra list memberships, contradictory printed rules and displayed
historical rules without their original authority retain concrete unresolved
dispositions and fallback. An accurate named reference that adds no external
numerical rule does not require whole-book external certification.

## Fresh native field QA

The maintained formal QA ran against the actual corrected disposable rules DB,
without `--check-incomplete`, and returned `validated-proposal` with zero pending
fields. All 724 owned candidate occurrences have fresh, field-specific decisions:

| Field | Accepted proposal | Rejected | Deferred | Excluded |
| --- | ---: | ---: | ---: | ---: |
| Name | 6 | 8 | 5 | 705 |
| Body | 652 | 0 | 59 | 13 |

The native unchanged-name guard remains intact. Excluded fields are not Chinese
quality passes. The 658 accepted fields cover 653 targets and have 614 correction
records; acceptance and correction counts therefore describe different things.
Independent full-body bindings, actual English/mechanics/HTML, current Chinese,
original locators and specific rule pairs were verified for all 652 bodies.
Changed-input cases have explicit committed-prior/latest evidence; old frozen
records remain. Ten previously proposed complete bodies now retain specific historical
source deferrals rather than claiming SC also proves their earlier versions.

Actual accepted/fallback exports match the individual decisions across all 2,004
DB fields: 1,326 retain existing Chinese and 20 retain English fallback. The extra
4837 record retains both fallback fields. Complete-body source conflicts and
specific expanded or historical rules remain deferred; bare named references
were reread against their actual impact.

The separate source-bound fallback channel individually reviewed 140 fields,
including complete old/new Chinese HTML, actual current English/HTML/mechanics
and original source evidence. Its maintained CLI returned `validated-proposal`
and exported 115 fields: 31 independent names and 84 complete bodies. Twenty-five
complete bodies retain specific historical source deferrals. Complete body revisions
have explicit frozen-prior/latest proof; frozen task inputs were not replaced.
Names 4153, 4464, 4496 and 4756 no longer inherit unrelated body blockers.

This channel preserves null source keys, exact target/field identities, current
before values and the native unchanged-name guard. It rejects duplicate fields,
native accepted overlap, stale full inputs and incomplete body/HTML audits.
Native accepted/fallback exports remain intact; main-gate accepts the exact
private revision and independent export before a later writer may consume it.
The verified combined handoff projects 773 accepted proposal fields and 1,231
retained fallback fields across all 2,004 DB fields; this projection performs no
write or activation.
A zero blocker count alone never supplies semantic acceptance. Of the 176
recorded standalone proposals, 61 remain outside the independent accepted export,
including the 25 historical deferrals and other concretely blocked fields.

The 736 accepted body proposals were screened across both outlets for area-type
and modifier/check discrepancies. Original-source checks covered 123 area
headers or clauses and 37 modifier-related paragraphs. Supplemental English
reverse screening of 554 lexical exclusions identified four candidates; original
paragraph checks found one omitted caster-level bonus cap in target 4396.
Nineteen complete bodies have explicit repairs: twelve native and seven
independent. Area repairs preserve the printed field, type, center, radius and
per-level scale; modifier repairs preserve attack rolls, the source's melee
limitation and the caster-level bonus cap within a dispel check. Every changed complete
body has renewed original-entry, actual English/mechanics/paired HTML, old CHM
HTML and complete new text/HTML review. Changed-clause verification read 27 bound
original pages and checked 20 quotes with ligature, whitespace and line-break
hyphen normalization alongside exact original spans. Unchanged category checks
do not claim fresh whole-body acceptance.

The private adapter first validates old canonical records and accepted exports
directly against their committed revision. It then validates the latest complete
bodies against actual read-only consumers and verifies both regenerated channels.
Unlisted accepted fields and every original fallback remain exact. Thirty
synthetic negative cases cover stale or jointly altered snapshots, ownership,
full input/HTML, field identity, exports and active override boundaries.

The maintained supplemental PDF verifier passed 312 original pages, 48,105 exact
spans and all 722 accepted/deferred field bindings. Rejected/excluded identity and
name decisions retain separate evidence; they are not counted as supplemental
accepted/deferred coverage. Formal validation is a proposal gate, not main-gate
acceptance or activation.

## Guarded correction and consumer proof

The final proposal contains 315 `updateSpell` operations. The maintained CLI
validates exact old values, complete descriptor sets and absent class memberships
before and inside the transaction. It preserves paired plain text/HTML and all
unlisted fields, rolls back failures and rebuilds the derived class index.

On a disposable copy, comparison of all 60 rules tables passed: 56 tables are
identical, all 5,097 spell identities remain, and only listed spell fields,
descriptors, class levels and their derived index change. Descriptor rows become
2,390; class levels and the derived index both become 13,795. Repeated application
is refused with 315 exact-old-condition errors.

The actual maintained whole-corpus normalizer produced and verified an audit-only
artifact for all 5,097 spells. It preserved unlisted normalized rows and source
projections; target 4681 has the corrected Cleric 4 / Paladin 3 memberships and
matching index. The actual importer refused the audit-only artifact before any
schema or content write. No full content import or API/browser activation was run.

The proof records implementation revision
`56004f74696a7fcc63babe60f37827ba1fb96db5` and its actual input provenance.
The unchanged shared manifest describes the operator database, not the disposable
corrected copy. Existing artifact provenance fingerprints that manifest but does
not check its internal database fingerprint against the input DB. Full activation
must use a separately maintained matching manifest and normal provenance guards.
Raw mechanic fallback remains where existing normalization cannot structure a
source string completely.

## Validation and handoff

Targeted validation passed 19 portable harness cases, five artifact cases,
32 source-bound contract cases, actual readonly CLI/stale-input/output-boundary
cases, data-tools typechecking and diff checks. Null-clear updates without their
required old condition now produce the expected diagnostic instead of a TypeError.
Private checks also reject changed allocation, source scope, consumer inputs,
historical disposition and prior/latest proof boundaries. The final public PR
records remote `ci:portable`, which remains the merge gate.

Private reproduction inputs live under
`data/dice-qa/books/86/issue-259/`, including complete-entry records, exact source
verification, fresh field QA and the consumer reproduction recipe. The pending
final patch incorporates the earlier starting-error patch; they must not both
be applied as an activation sequence.

The exact private evidence and pending patches are committed locally as
`7777cb7016ecb115acc7426c25759528593215f9` and were not pushed. Native and independent formal QA
record the actual tooling revision `8c94ebd636e4cf6cf23bc56f764a82354d56a6b8`.
Generated reports
retain their actual earlier runtime revisions and dirty flags; this bundle commit
does not relabel that provenance. Reproducible image caches, logs and an unused
PHB page extraction are excluded from the commit.

[Issue 263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263) owns the bounded
remaining semantic source disputes, historical rules and identity dispositions.
Its inventory is the exact private per-consumer summary, native historical proofs
and independent deferred-field records; main-gate owns scope and acceptance.
Creating that follow-up does not declare issue 259 accepted.

[Issue 121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121) owns the future
selective Chinese writer, transaction/order/replay validation and API/web/search
activation. The existing CHM importer deletes all Chinese spell text before its
import, so selective activation must prove CHM-before-selective ordering and
preserve current fallback. Operator rules/content databases, app-state, source
authority, the shared manifest and prior book QA remain unchanged.
