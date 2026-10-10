# Conditional and Mixed Saving Throw Review

[Issue #643](https://github.com/FrankHZ/dnd3.5-spellbook/issues/643) reviews one
fixed 30-entry non-SC batch after the [saving-throw pilot](save-qa-pilot.md).
The baseline is complete aligned DB English/mechanics and actual selected
Chinese. This is local saving-context review, not original-book verification,
whole-body acceptance, a writer or operator activation.

## Frozen scope

Private input/selection revision `aa4dafa17e2b5a581451a286d71d251dfbd97d40`
precedes paired semantic reading. A compact inventory covers 5,097 identities;
automatic English body hints leave 3,483 eligible Chinese contexts after the
scope exclusions. Overlapping pools contain 26 mixed canonical fields, 160
repeated named-body hints, 249 conditional named-body hints, 557 anonymous-body
contexts and 123 ordinary-check controls. These counts describe retrieval, not
confirmed attempts, translation errors or corpus QA coverage.

Selection freezes six mixed fields, ten repeated-body hints, eight conditional
body hints, four anonymous-body contexts and two ordinary-check controls. It
spans 30 books, 27 effective rows and three CHM rows, with 17 explicit save
headers. Least-used books, rotating body-family preferences, alternating
header/variant preferences and descending-ID ties are deliberately nonrandom;
no precision/recall estimate follows. Enough useful candidates were available
without expanding beyond the 30-entry cap.

All 43 accepted-pending action/saving targets, all 30 prior pilot identities and
existing residuals are excluded. The pending patches remain unactivated. ID
3289 is a previously action-reviewed identity, now reviewed in a different
dimension. No selected identity repeats the prior saving review. SC is excluded
and PHB extraction remains suspended. Completed private evidence revision:
`e3e6d96f7bdef91c7accdfb6392aff329f715393`, under `term-qa/issue-643/`.

## Local decisions

| Decision | Targets / proposed clauses |
| --- | ---: |
| No local saving discrepancy established | 23 / 0 |
| Clarity-only suggestions | 6 / 9 |
| Confirmed local saving-condition discrepancy | 1 / 2 |
| New source/version or language unknown | 0 / 0 |

The clarity targets are 3465/2717/3250/3484/3289/2985. Their local phrases
distinguish saving throws from ordinary checks; initial versus secondary,
per-round versus daily, and recipient versus beneficiary roles remain intact.
They are not confirmed mechanic errors.

ID 3606 has two saving-condition mistranslations against aligned DB English:
the save threshold uses the wrong comparison basis, and the termination rule
counts successes rather than attempts. The proposed threshold renders current
negative hit-point total as its magnitude, an explicit local interpretation
retained for independent review. Two exact clauses correct that basis and the
attempt count, while preserving stance activation, actions and other wording.
Canonical English/mechanics remain unchanged; no original-book claim follows.

The seven targets have eleven private clauses: five guarded effective updates
and two guarded effective inserts (2717/3606), with effective absence proved.
Complete selected/effective predecessors, canonical/rules/mechanic context and
raw prior name/body ownership are retained. Missing ownership is not invented.
Separate exact text/HTML edits compose against one original per target, retain
all unrelated bytes and preserve action wording. CHM rows remain unchanged.
All proposals are **unaccepted and unactivated** pending independent main-gate
review; no writer target set was expanded.

One out-of-dimension observation, ID 906's HD treatment, is retained as a
separately owned residual without correction or broader HD QA. This entry's
saving roles agree locally; it is not a whole-body pass. Prior source/version
conflict 1972 and language gaps 3291/5101 were excluded, not re-adjudicated.

## Retrieval value and boundaries

The maintained [readonly tool](../operations/save-qa.md) retrieved 80 occurrences,
including eleven anonymous contexts, and zero lexical candidates. Complete
reading still found the clarity issues and the two conditional errors; family
agreement cannot validate those clauses.

Nine selected contexts have specifically documented misleading role hints:
3250/3439/3315/3208/3340/3100/4807/1057/2985. Actor quantifiers, retry prohibition,
bonuses or immunity references can resemble recurring or conditional attempts.
These are **role-hint false positives**, not nine mistranslations or confirmed
lexical errors. The existing documented heuristic/unknown boundary controls
that limitation; no demonstrated retrieval defect requires new code.

Mixed fields and body saves can legitimately differ. No-save or empty initial
fields do not forbid secondary saves against later effects; a bonus or immunity
reference may mention a save family without requiring a roll. Success can stop
future attempts without undoing prior consequences. Anonymous occurrences do
not inherit a family automatically. Missing prose headers retain independently
rendered canonical mechanics, including raw context for incomplete facets.
These distinctions are checked per entry rather than normalized globally.

## Resources and validation

Budget used prior pilot measurements: approximately 1.25 MB metadata, 5 MB
English body scan, at most 30 complete contexts and 10 MB expected evidence;
limits remained 512 MiB peak RSS and 50 MiB new evidence. Retrieval scales
linearly in identities/text with no paragraph Cartesian pairing. No network
source collection, DB copies or paid bulk-model calls were needed.

Measured inventory: 98 ms, 108 MiB peak, 1,219,810 bytes. English body-hint scan:
46 ms, 96 MiB peak, 3,812,237 bytes scanned. Context enrichment: 62 ms, 116 MiB
peak, 897,248 bytes. Root/package retrieval: 17–20 ms, 69–72 MiB peak and
440,279 bytes each, with equal records. Final private validation: 69 ms and
110 MiB peak. The complete private deliverable is approximately 6 MB. Timings
exclude process startup and unmetered interactive review.

Existing `save:qa:test` passes. Independent readonly verification checks every
current canonical/rules/selected/effective/facet/component context, 43 exclusions,
frozen order, absent effective predecessors, exact clauses/composition, action
windows and root/package equality. Both operator databases retain size/mtime;
zero writes/copies/imports/deployment or application. Changed documentation
links and diff checks pass; exact-head remote `ci:portable` is the merge gate.

The useful stopping point is independent review of these eleven clauses and
their residual ownership. Two finite batches are not grounds for an automatic
all-corpus queue. Resolve the existing pending proposals and separately scoped
source/language questions before considering another saving batch; any further
batch should be justified by a concrete new context, not a remaining-ID quota.
