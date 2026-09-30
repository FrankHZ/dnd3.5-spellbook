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
| English text/HTML | 770 | 207 | 24 | 0 |
| Mechanics/relationships | 838 | 123 | 40 | 0 |
| Chinese name | 954 | 31 | 13 | 3 |
| Chinese body | 275 | 630 | 93 | 3 |

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
Untraced extra list memberships, contradictory printed rules and unavailable
external references retain concrete unresolved dispositions and fallback.

## Fresh native field QA

The maintained formal QA ran against the actual corrected disposable rules DB,
without `--check-incomplete`, and returned `validated-proposal` with zero pending
fields. All 724 owned candidate occurrences have fresh, field-specific decisions:

| Field | Accepted proposal | Rejected | Deferred | Excluded |
| --- | ---: | ---: | ---: | ---: |
| Name | 6 | 8 | 5 | 705 |
| Body | 650 | 0 | 61 | 13 |

The native unchanged-name guard remains intact. Excluded fields are not Chinese
quality passes. The 656 accepted fields cover 651 targets and have 612 correction
records; acceptance and correction counts therefore describe different things.
Independent full-body bindings, actual English/mechanics/HTML, current Chinese,
original locators and specific rule pairs were verified for all 650 bodies.
Five changed-input cases have explicit latest evidence; old frozen records remain.

Actual accepted/fallback exports match the individual decisions across all 2,004
DB fields: 1,328 retain existing Chinese and 20 retain English fallback. The extra
4837 record retains both fallback fields. Nine newly identified unavailable
template, disease, terrain, weather, plane or historical-comparison dependencies
remain body-deferred. Another 174 standalone fallback correction proposals remain
unaccepted, including independently verified local edits within unresolved bodies.

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
data-tools typechecking and diff checks. Remote `ci:portable` passed for the
implementation revision. Independent review of the actual six-file tooling diff
found no concrete defect; this does not substitute for main-gate review.

Private reproduction inputs live under
`data/dice-qa/books/86/issue-259/`, including complete-entry records, exact source
verification, fresh field QA and the consumer reproduction recipe. The pending
final patch incorporates the earlier starting-error patch; they must not both
be applied as an activation sequence.

The exact private evidence and pending patches are committed locally as
`50525b06bd05594860659f7343881734c6b0736e` and were not pushed. Generated reports
retain their actual earlier runtime revisions and dirty flags; this bundle commit
does not relabel that provenance. Reproducible image caches, logs and an unused
PHB page extraction are excluded from the commit.

[Issue 121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121) owns the future
selective Chinese writer, transaction/order/replay validation and API/web/search
activation. The existing CHM importer deletes all Chinese spell text before its
import, so selective activation must prove CHM-before-selective ordering and
preserve current fallback. Operator rules/content databases, app-state, source
authority, the shared manifest and prior book QA remain unchanged.
