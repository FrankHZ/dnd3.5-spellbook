# Spell Compendium summary source QA, slice 12

[Issue #386](https://github.com/FrankHZ/dnd3.5-spellbook/issues/386) reviews
the twelfth frozen summary slice under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-12.json)
lists every existing stable key and disposition. Main-gate/#346 owns semantic
acceptance and integration. Original source ambiguities remain recorded separately.

## Scope and review

Scope is `suggestedSummarySlices[11]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: exactly 50 targets / 84 existing rows.
Public base is `9f118a070a298cadf25a7209a52886b89b905d95`, synchronized with main
`3e3a131842ccf9bcc8e7955466c68e3434c6afb6`. Canonical private summary input remains
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`.

Private handoff/helper commit `edcc352f051e59baa13db28729ea0535c8403e78` owns
`dice-qa/books/86/issue-386/`. It reuses accepted
[#353 provenance](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), plus strengthened
[#380 evidence contracts](./spell-compendium-summary-source-qa-10.md).
The #379 helper reference is technical reuse, not semantic acceptance of that packet.
All 84 full current rows, actual-value reasons, 50 independent paired comparisons,
accepted context locks and exact source/parent spans are private review evidence.
All 100 final accepted Chinese name/body rows for these 50 targets are bound to
`0688739d92a2aa9fb3eceeb444daa7260e711058`,
`dice-qa/books/86/issue-365/field-dispositions.jsonl`; the historical context stays frozen.

The proposal corrects 20 rows (10 EN / 10 ZH) on 18 targets and retains 64.
Corrections address damage dice/caps, errata mote count, invented subsequent damage,
temporary hit points, elapsed-round damage, magical targeted shadows, object choice,
involuntary movement, actual skill checks, melee-only damage, death eligibility,
metal-armor entanglement, the lesser sonic progression, unsupported duration wording,
and corrupt wording/marks.
Accurate concise descriptions stay unchanged; omitted details alone do not require
expansion. Only listed existing keys are authored; missing summaries remain outside scope.

Original English SC entries and applicable official errata govern. All entries and
continuations were freshly read, with necessary direct parents and the complete accepted
English/mechanical and actual final accepted Chinese name/body contexts. Twenty-six bounded pages were
freshly extracted and visually inspected as original Poppler layouts. Parents include
complete SC True Domination, the One Mind chain and both Acid Orb chains; direct PHB
reads cover sanctuary, spider climb, Wall of Force with its continuation, haste,
deathwatch, fear, and rogue abilities. Both complete official errata documents were read.
Moonbow's corrected count/duration and Nerveskitter's flat-footed exception are bound;
PHB rogue-proficiency errata does not change the listed summary benefits.

Exact unavailable DMG/MM and historical other-book references are recorded as
unverified, without importing extra rules or resuming broad queues.

Existing `4574:permanent-duration` remains a source-only context question:
the original duration header and body conflict. Its English summary now inherits
True Domination and states the any-creature scope, removing unsupported
“nearly permanent” without choosing a duration. Chinese “持久” remains compatible
with either reading. Final accepted body note
`4611:nonmetal-armor-secondary-effect-source` is also preserved: summaries make
no claim about the secondary effect on nonmetal-armored targets. Neither note
requires a summary ruling; no summary-relevant unresolved question remains.

## Validation and handoff

`corrections.jsonl` is the only narrow authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All 6,552 other canonical
lines and accepted #323 rows are byte-preserved; accepted #353/#361 packets remain
unchanged. Other proposed slices are not composed into the canonical input.

The verifier reopens original PDFs and compares exact fresh text/geometry, audit scope,
full rows, frozen locators, accepted contexts, source notes, errata and complete parent
evidence. It replays 7,925 span references. Sixteen negative controls reject stale,
missing, duplicate or extra decisions/handoff/evidence, altered same-count corrections,
stale contexts/final accepted bodies/target bindings/locators/PDF geometry and unassigned line changes. Unicode, whitespace,
placeholder and repeated-prose checks pass with no invented byte budget/token syntax.

The maintained parser and real `importRows` consume only the 20-row handoff on a
tiny disposable summary-only SQLite DB seeded with 6,572 baseline rows. Dry-run is
unchanged; apply updates20/inserts0; repeat updates0/unchanged20. Every persisted field,
all untouched rows, identities and an unrelated sentinel are compared. The DB is
removed; importer CLI `main` is disabled to avoid environment-selected operator DBs.

Replay the fixed committed helper revision from public root and `data-tools`, using
absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-386/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision edcc352f051e59baa13db28729ea0535c8403e78 --run final-root
```

Replay verifies helper text against that revision, regenerates deterministic
context/decisions/comparisons/mirror, and records caller cwd and public head. Runtime
dependencies are reused without installation or links. Exact final public head,
private proof revision and full remote `ci:portable` results belong in the PR delivery;
green checks do not replace main-gate semantic review.

Canonical content, operator databases, app-state, private push and production remain
outside the write boundary. Main-gate reviews and integrates accepted narrow rows.
