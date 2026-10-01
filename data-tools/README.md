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

## Choose The Relevant Operation

- [CHM parsing and Chinese imports](../docs/operations/import-workflow.md#chm-and-entity-translations)
- [Rules patches and source candidates](../docs/operations/import-workflow.md#rules-patches)
- [Normalized content and search index](../docs/operations/import-workflow.md#normalized-content-and-search)
- [Short descriptions](../docs/operations/import-workflow.md#short-descriptions)
- [DB handoff and artifact provenance](../docs/operations/db-content-workflow.md)
- [Explicit-page PDF text/geometry extraction](./pdf-extract/README.md)

The read-only dice TXT intake and field-level QA validation are described at the
[replacement boundary](../docs/operations/import-workflow.md#dice-text-boundary).
`dice:effective` composes SC's exact accepted native/independent handoff with
complete current CHM/English after the unchanged formal QA and fresh PDF verifier.
The source entry derives original bindings and printing/errata authority from
the accepted private Git revision; optional generated evidence is comparison-only.
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

A documented command is not permission to write local DBs or activate production.
Use the task's explicit write boundary and the operation-specific dry-run path;
not every importer supports dry-run. App-state must never be reset or mutated
by content workflows.

[scripts.manifest.json](./scripts.manifest.json) classifies every package script
by module and lifecycle. Keep that classification when adding a command.
Maintained workflows need focused helper tests; dormant source reruns and local
acceptance are conditional operations, not default startup steps. One-time
investigations do not belong in always-on validation.
