# Readonly bonus-type QA

`bonus:qa` produces compact candidate and literal-frequency evidence for a finite
DB-English review. It accepts no writer, review decision, proposal or activation
option. It reuses the action QA output/path guards and API-compatible row-presence
selection: an effective row wins even if empty; CHM is used only when absent.

```powershell
npm run -w data-tools bonus:qa -- --content-db '<content.sqlite>' --out '<private-data-root>/term-qa/issue-N/inventory-new' --exclude-ids '1992,1024'
```

Relative arguments resolve from the checkout root. Output must be a fresh child
of configured `DATA_REPO_PATH/term-qa/`; existing evidence is never overwritten.
The supplied content DB is opened readonly and is never copied. Output is capped
at 50 MiB and records elapsed retrieval time, peak RSS and unchanged DB metadata.
Exclusion IDs must be distinct positive integers, at most 1,000. The examples above
are illustrative: freeze the owning issue's complete residual list before a run.

`inventory.jsonl` covers every canonical identity once, with book, selected
variant, identity/language status, whole-body seed offsets, control hints and a
disjoint partition. Partition precedence is SC, the fixed fifty accepted-pending
#629/#637/#645 targets, caller-frozen residual IDs, then eligible-unreviewed in
this dimension. Overlapping residual/pending/SC IDs count in their first partition;
`report.json` retains the complete supplied list. Older review in another dimension
is not bonus-type acceptance and must be separately disclosed in the frozen sample.

The English seeds are literal typed `bonus/bonuses` phrases: enhancement, morale,
luck, resistance, insight, competence, sacred, profane, armor/natural armor,
deflection, dodge, shield, inherent, circumstance, racial, size and alchemical.
These families are candidates, not a mandated translation dictionary or exhaustive
retrieval. A seed can refer to an existing statistic or an example rather than a
newly granted bonus. Control hints retrieve untyped/ordinary bonus phrases,
penalties and ability changes; hints are not semantic classifications.

`frequency.json` covers eligible identities, including language gaps. It records
English family DF/occurrences and Chinese literal seed/suffix phrases. A document
counts once per phrase even if repeated. Chinese labels are Top 40; discovery uses
2–4 characters immediately before 加值/加成, preserves that suffix spelling,
requires DF at least two and returns Top 20. Each phrase has at most two earliest-ID
examples capped at 300 characters in private evidence. Fragments, counts and
matching labels remain unverified. There is no cross-paragraph alignment, NLP
platform, semantic pass, inferred stacking behavior or precision/recall estimate.

Before semantic reading, estimate input/output/runtime and freeze at most the
owning issue's bounded identities/reasons from compact metadata. Exclude pending
targets and registered source/version/other-mechanic residuals. Retrieve full
current paired contexts with existing `action:qa --ids`/readonly helpers; strip
unrelated action findings from bonus evidence and retain complete canonical/rules
English/mechanics, selected/effective predecessors, provenance, facets/components.
Do not reopen PDFs or suspended PHB extraction. Raw identity metadata is not a new
acceptance grant. Missing Chinese, English fallback and context/version conflict
remain unknown.

Review each local type with its recipient, affected statistic and condition.
The same type elsewhere does not settle the current clause. A natural-armor
statistic receiving an enhancement bonus has two distinct roles. A penalty,
attribute change, ability modifier or ordinary bonus phrase does not authorize
inventing a bonus type. Existing synonyms can be legitimate; lexical matching
alone cannot approve them. Full-context reading still grants no whole-body QA.
Incidental numeric/action/save/duration/condition conflicts stay in bounded
residual records and are not repaired by this workflow.

Any local proposal needs one original full selected body, exact independent
text/HTML spans and disjoint composition, stable identity, full canonical/rules
context, prior ownership, and guarded update or absent-effective insert. Names,
summaries, English/mechanics, CHM and unrelated bytes remain unchanged. Main-gate
accepts proposals separately; this command cannot apply them. Stop or narrow the
next slice based on observed value/cost rather than an ID quota.

Run `npm run -w data-tools bonus:qa:test` for literal/plural/nested-family seeds,
DF and bounded examples, remote-recipient/context limits, untyped/penalty/ability
controls, literal Chinese suffix spelling, fallback/empty-effective semantics,
partition exclusions, invalid arguments, private outputs and readonly DB checks.
See the [finite pilot report](../reports/bonus-qa-pilot.md). Exact-head remote
`ci:portable` gates merge; operator/production activation remains separate.
