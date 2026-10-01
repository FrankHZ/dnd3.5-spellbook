# Spell Compendium Six-Batch Evidence Handoff

Issue [#313](https://github.com/FrankHZ/dnd3.5-spellbook/issues/313), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
This source-free report describes independent coverage reconciliation and concrete
source requests from six accepted complete-entry reviews. It accepts no new field,
repeats no entry QA and makes no source ruling or activation decision.

Public dispatch and execution base: `b3a80865175d68de48342c8eba1a81bee1c48683`.
Private accepted base: `64bfb81abd8f32eeb6f2cc889c265b8bf01f7044`.
Private delivery: `da691dacd3973d38a9d0f66a08d78fdb1eaafd47`, local only, under
`data/dice-qa/books/86/issue-313/`. No private data was pushed.

## Recomputed field and target coverage

The private helper reads frozen Git records and compares their working bytes,
joins #292's accepted union with each of the six exact increments, and checks
record equality against #311. It derives the universe from all current targets
and both fields, checks native acceptance against original formal fallback,
and computes the independent selections and complete complement as sets.
The resulting counts are measurements, not constants used to manufacture a pass.

| Partition | Fields |
| --- | ---: |
| Native accepted | 658 |
| Independent accepted | 221 |
| Unique accepted union | 879 |
| Accepted bodies / names | 838 / 41 |
| Original formal native fallback | 1,346 |
| Current union complement | 1,125 |
| Complement bodies / names | 164 / 961 |
| Universe | 2,004 |

Native `descriptionHtml` and independent `descriptionText` correspond for key
comparison only. Both original formats and all accepted values remain unchanged;
retained names/bodies, unchanged text and old semantic status labels are not exports.

| Frozen batch | Complete targets | Specific body gaps |
| --- | ---: | ---: |
| [#294 / batch 01](./spell-compendium-batch-01-report.md) | 40 | 16 |
| [#303 / batch 02](./spell-compendium-batch-02-report.md) | 40 | 20 |
| [#305 / batch 03](./spell-compendium-batch-03-report.md) | 44 | 18 |
| [#307 / batch 04](./spell-compendium-batch-04-report.md) | 40 | 27 |
| [#309 / batch 05](./spell-compendium-batch-05-report.md) | 37 | 37 |
| [#311 / batch 06](./spell-compendium-batch-06-report.md) | 37 | 31 |
| Unique coverage | 238 | 149 |

Every batch binds the same complete current English/mechanics, English HTML and
Chinese text/HTML snapshot. Target coverage has no duplicates or missing body
fallbacks: every current body complement has a complete batch disposition except
the separately frozen identity anomaly. The 164-body complement partitions exactly
into 149 specific source gaps, five verified-retained bodies outside accepted
exports, nine absent-Chinese English fallbacks and identity anomaly 4837.
One earlier retained batch body is already in the accepted union; it is not a
sixth retained fallback. Review completion does not turn source gaps into passes.

The 961-name complement measures export coverage. Within the six batches, 221
retained names and nine English fallback names remain in that complement; eight
other reviewed names already have accepted bindings. The other 731 complement
names are outside these six complete-entry reviews. This does not claim all 961
names were manually reviewed, or that fallback names are errors. No name QA was
started.

## Concrete private source requests

The private `source-gap-needs.json` and readable counterpart contain one record
for each of the 149 targets. Each record points to its exact frozen disposition
revision/path/line and complete current fields, candidate and preserved historical
text. It retains original joint consumer obligations, frozen residuals, native
decisions, scoped main-gate decisions and supplemental obligations. Complete
corpus fields stay in the original batches; this handoff supplies navigation.

`source-groups.json` groups 164 request dependencies for those 149 targets by the
recorded publication label, target and actual consumers. Multiple books or an
additional unknown claim may belong to one target; dependency counts are never
reported as spell counts. Historical book labels do not authenticate editions or
printings. Unknown publication, edition, printing, printed locator and PDF index
are explicit. Known SC/PH pages remain separate from requested external locators.
No abbreviation, character class or compiled edition is used to guess a source.

Each request carries the full frozen pending claim and minimum context: complete
entry/header, historical variant or mixed paragraphs, necessary inherited rules,
table/footnotes, applicable printing and errata. It preserves the old English,
mechanics and Chinese consumers as well as newly identified body obligations.
Literal references remain within their accepted boundary; they do not create
whole-book or unexpanded statblock prerequisites. Historical annotations cannot
be dropped to manufacture full-body acceptance, and prior native deferrals cannot
be bypassed through an independent export.

The configured local PDF inventory contains only SC, PHB and their errata. It was
enumerated read only; no PDF was opened, extracted, downloaded or OCRed. Requested
external books are absent from that inventory. The private request suggestions
offer four limited representative packages: two MM functional dependencies,
specific Complete Divine historical claims, and Complete Arcane mixed historical
paragraphs. A separate unidentified-source example tests locator/decision needs.
These are bounded design inputs for [#201](https://github.com/FrankHZ/dnd3.5-spellbook/issues/201),
with potential complete-body effects, not an extraction queue or an unlock promise.
Unknown historical versions, unavailable books and independent rule/identity
decisions remain real blockers. New collection requires its own authorization.

## Separate questions and identity handoffs

The complete official problem authority remains #270's original checklist and
34 dispositions, navigated through the [#288 handoff](./spell-compendium-accepted-handoff-report.md).
All problem IDs occur once in the new private question navigation. Recomputed
current mapping is 28 unanswered questions across 27 accepted complete bodies
with retained source notes, and five unanswered questions across four source-gap
bodies. The change from #288 follows the later accepted #292 consumer disposition;
this handoff does not make a new ruling. All 33 questions remain unanswered.
4709's official resolution and accepted body remain separate.

The nine absent-Chinese targets and 4837 identity anomaly remain separate inputs
for [#197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197).
Incorrectly attached and mixed historical text stays with its frozen identity;
no body is moved into a neighboring absent-Chinese target and no entity is added.

## Validation and activation boundary

Original root/package executing helper source:
`558924188ca7733e28aea44796bdb84fdd51526f`.
Private `reproduction-run-01.json` and `reproduction-run-02.json` record root and
package invocations, actual outer/nested argv/cwd, public/private execution heads,
committed-source comparisons, output and exit codes. Both runs pass five commands:

- Maintained 315-patch dry-run on a disposable rules copy and reused exact
  all-table verification, preserving 56 unchanged tables, unlisted columns,
  relationships, invalid bytes and 4837. Both generated copies were removed.
- Actual readonly rules/content provenance and full current inputs, restored
  formal CLI's unchanged 658-native/145-independent contract, and separate
  maintained-API validation of all 221 current independent fields. Native
  acceptance/original fallback and complete current snapshots match exactly.
- Full static handoff rederivation against frozen Git records: exact union,
  complement, six-batch coverage, body partition, questions/retained notes,
  old consumers and source-request joins. Old evidence outside #313 is unchanged.
- Maintained `dice:qa:test`, including 104 source-bound rejection checks;
  the reused actual-input verifier also passes six rejection cases.

The bounded source-group correction uses helper revision
`6ac87adec980a53a60f24fd206c59b57ab2ae69a`.
`source-revalidation-01.json` records the actual aggregate commands and committed
helper bindings. All 149 frozen pending publication labels were checked; the
omitted Libris Mortis label for 3978 is restored without authenticating a printing
or locator. The other 148 requests, coverage, question mapping and inventory are
unchanged. Historical comparison aids and unexpanded literal references remain
distinct from required sources; genuine unknown claims remain unknown. Both
label-loss and comparison-promotion regressions are rejected. This check reruns
only aggregate derivation and source-group validation. Original DB run records
and their executing versions remain unchanged; no DB or PDF check was repeated.

Independent checkout dependencies and Prisma clients were prepared. Session
`turn_context` metadata verifies model `gpt-6.1-sol`, effort `high`; the private
model verification records the metadata location. No prompt self-report is used.
Public links/command paths and `git diff --check` were checked. Remote
`ci:portable` remains the PR merge gate; full old semantic/PDF batch runs were
reused at their accepted revisions and were not repeated.

[#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121) still owns activation
dependencies: precise accepted exports and current-input bindings, deterministic
valid CHM/English retention, default/explicit `chm` consumer mapping, and tested
import order accounting for the CHM importer's deletion of all Chinese spell text.
Disposable artifact, transaction/failure/repeatability tests, protected fields,
content generation/parity/provenance, final search rebuild and API/browser checks
precede a separate operator handoff and explicit production authorization.

No operator DB, app-state, shared manifest, accepted/fallback/disposition input,
production writer, deployment or activation changed. Source authority, IDs,
canonical English, normalized mechanics, summaries and import fallback/order
remain intact. PHB/MinerU/SRD and other-book full QA stay suspended. This does not
close #263 or certify v1.4 release readiness; main-gate owns #313 acceptance.
