# Spell Compendium Restored Current Evidence Baseline

Issue [#298](https://github.com/FrankHZ/dnd3.5-spellbook/issues/298), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
The surviving #292 field handoff can now be reproduced in the G-drive worktree
against current complete inputs and actual source PDFs. All 803 historical
fields passed current revalidation; no field required isolation. This report
contains no source text, translations or PDF spans. Main-gate owns acceptance
of the restored evidence contract.

## Evidence binding

Execution started from public `2118f3c040bebfb0d2ea4a53bf9168aa8b8823fb`
and private `fe089990e2a5eeac69c92e068ca695f10c42ec58`.
The committed reproduction ran public implementation
`73107ce82ce88e16e07296a14582feb39469f5bf` and private helper
`96c807bdfedad99bb21d243af3316252a30669f8`.
Private local-only delivery is `e2b19619b6efe13e03a7fbd5cd34459b0945a4eb`,
under `G:/spell-book/data/dice-qa/books/86/issue-298/`.

The fixed current input snapshot remains `fe089990e2a5eeac69c92e068ca695f10c42ec58`.
Actual current source/map Git revisions are both
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`. Historical source-key namespace
`9847e70236cd4bcd841347ed1b42b2f478826268` and mapping namespace
`4cd593b44e73f591d46e2f35a90d882befc19702` remain intact.
The old semantic delivery `9961ecc838be14d540c20d5b4971273d48c61f18` and
its missing root tree remain historical limitations. Current verification does
not authenticate old file continuity or claim that tree was restored.

The maintained QA CLI's explicit `--restored-sc-baseline` mode binds all 115
consumed files to the fixed current snapshot, then performs complete parsing,
source coverage and exact reconciliation of all 105 TXT files and 5,606 candidate
occurrences. Only SC and its specified #259/#292 frozen input paths are allowed.
TXT bytes are compared exactly; JSON/JSONL permits only Git CRLF/LF normalization.
The default execution path retains its original revision guards.

## Current verification

`reproduction-run-01.json` and `reproduction-run-02.json` each record six commands
exiting zero, once from the worktree root and once from `data-tools`. They retain
actual argv/cwd/environment, stdout/stderr, execution heads and direct comparisons
of every helper with its committed source. Both disposable rules copies were
removed after verification.

- The existing guarded 315-patch CLI rebuilds the temporary rules input.
  The adapted all-table checker confirms the exact allowed deltas and 56
  unchanged tables, including unrelated columns, relationships and invalid bytes.
- Current content generation metadata and original rules/manifest fingerprints
  match. All 1,002 SC targets' full English, mechanics, English HTML and CHM
  name/text/HTML are saved privately. Maintained formal QA reproduces the complete
  native and independent exports and the original native fallback. All 652 native
  body proofs also match complete current English/HTML and CHM name/text bindings.
- The maintained PDF verifier rereads 324 pages and 51,807 saved spans for all
  803 field bindings, including retained source issue statements. SC printing
  authority and complete official errata match. Previous semantic and visual
  reviews are reused; no new 1,001-entry semantic review was conducted. Existing
  PHB evidence serves only the already bounded SC comparisons/dependencies.
- Eleven added input/scope rejection cases cover changed source text at the
  same position, map/alias changes, missing/outside inputs, unknown baseline,
  wrong namespaces, wrong source keys and unsupported restoration scope.
  Six current field-input mutations, five PDF mutations and five union mutations
  also reject. `dice:qa:test` passes, including the existing 104 independent
  rejection checks; `typecheck:data-tools` and Git diff checks pass.

| Current handoff partition | Fields |
| --- | ---: |
| Native | 658: 6 name, 652 body |
| Independent | 145: 33 name, 112 body |
| Historical fields / currently reverified | 803 / 803 |
| Isolated current evidence failures | 0 |
| Original native fallback | 1,346 |
| Remaining union complement | 1,201 |
| Field universe | 2,004 |

The new handoff's accepted text and fallback bytes match #292 exactly. #294's
two candidate names, targets 3822 and 4204, and its 805-field candidate union are
excluded. The 33 unanswered source questions plus one official errata resolution
remain unchanged. Twenty-seven independent body fields retain their 28 source
issues; accepting an annotation does not resolve an original rule.

Historical body gaps remain exact: 3822 needs its historical/Complete Arcane and
Finding the Center evidence; 4047's old material/cost source is uncertified;
4574's historical XP provision lacks its original publication; 4504's old
header/range/damage and class-list source is unknown; 4691 lacks the applicable
Book of Exalted Deeds original. Those bodies retain fallback. The existing 4204
body and unresolved-engine notes match its complete #280 row. Target 4469's
retained Close comparison issue remains unresolved and its name stays fallback.

Use the private directory's README and committed `reproduce.py` with explicit
code, original rules and readonly content paths for subsequent verification.
The current handoff revision above is available for main-gate review and later
batches after that review. No private push, frozen-directory edit, backup,
junction, shared-manifest write, operator DB/app-state write, production
activation or suspended queue run occurred. Remote `ci:portable` is the PR gate.
