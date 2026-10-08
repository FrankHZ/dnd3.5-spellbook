# Bounded action-context review

Issue [#626](https://github.com/FrankHZ/dnd3.5-spellbook/issues/626) follows the
accepted [#622 pilot](action-qa-pilot.md). This report contains aggregates only;
complete texts, provenance, decisions and unaccepted proposals are private.

## Scope and evaluation

The deterministic sample contains 60 new stable IDs across 29 books, excluding
all 100 pilot IDs from private revision
`cf9d49c2eac4731fb684e7961ea2cc804d038899`. Book round-robin selection favors
earlier remaining IDs, with 25 immediate, 25 free, four eligible no-cost controls
and six additional action contexts. Retrieval verbs do not establish semantic
eligibility: a prohibition and a maneuver initiation are useful controls.
This is neither random sampling nor a corpus recall estimate.

The implementing agent read all 60 complete matched DB-English/current-Chinese
pairs for action roles, conditions and counts. Six selected bodies are English
fallback and cannot establish Chinese correctness. Three additional entries have
unresolved historical action-label semantics. The remaining 51 had no action
discrepancy observed; this does not accept whole bodies. Five SC observations
remain readonly under their existing source-bound authority, without DB-English
reacceptance. Other translation fields and book verification are outside scope.

There are 123 occurrence findings: five candidates and 118 context-unverified
lexical findings. Of the five candidates, two are false positives and three are
unknown; none is a demonstrated action error. Resolved candidate precision is
**0/2**, with three unknowns excluded, rather than treating unknowns as errors or
passes. The false positives involve a shared action noun across casting
alternatives and a cost supplied by a maneuver's initiation header. No confirmed
sampled miss was observed; with no demonstrated held-out errors, recall cannot
be estimated. Lexical findings never become semantic acceptance automatically.

Separate clarity-only proposals align the three ambiguous entries' specific
roles with complete DB English: two free-action roles and one standard casting
header. Historical mechanical-error unknowns and the above denominators stay
unchanged. Two proposals target current effective rows with existing DB-English
authority; one is a future effective insert from a retained CHM reference, guarded
by effective-row absence. It does not modify CHM or resume suspended PHB
PDF/MinerU/SRD queues. All three are non-SC, unaccepted, and preserve complete
predecessors plus every unrelated substring. Frequency alone is not their basis.

Three known pilot follow-ups are additional, not part of these denominators.
Current #84 has four separately reviewable private clause proposals: creation
basis, force property, free-action terminology and an upper bound of three.
Coordinator review resolved the latter two against the complete DB English;
historical label origins do not require fresh source research for this bounded
normalization. Current #101 already preserves the correct frequency; current
#378 explicitly preserves the free-action meaning, while its existing unresolved
owner record remains untouched. Historical CHM rows are unchanged. The #84
proposals preserve every unrelated substring in text and HTML, full predecessor
and provenance, complete matched English and mechanics. They are unaccepted and
unactivated; no DB writes occurred. All four proposals share one original predecessor;
a future accepted handoff must compose accepted clause replacements explicitly,
not sequentially overwrite full bodies. Neither grants whole-body acceptance.

## Frequency and usefulness

The readonly seed stream covers 5,097 inventory rows and 8,082,790 UTF-8 bytes
of English, casting time and selected Chinese. Document frequencies count a
spell once per phrase/scope, separately from repetition counts. Representative
body frequencies are:

| Language | Family or literal label | Body document frequency |
| --- | --- | ---: |
| English | standard | 232 |
| English | free | 149 |
| English | immediate | 50 |
| English | no-action | 25 |
| Chinese | 标准动作 | 208 |
| Chinese | 自由动作 | 110 |
| Chinese | 直觉动作 | 48 |
| Chinese | 即时动作 | 16 |

These are independent retrieval counts, not paired equivalences. 即时 is an
ambiguous historical label. Rare labels including
实时 and 迅速 provide useful concordance leads without asserting a consistent
dictionary. Scope separation materially changes counts because maneuver headers
previously leaked into body scope; the local classifier now excludes them.

Chinese suffix discovery is bounded to lengths 2–4, DF ≥2, Top 20, with known
label and boilerplate filtering. It surfaces leads such as preparation/attack
actions, but also pronoun fragments and truncated known labels. Its usefulness
is limited; these are rejected as semantic evidence, not added as accepted
aliases. Two earliest-ID concordances per phrase, capped at 600 characters, are
private retrieval excerpts; only selected complete bodies received manual review.

## Resources and validation

The pre-scan estimate was under 20 MiB input, 5 MiB selected output and 512 MiB
memory, using sequential processing. The final context/frequency scan took
238 ms, peaked at 120 MiB RSS and emitted 504,215 bytes (about 493 KiB), within
the 50 MiB output budget. DB size and modification metadata stayed unchanged;
SQLite opened readonly, without copies. Tooling made zero model API calls.
Interactive agent review covered 63 complete pairs including known follow-ups;
its elapsed time, chat token usage and billing were not separately metered.
Scan duration is not semantic-review cost or a human-review claim.

Meaningful portable regressions cover maneuver header/body separation, repeated
occurrences versus document frequency, concordance limits, suffix filtering,
fresh private output boundaries, and empty effective-row presence without CHM
fallback. Targeted action QA tests and data-tools typecheck pass. Remote
`ci:portable` remains the merge gate; exact-head evidence belongs in the PR.

Existing closeout machinery authenticates revision-bound accepted fields against
CHM predecessors and projects inserts. It does not authorize these proposals.
A future accepted application needs separately scoped effective-row replacement
or guarded insertion with complete predecessor/identity/provenance guards,
preserved source evidence and search refresh through existing mechanisms.
This delivery adds no writer or activation authority.
