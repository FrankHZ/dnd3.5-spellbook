# Spell Compendium summary source QA, slice 11

[Issue #383](https://github.com/FrankHZ/dnd3.5-spellbook/issues/383) reviews the
eleventh frozen summary slice under
[SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-11.json)
lists all exact keys and dispositions. Main-gate/#346 owns acceptance and
maintained integration; these are guarded proposals awaiting review.

## Scope and evidence

The scope is `suggestedSummarySlices[10]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets and 89 existing EN/ZH rows.
Canonical summaries remain frozen at private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. The public base is
`70eff96c77223dd6e1c05206de549b80407b5423`; the final checked remote main is
`9f118a070a298cadf25a7209a52886b89b905d95`.

Private handoff/helper revision `e594d44ed330b0d716c90dac8ecf866ad2cd72ce` owns
`dice-qa/books/86/issue-383/`. It reuses the accepted
[#353 contract](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer contract](./spell-compendium-summary-source-qa-02.md),
with independently authored actual-value reasons and 50 paired comparisons.
Complete original entries, necessary direct parents, accepted bilingual body and
mechanics, fresh geometry and complete applicable official errata are bound together.
All 18 bounded original pages were freshly extracted and visually inspected,
including SC's first-printing imprint and the two necessary PHB reference pages.
This bounded reading does not resume broad PHB or other-book workflows.

There are 22 proposed corrections (13 EN / 9 ZH) and 67 retentions. Corrections
address damage dice and scaling, nonlethal cost, overbroad immunity or command
protection, illumination and skill thresholds, unsupported extra benefits,
single-target versus mass planar scope, jaw-pair counts, travel boundaries,
weapon/shield identity, damage types and condition terminology. Accurate concise
summaries stay concise; omissions alone do not require expansion. No missing
summary, name, body or mechanics is authored by this slice.

Source-only reader notes preserve the existing range header/prose, ejection,
component inheritance and target/prose differences. No new source ruling is made,
and no summary disposition remains unresolved. The named pounce, coexistent-plane
and Solid Fog references remain bounded to SC's explicit grant or citation;
external mechanics are not independently authenticated or expanded. The opposite
alignment mantle family legitimately shares unchanged English wording; every
variant was compared with its complete parent and specific descriptor override.

## Validation and replay

Private replay evidence `976c461359945e512cdeb654e2a7828a2eca50a3` records root
and package runs with the exact committed helper revision. Replay reopens original
PDFs and compares complete page geometry and all 3,666 cited span references,
scope, current rows, context source locks and deterministic authored outputs.
Negative controls reject stale, missing, duplicate and out-of-scope decisions or
handoff rows, same-count altered corrections, unrelated mirror changes, modified
source locators, bilingual context and PDF geometry. Unicode, whitespace,
placeholder and unrelated repeated-prose checks pass. These summaries have no
fixed byte budget or special control-token syntax; checks and counts do not replace
semantic acceptance.

`corrections.jsonl` is the narrow authored handoff. The complete line-preserving
`summaries.proposed.jsonl` is derived review output, never canonical authoring
input. All full correction rows equal their decisions and mirror values. All
other 6,550 lines, accepted #323's 29 rows and prior #353/#361 packets remain exact.

The maintained summary parser and `importRows` consume only the 22-row handoff
on a tiny command-created summary-only database seeded with 6,572 rows. Dry-run
changes nothing; apply updates 22 with zero inserts; repeat updates zero. Every
persisted proposal field matches, while all other rows, identities and an unrelated
sentinel remain exact. The disposable database is removed after verification.

Use absolute roots and the existing runtime, and choose a fresh run label. Run
from the public root and again from `data-tools`:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-383/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision e594d44ed330b0d716c90dac8ecf866ad2cd72ce --run review-root
```

Replay verifies helper working text against the committed revision and writes
private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
with the actual caller directory and public head. Dependencies are reused without
installation or links. Full exact-head remote `ci:portable` is the merge gate;
final-head replay and CI evidence belong to the linked PR.

No canonical, operator DB, app-state, private push or production activation is
part of this delivery. Main-gate/#346 reviews and integrates accepted narrow rows
and owns operator migration and subsequent UI/HTML acceptance.
