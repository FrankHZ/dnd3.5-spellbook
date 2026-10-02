# Spell Compendium summary source QA, slice 08

[Issue #376](https://github.com/FrankHZ/dnd3.5-spellbook/issues/376) reviews the
eighth frozen summary slice under
[SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-08.json)
lists all exact keys and dispositions. Main-gate/#346 owns acceptance and
maintained integration; these are guarded proposals awaiting review.

## Scope and evidence

The scope is `suggestedSummarySlices[7]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 95 existing EN/ZH rows.
Canonical summaries are frozen at private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. The public base is `52bf0b725d3f16dde1eac7aeec172d14d8a05d96`; the final checked
remote main is `071cf8b13246a05971326095548aef91880b0fe2`.

Private handoff/helper revision `11c38629ae3a7ebe957ed88210a9ff519fd6656e` owns
`dice-qa/books/86/issue-376/`. It reuses the accepted
[#353 contract](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer contract](./spell-compendium-summary-source-qa-02.md),
with independently authored actual-value reasons and 50 paired comparisons.
It binds complete original entries, necessary direct parents, current accepted
EN/mechanics/ZH, fresh geometry, and complete applicable official errata.
All 27 bounded pages were freshly extracted and visually inspected, including
SC's first-printing imprint. Original locators use the canonical C/D owners;
unreviewed A-owner placeholders are not used as source evidence.

There are 21 proposed corrections (8 EN / 13 ZH) and 74 retentions. Corrections
address movement and dimensions, numerical bonuses/damage, target versus missile
counts, extra damage versus entire-hit avoidance, pre-death healing, invented
level growth, recording scope, creature type, alignment recipients and protection
exceptions. Concise accurate summaries stay concise; omissions alone are not
treated as defects. Missing summaries are not created.

Existing `3795:sphere-motion` and `4539:balance-save` questions remain unchanged
as source-only context. The summaries do not decide either question, and no new
source ruling is introduced. The armor ability summary is limited to SC's named
grant. Its external DMG219 mechanics are not independently verified or expanded;
the limitation is recorded privately in both decisions and correction provenance.
Other external monster references likewise do not certify absent stat blocks.
No summary disposition remains unresolved; this does not resolve the existing
body questions or authenticate external capability expansions.

## Validation and replay

Private replay evidence `9302cb9ceb85015a2b23627df9c298c1660324cf` records root
and package runs on the checked base using the exact helper revision. Replay
reopens the PDFs and compares full page geometry, all 5,169 cited span references,
scope, current rows, context source locks and deterministic authored outputs.
Negative controls reject stale, missing, duplicate and out-of-scope rows,
same-count altered corrections, unrelated mirror changes and modified geometry
or source locks. Unicode, whitespace, placeholders and long repeated prose checks
pass. These summaries have no fixed byte budget or special control-token syntax;
counts and green checks do not replace semantic acceptance.

`corrections.jsonl` is the narrow authored handoff. The complete line-preserving
`summaries.proposed.jsonl` is derived review output, never canonical authoring
input. All full correction rows equal their decisions and mirror values. All
other 6,551 lines, accepted #323's 29 rows and prior #353/#361 packets are preserved.

The real maintained summary parser and `importRows` consume only the 21-row
handoff on a tiny command-created summary-only database seeded with 6,572 rows.
Dry-run changes nothing; apply updates 21 with zero inserts; repeat updates zero.
Every persisted proposal field matches, while all other rows, identities and the
unrelated sentinel remain exact. The disposable DB is removed after verification.

Use absolute roots and the existing runtime, and choose a fresh run label. Run
from the public root and again from `data-tools`:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-376/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 11c38629ae3a7ebe957ed88210a9ff519fd6656e --run review-root
```

Replay verifies the helper working text against the committed revision and writes
private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
with the actual caller directory and public head. Dependencies are reused without
installation or worktree links. Full exact-head remote `ci:portable` is the merge
gate; final-head replay and CI evidence belong to the linked PR.

No canonical, name/body/mechanics, operator DB, app-state, private push or
production activation is part of this delivery. Paused broad source workflows
remain paused. Main-gate/#346 integrates accepted narrow rows and owns operator
migration and subsequent UI/HTML acceptance.
