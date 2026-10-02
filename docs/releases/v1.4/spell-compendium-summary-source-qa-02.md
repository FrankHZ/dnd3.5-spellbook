# Spell Compendium summary source QA, slice 02

[Issue #361](https://github.com/FrankHZ/dnd3.5-spellbook/issues/361) reviews the
second frozen summary slice under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-02.json)
records every exact key and disposition. Main-gate/#346 owns acceptance and
maintained integration; the outputs are guarded proposals awaiting review.

## Scope and source evidence

The scope is `suggestedSummarySlices[1]` from audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 96 existing EN/ZH
summary rows. Canonical summaries are frozen at private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Missing rows are not created.
The public work starts from `37711b9b270b4f1931729dc3eccf3c67a9a5dd41` and is
synchronized with main `fde172452f275eedef70a136e773de682f27fded`.

Private handoff/helper commit `af9296f19b29a05d60915fe4871a1d0e5ebaf63e` owns
`dice-qa/books/86/issue-361/`. It adapts the accepted
[#353 contract](./spell-compendium-summary-source-qa-01.md), with independently
authored actual-value reasons and paired semantic comparisons. It contains the
full frozen inputs, 96 decisions, 50 bilingual/context comparisons, fresh
original-page extraction/geometry, narrow authored `corrections.jsonl`, and the
derived `summaries.proposed.jsonl` review mirror. Source-bearing text stays private.

The outcome is 15 proposed corrections (6 EN, 9 ZH) on 12 targets and 81
retentions. Corrections address wrong retaliation recipients, unsupported
trigger restrictions, an incorrect repeat-touch count, condition/size translation,
overstated shot blocking and visibility, and attack action/count limits.
Accurate short summaries remain short; omissions alone are not defects.

Complete original SC entries, necessary parents and complete applicable official
errata were read. Twenty-seven bounded pages were freshly extracted and visually
inspected, including necessary PHB202/203 comparison entries and PHB205/206
Bless Weapon. The paused broad PHB workflow remains paused. The SC Axiomatic
Storm and Axiomatic Water errata are distinguished from summary changes.
Existing `3870:material-quantity` is unchanged source-only context: creation-only
summaries make no material ruling. No new or summary-relevant unresolved question
is introduced. Accepted body/mechanical context is bound to explicit private Git
revisions without reading or changing operator databases.

## Validation and replay

The private replay checks every scoped input and disposition, all 4,468 cited
span references, fresh page geometry, frozen body/mechanical context and paired
semantic values. Negative controls reject stale rows, missing decisions,
out-of-scope keys, unrelated line changes and a same-count altered correction
handoff. Every full correction row equals its decision and derived proposal.
Unicode, whitespace, placeholder and long repeated-prose checks pass. These
prose summaries have no fixed byte budget or control-token syntax.

The maintained summary parser and `summaries:import` implementation run on a
small command-created summary-only database seeded with 6,572 canonical rows.
Only the narrow 15-row authored correction handoff is applied. Dry-run changes
nothing; apply updates 15 rows with zero inserts; repeat updates zero. Every
persisted proposal field is equal, and all other 6,557 rows, identities and an
unrelated sentinel table remain exact. Prior accepted #323's 29 rows are also
byte-preserved in the mirror. The disposable DB is removed after verification.

Run from the public root and again from `data-tools`, with absolute roots and
the existing runtime checkout. Choose fresh run labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-361/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision af9296f19b29a05d60915fe4871a1d0e5ebaf63e --run review-root
```

Replay verifies that every helper's working text matches that exact committed
revision, regenerates deterministic authored outputs, and records the actual
public head and caller directory in private `replay-<run>.json`,
`verification-<run>.json` and `importer-<run>.json`. Runtime dependencies are reused
without installation or worktree links. Full exact-head remote `ci:portable`
remains the merge gate.

The shared canonical owner, prior evidence and PDFs are unchanged. No name,
body, mechanics, operator DB, app-state, private push or production activation
is part of this delivery. Main-gate/#346 merges accepted narrow correction rows,
not a replacement whole-file mirror.
