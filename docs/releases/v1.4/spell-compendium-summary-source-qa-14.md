# Spell Compendium summary source QA, slice 14

[Issue #390](https://github.com/FrankHZ/dnd3.5-spellbook/issues/390) owns the
fourteenth frozen summary slice under SC delivery #342. The
[source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-14.json)
lists all 75 exact existing keys for 50 targets. These proposals await
main-gate/#346 semantic acceptance and maintained integration.

Scope is `suggestedSummarySlices[13]` at public audit
`e793ff09a38060c5c6b336d28690353bd0d96909`. Canonical input is private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`; integration base is
`3e3a131842ccf9bcc8e7955466c68e3434c6afb6`.

Private handoff/helper commit `9f76e6c8828512b5306e602bafa50975bedc5673`
owns `dice-qa/books/86/issue-390/`. It reuses accepted
[#353](./spell-compendium-summary-source-qa-01.md) and
[#361](./spell-compendium-summary-source-qa-02.md) contracts with strengthened
#379/#380 replay checks. Every existing row has an independently authored
actual-value reason; all 50 targets have a paired language comparison.

Complete original entries, continuations, necessary direct parents and complete
SC/PHB official errata were read. All 29 bounded original pages were freshly
extracted and visually inspected, including SC's first-printing imprint, Panacea
and necessary PHB Wish references. Frozen English/mechanics context is retained.
All 100 final accepted name/body fields, including full text, HTML, origin and
review, are bound to private candidate
`0688739d92a2aa9fb3eceeb444daa7260e711058` /
`dice-qa/books/86/issue-365/field-dispositions.jsonl`. The accepted candidate is
review context; original PDFs and official errata govern.

There are 10 corrections (4 EN / 6 ZH) and 65 retentions. Corrections address
simultaneous conditions, poison damage dice, the first charge attack, alignment
scope, melee/full-attack restrictions, one chosen natural weapon, instantaneous
push, finite energy resistance, and the complete damage-reduction gate for
reflected projectiles. Accurate concise summaries remain concise. No missing
row, name, body or mechanics is authored.

Existing push-distance, target/prose, good-undead overlap and temporary-HP timing
notes remain separate without a new ruling. No summary disposition is unresolved.
DMG149/292 and MM314 citations retain their SC context; unavailable external
mechanics are not independently authenticated or expanded. Necessary PHB reading
does not resume broad extraction or translation queues.

Private replay evidence `ef0ca91a306fdf3c334d652fa16f96816a2341d3` records
root and package runs with the exact committed helpers. Verification reopens
original PDFs, compares complete geometry and 4,758 cited span references, and
checks full current rows, exact scope, locators and accepted context. Negative
controls reject stale, missing, duplicate and out-of-scope decisions, handoff,
pages and parent evidence, cross-target final fields and same-count altered
corrections. Unicode, whitespace, placeholders and unrelated repeated prose
checks pass. Counts and checks do not replace semantic acceptance.

`corrections.jsonl` is the narrow authored handoff. The full line-preserving
`summaries.proposed.jsonl` is derived review output. Full correction rows match
decisions and mirror values; all other 6,562 canonical lines, accepted #323's
29 rows and accepted #353/#361 packets remain exact.

The maintained parser and actual `importRows` consume only the 10-row handoff
on a tiny disposable summary-only database seeded with 6,572 rows. Dry-run
changes nothing; apply updates 10 with zero inserts; repeat updates zero.
Every persisted column, including the generated timestamp, is checked. All
untouched rows, identities and the unrelated sentinel remain exact; the
disposable database is removed.

Use absolute roots, the existing runtime and a fresh run label. Run from the
public root and again from `data-tools`:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-390/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 9f76e6c8828512b5306e602bafa50975bedc5673 --run review-root
```

Replay compares helper working text with the committed revision and writes
private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
with actual caller directory and public head. Final-head root/package replay
and full remote `ci:portable` evidence belong to the linked PR.

Canonical input, operator databases, app-state, private push and production
activation are outside this delivery. Main-gate owns acceptance, integration
and subsequent operator migration and UI/HTML validation.
