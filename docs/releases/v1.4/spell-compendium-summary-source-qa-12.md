# Spell Compendium summary source QA, slice 12

[Issue #386](https://github.com/FrankHZ/dnd3.5-spellbook/issues/386) reviews
the twelfth frozen summary slice under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-12.json)
lists every existing stable key and disposition. Main-gate/#346 owns semantic
acceptance and integration; the duration question below remains unresolved.

## Scope and review

Scope is `suggestedSummarySlices[11]` at audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: exactly 50 targets / 84 existing rows.
Public base is `9f118a070a298cadf25a7209a52886b89b905d95`, synchronized with main
`9b3a4910a82fc2969191a8a2024ff159a136866f`. Canonical private summary input remains
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`.

Private handoff/helper commit `45fdd7d226f9f11cd90d9220ca04a7ed9595060e` owns
`dice-qa/books/86/issue-386/`. It reuses accepted
[#353 provenance](./spell-compendium-summary-source-qa-01.md) and
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), plus strengthened
[#380 evidence contracts](./spell-compendium-summary-source-qa-10.md).
The #379 helper reference is technical reuse, not semantic acceptance of that packet.
All 84 full current rows, actual-value reasons, 50 independent paired comparisons,
accepted context locks and exact source/parent spans are private review evidence.

The proposal corrects 19 rows (9 EN / 10 ZH) on 17 targets and retains 65.
Corrections address damage dice/caps, errata mote count, invented subsequent damage,
temporary hit points, elapsed-round damage, magical targeted shadows, object choice,
involuntary movement, actual skill checks, melee-only damage, death eligibility,
metal-armor entanglement, the lesser sonic progression, and corrupt wording/marks.
Accurate concise descriptions stay unchanged; omitted details alone do not require
expansion. Only listed existing keys are authored; missing summaries remain outside scope.

Original English SC entries and applicable official errata govern. All entries and
continuations were freshly read, with necessary direct parents and the complete accepted
English/mechanical and available Chinese contexts. Twenty-six bounded pages were
freshly extracted and visually inspected as original Poppler layouts. Parents include
complete SC True Domination, the One Mind chain and both Acid Orb chains; direct PHB
reads cover sanctuary, spider climb, Wall of Force with its continuation, haste,
deathwatch, fear, and rogue abilities. Both complete official errata documents were read.
Moonbow's corrected count/duration and Nerveskitter's flat-footed exception are bound;
PHB rogue-proficiency errata does not change the listed summary benefits.

Accepted Chinese bodies are absent for targets 4611, 4612, 4613, 4614, 4616 and 4617
in the exact frozen context. Existing summaries are reviewed against the complete
original and accepted English/mechanics; no Chinese body is manufactured or accepted
from neighboring entries. Exact unavailable DMG/MM and historical other-book references
are recorded as unverified, without importing extra rules or resuming broad queues.

Existing `4574:permanent-duration` is summary-relevant and remains unresolved:
the original duration header and body conflict. Both existing summaries are retained
provisionally with the accepted reader note. General errata precedence is recorded;
this packet does not choose a ruling or mark these two rows semantically accepted.

## Validation and handoff

`corrections.jsonl` is the only narrow authored handoff. The full
`summaries.proposed.jsonl` is derived review evidence. All 6,553 other canonical
lines and accepted #323 rows are byte-preserved; accepted #353/#361 packets remain
unchanged. Other proposed slices are not composed into the canonical input.

The verifier reopens original PDFs and compares exact fresh text/geometry, audit scope,
full rows, frozen locators, accepted contexts, source notes, errata and complete parent
evidence. It replays 7,925 span references. Fourteen negative controls reject stale,
missing, duplicate or extra decisions/handoff/evidence, altered same-count corrections,
stale contexts/locators/PDF geometry and unassigned line changes. Unicode, whitespace,
placeholder and repeated-prose checks pass with no invented byte budget/token syntax.

The maintained parser and real `importRows` consume only the 19-row handoff on a
tiny disposable summary-only SQLite DB seeded with 6,572 baseline rows. Dry-run is
unchanged; apply updates19/inserts0; repeat updates0/unchanged19. Every persisted field,
all untouched rows, identities and an unrelated sentinel are compared. The DB is
removed; importer CLI `main` is disabled to avoid environment-selected operator DBs.

Replay the fixed committed helper revision from public root and `data-tools`, using
absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-386/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 45fdd7d226f9f11cd90d9220ca04a7ed9595060e --run review-root
```

Replay verifies helper text against that revision, regenerates deterministic
context/decisions/comparisons/mirror, and records caller cwd and public head. Runtime
dependencies are reused without installation or links. Exact final public head,
private proof revision and full remote `ci:portable` results belong in the PR delivery;
green checks do not replace main-gate semantic review.

Canonical content, operator databases, app-state, private push and production remain
outside the write boundary. Main-gate reviews and integrates accepted narrow rows.
