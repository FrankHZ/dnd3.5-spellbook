# Spell Compendium summary source QA, slice 03

[Issue #362](https://github.com/FrankHZ/dnd3.5-spellbook/issues/362) delivers
`suggestedSummarySlices[2]` under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-03.json)
records all 96 exact keys and dispositions for 50 targets. Main-gate owns
acceptance and #346 maintained integration; these are review proposals.

## Scope and evidence

The audit is frozen at `e793ff09a38060c5c6b336d28690353bd0d96909`, with canonical
summary input at private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Missing
summaries are not created. Public base `37711b9b270b4f1931729dc3eccf3c67a9a5dd41`
is synchronized through `fde172452f275eedef70a136e773de682f27fded`.

Private handoff/helper commit `826caffb384fc54266cae0f373811cbebe868e9c` owns
`dice-qa/books/86/issue-362/`. It adapts the accepted #353 helpers/content at
`e154c69e817c81d7e48da105c46daba83a4da8c4` and reads its final delivery
`7de75ae250354372842c23c8c2d2ae4a1f1b1b55` without modifying that packet.
The private packet contains full frozen inputs, 96 individually authored
decisions, 50 bilingual/context comparisons, fresh original geometry/spans,
20 narrow authored corrections and their derived line-preserving review mirror.
Complete current English, Chinese and mechanics remain read-only context.

Twenty explicit original pages were freshly extracted and visually inspected,
including scoped SC entries and continuations, printing evidence, the necessary
direct Blink parent and complete official SC/PHB errata. None of this batch's
summary clauses requires an errata substitution. There are 20 proposals
(11 EN / 9 ZH) and 76 retentions. Demonstrated defects include reversed effect
recipients, incorrect damage scaling/types and misleading transformation or
escape conditions. Concise accurate omissions remain unchanged.

Four EN proposals replace unverified external elaboration with the SC entry's
directly printed grant: the brilliant-energy property and the three called
inevitables' duties. Original DMG/MM property/lore inputs are unavailable.
The review verifies SC's grant by reference and task clauses; it does not certify
all external property mechanics, declare every old elaboration false, or turn
missing evidence into an original-text ambiguity. The external details in
read-only body context remain outside summary acceptance. No new source question
or ruling is proposed.

## Validation and replay

The verifier replays 4,522 original span references and all fresh page geometry,
checks exact frozen scope/input/context, and rejects stale decisions, missing or
extra keys, unassigned line changes and same-count stale correction handoffs.
Every authored correction field equals its decision and derived proposal.
Bilingual values, Unicode/placeholder/whitespace and repeated-prose heuristics
pass. Prose has no invented fixed byte budget or control-token syntax.

The actual maintained summary parser and `importRows` read the narrow 20-row
`corrections.jsonl` on a small command-created summary-only database. Every parsed
correction field equals its mirror row before import. Dry-run preserves all rows;
apply updates exactly 20 rows with every persisted field equal to the proposal,
without inserts; repeat updates zero and reports 20 unchanged. All 6,552 other
rows, identities and variants, #323's 29
accepted corrections and an unrelated table remain unchanged. The disposable
database is removed after success. No operator DB or app-state is opened/copied.

Use absolute public/data/runtime roots and a fresh run label. Run from the
public root and again from `data-tools`; exact committed helpers are checked
before execution, and private replay files record actual head and caller cwd.

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-362/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 826caffb384fc54266cae0f373811cbebe868e9c --run review-root
```

The existing runtime is reused without installation or worktree links. Root and
package replays pass. Exact-head full remote `ci:portable` remains the merge gate.
Canonical summaries, prior evidence, source PDFs, names/bodies/mechanics and
production remain unchanged. PHB reference work is limited to the necessary
direct page and applicable official errata; no suspended queue is resumed.
