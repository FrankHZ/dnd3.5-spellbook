# Finite bonus-type pilot

[#647](https://github.com/FrankHZ/dnd3.5-spellbook/issues/647) evaluates the next
terminology dimension under #631. Standard rigor uses established readonly
mechanisms, measured inventory and a frozen finite selection. The pilot is not
a corpus-wide correctness claim or stacking/unit/duration QA.

## Denominators and selection

Compact inventory covers all 5,097 current canonical identities. Disjoint
partitions exclude 1,001 SC identities, fifty accepted-pending action/saving
targets and twelve additional registered residual identities, leaving 4,034
eligible identities. The supplied residual list contains seventeen IDs; five
already belong to the SC/pending partitions. No predecessor is changed or treated
as already activated.

Among eligible identities, 3,494 have Chinese-present-unverified, 260 are English
fallback and 280 have missing Chinese. There are 2,710 effective selections,
1,044 CHM selections and 280 absent rows. Effective row presence wins even when
its body is empty. Seventeen of eighteen English seed families occur; alchemical
has no literal match. The 587 distinct typed-seed identities include 525 Chinese
contexts, 33 English fallbacks and 29 missing-Chinese identities. These are
retrieval counts; overlapping family DFs cannot be summed into unique identities.

| English family | Eligible document frequency |
| --- | ---: |
| Enhancement | 179 |
| Competence | 76 |
| Morale | 63 |
| Deflection | 54 |
| Insight | 46 |
| Resistance | 45 |
| Natural armor | 41 |
| Circumstance | 37 |
| Sacred | 33 |
| Luck | 27 |
| Armor | 25 |
| Profane | 19 |
| Racial | 15 |
| Size | 12 |
| Dodge | 11 |
| Shield | 5 |
| Inherent | 2 |

Chinese literal labels include 增强加值 DF159, 表现加值60, 士气加值58,
偏斜加值46 and 洞察加值40. They do not establish translation alignment. Bounded
concordance favors early IDs; suffix fragments and unknown language contexts
remain unverified. The [operation contract](../operations/bonus-qa.md) defines
these counts and limits.

Thirty metadata-selected contexts were frozen before semantic reading at private
`797462215eb7b53b6b1422d56f019f4bc96c274f`, under `term-qa/issue-647/`.
They cover twenty books and sixteen observed seed families, repeated bonuses,
different recipients/statistics, four deliberate non-type controls and two
language-gap controls. One typed seed also proves to be an existing-statistic
reference. Identities 4859 and 3008 are explicitly disclosed revisits from the
older action dimension; the other twenty-eight are not represented as whole-body
or original-book QA. This purposive sample supports no precision/recall estimate.

## Local decisions and stopping point

| Decision | Contexts |
| --- | ---: |
| No local type discrepancy | 19 |
| Legitimate existing synonym/variant | 3 |
| Retrieval false-positive/non-type control | 5 |
| Unknown selected-context conflict | 1 |
| Unknown English fallback | 1 |
| Unknown missing Chinese | 1 |

Review/context/replay evidence is frozen at private `3a0b401abf4cd0f58e27978a1cad18ff9252a00e` in the same directory.

No isolated confirmed type omission/substitution or clarity proposal was formed.
The false-positive/control count includes four deliberately unseeded controls;
it is not a detector false-positive rate. Existing synonyms remain unchanged.
Each private decision distinguishes type, recipient, statistic and condition,
including differing ally/caster effects, typed AC versus untyped attack benefits,
existing natural armor as an input statistic, and penalties versus bonuses.
No matching word or inherited review stamp is treated as a semantic pass.

1267 has multiple selected-CHM divergences in types, values and other effects;
the conflict's source/version cause is unconfirmed. It remains unknown, with no
isolated type edit that could conceal the wider mismatch. English fallback3288
and missing-Chinese5082 remain language gaps. Adjacent condition/statistic
residuals on3126/116/3566 are recorded with bounded English/Chinese evidence and
remain unchanged. Existing historical residual metadata is retained.

Stop automatic bonus semantic waves at this pilot. The observed value is compact
retrieval, local-role guardrails and named residuals, with no independent type
repair to activate. A future separately prioritized slice can address named
context/language conflicts; a remaining-ID quota is not a reason to continue.
The 3,447 eligible identities without literal seeds and all unreviewed candidates
have no correctness conclusion. SC authority and suspended PHB extraction remain
unchanged; canonical English/mechanics, names, summaries and CHM are preserved.

## Reproduction, protection and cost

Root/package final inventories and full-context retrieval outputs are equal.
Readonly live replay verifies all thirty full canonical and selected/effective
predecessors, matched rules English/name/book, facets/components, exclusions,
local decisions and four residual records. There are zero proposals, zero
accepted/activated flags, no writer/import/deployment and no operator DB copies.
SQLite size/mtime remains unchanged. Synthetic tests cover positive/negative
seeds, role limits, DF/occurrences, suffix spelling, row-presence selection,
unknown language/identity and private-output protections. Typecheck and affected
portable checks pass; exact-head remote `ci:portable` remains the merge gate.

Initial estimates were roughly 5,097 identities, 3.8 million English characters,
8 MiB selected text, 1–5 seconds inventory and 1–10 seconds context retrieval.
Budgets were 512 MiB peak RSS and 50 MiB new evidence. Actual eligible paired
frequency input is 6,151,969 UTF-8 bytes. Final inventory takes about0.18 seconds
at160 MiB peak RSS and emits1.47 MiB; thirty complete contexts take about0.07
seconds at128 MiB and emit655 KiB. Live replay takes about0.06 seconds at133 MiB.
Total retained evidence is about8 MiB, including frozen and fresh replay outputs.
These are retrieval/verification measurements; interactive semantic review is
unmetered separately. Paid bulk-model API calls are zero. Actual model/effort
was verified from session metadata as gpt-6.1-sol/medium. The thirty-nine unrelated
private staged deletions and all prior/reviewer evidence are preserved.
