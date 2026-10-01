# Spell Compendium Accepted Field Handoff

Issue [#288](https://github.com/FrankHZ/dnd3.5-spellbook/issues/288), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
This source-free report describes a static union of previously accepted exports
and navigation from the complete source-question checklist to Chinese acceptance
or specific missing evidence/consumer obligations. It does not accept new content, resolve unanswered
source questions, or complete the parent issue.

The private handoff is local-only at
`63889c8e4fa0dcc180bd2e912d017de9e4558de7`, under
`data/dice-qa/books/86/issue-288/`. No private data was pushed.
Public dispatch base: `32fb4ec69e42f99807db2752f8985d1c631fa8fd`.
Private dispatch base: `f3fb0f0466f70c6567a28e9579b7f6fa8f34b8c2`.

## Exact Accepted Dependencies

The private `accepted-output-bindings.json` binds the following exact revisions,
paths and per-export counts. Both original formats remain separate. Native
acceptance comes only from #259; independent acceptance comes from the eleven
accepted exports below. Frozen #264 and #270 remain evidence/checklist inputs.

| Issue | Accepted public merge | Accepted private revision |
| --- | --- | --- |
| #259 / #260 | `7a0344c69a6260c7b911d0e04994fa5a6a80d44b` | `7777cb7016ecb115acc7426c25759528593215f9` |
| #264 / #266 | `9e27c9d28898d3c25b79335e94f223ee340f2438` | `3ccda19e2e5e483696cf305374fc9343703525af` |
| #265 / #267 | `4f3c74a01dfda8f9cbbd5fc2d0cb03649cc838f6` | `7f6a143e3b48cd9484c79176e60c7f2d71befb2e` |
| #268 / #269 | `7bf1ee11c109f8ef70e4bee47108da325813434f` | `a05a226f5f4e21982195cf67f365ff5f55644f47` |
| #270 / #271 | `40bfc7a1d42013f0b07c827b2db54bb00b3d1bac` | `c6cc9a8d6b887ffaffbdcd1ecec08b3444e3ced2` |
| #272 / #273 | `a909b6483c90facb9aed71f157716e651b99c00b` | `2ee22e46e12eb4b1ade5556ab09f7f568f549c62` |
| #274 / #275 | `c383dd27bf82a547b977bfdf453b84751d4990c4` | `c6624878b4bba676690b0e27c7f2faf151004457` |
| #276 / #277 | `96caf88d34a636ca393710017ebc6e6d61aa7173` | `ab61f604534ce06c80adabd41110f11680099936` |
| #278 / #279 | `8431f788744b8863b1efe11a83bd06c96105e4ae` | `57f5afea0fdacd192e6de9161f03dd8c78322c1f` |
| #280 / #281 | `dbb15f3b0b57b74850c8c81be2ed2afdfdec9d0e` | `616df1d60a80f5706bc27aab50543bba7db20b20` |
| #282 / #283 | `e5919843428cfc253ecff1985ce2752ab09eca8e` | `29796e7e0166ad2d8be7a00f39c4a97415f0fa5f` |
| #284 / #285 | `3f9c4a5fbba2e6ce2e120c773256da9677678b34` | `5c32522938888eb053cc5fa8a0dd8e4804bccdfe` |
| #286 / #287 | `32fb4ec69e42f99807db2752f8985d1c631fa8fd` | `f3fb0f0466f70c6567a28e9579b7f6fa8f34b8c2` |

Native path: `issue-259/fresh-qa/formal-check/accepted.jsonl`.
Independent paths: `issue-259/fresh-qa/source-bound-formal-check/` and
`issue-N/formal-check/source-bound-fallback-accepted.jsonl` for subsequent slices.
Paths in this paragraph are relative to `data/dice-qa/books/86/`.

#286 ignores its formal export; its accepted revision commits
`issue-286/source-bound-reviews.jsonl`. All record values match the actual accepted
formal export. The thin private reproducer uses the existing QA JSONL serializer
to reconstruct those bytes from committed input and then revalidates them through
the current formal CLI. It does not require retaining that old ignored file.
JSON serialization whitespace differs between that committed input and export;
source text, Chinese text, evidence and record values remain unchanged.

## Field Union And Fallback

| Measured set | Records / fields |
| --- | --- |
| Native accepted export | 653 records / 658 fields |
| Independent accepted exports | 142 records / 142 fields: 111 body, 31 name |
| Unique accepted target + field union | 800 fields |
| #259 formal field universe | 2004 fields |
| Original formal native fallback | 1346 fields |
| Projected fallback after independent selections | 1204 fields |

The private `native-accepted.jsonl` and `independent-accepted.jsonl` preserve
original accepted-export bytes and ordering. For set comparison only, native
`descriptionHtml` corresponds to independent `descriptionText`; both export
formats remain intact. `remaining-fallback.jsonl` retains original fallback
records and order after filtering every independent accepted field.

The complete complement is verified against the actual #259 formal universe.
The formal CLI still produces its original 1346-field native fallback; 1204 is
the derived projection and is not presented as the CLI's original fallback.
No field is accepted from old joint-review `corrected` or `source-correct` labels,
unchanged Chinese, target counts or question counts. No consumer/writer contract,
manifest, registry or change-detection hash mechanism was introduced.

## Source Questions And Chinese Dispositions

The complete transferable problem authority remains frozen
`data/dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md` and its
`question-dispositions.jsonl`. The new private
`question-chinese-dispositions.zh-CN.md` supplies navigation;
`question-chinese-dispositions.jsonl` preserves all original dispositions and
binds exact checklist/evidence lines, accepted body revisions, retained note
locations and full-body audits, or the corresponding source-gap request.

| Source-question state | Chinese disposition at dispatch |
| --- | --- |
| 27 unanswered questions | 26 complete bodies accepted with retained source issues |
| 6 unanswered questions | 5 complete bodies remain deferred: four displayed historical-source gaps and one consumer obligation to define |
| 1 official resolution: 4709 | Separate ordinary accepted complete body from #280 |

All 34 problem IDs occur once. The 33 unanswered source questions remain
unanswered; Chinese acceptance does not imply a source ruling. The official
resolution is kept separate and is not counted as a 34th unanswered question.
The new navigation does not rewrite the existing checklist's rules or questions.

## Four Source Requests And One Consumer Obligation

The private `source-gap-needs.md` is a readable request list, with full current
CHM text/HTML, current English/mechanics, exact predecessor records and fallback
fields in `source-gap-needs.json`. It binds the actual expanded historical
claims, distinguishes known SC locators from unverified external-book locators,
and specifies the minimum entry, header, inherited context, printing and errata
needed for the four displayed historical-source gaps. For 4469 it first requires
definition of the actual consumer obligation; evidence gathering is conditional
on identifying a specific unsupported rule. It does not request whole-book QA.

| Target | Required evidence and boundary |
| --- | --- |
| 4047 | Historical pearl/component rule. An unaccepted prior proposal labels the book Draconomicon; original publication/printing/page still require confirmation. |
| 4574 | Historical XP rule. The old book shorthand does not establish exact publication or allow reuse of 4047's proposed identity. |
| 4469 | Define the actual spell consumer's external-rule obligation first. Its current fields do not expand creature statistics or abilities; SC supports the displayed elemental-related claims. A prior unread-abilities boundary does not make MM statblocks an acceptance prerequisite. Seek only a specific required rule/context if SC cannot support it; deferred fields and the Close question remain. |
| 4504 | Identify the original publication for the historical class-level and damage/radius claims and its parent entry. Warmage does not identify a rulebook. |
| 4691 | Applicable Book of Exalted Deeds complete historical entry and shared header, bound to the existing #268 gap; SC-only evidence cannot close it. |

The configured local PDF inventory was inspected: only SC, PHB and their errata
are available. The historical books and MM are absent there; absence of MM alone
does not establish an evidence obligation for 4469. Historical book printings and
original page numbers remain explicitly unlocated; an MM locator is needed only
if the consumer review establishes a specific external-rule obligation. No original
book was guessed, downloaded or claimed read. All five targets still have both
name and body in the actual fallback complement; this handoff does not accept
names or erase historical annotations to manufacture a pass.

## Validation

Committed helper source:
`9c1c8efb8d00e61167bff7bb6483e6b438e9414f`.
`reproduction-run-03.json` records six passing commands with actual argv/cwd,
public execution head `32fb4ec69e42f99807db2752f8985d1c631fa8fd`, private execution
head `9c1c8efb8d00e61167bff7bb6483e6b438e9414f`, outputs and exit codes.
`run-source-bindings.json` verifies the executed helpers match that commit.
Earlier uncommitted-source runs remain preserved and explicitly distinguished.

| Check | Result / private evidence |
| --- | --- |
| Accepted Git exports and frozen directories | All 13 frozen directories unchanged; exact records/bytes and revisions bound; `accepted-output-bindings.json`, `scope-verification.json` |
| Specified temporary 315-patch rules copy | Exact all-table delta, unlisted raw bytes/columns and relationships preserved; 56 unchanged tables; `joint-copy-verification.json` |
| Operator content provenance | Existing generation metadata and original rules/manifest fingerprints match; `content-provenance.json` |
| Complete union against actual readonly inputs | All 142 independent records validate unchanged; formal maintained QA regenerates exact 658 native fields and original fallback, and all independent records; `input-validation.json`, local `formal-check/` |
| Aggregate completeness failures | Missing native/independent entries, duplicate fields, changed records and cross-export overlap rejected; six cases in `artifact-verification.json` |
| Current-input failures | Duplicate/overlap, missing English target and stale Chinese, English/mechanics or HTML rejected; six cases in `input-validation.json` |
| Questions, complete complement and gaps | All 34 original dispositions/references and retained notes checked; five gaps bind actual old CHM and fallback; `artifact-verification.json` |
| Maintained portable dice QA | Passed, including 104 maintained rejection checks; command/exit in run 03 |
| Public diff, links and command paths | Checked |

This is bounded aggregate validation. Accepted semantic/PDF evidence is reused
at exact revisions; the old per-slice 17-step workflows, whole-book PDFs and
180-residual QA were not rerun. New outputs stay inside #288; old wrappers that
write into frozen directories were not executed. Remote `ci:portable` remains
the PR merge gate.

## Preserved Scope

The 4469 obligation correction was rederived and checked using committed helper
source `dda00f3e8416122e4df024a21ea532ee1f01fd6a`.
`gap-revalidation-01.json` records exact commands, exit codes and public execution
head `9bbc4f6609168ec45553a45989795899a367b090`. Affected derivation/reference checks
pass; all 13 frozen directories, original run03, current inputs, exports, 800/1204
partition, all 34 question dispositions, other four gap records and 4469's exact
prior/fallback/Close issue remain unchanged. Its external-rule obligation remains
undetermined and it is not automatically accepted or cleared. This bounded
recheck did not rerun the original six-step validation or old slices.

Other missing-source, identity and terminology items, and 4204's name residual,
remain with #263/#197 and their existing owners. The parent is not complete and
the 180 residuals are not cleared. This static handoff does not weaken source
authority, provenance, IDs, canonical English/mechanics, summaries, fallback or
import ordering. No operator DB, app-state, shared manifest, production consumer,
writer, deployment, activation or external delivery was written. PHB/MinerU/SRD
queues and other-book full QA remain suspended or outside this authorization.
#121's consumption and production workflows remain separate.
