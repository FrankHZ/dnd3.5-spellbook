# Spell Compendium summary source QA, slice 17

[Issue #396](https://github.com/FrankHZ/dnd3.5-spellbook/issues/396) owns the
seventeenth frozen summary slice under SC delivery #342. The
[source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-17.json)
lists all 78 existing keys for 50 targets. These proposals await main-gate/#346
semantic acceptance and maintained integration.

Scope is `suggestedSummarySlices[16]` at public audit
`e793ff09a38060c5c6b336d28690353bd0d96909`. Canonical input is private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`; public integration base is
`997b1008843053763f407e01268bc29b84331500`.

Private handoff/helper commit `8ac9f555f694ec442638f0aee96721cb9deccf2a`
owns `dice-qa/books/86/issue-396/`. It reuses accepted
[#353](./spell-compendium-summary-source-qa-01.md) and
[#361](./spell-compendium-summary-source-qa-02.md) contracts and strengthened
#379/#380/#389/#390 checks. Every existing row has an independently authored
actual-value reason; all 50 targets have a paired language comparison.

Complete original SC entries, continuations, necessary direct parents and
complete SC/PHB official errata were read. All 26 bounded original pages were
freshly extracted and visually inspected, including the first-printing imprint,
cross-column and continued entries, and full PHB range/summoning parents.
Frozen English/mechanics context is retained. All 100 final accepted name/body
fields, including full text, HTML, origin and review, bind to private candidate
`0688739d92a2aa9fb3eceeb444daa7260e711058` /
`dice-qa/books/86/issue-365/field-dispositions.jsonl`. The candidate is review
context; original PDFs and official errata govern.

There are 18 corrections (7 EN / 11 ZH) and 60 retentions. Corrections address
distinct contact/passage effects, living/undead healing, bounded search checks,
nonlethal damage, the official dagger target erratum, saddle check scope,
damage to stone creatures, sphere diameter, immobilization, storm behavior,
an existing touched ship, outsider-only defenses, and greater-elemental rank.
Accurate concise summaries remain concise. No missing row, name, body or
mechanics is authored.

Steeldance's Targets/Focus wording and Stone Shatter's SC/PHB Close formulas
remain separate source-only questions without a new ruling. No summary row is
unresolved. The old WuJen9 residual for Summon Elemental Monolith is historical
and absent from its final accepted body. DMG94–95, MM16/40/52/93/96–100,
Complete Arcane156 and Planar Handbook114/118 references retain their SC
context; unavailable external statistics are not independently authenticated
or expanded. Necessary PHB reading does not resume broad extraction or
translation queues.

Private replay evidence `88ba2ef3f69081aae110d586114408bdf7405d2a` records
root and package runs with exact committed helpers. Verification reopens
original PDFs, compares complete geometry and 6,404 cited spans, and checks
full current rows, exact scope, locators and accepted context. Negative
controls reject stale, missing, duplicate and out-of-scope decisions, handoff,
source pages and parent evidence, same-count altered corrections and altered
or cross-target final fields, including HTML, origin and review. Unicode,
whitespace, placeholders and unrelated repeated prose checks pass. Counts and
checks do not replace semantic acceptance.

`corrections.jsonl` is the narrow authored handoff. The full line-preserving
`summaries.proposed.jsonl` is derived review output. Full correction rows match
decisions and mirror values; all other 6,554 canonical lines, accepted #323's
29 rows and accepted #353/#361 packets remain exact.

The maintained parser and actual `importRows` consume only the 18-row handoff
on a tiny disposable summary-only database seeded with 6,572 rows. Dry-run
changes nothing; apply updates 18 with zero inserts; repeat updates zero.
Every persisted column, including the generated timestamp, is checked. All
untouched rows, identities and the unrelated sentinel remain exact; the
disposable database is removed.

Use absolute roots, the existing runtime and a fresh run label. Run from the
public root and again from `data-tools`:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-396/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 8ac9f555f694ec442638f0aee96721cb9deccf2a --run review-root
```

Replay compares helper working text with its committed revision and writes
private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
with actual caller directory and public head. Final-head root/package replay
and full remote `ci:portable` evidence belong to the linked PR.

Canonical input, operator databases, app-state, private push and production
activation are outside this delivery. Main-gate owns acceptance, integration
and subsequent operator migration and UI/HTML validation.
