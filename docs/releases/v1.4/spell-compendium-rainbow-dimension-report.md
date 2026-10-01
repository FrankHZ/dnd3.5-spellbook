# Rainbow Blast and Greater Dimension Door Review Handoff

This source-free report addresses [#286](https://github.com/FrankHZ/dnd3.5-spellbook/issues/286)
under [#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263), following the
accepted [#284](https://github.com/FrankHZ/dnd3.5-spellbook/issues/284) handoff.
Targets 4057 and 4378 have complete Chinese description and escaped HTML
proposals. Both preserve the original SC statements and add explicitly
unofficial reader notes with independently bound PH comparisons. The original
source questions remain `source-unresolved`. Main-gate must independently
review the handoff; candidate validation does not authorize merge or activation.

## Revisions and Evidence

Public base and validation code:
`3f9c4a5fbba2e6ce2e120c773256da9677678b34`.
Private accepted base: `5c32522938888eb053cc5fa8a0dd8e4804bccdfe`.
Committed helper/proposal source: `caac6348203e9af4abf07fc0e8440362f4110905`.
Private local-only evidence head: f3fb0f0466f70c6567a28e9579b7f6fa8f34b8c2.

Only `dice-qa/books/86/issue-286/` was added in the private repository. Its
`README.md` and `review.md` expose complete current English/HTML/mechanics,
old and new Chinese text/HTML and both diffs, complete original SC entries,
full-body audits, complete PH221 inheritance, and 14 precise predecessor
records. Inputs, actual pages, quotes and audits were generated independently
for this slice. Earlier reviews serve as precise lineage references.
No private push occurred; unrelated untracked files were preserved.

The public change is this report alone. It reuses the accepted source-bound
reviews, `retainedSourceIssues`, `comparisonSourceIds`, `contentLocation` and
physical PDF alias guard. No contract, writer or shared manifest changed.
The PR identifies the final public commit; execution reports identify actual
public and private source heads for each command.

## Complete Review

Rainbow Blast was read from its SC165 middle-column title through the complete
right-column continuation and final component paragraph. The full translation
restores all flavor, separates range from area, and preserves the five energy
types, separate resistance application, damage-die growth and one die per type.
The original material-component header and the Focus paragraph remain distinct;
the header was not silently changed to match the current canonical focus flag.
PH174's actual material-consumption and focus-reuse definitions support the
reader note. They do not determine which component the author intended or
whether another material was omitted. The source question stays unresolved.
Neighboring Rainbow Beam rules and the illustration caption are not imported.

Greater Dimension Door was read completely in SC64's right column, including
its own header, flavor, named inheritance and repeated-transfer rule. The
proposal retains the square-bracket classification, contact targets, duration,
frequency, short transfer distance, move action and absence of opportunity
attacks. Inherited component, casting-time, save and resistance entries are
restored from the actual PH221 base. Names and canonical classification remain
unchanged; the original bracket-versus-subschool question is not adjudicated.
PH172-174's actual category definitions and PH221's base classification are
separately bound as comparisons in the reader note.

The complete PH221 header and body were read across the left and middle
columns. The inheritance audit includes chosen location/direction, carrying
capacity, passenger count and size equivalents, mutual contact, occupied
landing damage, alternative landing distances and ultimate failure. Named
inheritance preserves these unmodified conditions without copying the entire
PH entry into SC. The reader note separately binds the base post-transfer
action restriction and base range. SC's move-action transfer does not expressly
waive that restriction or grant an attack afterward; its own transfer distance
must not be replaced by the base range. The full review therefore includes
inherited rules as well as the classification conflict.

Both complete old Chinese bodies were inspected for expanded historical rules.
Neither contains an unverified numerical block from another book. Other
historical source gaps, including 4047, 4574, 4469, 4504 and 4691, remain outside
this slice. No historical annotation was removed to manufacture a pass.

Actual printing pages establish SC December 2005 first printing and PHB v3.5
July 2003 first printing. The scanned PH printing page was visually read,
without fabricated text spans. The complete single-page SC errata and all three
pages of the 2006-02-17 PHB errata were read. Neither supplies a dedicated
correction for these entries or the inherited base restriction. The PH erratum
for Transport via Plants concerns a different spell and cannot be applied to
SC64. General primary-source policies do not supply a dedicated rewrite of
these two conflicts. All later printings have not been certified.

Reader notes contain original statements, actual rule evidence, impact,
unanswered questions and version limits. Internal fields, QA details and
repair history stay in the private audit.

## Validation

| Check | Result and private evidence |
| --- | --- |
| Specified patched rules | All 315 operations, unlisted columns/raw bytes, relationships and 56 unchanged tables verified; `joint-copy-verification.json` |
| Content provenance | Generation metadata and original rules/manifest fingerprints matched; `content-provenance.json` |
| Fresh inputs and precise priors | Two complete readonly inputs and 14 frozen predecessor records; `current-inputs.json`, `prior-bindings.json` |
| Formal maintained QA CLI | Two complete bodies and retained conflicts passed, without incomplete-review mode; native accepted/fallback unchanged; `formal-verification.json` |
| Actual PDFs and quotes | 11 pages and 1,990 spans reverified; nine inherited claims checked; 30 actual-proposal evidence counterexamples rejected; `pdf-verification.json` |
| Visual review | 11 text pages plus the scanned printing page rendered with Poppler and inspected; `render-verification.json`; images remain local |
| Validator and formal CLI failures | 42 cases rejected by both paths with no accepted export; `counterexample-results.json` |
| Existing outputs and future union | All 140 exact frozen independent fields and the complete 142-field union pass against current readonly inputs; duplicate/native-overlap cases reject; `prior-contract-verification.json` |
| Frozen scope | 12 frozen directories unchanged, 658 native fields preserved, two new bodies disjoint; actual old native candidate bodies remain deferred; `scope-verification.json` |
| Data-tools checks | Typecheck and dice QA passed, including 104 maintained synthetic rejection checks |
| PDF tests and alias compatibility | All 18 tests passed against current worktree source; existing dual-layer alias reproducer preserves distinct-source control and rejects physical aliases |
| Committed-source reproduction | All 17 commands passed; `reproduction-run-02.json` records actual argv/cwd/heads/outputs/exit codes |
| Scoped diffs and links | Passed |

Run 01 is preserved with its actual uncommitted-source state; the exact helper
snapshot is the committed revision above. Run 02 executes that committed
helper/proposal source. `run-source-bindings.json` distinguishes the execution
head from the later snapshot. No earlier audit is overwritten. An initial
manual unittest invocation omitted PYTHONPATH and used the old editable package;
the corrected invocation and both complete runs explicitly use this worktree's
PDF source and pass. Existing PDF ICC warnings did not prevent extraction,
rendering or verification; original PDFs were not repaired.

The specified disposable patched rules copy was verified before readonly use.
Operator content was also opened readonly. Remote `ci:portable` and configured
PDF tests remain the PR merge gate; targeted local checks do not replace it.

## Preserved Boundaries

Frozen #259/#264/#265/#268/#270/#272/#274/#276/#278/#280/#282/#284 remains
unchanged. After acceptance, future consumers must union the new two bodies
with the old independent set, rather than replacing it. Names, IDs, canonical
English, mechanics, summaries, source authority, provenance, fallback and import
order remain intact. The 4204 name residual and other historical gaps remain.

The complete review entry remains
`dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md`: 33 unanswered source
questions and one official resolution. Chinese validation does not reduce this
count. No operator DB, app-state, shared manifest, production writer,
deployment, activation or external source delivery was written. PHB/MinerU/SRD
queues and other-book full QA remain suspended or outside this slice.
