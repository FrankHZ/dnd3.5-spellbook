# Spell Compendium summary source QA, slice 05

[Issue #369](https://github.com/FrankHZ/dnd3.5-spellbook/issues/369) proposes
source-faithful review of the fifth frozen SC summary slice. The
[source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-05.json)
records its exact keys, dispositions and checks. Main-gate owns acceptance and
maintained integration through [#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346).

## Scope and evidence

The scope is `suggestedSummarySlices[4]` from frozen audit
`e793ff09a38060c5c6b336d28690353bd0d96909`: 50 targets / 93 existing EN/ZH rows.
Canonical input is private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`.
The public base is `a5a15c4d3656cfed4710797469af8bbcc2348ef5`, synchronized
with relevant main through `e3f8fccfbc026871c15ee99e6ba86f67d4e2741f`.

Private handoff/helper revision `729510064c313c1383452b050db7da9304adf9ff`
owns `dice-qa/books/86/issue-369/`. It adapts accepted #353 helpers
`e154c69e817c81d7e48da105c46daba83a4da8c4` and #361's narrow importer contract
`af9296f19b29a05d60915fe4871a1d0e5ebaf63e`. It contains 93 independently
authored actual-value reasons, 50 bilingual comparisons and complete read-only
accepted body/mechanical context. Actual GPT-6.1 Sol/high is verified from
persisted turn metadata in the private record.

Complete original entries, needed direct parents and both complete official
errata were read. Thirty bounded original pages were freshly extracted and
visually inspected, including cross-column continuations. The direct PH265
comparison tests an existing summary's unsupported parent equivalence; it does
not resume broader PHB work. The PH223 parent span includes its final lines that
old locators had truncated. Original PDF and applicable errata govern; old CHM,
dice and derived English text supply context.

There are 28 proposed corrections (14 EN / 14 ZH) on 21 targets and 65 retentions.
They address wrong damage and attack types, invented conditions/properties,
incorrect target/trigger scope, subtype identities, unsupported inheritance and
malformed translation meaning. Accurate concise summaries stay unchanged;
omission alone does not require expansion. Existing `4378:teleport-category`
and `4394:dispel-order` remain source-only context with accepted notes preserved
verbatim. No new source question or summary ruling is introduced.

`corrections.jsonl` is the narrow authored handoff. The full
`summaries.proposed.jsonl` is a derived, line-preserving mirror. Shared canonical
input and prior accepted packets are preserved; main-gate owns maintained merging.

## Validation and replay

Private replay evidence revision `75ab88df20e4b04ac062eda72bc4ccc83707c612`
records root and package runs of the exact committed helpers. All 6,043 source
span references and fresh geometry match. Full correction rows agree with
decisions and mirror; scope/source-lock, stale, missing, duplicate, out-of-scope
and unrelated-change negative controls pass. Prose checks find no long repeated
verdict/summary template, placeholder, Unicode/control residue or whitespace
damage. These summaries have no fixed byte budget or control-token syntax.

The maintained parser and actual `importRows` consume only the 28 narrow
corrections on a tiny command-created summary-only database. Dry-run changes
nothing; apply updates 28 and inserts none; repeat updates none. Every persisted
proposal field matches. All 6,544 other rows, accepted #323's 29 rows, identities,
variants and an unrelated table sentinel are preserved. The disposable file is
removed after success. Prior #353/#361 decision, correction and mirror files
remain equal to their accepted revisions.

Run from the public root and again from `data-tools`, using absolute paths,
the existing authorized runtime and a fresh label each time:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-369/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 729510064c313c1383452b050db7da9304adf9ff --run review-root
```

Private `replay-<run>.json`, `verification-<run>.json` and `importer-<run>.json`
record caller directory and actual public head. Runtime reuse needs no install
or links. Complete remote `ci:portable` at the exact PR head remains the merge gate.

No missing summaries, names, bodies, mechanics, operator DBs, app-state,
canonical source, old accepted evidence, private push or production activation
is changed. Other-book and broad PHB queues remain paused. Main-gate/#346 owns
acceptance and any subsequent authorized integration/application.
