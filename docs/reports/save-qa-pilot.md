# Saving Throw Terminology Pilot

[Issue #641](https://github.com/FrankHZ/dnd3.5-spellbook/issues/641) is the fixed
30-entry saving-throw pilot under [#631](https://github.com/FrankHZ/dnd3.5-spellbook/issues/631).
It compares complete aligned canonical DB English/mechanics and actual selected
Chinese, without original-book verification or whole-body acceptance. The
[readonly command](../operations/save-qa.md) provides metadata inventory and
bounded contexts; no writer or operator application is included.

## Selection and inputs

Private revision `b443663ace5e2d2c0d896bc5755154ab0c9aa1ae` freezes all IDs,
reasons, budget and metadata inventory before semantic reading. Denominator is
5,097 canonical identities. The selection has six entries each from single
Fortitude, Reflex and Will field strata; four mixed/context-dependent field
controls; four no-save controls; two SC readonly controls; one English fallback
and one missing-Chinese control. It spans 29 books: 26 effective rows, three
CHM rows and one absent row. Fourteen initial metadata records have translated
save headers. Least-used books, alternating header/variant preference and
descending-ID ties make this deliberately nonrandom.

All 41 accepted-pending action targets and the prior unresolved residual IDs
are excluded. Those action patches remain unactivated. IDs 4907 and 3328 are
previously action-reviewed identities, now reviewed for a different dimension;
the other 28 are not thereby claimed to be new whole-body QA identities.
Effective selection follows row presence, including empty effective bodies.
English rules name/book/body align with canonical context for all 30.

Complete canonical fields, saving facets, components, current/effective rows and
raw name/body ownership are retained privately. A final readonly check proved
those actual inputs unchanged. Private completed evidence revision: `bba02ad6aead7609682588e1a193cb8160681c48`.

## Findings and limits

| Scoped decision | Entries / proposed clauses |
| --- | ---: |
| No local save discrepancy established | 23 / 0 |
| Clarity-only suggestions | 2 / 3 |
| Source/version conflict unresolved | 1 / 0 |
| English fallback unknown | 1 / 0 |
| Missing Chinese unknown | 1 / 0 |
| SC readonly observations | 2 / 0 |
| Confirmed mechanical errors | 0 / 0 |

Clarity proposals affect only IDs 3492 and 4915: distinguish two Reflex saving
throws from ordinary checks and clarify one initial Will-negates header. A
separate linked-spell eligibility save label is intentionally preserved.
Both targets already have effective predecessors. Three exact text/HTML clauses
compose into two guarded updates; all other bytes, including actions, remain
unchanged. They are unaccepted and unactivated, with no SC proposal.

ID 1972 has materially different aligned English versus selected CHM effects;
name/book equality does not resolve source/version ownership. No body or header
correction is safe within this pilot. IDs 3291 and 5101 remain language gaps,
including the zero-seed fallback case. SC IDs 4919/4730 are observations only.

Initial retrieval had 38 named occurrences and zero lexical candidates. Semantic
reading exposed an embedded same-line save header (1095) and anonymous save
contexts, including conditional follow-up saves (4950) and another spell's
eligibility label (4915). The maintained refinement finds the inline header and
adds five unspecified body contexts, for 43 occurrences. Anonymous contexts stay
unknown; family inheritance would conflate roles. Final header count is 15.
Both initial and refined outputs are retained; the same frozen IDs were replayed.

No candidate was adjudicated as a false-positive error because neither run
produced a lexical candidate. Missing headers, lexical agreement, initial versus
conditional saves, and checks versus saving throws are observed mechanisms that
could otherwise mislead review. The two clarity issues were not lexical deficits,
and the source conflict was not detectable from family matching. There is no
corpus precision/recall estimate or automated semantic pass.

The detail UI independently renders canonical saving mechanics. Existing display
helper replay covers all 30; 22 have complete facets, while partial/review facets
retain raw context. Missing prose headers therefore do not imply missing user
information. This is a code/display-helper check, not a new browser acceptance.

## Cost and validation

Before execution, the save fields totalled 54,659 characters and English bodies
3,810,837 characters. The approach reads compact metadata, then only 30 complete
contexts; time and storage grow linearly in retrieved text/identities, with
independent Chinese scope indexes rather than paragraph Cartesian pairing.
Budget was under 512 MiB peak RSS and 50 MiB new private evidence, with no bulk
model API calls.

Metadata inventory measured 99 ms, 123 MiB peak and 1,219,811 bytes. Complete
context enrichment measured 63 ms, 115 MiB peak and 909,759 bytes. Final root and
package retrievals measured 18–19 ms, 71–87 MiB peak and 435,866 bytes each, with
identical records. Final evidence validation measured 70 ms and 109 MiB peak;
the private deliverable is approximately 5.5 MB. These are retrieval/validation
times, excluding unmetered interactive semantic review and process startup.

Targeted synthetic regressions and data-tools typecheck pass. Independent
readonly validation checks all current contexts/rules/mechanics, frozen IDs,
41 exclusions, proposal composition and root/package replay equality. Operator
DB size/mtime remain unchanged; zero DB copies/writes, imports, deployment or
paid bulk-model API calls. Public changes include scripts, manifest/gate and
operation documentation. Exact-head remote `ci:portable` remains the merge gate.

The next useful scope would be a separately authorized finite batch of at most
30 non-SC contexts emphasizing mixed fields, conditional/repeated body saves and
local clarity checks, after independent review of these three proposals. Keep
1972 as a separately owned source/version question and language gaps separate.
Do not infer all remaining entries need edits or start a corpus-wide wave.
PHB extraction remains suspended; SC source-bound acceptance is unchanged.
