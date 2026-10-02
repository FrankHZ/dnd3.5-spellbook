# Spell Compendium summary source QA, slice 09

[Issue #379](https://github.com/FrankHZ/dnd3.5-spellbook/issues/379) proposes
source-faithful review of 50 SC targets / 96 existing bilingual summary rows.
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-09.json)
records every assigned stable key and disposition. Main-gate owns acceptance
and integration through [#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346).

## Scope and handoff

Scope is `suggestedSummarySlices[8]` from audit
`e793ff09a38060c5c6b336d28690353bd0d96909`. The canonical private input remains
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public base is
`fe4b9db939e0d49787f5582cf8957c531798aad7`, synchronized with relevant main
through `70eff96c77223dd6e1c05206de549b80407b5423`.

Private handoff/helper revision `9d1a6d4229d7153b834b36b116570e48de5916a2`
owns `dice-qa/books/86/issue-379/`. It reuses the accepted #353 contract
`e154c69e817c81d7e48da105c46daba83a4da8c4` and #361 narrow importer contract
`af9296f19b29a05d60915fe4871a1d0e5ebaf63e`, with the later source/context
binding checks adapted for this batch.

There are 96 individually authored reasons and 50 actual-value bilingual/body
comparisons. The proposal corrects 38 rows across 26 targets (17 English,
21 Chinese) and retains 58 rows. Corrections concern target qualification,
triggers, duration, damage scaling, temporary hit points, bonus types,
movement modes, conditional effects, named appearance and weapon behavior.
Concise accurate summaries retain their existing wording and level of detail.

`corrections.jsonl` is the authored narrow handoff.
`summaries.proposed.jsonl` is a derived review mirror preserving row order and
all 6,476 out-of-scope lines; 6,534 canonical lines remain byte-identical to the
frozen input. The mirror must not replace canonical summaries or become an
import input. Prior accepted #323/#353/#361 packets remain read-only.

## Evidence and verification

Each decision binds its complete current row, original printed/physical pages
and spans, direct dependencies, and frozen accepted bilingual/body/mechanical
context. Fresh extraction and individual Poppler layout inspection cover
29 pages, with 5,000 entry/parent span references replayed. The complete local
SC and PHB official errata were read. No SC errata names an assigned entry.
The PHB parent correction for `4709:touch-spell-turning` is preserved;
context-only animal-companion and special-mount errata do not alter the summaries.

The accepted `4691:healing-cost` and `4691:save-application` reader notes remain
unchanged in body context. Its retained English summary does not decide those
source ambiguities. There are no newly adjudicated source questions or
summary-relevant unresolved rows. Named external abilities, templates and
creatures are retained only to the extent explicitly stated by SC; external
statblocks and terrain mechanics are not expanded without original verification.

The verifier rejects stale current rows, canonical/context source locks,
source locators/excerpts/geometry, missing or duplicate decisions/corrections,
out-of-scope changes, and a stale same-count handoff. It checks complete
correction-row equality with decisions and mirror, paired values, repeated
prose, placeholders, Unicode and whitespace. It invents no byte budget or
control-token syntax.

The maintained summary parser and `importRows` consume only the 38-row narrow
handoff on a disposable summary-only database with 6,572 baseline rows and an
unrelated sentinel table. Dry-run preserves all rows; apply updates exactly
38 and inserts zero; repeat updates zero. Every persisted proposal field
matches, and all 6,534 other rows and the sentinel are unchanged. The database
is removed after the run. Fixed-revision replay passes from repository root
and `data-tools`; final-head evidence records exact public revisions privately.
Full remote `ci:portable` at the final PR head remains the merge gate.

## Reproduction

Use explicit roots for this checkout, the private data repository and the
existing shared runtime. No dependency installation, links, full database
copies or operator database access are needed.

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-09'
$dataRoot = 'G:/spell-book/data'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$qaRoot = Join-Path $dataRoot 'dice-qa/books/86/issue-379'
$python = Join-Path $runtimeRoot 'data-tools/pdf-extract/.venv/Scripts/python.exe'
$revision = '9d1a6d4229d7153b834b36b116570e48de5916a2'
$env:PYTHONDONTWRITEBYTECODE = '1'
Set-Location $codeRoot
& $python -X utf8 "$qaRoot/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision $revision --run review-root
Set-Location (Join-Path $codeRoot 'data-tools')
& $python -X utf8 "$qaRoot/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision $revision --run review-package
```

Choose unused run labels to keep your evidence separate. This proposal does
not write canonical summaries, names, bodies, mechanics, operator databases or
app-state, add missing summaries, resume broad PHB/other-book queues, push the
private repository, or activate content. Acceptance and authorized integration
remain main-gate responsibilities.
