# Data Tools Workspace

Local source preparation, parsing, inspection, rules patches, and content
artifact generation. The API runtime belongs to `server/`.

## Setup And Validation

Install dependencies from the repository root. Commands are defined in
[package.json](./package.json); run them from the root with
`npm run -w data-tools <script>`. Real-data operations require the configured
private data repo and [DB setup](../docs/operations/data-setup.md).

The independent [PDF Extract Python subproject](./pdf-extract/README.md) uses its
own Python 3.13 environment and pinned PyMuPDF dependency. Its native CLI/tests
are separate from npm installation and run independently in GitHub CI.

| Task | Command |
| --- | --- |
| Typecheck | `npm run typecheck:data-tools` |
| Run portable helper/import tests | `npm run test:data-tools` |
| Build the public Node package entry | `npm run build:data-tools` |
| Check that entry after building | `npm run check:data-tools-review` |
| Explicit local data acceptance | `npm run -w data-tools acceptance:local` |

For behavior changes, run the affected helper tests first. Portable tests use
synthetic fixtures, including disposable SQLite databases; they do not require
or touch `server/db/local/`. Local acceptance reads configured DBs and writes
reports/generated artifacts, but does not perform live DB imports. Use it only
when source data, manifests, parser output, or import behavior is affected.
Documentation-only edits need link, command, and diff checks. Remote CI remains
the merge gate.

Run `npm run -w data-tools summaries:normalize:test` for the portable short-desc
normalization guard checks. Normalization refuses to overwrite existing reviewed
summary corrections; generate a new candidate file and explicitly review/merge it
as described in the [short descriptions workflow](../docs/operations/import-workflow.md#short-descriptions).

For an already prepared and accepted full normalized/summary handoff, use the
[fixed content sequence](../docs/operations/import-workflow.md#fixed-content-sequence)
to check or explicitly apply normalized content, summaries and derived search.
Run `npm run -w data-tools content:sequence:test` for its synthetic preflight,
committed-boundary resume and no-op checks. Operator writes still require the
owning workflow's explicit authorization.

## Choose The Relevant Operation

- [Readonly action semantics QA and bounded pilot](../docs/operations/action-qa.md)
- [CHM parsing and Chinese imports](../docs/operations/import-workflow.md#chm-and-entity-translations)
- [Read-only CHM class-source directory scanning and proposals](../docs/operations/class-sources.md)
- [Accepted bounded class-source mapping check/import](../docs/operations/class-sources.md#accepted-mapping-import)
- [Rules patches and source candidates](../docs/operations/import-workflow.md#rules-patches)
- [Atomic spell step and exact repeat checks](../docs/operations/rules-db-notes.md#atomic-spell-maintenance-step)
- [Normalized content and search index](../docs/operations/import-workflow.md#normalized-content-and-search)
- [Exact search check, atomic rebuild and repeat](../docs/operations/import-workflow.md#exact-search-index-step)
- [Exact normalized import check/apply/repeat](../docs/operations/import-workflow.md#normalized-content-import-step)
- [Short descriptions](../docs/operations/import-workflow.md#short-descriptions)
- [Exact summary check, atomic apply and repeat](../docs/operations/import-workflow.md#summary-import-step)
- [DB handoff and artifact provenance](../docs/operations/db-content-workflow.md)
- [Prepare or resume a rulebook QA batch](../docs/operations/db-content-workflow.md#preparing-a-rulebook-qa-batch)
- [Offline Chinese class/domain HTML / CHM source pages](../docs/operations/offline-html.md)
- [Explicit-page PDF text/geometry extraction](./pdf-extract/README.md)
- [SC PDF typography display derivatives](../docs/operations/sc-pdf-typography.md)
- [SC domain-list, summary and HTML ability handoffs](../docs/operations/sc-domain-lists.md)

The read-only dice TXT intake and field-level QA validation are described at the
[replacement boundary](../docs/operations/import-workflow.md#dice-text-boundary).
Both commands accept `--baseline-dir` for an isolated current all-source ledger
and book QA inputs/outputs in the private data repo, preserving the shared ledger
and frozen SC handoff. See the replacement boundary for paths and output guards.
`dice:qa --slice-scope ... --slice-revision ...` binds exact committed target and
evidence selection; `--reconcile-slices ...` revalidates disjoint complete parent
coverage through the full-book validator. See the
[slice contract](../docs/operations/import-workflow.md#independently-reviewable-qa-slices).
Run `dice:qa:test` for the synthetic slice and existing book checks.
`dice:handoff:check` authenticates the fixed main-gate accepted Cityscape
DB-English revision against full QA and current read-only DBs, then writes an
inspection-only selective overlay proposal to a fresh private directory.
Run `dice:handoff:test` for synthetic binding, residual and DB protection checks;
see the [accepted DB-English handoff](../docs/operations/import-workflow.md#accepted-db-english-handoff-preflight).
For the same eight accepted targets, `dice:overlay` checks or explicitly applies
selective name/body rows, resumes committed-overlay/search failures, and verifies
zero-write repeats. It preserves SC and full normalized build provenance; see
[selective Cityscape overlay](../docs/operations/import-workflow.md#selective-cityscape-overlay).
Run `dice:overlay:test` for its synthetic transaction and recovery checks.
`dice:closeout:check` authenticates the closed round's fixed non-SC native,
recovered and independent Chinese field handoffs, loading current sources and
DBs once. It writes only fresh private inspection artifacts; `dice:closeout:test`
checks source/input drift, ownership, residual and SC exclusion boundaries.
See the [closed QA handoff](../docs/operations/import-workflow.md#closed-dice-qa-handoff).
`dice:effective` composes SC's exact accepted native/independent handoff with
complete current CHM/English after the unchanged formal QA and fresh PDF verifier.
The source entry derives original bindings and printing/errata authority from
the accepted private Git revision; optional generated evidence is comparison-only.
Explicit `--accepted-baseline 6a73f4d64682325c67e2c40595008344fb5c3be5`
selects the accepted 1,026-field union with ten existing-body amendments. Their
original owners/ledger rows remain alongside active amendment provenance.
The previous 879-field revision remains reproducible. The disposable writer
supports both exact revisions through the same complete verification; no generated
projection grants write authority.
It writes inspection-only field provenance and coverage to a new directory in
this worktree's `data-tools/out/`; see the
[effective projection contract](../docs/operations/import-workflow.md#effective-chinese-preflight).
`dice:effective:write` reuses the complete preflight and writes field provenance
only into a fresh disposable content copy with `--apply`; its default dry-run
emits a plan/report without a database. See the
[writer command and non-publishing boundary](../docs/operations/import-workflow.md#disposable-effective-writer).
Run `npm run -w data-tools dice:effective:write:test` for the synthetic migration,
transaction, idempotence and actual CHM-order checks.
PHB PDF extraction/review is suspended and is
not a prerequisite for these operations. Only an explicit resumption scope
should use the [PHB safeguards](../docs/releases/v1.4/phb-source-and-errata-plan.md#paused-workflow-execution-safeguards)
and [private review console](../review-console/README.md).
The Python PDF extractor requires its own authorized source/page/output scope;
it does not resume that PHB workflow or accept extracted English as content.

## Code And Data Boundaries

Code is grouped by module under [src](./src); consult the
[module boundaries](../docs/modules/data-tools.md) when changing ownership.
The public Node review entry is `data-tools/phb-review`; browser code may use
its types but must not import its runtime or deep source paths.

Real source data, accepted patches, normalized JSONL, and review decisions stay
in the configured private data repo. Rebuildable output stays in `data-tools/out/`.
Operator-owned SQLite files stay under `server/db/local/`. Do not commit these
inputs or generated source-bearing output to the parent repo. Public PHB
reports contain only source-free aggregates such as counts, hashes, and status.

The standalone [SC coverage audit](./audits/sc_coverage.py) reconciles frozen
Git evidence with current read-only fields and emits exact field/slice identities.
See its [coverage report and reproduction recipe](../docs/releases/v1.4/spell-compendium-final-qa-coverage-report.md).
It requires explicit data/revision/DB roots and grants no content acceptance or
write authority. It is a bounded audit helper, outside routine local acceptance.

The [final SC name/body candidate replay](../docs/operations/sc-final-source-binding.md)
composes the exact 1,001-entry sources through complete historical QA, maintained
in-memory rules patching and fresh PDF/retention coverage checks. It keeps
historical effective baselines intact and emits inspection evidence only.
The selected candidate's maintained `dice:final:write` path replays source QA and
PDF verification against durable final inputs. It defaults to read-only dry-run;
`--apply` writes transactionally and `--validate` checks the migrated state.
It preserves genuine full normalized build provenance and records accepted
name/body overlay provenance separately from pending semantic QA. See the
[final overlay command](../docs/operations/sc-final-source-binding.md#final-overlay-and-migrated-state-validation).
That entry also authenticates the fixed accepted #407 reader-note handoff and
adds only its three body notes, preserving the original final candidate and
every unchanged field's provenance.

A documented command is not permission to write local DBs or activate production.
After importing the exact accepted full canonical summaries, the final overlay's
`--accepted-summaries` gate verifies all persisted columns and records their
fixed revision in existing build metadata; see the final overlay workflow above.
Use the task's explicit write boundary and the operation-specific dry-run path;
not every importer supports dry-run. App-state must never be reset or mutated
by content workflows.

For the exact already accepted SC annotated summary predecessor, use the
[source-bound final summary upgrade](../docs/operations/sc-final-source-binding.md#upgrade-an-already-accepted-annotated-summary-state)
through `dice:final:write -- ... --accepted-summaries --upgrade-summaries`.
It authenticates both fixed inventories and all final fields/notes before
inserting the accepted 265 additions and changing only summary acceptance
metadata in one transaction. The generic summary step still rejects changed
annotated predecessors; its accepted paths never grant source QA authority.

For original printed class/domain-list M/F/X annotations, use the independent
[printed list marker workflow](../docs/operations/spell-list-markers.md).
Its candidate scanner and automatic SC processor emit separate private evidence.
`sc:list-markers:auto` matches complete cached labels to unique SC relationships;
machine results remain distinct from human acceptance. The display selector omits
unknown annotations and never falls back to complete component flags.

[scripts.manifest.json](./scripts.manifest.json) classifies every package script
by module and lifecycle. Keep that classification when adding a command.
Maintained workflows need focused helper tests; dormant source reruns and local
acceptance are conditional operations, not default startup steps. One-time
investigations do not belong in always-on validation.

The bounded [SC source-pair upgrade](../docs/operations/sc-final-source-binding.md#upgrade-the-accepted-bands-of-steel--beast-claws-pairs)
uses `dice:final:write -- ... --accepted-source-pairs --upgrade-source-pairs`
with the existing accepted English-title/summary flags and exact full predecessor.
It authenticates the fixed source decision and changes only its paired fields;
operator migration and display selection retain their owning acceptance gates.

Use `dice:closeout:write` for the authenticated non-SC accepted field handoff,
readonly by default and `--apply` only under the owning local write authorization.
It preserves SC and existing CHM, composes honest fallback and coordinates atomic
overlay plus maintained FTS recovery. See [accepted non-SC closeout](../docs/operations/import-workflow.md#accepted-non-sc-dice-closeout).
Run `dice:closeout:write:test` for synthetic transaction, recovery and path checks.
