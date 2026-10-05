# DB Content Workflow

This is the durable entry point for DB/content update work after v1.2.

Use this document to choose the correct workflow and command owner. Do not copy
new command sequences here when an existing operations doc already owns them.

## Scope

This workflow covers:

- accepted data handoffs from the configured private data repo
- local rules-clean patching as a build input
- local content DB regeneration and provenance checks
- portable fixture manifest coverage for maintained local JSONL inputs
- optional remote content DB activation after merge and explicit operator authorization

It does not cover:

- full app-state/user-data migration
- automatic DB deployment in CD
- broad rules/content schema redesign
- raw/source data publication in the parent repo

## Source Of Truth

English original rulebook PDFs and applicable official errata govern translation
and rules content. Existing Chinese CHM, dice database text, and derived English
DB text are references, not acceptance authority. Translate missing Chinese
directly and correct demonstrated English/Chinese/mechanical discrepancies through
source-bound QA. Retained translations need source-faithfulness evidence; legacy
resemblance alone is not acceptance. Preserve original ambiguities faithfully
with separate reader notes.

Keep stable IDs, source evidence/fingerprint checks, and safe import order.
Preserve existing content and fallback outside accepted corrections/translations;
an existing English baseline does not override the original or applicable errata.
Corrections follow the accepted-input and explicit DB-write gates below. This
authority rule does not resume paused broad PHB extraction or translation work.

- Real source, patch, review, and decision data lives in the configured private
  data repo, outside removable code worktrees.
- Runtime SQLite files live under `server/db/local/` and are ignored by the
  parent repo.
- Public-safe portable fixtures live under `server/db/<db-role>/fixtures/`.
- Fixture coverage is declared in `server/db/fixtures.manifest.json`.
- Generated reports and rebuildable intermediates live under `data-tools/out/`.

The parent repo should own schemas, validators, tests, fixtures, and workflow
docs. It should not own local DB files or source-bearing data.

## Preparing A Rulebook QA Batch

Before dispatch, reconcile the owning issue with the current source rules above
and [quality tradeoffs](../feature-workflow.md#source-and-quality-tradeoffs).
Older dice/CHM agreement or English-DB audit labels are historical evidence,
not certification against the original book. Reuse verified source evidence
when its identity, inputs and affected fields still match; do not reopen an
accepted book merely because another book is restarting.

1. **Inventory the complete book.** Include existing targets without dice
   candidates, duplicate occurrences and unresolved publication ownership.
   Distinguish source-reviewed fields, references awaiting review, actual
   source gaps and out-of-scope items. Unperformed review stays pending.
   A complete disposition list is not a claim that every field passed QA.
2. **Check the input baseline before semantic work.** Verify source/map and
   review revisions resolve, source files are committed, and the maintained
   scoped QA command can validate the actual current inputs. After repository
   recovery or a baseline change, preserve old evidence and prepare separately
   reviewed current intake inputs; never bulk-relabel old decisions or extend
   SC's fixed recovery exception to an unrelated book. Resolve a demonstrated
   tooling gap before dependent batches begin.
3. **Choose a small end-to-end pilot.** Establish original/errata availability,
   complete-entry review and a consumable accepted handoff on a small book or
   independently reviewable slice. Use original text for missing translations;
   record substantive English/mechanics corrections separately from Chinese
   proposals. A QA proposal does not authorize canonical or operator writes.
   Verify needed pages with the existing extraction tools; render only where
   layout affects interpretation. Natural paragraphs and useful emphasis suffice.
4. **Budget and scale from evidence.** Estimate source/output size, text volume,
   runtime, peak memory, disk and any paid model/API use before a full run.
   Size slices by complete entries and review effort using
   [task sizing](../feature-workflow.md#task-size-and-slices); use a whole small
   book when it fits. Do not create per-spell issues or separate mechanical
   paperwork stages. Current `dice:qa --rulebook-id` requires book-wide coverage:
   partial `--check-incomplete` output is progress, not accepted slice evidence.
   Prove a bounded slice contract before promising independent partial acceptance.
5. **Prove the next consumer handoff early.** Reuse maintained validation,
   import and search stages. SC-specific final overlays and a successful generic
   content sequence do not prove another book can replace an annotated baseline.
   Bind any necessary extension to the pilot's actual accepted inputs; preserve
   prior SC content, fallback and provenance. Use one integration writer, the
   same maintained execution path for rehearsal and operator apply, and explicit
   authorization for operator/production changes.
6. **Keep only useful durable evidence.** Private source/review records and
   acceptance references belong in the data repo; PRs contain source-free
   results, exact revisions and reproducible commands. Reuse accepted evidence
   and check changed fields plus affected consumers at integration. Keep progress
   in issues, and remove owned disposable copies after acceptance and dependency
   checks. Reuse worktrees and runtime installs; do not copy whole databases or
   grow issue-specific script chains for every content batch.

The book issue states its included fields, source gaps, completion condition,
write owner and dependencies. Summaries, relationships, book-wide HTML/CHM and
production deployment are included only when the issue explicitly needs them;
SC's complete delivery scope is not an automatic template for every book.

## DB Roles

- `rules-clean.sqlite`: locked local rules baseline and accepted patch staging
  input. It is not the artifact served to users after normalized content is
  generated.
- `content.sqlite`: generated runtime content artifact consumed by the app and
  activated remotely.
- `app-state.sqlite`: future user/app-state boundary. Do not mutate it with
  content import scripts.

For setup details, environment variables, and Prisma reset commands, use
[data-setup.md](./data-setup.md).

## Accepted Input Boundary

A proposed source package is not accepted import data. Dice replacement scope
and acceptance live in [the activation issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121).
Its accepted input, variant/request compatibility and safe import order must be
implemented and tested before a write-capable handoff. Existing PHB artifacts
and unmerged PR #113 are paused work, not implicit accepted inputs.
SC's [effective Chinese preflight](./import-workflow.md#effective-chinese-preflight)
revalidates its exact accepted handoff and computes field provenance read-only.
Its inspection outputs do not implement storage, import, consumer compatibility
or activation, and must not be passed to a DB writer.
The [disposable effective writer](./import-workflow.md#disposable-effective-writer)
reuses that complete preflight directly and writes only a command-created
experimental content copy under worktree output. Its field provenance and
limited build marker do not constitute a deployable artifact or permission to
migrate/write operator DBs. Full build/search/consumer integration remains separate.
The selected final candidate uses the maintained
[final overlay and migrated-state validator](./sc-final-source-binding.md#final-overlay-and-migrated-state-validation)
after genuine full normalized generation/import. It preserves generation
provenance and records accepted name/body and summary authority independently.
Extra relationship QA remains separately pending under #354; accepted text and
summaries do not certify those relationships. Its validation needs durable final inputs,
not removable rehearsal DB snapshots; operator writes still require the owning
migration's authorization and acceptance.

## Standard Handoff Flow

1. Refresh context.
   - Confirm parent repo branch/status.
   - Confirm the configured private data repo branch/status.
   - Read the owning feature issue and its accepted data handoff.
   - Run the smallest relevant portable/data-tool validation before writing DB
     files.

2. Apply accepted rules patches only after handoff acceptance.
   - New batches may use the [atomic spell maintenance step](./rules-db-notes.md#atomic-spell-maintenance-step)
     for a read-only check and explicit transactional apply/repeat validation.
     This covers only rules and their derived indexes; partial history is rejected.
   - Validate and dry-run the exact pending file.
   - Apply to a temporary copy before touching the local rules DB.
   - Apply to operator-owned `rules-clean.sqlite` only with explicit DB-write
     authorization, accepted input and the required validation.
   - Move accepted patch files from `pending/` to `applied/` in the nested
     private data repo.
   - Rewrite and verify the rules manifest.

3. Regenerate the content DB artifact.
   - Use [import-workflow.md](./import-workflow.md) for the canonical local
     command order.
   - When rules/manifest/generation are already prepared and both full normalized
     and complete summary pairs are accepted, use the
     [fixed content sequence](./import-workflow.md#fixed-content-sequence) for
     readonly preflight, ordered stage commits and DB-derived interruption resume.
     Changed annotated predecessors remain unsupported; this content-only sequence
     does not accept source QA, coordinate other DBs or authorize activation.
   - For an already accepted pair of full normalized artifacts, the
     [normalized import step](./import-workflow.md#normalized-content-import-step)
     proves exact before/after and supports atomic apply or a zero-write repeat.
     An annotated predecessor is refused until later coordination handles
     downstream acceptance; this stage does not run overlays, summaries or FTS.
   - For an already accepted pair of complete canonical summary inventories,
     the [summary import step](./import-workflow.md#summary-import-step) proves
     exact before/after and applies maintained upserts atomically. Annotated
     summary predecessors reject; valid exact-after annotations and all build
     provenance remain unchanged. Search is checked after summary completion.
     The specific accepted SC directory promotion uses the
     [source-bound final summary upgrade](./sc-final-source-binding.md#upgrade-an-already-accepted-annotated-summary-state)
     instead; this authenticated exception does not relax the generic step.
     The [accepted domain-summary transition](./sc-final-source-binding.md#upgrade-accepted-domain-summaries)
     additionally binds its one reviewed correction and requires the separately
     promoted canonical inventory before apply or validation.
   - Require canonical publication metadata for the full artifact; use the
     explicit audit-only generator only for limited, non-importable output.
   - Run content generate/import, then dry-run and rebuild the derived search
     index after all text and normalized-content imports.
   - Run parity/meta checks after the artifact is complete.
   - Verify the artifact's generation-time rules DB, canonical-input, and
     migration hashes during import.
   - Preserve generation-time parent/data commits and dirty flags in artifact
     metadata; keep importer repository state separate in `buildMetaJson`.
   - Verify representative rows named by the active handoff.

4. Maintain portable fixture coverage.
   - Add exact JSONL roots for narrow handoffs.
   - Use directory roots only when every JSONL under that directory is intended
     to be covered.
   - Map real local data to synthetic public-safe fixtures.
   - Run the portable harness after fixture manifest or fixture changes.

5. Activate remotely only after merge and explicit operator authorization.
   - Regenerate from the merged parent commit and intended data repo commit.
   - Use [deployment.md](./deployment.md) for upload and `~/update-db.sh`.
   - Compare remote `/api/status/db` provenance with local content metadata.
   - Sample public API responses after activation.

## Command Owners

- Local DB roles, environment variables, migrations, and reset setup:
  [data-setup.md](./data-setup.md)
- Local import, rules patch apply, content generation, parity, and metadata
  commands: [import-workflow.md](./import-workflow.md)
- Rules DB patch semantics and source-specific caveats:
  [rules-db-notes.md](./rules-db-notes.md)
- Remote upload, backend deploy, and operator activation:
  [deployment.md](./deployment.md)
- Portable DB fixture layout: [../../server/db/README.md](../../server/db/README.md)
- Data-tool command inventory: [../../data-tools/package.json](../../data-tools/package.json)

## Cache And Runtime Notes

The backend may cache some API responses in-process. After swapping local or
remote DB files, restart the API process before using cached endpoints such as
`/api/rulebooks` as evidence.

Use `/api/status/db` for DB provenance and active read-source checks. In
production, detailed DB status is operator-facing and token-protected.
