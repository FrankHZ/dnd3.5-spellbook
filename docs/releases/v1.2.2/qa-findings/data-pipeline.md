# Data Pipeline Raw Audit Handoff

> This is a temporary raw role audit. Proposed severities are not final.
> `main-gate` owns de-duplication and disposition. Remove this file or collapse
> its accepted result into the owning plan's Completion Notes before the v1.2.2
> freeze.

- Primary role: `data-pipeline`
- Audit base: `ff4f2ff7eb7158d2007178179c15919923769311`
- Scope: data-tools, source/patch/import flow, fixture and migration parity,
  script manifest, repeatability, artifact provenance, and parent-versus-nested
  data boundaries
- Audit mode: read-only; no source data, local SQLite, generated fixture,
  import output, API semantics, or remote configuration changes

Seven actionable findings survived the audit: five proposed P1 and two proposed
P2.

## DP-AUD-001 - Proposed P1

- **Failure:** `rules:content:generate` silently treats canonical nested-repo
  publication metadata as optional. A build without
  `data/rulebook-publications/publications.jsonl` succeeds, emits null
  publication details, and the subsequent import replaces valid
  `RulebookContent` rows with the degraded output.
- **Evidence:** The metadata is documented as canonical in
  [`docs/modules/data-tools.md`](../../../modules/data-tools.md#L38), but the
  script manifest declares generation does not require local data in
  [`data-tools/scripts.manifest.json`](../../../../data-tools/scripts.manifest.json#L96).
  Missing files become empty maps in
  [`data-tools/src/rules-content/cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L428),
  accepted details consequently become null at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L275), and import
  deletes/replaces every generated table at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L635). A narrow
  read-only count in the current nested checkout found 151 metadata rows,
  including 111 accepted rows with publication details.
- **Impact:** Reviewed dates, years, URLs, images, and display overrides can
  disappear from a rebuilt content DB while all commands report success.
- **Coverage gap:** No command-level test verifies that a full build rejects a
  missing canonical metadata source.
- **Recommended owner / smallest safe fix:** `data-pipeline`; require the
  canonical files for an importable full build, mark generation
  `requiresLocalData: true`, and reserve fallback generation for an explicit
  non-importable audit mode.
- **Confidence / unresolved question:** High. It is unresolved whether every
  operator path reliably runs `rules:manifest:verify` first; that lowers
  likelihood but does not protect the standalone command.

## DP-AUD-002 - Proposed P1

- **Failure:** The supported `--limit` option creates a partial artifact
  indistinguishable from a full artifact, and live import accepts it as a
  full-table replacement.
- **Evidence:** `generate --limit` is advertised at
  [`data-tools/src/rules-content/cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L134);
  the limit is applied to the spell query at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L234) and
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L292). Generation
  writes the normal default artifact at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L849). Its schema
  has no full/partial scope marker in
  [`normalize.ts`](../../../../data-tools/src/rules-content/normalize.ts#L104),
  while import validation checks only generator version and mechanics shape at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L554). Import then
  deletes all generated tables before inserting the limited rows.
- **Impact:** Importing a smoke-test artifact can reduce a complete content DB
  to an arbitrary prefix of spells.
- **Coverage gap:** Portable tests exercise the pure normalizer, not limited
  generation followed by dry-run/live import. Dry-run also accepts the partial
  counts.
- **Recommended owner / smallest safe fix:** `data-pipeline`; mark artifacts
  explicitly as full or limited, record source totals, reject limited artifacts
  from live import, and direct limited output to a separate path.
- **Confidence / unresolved question:** High. No unresolved question.

## DP-AUD-003 - Proposed P1

- **Failure:** `en:summaries:sources` can recursively delete too broad a
  nested-data target and can replace the canonical source index with a partial
  crawl.
- **Evidence:** Source mode accepts `--source-offset`, `--source-limit`, and
  `--output-name`, defaulting to `source-index`, at
  [`data-tools/src/short-desc/en-summaries.ts`](../../../../data-tools/src/short-desc/en-summaries.ts#L483).
  The selected slice is built at
  [`en-summaries.ts`](../../../../data-tools/src/short-desc/en-summaries.ts#L1198).
  Before writing, the target is recursively removed at
  [`en-summaries.ts`](../../../../data-tools/src/short-desc/en-summaries.ts#L1068).
  `safeReportName(".")` remains `"."`, while `assertInside` accepts root
  equality because `path.relative(root, root)` is empty at
  [`en-summaries.ts`](../../../../data-tools/src/short-desc/en-summaries.ts#L936)
  and
  [`en-summaries.ts`](../../../../data-tools/src/short-desc/en-summaries.ts#L1050).
- **Impact:** A limited run without a distinct output name discards the full
  canonical index; `--output-name .` targets the entire
  `data/imarvin/short-desc` root, potentially deleting candidates and
  maintained source-index data.
- **Coverage gap:** No path-safety, partial-run, or destructive-target test
  exists.
- **Recommended owner / smallest safe fix:** `data-pipeline`; require a strict
  descendant with a non-special basename, refuse partial runs against the
  canonical target, and stage then atomically replace complete crawls.
- **Confidence / unresolved question:** High. Destructive reproduction was
  intentionally not run. Recoverability depends on whether affected
  nested-data files were committed.

## DP-AUD-004 - Proposed P1

- **Failure:** Provenance records import-time repository state, not the state
  that generated the artifact, and may label `rulesDbSha256` with a stale
  manifest value.
- **Evidence:** The generated artifact carries no repository commits or rules
  DB hash at
  [`data-tools/src/rules-content/normalize.ts`](../../../../data-tools/src/rules-content/normalize.ts#L104).
  Provenance is collected during import at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L622), using current
  parent/data commits and dirty state at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L724). It prefers
  the manifest's stored DB hash over hashing the actual DB at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L729).
- **Impact:** An artifact generated from commits/database A and imported after
  switching to B is recorded as originating from B. Deployment/status evidence
  can therefore assert incorrect source provenance.
- **Coverage gap:** The portable fixture contains hard-coded provenance but no
  generate/change-checkout/import correspondence test.
- **Recommended owner / smallest safe fix:** `data-pipeline`; embed
  generation-time commits, dirty flags, canonical-input hashes, and actual
  rules DB hash in the artifact, then preserve and verify them during import.
  Record importer state separately if needed.
- **Confidence / unresolved question:** High. It is unresolved whether
  deployment always compares an independently retained generated-artifact
  hash; that would detect artifact substitution but not correct false commit
  attribution.

## DP-AUD-005 - Proposed P1

- **Failure:** Structured spell apply is not atomic across spell mutation and
  derived-index rebuilding.
- **Evidence:** Inserts commit in their own transaction at
  [`data-tools/src/rules/spells.ts`](../../../../data-tools/src/rules/spells.ts#L533),
  updates commit separately at
  [`spells.ts`](../../../../data-tools/src/rules/spells.ts#L621), and the command
  invokes inserts, updates, then index rebuild sequentially at
  [`spells.ts`](../../../../data-tools/src/rules/spells.ts#L721). Index SQL paths
  are only resolved after mutations have committed at
  [`spells.ts`](../../../../data-tools/src/rules/spells.ts#L640).
- **Impact:** A missing, mismatched, or failing nested-repo index script leaves
  new/updated rules rows committed but derived indexes stale. Retrying an
  insert patch can then fail on duplicate IDs, requiring manual recovery.
- **Coverage gap:** Tests cover update-field behavior, not rollback of the
  complete apply command when index rebuild fails.
- **Recommended owner / smallest safe fix:** `data-pipeline`; pre-resolve/read
  all required scripts before mutation and wrap inserts, updates, and index
  rebuild in one outer transaction.
- **Confidence / unresolved question:** High. The required SQL files exist in
  the currently checked-out nested data repo; the failure remains credible when
  parent and nested commits are mismatched.

## DP-AUD-006 - Proposed P2

- **Failure:** Portable fixture validation does not exercise tracked migrations
  or real import constraints.
- **Evidence:** `ci:portable` generates Prisma clients and runs tests but never
  applies content migrations in
  [`package.json`](../../../../package.json#L23). Server tests hand-create a
  reduced content schema at
  [`server/tests/setup-test-dbs.ts`](../../../../server/tests/setup-test-dbs.ts#L214).
  It omits `SpellAppearance` and migration-defined unique indexes; the real
  migration creates that table and constraints at
  [`migration.sql`](../../../../server/db/content/migrations/20260702090000_add_normalized_rules_content/migration.sql#L49)
  and
  [`migration.sql`](../../../../server/db/content/migrations/20260702090000_add_normalized_rules_content/migration.sql#L161).
  The fixture-manifest test verifies mapping and file existence only at
  [`portable-tests.ts`](../../../../data-tools/src/harness/portable-tests.ts#L246).
  Rules-content dry-run returns before attempting inserts at
  [`cli.ts`](../../../../data-tools/src/rules-content/cli.ts#L630).
- **Impact:** Missing columns, duplicate semantic keys, or
  generated-row/migration incompatibility can pass portable CI and fail only
  during the real write-capable import.
- **Coverage gap:** No migration-backed disposable fixture/import test.
- **Recommended owner / smallest safe fix:** `data-pipeline`, with `backend-db`
  review; add one focused disposable test that applies tracked content
  migrations, loads portable fixtures, and executes the import path under real
  constraints.
- **Confidence / unresolved question:** High. No current generated-row
  collision was established within the audit timebox.

## DP-AUD-007 - Proposed P2

- **Failure:** CHM preprocessing never removes outputs whose source files were
  deleted or renamed.
- **Evidence:** Preprocessing enumerates current inputs and overwrites
  corresponding outputs only at
  [`data-tools/src/zh-parser/scripts/preprocess-chm-html.ts`](../../../../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts#L193).
  It performs no output reconciliation before completing at
  [`preprocess-chm-html.ts`](../../../../data-tools/src/zh-parser/scripts/preprocess-chm-html.ts#L216).
  The standard parser subsequently scans the retained `data/chm-clean` tree via
  the package commands in
  [`data-tools/package.json`](../../../../data-tools/package.json#L46).
- **Impact:** Removed source pages survive indefinitely as clean inputs and can
  re-enter parser output or later imports, making rebuilds dependent on prior
  filesystem state.
- **Coverage gap:** No preprocess repeatability test covers source
  deletion/rename.
- **Recommended owner / smallest safe fix:** `data-pipeline`; generate into a
  validated staging directory and replace the generated tree, or maintain a
  generated-file manifest and delete only stale generated outputs.
- **Confidence / unresolved question:** High. This workflow is classified
  `dormant-local`, so severity is proposed P2 rather than release-critical.

## Checks Run

- Confirmed clean parent `HEAD` equaled audit base
  `ff4f2ff7eb7158d2007178179c15919923769311` using `git rev-parse`,
  `git cat-file`, `git status`, and base-relative `git diff` during the audit.
- Read the required role contract, role routing guide, `AGENTS.md`, owning QA
  plan, data-tools workspace/module docs, DB/content workflow,
  import/setup/rules notes, and nearby source/tests.
- Inventoried tracked `data-tools`, migrations, fixtures, and operations files
  with `git ls-files`.
- Searched write/delete/transaction, dry-run, provenance, manifest, fixture,
  migration, and coverage paths with `rg` and `Select-String`.
- Compared migration DDL with hand-built test DDL and inspected the portable
  fixture/manifest harness.
- Narrowly inspected nested-data status and SQL patch presence; the nested
  checkout observed during the audit was clean at
  `fbdcc780ff4f229e4bc3416a5a5d2a1a11b30a28`.
- Counted publication metadata without modifying it: 151 rows, 111 accepted
  with detail fields.
- Did not rerun an npm suite because the supplied `ci:portable` result already
  covered the exact parent audit commit.
- Did not run destructive reproduction, import, generation, network crawl, or
  SQLite commands.

## Residual Risks

- The timebox ended before end-to-end review of every `spells-full`, summary
  decision/apply, parser matching, and network-fetch branch.
- No broad corpus QA was performed because child delegation was prohibited and
  loading the corpus into the main audit would violate repository guidance.
- No automated full-schema diff was run; migration/fixture comparison was
  targeted to the normalized-content path.
- The context packet did not specify an audit-base commit for the nested
  `data/` repository, so current nested-data counts are supporting evidence,
  not a frozen cross-repo baseline.
- Runtime deployment/activation scripts and server API semantics remained
  outside the `data-pipeline` audit boundary.
