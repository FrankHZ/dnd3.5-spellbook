# Spell Compendium accepted summary composition

[Issue #411](https://github.com/FrankHZ/dnd3.5-spellbook/issues/411) delivers one
composition proposal from the twenty independently accepted SC summary slices.
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-composition.json)
lists every exact private revision, final accepted public head, merged PR and
main-gate acceptance comment. Existing public slice reports can retain their
proposal status; the linked owner acceptance comments select their final revision.

The actual union covers 967 assigned targets and 1,671 existing rows: 442
corrections (192 EN / 250 ZH), with 1,229 retentions. The handoff preserves each
complete accepted correction row, including the original slice's review owner,
reason, source pages/spans, source notes and prior provenance. It creates no new
summary text or composition authority. Slice 20 uses the accepted revision whose
4784 Chinese correction explicitly enumerates the four qualifying alignments.

The private `dice-qa/books/86/issue-411/` directory contains:

- `corrections.jsonl`: 442 exact accepted full rows in frozen canonical order.
- `summaries.proposed.jsonl`: the 6,572-row derived canonical candidate.
- `composition-index.jsonl`: 1,671 references to complete original decisions at
  their fixed private revisions, including retained rows and their evidence.
- `locks.json`, acceptance snapshots, bounded helpers and replay proof.

The frozen canonical input is private
`a9cbe07747b1bc908ff4ebcd24244e38e58cb411:short-desc-normalized/summaries.generated.jsonl`;
the assignment is public
`e793ff09a38060c5c6b336d28690353bd0d96909:data-tools/reports/dice-qa/books/86/final-qa-coverage.json`.
All other 6,130 candidate lines preserve that canonical Git blob byte-for-byte,
including the previously accepted #323's 29 rows. The missing-summary coverage
facts (222 EN / 82 ZH / 26 neither) do not authorize row creation. The maintained
canonical file remains unchanged pending main-gate acceptance and promotion.

## Reproduce the proposal

The fixed private helper/handoff revision is
`c4fe0c0a7b14aafed04bc9e733387afb51ae45eb`. Run this from either the assigned
repository root or its `data-tools` directory, choosing a fresh run label:

```powershell
& G:/spell-book/worktrees/sc-current-effective-writer/data-tools/pdf-extract/.venv/Scripts/python.exe G:/spell-book/data/dice-qa/books/86/issue-411/reproduce.py --code-root G:/spell-book/worktrees/sc-summary-17 --runtime-root G:/spell-book/worktrees/sc-current-effective-writer --private-revision c4fe0c0a7b14aafed04bc9e733387afb51ae45eb --run main-gate-root
```

The explicit code/data/runtime roots are independent of the caller's cwd. No
install, linked data directory or full corpus/DB copy is needed. The wrapper
binds its helpers, acceptance inputs, index and candidates to the private commit;
the composer reads actual accepted Git blobs and compares current packet text
(allowing checkout CRLF). It checks complete frozen rows, disjoint assignments,
language/variant/ID/book ownership, and exact complete correction/provenance
equality. Source semantics remain the accepted slices' decisions; this replay
does not repeat their full original-source QA or certify unresolved references.

Negative controls reject stale canonical and packet refs/content, missing,
duplicate, extra or cross-target decisions/rows, same-count changed values or
provenance, reordered handoffs and edits outside the correction set.

The DB helper reuses the accepted narrow replay mechanism from private
`4d33200241c53cc36da399e5dd5a24af5f76c77f`, executing the actual maintained
[summary parser](../../../data-tools/src/short-desc/summary-row-schema.ts) and
[importRows](../../../data-tools/src/short-desc/import.ts). It creates only a
disposable summary table using the actual content migration, plus an unrelated
sentinel. Dry-run preserves every row; apply performs 442 updates / 0 inserts;
repeat performs 0 updates / 442 unchanged. All persisted columns match the parser
projection, createdAt is preserved, updatedAt matches the import execution, and
all 6,130 untouched rows and the sentinel remain unchanged. Full source provenance
stays in the authoritative JSONL even though the runtime table stores a projection.
Each small DB is removed after the run. Private proof records the actual commands,
caller cwd and public head; the PR records exact-head full remote `ci:portable`.

## Main-gate promotion and subsequent imports

These are future acceptance/integration steps for main-gate and #346, not writes
performed by this delivery. First independently review the fixed candidate and
replay it while canonical still equals the frozen baseline. After acceptance,
promote those exact bytes to the maintained canonical owner and commit only that
authorized private path. For the assigned roots, the promotion is:

```powershell
$ErrorActionPreference = 'Stop'
& G:/spell-book/worktrees/sc-current-effective-writer/data-tools/pdf-extract/.venv/Scripts/python.exe G:/spell-book/data/dice-qa/books/86/issue-411/reproduce.py --code-root G:/spell-book/worktrees/sc-summary-17 --runtime-root G:/spell-book/worktrees/sc-current-effective-writer --private-revision c4fe0c0a7b14aafed04bc9e733387afb51ae45eb --run accepted-promotion-preflight
if ($LASTEXITCODE -ne 0) { throw 'Promotion preflight failed' }
Copy-Item -LiteralPath G:/spell-book/data/dice-qa/books/86/issue-411/summaries.proposed.jsonl -Destination G:/spell-book/data/short-desc-normalized/summaries.generated.jsonl
```

This preflight rejects a changed canonical owner; do not bypass it or overwrite
concurrent accepted work. After promotion the proposal replay intentionally fails
its frozen-owner check. The committed candidate and all packet refs still provide
the original reproducible evidence; #346 records the promoted data commit and
validates its actual migration target independently.

The current [normalizer](../../../data-tools/src/short-desc/normalize.ts) already
refuses to overwrite an output containing `reviewed-summary-correction` before
opening source inputs or writing output/report. Its maintained portable safety
test passes from both root and package with the shared runtime's loader. Future
raw normalization uses a separate new `--out` and `--report`; explicitly review
and merge those candidates while preserving these accepted rows. Do not pass an
old regenerated candidate to the summary importer. No public-tool gap or new
importer is needed for this composition.

For a subsequent authorized #346 rebuild, use the promoted maintained canonical
as the summary input. Complete normalized-content generation/import and complete
CHM/other text imports before summaries, then the accepted final overlays/notes
in their maintained order and final FTS/parity/API/HTML validation. The CHM importer
deletes all Chinese full-text variants; it must precede the effective/final text
overlay. It does not recreate summary rows. The ordinary normalized-content
import replaces its declared generated tables, which do not include
`I18nSpellSummaryText`. A later summary import upserts its supplied values, so the
promoted canonical is required to prevent restoring the old summaries.

The standard commands are `npm run -w data-tools summaries:import -- --input
<absolute-promoted-canonical> --dry-run` and the same command without `--dry-run`.
With this checkout's existing external runtime, the equivalent executable calls
are below. The target is an explicitly authorized #346 disposable migration DB
whose baseline that task has independently checked; these commands are not an
authorization to select an operator database:

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-17'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$dataRoot = 'G:/spell-book/data'
$targetDb = Join-Path $codeRoot 'data-tools/out/issue-346/content.sqlite'
$env:DATA_REPO_PATH = $dataRoot
$env:NODE_PATH = Join-Path $runtimeRoot 'node_modules'
$env:CONTENT_DATABASE_URL = 'file:' + $targetDb.Replace('\', '/')
$loader = Join-Path $runtimeRoot 'node_modules/tsx/dist/cjs/index.cjs'
$importer = Join-Path $codeRoot 'data-tools/src/short-desc/import.ts'
$canonical = Join-Path $dataRoot 'short-desc-normalized/summaries.generated.jsonl'
& node --require $loader $importer --input $canonical --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Summary dry-run failed' }
& node --require $loader $importer --input $canonical
if ($LASTEXITCODE -ne 0) { throw 'Summary import failed' }
```

For an independently matched existing frozen summary baseline, the narrow
`issue-411/corrections.jsonl` handoff yields the proven 442-update delta. Full
rebuilds consume the promoted 6,572-row canonical instead. Follow the durable
[DB content workflow](../../operations/db-content-workflow.md),
[import order](../../operations/import-workflow.md#short-descriptions), and
[final source binding](../../operations/sc-final-source-binding.md) for the
remaining authorized migration checks.

This proposal changes no canonical owner, old slice packet, name/body/mechanics,
relationship, missing row, accepted final rehearsal or operator database. It does
not open app-state, rebuild FTS, push private data or deploy. #407 reader-note
integration and #354 unresolved external sources remain separate under #346;
`wholeBookQAComplete` is false. Main-gate owns acceptance, merge and promotion.
