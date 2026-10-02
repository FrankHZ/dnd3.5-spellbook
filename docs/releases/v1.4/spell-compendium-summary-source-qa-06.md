# Spell Compendium summary source QA: slice 06

[Issue #371](https://github.com/FrankHZ/dnd3.5-spellbook/issues/371) delivers
the frozen sixth summary slice under
[the SC delivery issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-06.json)
lists every exact key and disposition. Main-gate/#346 owns acceptance and
maintained integration. These outputs remain guarded proposals, with one
existing summary-relevant source question still unresolved.

## Scope and evidence

`suggestedSummarySlices[5]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909` assigns exactly 50 targets and
92 existing EN/ZH rows. Canonical input is private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public work starts from
`ad5c782d7dc36204e6e38fa69e44021426751a90`, synchronized with main
`52bf0b725d3f16dde1eac7aeec172d14d8a05d96`. Missing summaries are not authored.

Private handoff/helper commit `6d4b61f345c4163a0a2168b2602cb8d7340da5d4` owns
`dice-qa/books/86/issue-371/`. It reuses the accepted
[#353 contract](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer contract](./spell-compendium-summary-source-qa-02.md),
with new actual-value reasons for all 92 rows, 50 bilingual context comparisons,
and a separate second semantic read by the same task owner. Original text,
accepted full body/mechanical context, decisions, helpers and evidence stay
private. Five empty review-a locators use the accepted review-d entry boundaries
at the same frozen private revision; prior packets remain read-only.

The result is 25 proposed corrections (9 EN, 16 ZH), 65 source-correct
retentions and two unresolved retentions. Corrections address incorrect effect
direction, damage recipients, critical terminology, HD and hardness values,
attack triggers, skill-check scope, probabilities and travel/energy wording.
Accurate short summaries remain short; omissions alone do not require expansion.

Complete original SC entries, necessary SC/PHB parents, full official SC and
PHB errata and the December 2005 first-printing evidence were read. All 27
bounded pages were freshly extracted and visually inspected. Earth Lock's
Huge-blocker errata is preserved; the supplied PHB Dispel Magic parent already
matches its 20-foot area errata. Unavailable external references remain explicit
references, without invented tables, identities or claims of independent review.
The broad PHB workflow remains paused.

`3544:darkness` remains a summary-relevant unresolved source question. Both
existing rows are retained with `faithful-unresolved-source-note`, not counted
as a source-correct pass. The complete original and accepted reader note are
preserved without a new ruling. Existing `4443:item-energy` and
`4443:sr-application` remain source-only context; these summaries assert neither
the disputed formula nor an SR check's subject or timing. No new question is added.

## Validation and replay

The authored handoff is narrow `corrections.jsonl`; the derived whole-file
`summaries.proposed.jsonl` is only a review mirror. Full correction rows match
their decisions and mirror, including prior provenance. The other 6,547
canonical lines are byte-preserved. Accepted #323/#353/#361 packets are unchanged
and disjoint; other proposed slices are not composed into this mirror.

Replay checks exact frozen scope/current rows, committed helpers/authored values,
fresh original geometry/text and all 5,643 cited span references. Thirteen
negative controls reject stale source/context, missing/duplicate/out-of-scope
records, unrelated line changes and altered text/provenance in a same-count
correction handoff. Unicode, whitespace, placeholder and repeated-prose checks
pass. These prose summaries have no fixed byte budget or control-token syntax.
Counts and validation success do not resolve the remaining source question.

The maintained parser and actual `importRows` run against a small command-created
summary-only disposable database with 6,572 baseline rows. Only the narrow
25-row handoff is consumed. Dry-run changes nothing; apply updates 25 with zero
inserts; repeat updates zero. Every persisted proposal field matches, while IDs,
all other rows and a sentinel table are unchanged. The disposable file is removed.
CLI `main()` is disabled so it cannot select an operator database.

Run from the public root and again from `data-tools`, supplying absolute roots
and the existing runtime checkout, with fresh run labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-371/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 6d4b61f345c4163a0a2168b2602cb8d7340da5d4 --run review-root
```

Private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
record the exact public head and caller directory. Runtime dependencies are reused
without installation or links. Complete exact-head remote `ci:portable` remains
the merge gate. Canonical summaries, source PDFs, names/bodies/mechanics, operator
DB/app-state and production remain untouched. Main-gate integrates accepted
narrow rows and owns unresolved-source decisions and later write authorization.
