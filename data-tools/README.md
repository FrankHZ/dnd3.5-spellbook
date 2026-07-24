# Data Tools Workspace

This workspace owns data preparation, inspection, parser, and future rules DB
patch tooling.

It is separate from the `server` workspace so API runtime code stays focused on
serving requests.

## Source Layout

`data-tools/src/` is grouped by module before lifecycle:

- `shared/`: repo path, environment, and local-data helpers.
- `db/`: data-tool database clients.
- `rules/`: rules DB inspection, SQL patching, manifests, structured spell
  patching, and `spells-full` patch generation.
- `rules-content/`: normalized spell-facing content generation from the legacy
  rules DB into content-DB-ready rows and audit reports.
- `short-desc/`: English source probing, matching helpers, QA, normalization,
  import, coverage, and reuse workflows for short descriptions.
- `phb/`: PHB 3.5 source locking, PDF.js text baselines, pilot preparation,
  MinerU layout import, and errata inventory validation.
- `phb-review/`: public Node-only review service and DTO boundary for the
  localhost PHB review console.
- `zh-parser/`: Chinese CHM parser, parser helpers, and parser-local scripts.
- `harness/`: portable tests and explicit local acceptance bundles.

Command lifecycle is documented below. Physical module placement does not by
itself mean every script is equally durable.

Command lifecycle metadata lives in
[`scripts.manifest.json`](./scripts.manifest.json). The portable harness checks
that every `package.json` script is classified there.

## Commands

Current v3.4 planning for data-tooling work lives in:

- [../docs/mvp/v3.4/integrated-plan.md](../docs/mvp/v3.4/integrated-plan.md)
- [../docs/mvp/v3.4/short-description-pipeline-plan.md](../docs/mvp/v3.4/short-description-pipeline-plan.md)
- [../docs/mvp/v3.4/data-harness-hardening-plan.md](../docs/mvp/v3.4/data-harness-hardening-plan.md)

Active PHB source work is owned by
[../docs/releases/v1.4/phb-source-and-errata-plan.md](../docs/releases/v1.4/phb-source-and-errata-plan.md).

Verify the pinned PHB 3.5 source and errata, then prepare or import the v1.4
pilot:

```bash
npm run -w data-tools phb:source:verify
npm run -w data-tools phb:source:extract -- --pilot --prepare-only
npm run -w data-tools phb:source:extract -- --pilot --mineru-output artifacts/mineru/phb35/pilot-output-run4
npm run -w data-tools phb:source:compare -- --pilot
npm run -w data-tools phb:source:report -- --pilot
npm run -w data-tools phb:pilot:verify
```

The first command verifies exact PDF bytes, PDF.js text-layer evidence, the
ten-case pilot manifest, the spell-relevant errata inventory, and any committed
page-pilot review hash chain. Provenance files must be clean and byte-identical
to the Git commit reported for them. The
prepare-only command creates deterministic subset PDFs under ignored
`data/artifacts/mineru/phb35/pilot-input/`. Run pinned MinerU 3.4 externally,
then pass its data-relative output directory to the import command. Import
writes source-bearing page rows and provenance under
`data/phb35/extracted/pilot/`; `data-tools/out/phb/` receives only source-free
counts and hashes.

MinerU is the primary structured extractor for blocks, reading order, fields,
lists, and tables. Every imported page also stores an independently derived
PDF.js exact-character and coordinate baseline. Items inside strict MinerU
bboxes may repair glyphs directly. An outside-bbox item, image-adjacent caption
exclusion, or MinerU/source order conflict requires a current accepted row in
`data/phb35/review/full-mineru-layout-review.jsonl`; each row fingerprints the
PDF.js item, all eligible MinerU blocks, the selected block or anchor, and the
source inputs. PDF.js never defines spell segmentation, reading order, or table structure. MinerU table
text is marked `ocr-risk`, and unresolved projection or layout drift blocks
entity-level acceptance. The tested local runtime is pinned by
`data/phb35/source/mineru-runtime.json`, including the required
`pdftext==0.6.3` and `six==1.17.0` compatibility pins.

Before replacing the accepted full-run runtime, audit candidate MinerU output
against the independently pinned PDF.js text layer one page at a time:

```bash
npm run -w data-tools phb:mineru:recall -- \
  --label vlm-printed-182 \
  --source-id phb35-core \
  --source-page-index 182 \
  --candidate-page-index 0 \
  --content-list artifacts/mineru/phb35/recall-pilot/printed-182-vlm-gpu/phb35-core.full/vlm/phb35-core.full_content_list.json \
  --backend vlm-engine \
  --method auto
```

The command verifies the current source and full-input manifests, reads one
candidate content-list page, and writes a source-free report under
`data-tools/out/phb/`. It reports strict MinerU-bbox coverage, normalized item
coverage, and dehyphenated token recall/precision without emitting PDF text.
The `backend` and `method` arguments describe the candidate; they are not a
runtime provenance gate. A full-run replacement still requires a committed
runtime manifest generated from the actual environment plus representative
description, table, and image-adjacent page acceptance.

`phb:pilot:verify` is the acceptance gate, not another report command. By
default it requires a committed, non-stale, `accepted` end-to-end review with
entity extraction, errata overlay, DB comparison, and row-review artifacts.
The linked source and pilot manifests must also be `accepted`.
The accepted page-only review cannot satisfy that end-to-end gate. To verify
only the accepted page-extraction substage, run:

```bash
npm run -w data-tools phb:pilot:verify -- --stage page-extraction
```

This explicit stage check passes for the accepted page review, but it does not
authorize full-PHB extraction.

`phb:source:compare -- --pilot` consumes the ten selected imported page rows,
applies the maintained errata inventory, reads the
rules/content SQLite databases without writing them, and emits one comparison
and proposed review per case. Spell-list short descriptions are comparison
components, including summary-only cases. Source-bearing outputs stay in the
nested data repo. Four small manifests form the end-to-end provenance chain:

```text
pages -> entities -> errata overlay -> DB comparison -> row review
```

Rerunning comparison preserves an existing terminal row decision only when its
category, evidence-row ids, review flags, and full evidence fingerprint are
unchanged. `phb:source:report -- --pilot` refuses to propose the end-to-end
review while any row remains `proposed`.
After all ten rows have terminal decisions, the report command writes the
proposed `pilot-e2e-review.json`; main-gate acceptance and a committed clean
hash chain are still required before the default pilot verifier passes. The
verifier also checks the current committed errata inventory and current
rules/content DB hashes against the accepted comparison inputs.

After the accepted end-to-end pilot passes, run the full source workflow:

```bash
npm run -w data-tools phb:source:extract -- --full --prepare-only
npm run -w data-tools phb:source:extract -- --full --mineru-output artifacts/mineru/phb35/full-output
npm run -w data-tools phb:source:extract
npm run -w data-tools phb:source:compare
npm run -w data-tools phb:srd:verify
npm run -w data-tools phb:srd:extract
npm run -w data-tools phb:srd:adjudicate
npm run -w data-tools phb:srd:apply
npm run -w data-tools phb:source:report
```

The prepare command creates deterministic 126-page subset PDFs for the pinned
MinerU runtime. Import preserves all ordered MinerU blocks and table HTML under
`data/phb35/extracted/full/`, projects strict-inside PDF.js items, generates or
refreshes explicit review rows for every outside-bbox item, image-adjacent
caption exclusion, and order conflict,
and then runs entity extraction. The plain extract command only
reparses the already imported MinerU page rows; it cannot fall back to a
PDF.js-only full run. The extractor hard-fails unless the independently derived
description and class/domain-list sets both contain 605 spells, with 1,216
printed list rows, 1,235 expanded occurrences, and no parser or set-
reconciliation issue. The source-specific layout contract also pins 59 MinerU
table blocks, seven detached named tables, and seven excluded description image
blocks. Every table artifact and its page-linked spell references enter the
row-review evidence chain. The accepted full corpus currently has 126 reviewed
outside-bbox item projections, three reviewed image-caption exclusions, and two
reviewed order overrides. Proposed, stale, or invalid-status layout rows block
extraction, and their manifest is recursively verified by the full report.
Combined `Target` / `Effect` / `Area` labels remain
distinct extraction fields instead of being flattened into `target`.

Full comparison applies the committed errata inventory and operation hints,
then compares the 605-row source/DB union against read-only rules and content
databases. It writes component comparisons, DB identities, fingerprint-bound
row reviews, and source-free aggregate counts. `exact-match` and
`formatting-only` rows receive deterministic `data-tools:auto` acceptance;
substantive and manual rows remain `proposed`. Combined target/effect/area
fields and unparsed shared Summon Nature's Ally tables are always manual;
whole-body token reordering is never accepted as formatting equivalence. The
default report command recursively re-hashes extraction issues, errata output,
the pilot summon table, comparison inputs, and review evidence, then refuses
to create `full-english-review.json` until every current row decision is
terminal. A successful extraction or comparison does not close Gate 2.
The SRD commands verify and parse the pinned official 3.5 corpus, generate a
three-way PHB+errata/SRD/DB adjudication queue, and apply only committed,
fingerprint-current terminal candidates to row review. Residual exceptions
remain explicit main-gate work.

The maintained `data-tools/phb-review` package subpath exposes exactly two
review queues to the private localhost console:

- `mineru-layout`: current candidate/page evidence for all layout statuses;
- `english-residual`: current SRD exception rows joined to comparison,
  row-review, PHB, errata, table, and list evidence.

The service rebuilds candidates before every write, checks both evidence and
review-state fingerprints, including current SRD adjudication evidence for
English residuals, validates the complete queue, serializes writes in the
process, and atomically replaces only the selected nested-data JSONL. The
English queue also requires the code-owned `official-srd-default-v1` authority
policy reference in the adjudication manifest and includes that policy in each
review fingerprint. Pre-authority snapshots therefore fail closed; the legacy
adjudicator cannot make them reviewable by merely rerunning itself. Queue
summaries and decision responses derive `canonicalRerunRequired` from current
manifests, so reloads and no-op submissions retain pending rerun state. A layout
save invalidates the English chain and requires a rerun beginning at
`phb:source:extract`. English residual decisions may be completed as one batch;
after the final save, rerun `phb:source:compare` to refresh the stale row-review
manifest before `phb:source:report`.

The package is built before the review-console runtime resolves it:

```bash
npm run build:data-tools
npm run check:data-tools-review
npm run -w phb-review-console smoke:local
```

The local smoke is read-only and checks runtime token handoff, layout detail,
the verified PDF byte-range route, and either current English detail or the
expected structured `stale-queue` response while authority-locked.

Inspect the local rules DB:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools inspect:rules -- spell fireball
npm run -w data-tools inspect:rules -- schema dnd_spell
```

Prepare the local rules DB:

```bash
npm run -w data-tools rules:sql:dry-run -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:sql:apply -- pending/legacy-sql/example.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Validate and apply structured missing-spell patches:

```bash
npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- pending/spells/example.jsonl
```

Record and verify the local `rules-clean.sqlite` fingerprint against maintained
rules patch inputs:

```bash
npm run -w data-tools rules:manifest:write
npm run -w data-tools rules:manifest:verify
```

Audit and generate normalized spell-facing rules content:

```bash
npm run -w data-tools rules:content:audit
npm run -w data-tools rulebooks:publications:seed
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:generate -- --audit-only --limit 100
npm run -w data-tools rules:content:import -- --dry-run
npm run -w data-tools content:search:rebuild -- --dry-run
npm run -w data-tools content:search:rebuild
npm run -w data-tools rules:content:review
```

`rules:content:audit` and `rules:content:generate` open the configured rules DB
read-only. A normal generator run is a full, importable build and requires the
canonical `data/rulebook-publications/publications.jsonl`, one metadata row for
every rules-clean rulebook, the rules DB manifest, and nested-data Git state.
It writes `data-tools/out/rules-content/rules-content.generated.json` plus an
audit summary of review-worthy legacy strings and normalized mechanics display
coverage. The artifact records `scope: "full"`, source-table totals,
generation-time parent/data commits and dirty flags, canonical-input hashes,
the actual rules DB hash, and the tracked content-migration hash.

Use `rules:content:generate -- --audit-only [--limit N]` only for incomplete
inspection artifacts. It writes the distinct
`rules-content.limited.generated.json` default, records `scope: "limited"` and
its limitations, and cannot be passed to `rules:content:import`. `--limit`
without `--audit-only`, or an audit-only run targeting the full default path,
fails before generation.
Each generated mechanics facet keeps `rawText` and records `normalizedText`
plus `displayCoverage`: only `complete` rows may replace raw display;
`partial` and `review` rows fall back to raw, while `empty` rows have no display
value. Parser `reviewStatus` remains a separate filter/review confidence signal
and must not be used as display coverage. `normalizedText` is the canonical
English equivalence check; later localized consumers should translate the
structured category/amount/unit/flags rather than translate that string as
free-form copy. `rulebooks:publications:seed` writes the
maintained local publication metadata source at
`data/rulebook-publications/publications.jsonl` from rules-clean rulebook fields
and CHM publication labels. Seeded rows use `reviewStatus: "review"` until a
human or specialist review accepts them. Rulebook content rows receive
publication metadata used by API consumers: `publicationCategory`,
`publicationFamily`, `publicationSourceKind`, `publicationDisplayOrder`,
`publicationYear`, `publicationDate`, `publicationUrl`, `publicationImage`, and
`publicationReviewStatus`. Review-stage publication rows may keep source
year/date/URL/image values in local data, but `rules:content:generate` only
publishes those detail fields from rows marked `accepted`.
`publicationDisplayOrder` is a deterministic manual/fallback ordering field, not
publication chronology; seeded rows currently derive it from the publication
category bucket plus the rules-clean legacy rulebook id. Consumers that need
publication order should prefer `publicationDate`, then `publicationYear`, then
display label/id fallback unless a reviewed row intentionally overrides
`publicationDisplayOrder`. Frontend code should consume the generated metadata
instead of deriving publication groups from labels. `rules:content:import`
reads that generated file, rejects limited artifacts, re-hashes the current
rules DB, canonical inputs, and tracked migrations against the generation
record, and replaces only the rules-content generated tables in
`CONTENT_DATABASE_URL`. `RulesContentBuild` commit/hash columns preserve the
generation state; `buildMetaJson` records generation and importer state
separately. Use `--dry-run` after applying content migrations to validate the
same artifact/provenance and row counts without mutating SQLite.

`content:search:rebuild` is the maintained boundary for the derived content DB
FTS5 index. Run it after every content import in a normal rebuild. It generates
canonical and localized spell documents from prepared names, aliases,
summaries, body text, and mechanics/header text, then records the compatible
schema version and document count in `SpellSearchIndexState`. `--dry-run`
requires the migration and reads the same source rows without changing the DB.
FTS shadow tables are rebuildable runtime state, not portable fixture source
files.

`rules:content:review` opens the configured content DB read-only and inventories
the normalized taxonomy, component, and mechanic facet tables for filter-contract
readiness review. It writes a timestamped report under
`data-tools/out/rules-content/`, including mechanics coverage counts by field
and representative complete/fallback samples. Readiness status `detail_only`
means the
family is intentionally retained for raw/detail display and is not public filter
vocabulary; for example, `components.other_or_extra` keeps extra component text
out of filter controls.

Run portable data-tools helper tests:

```bash
npm run -w data-tools test:portable
```

This command is fixture-only and does not require local CHM/raw source data,
the nested `data/` repo, or configured runtime SQLite databases. It covers pure
source-label mapping, English name normalization, short-description row
validation, structured rulebook/spell patch JSONL/schema validation, artifact
scope/provenance failures, and a disposable in-memory content DB acceptance
that applies every tracked migration before exercising the real import path and
constraints. Run that final path directly with:

```bash
npm run -w data-tools rules:content:acceptance:portable
```

Run the local v3.4 data acceptance bundle:

```bash
npm run -w data-tools acceptance:local
```

This explicit local gate runs `typecheck`, `rules:manifest:verify`,
`rules:content:audit`, `rules:content:generate`, `summaries:qa`, and
`summaries:import -- --dry-run`. It depends on the local nested `data/` repo and
configured SQLite paths, so it is intentionally not part of root
`npm run verify`.

Inspect and generate structured patches from local `spells-full` data:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses --write-patch pending/spells/spells-full-known-misses.jsonl
npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch pending/spells/short-desc-rules-gaps.generated.jsonl
npm run -w data-tools spells-full:inspect -- source-package
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
```

`source-package` is a local-only v1.2 source-review command. It reads
`data/spells-full/v6.01/`, hashes the package files, parses the source index
from `Spells v6.01 - List.txt`, compares that index with
`data/spells-full/spells-parsed.json`, and writes a rebuildable report under
`data-tools/out/spells-full/`. It does not open SQLite and does not write patch
JSONL.

`corpus-inventory` is a local-only v1.1 data-pipeline command. It reads the
ignored `data/spells-full/spells-parsed.json` source dump and the configured
rules DB read-only, then writes a rebuildable inventory report under
`data-tools/out/spells-full/`. Generate mode writes only the `ready` category
as structured `insertSpell` JSONL for review. It does not apply the patch or
rebuild content DB artifacts.

Generate mode also writes row-level review artifacts under `data/spells-full/`:
`full-corpus-rejected.generated.jsonl` contains confirmed non-import rows
because they already exist in the rules DB, resolve to parser/index artifacts
or out-of-scope 3.0 rulebooks, or were reviewed as typo/duplicate hazards;
`full-corpus-ambiguous.generated.jsonl` contains unresolved in-scope row-level
mismatches and source/edition ambiguity. These files are review data, not patch
operations.

For multi-source spells-full rows, the parsed corpus normally provides one
combined body rather than one body per source book. If any mapped target
rulebook already has an exact or reviewed alias hit, the row is treated as
already collected unless it is on a version-aware manual review blocklist.

`spells-full:rulebooks` reads the latest generated corpus inventory report and
writes deferred source-label review rows to
`data/spells-full/source-rulebooks.generated.jsonl`. It also writes
`data/spells-full/source-rulebooks-ambiguous.generated.jsonl` with only
`manual-review-source` labels for focused edition/source review. These rows
classify unmapped source families and import disposition; they are not rulebook
insert operations. D&D 3.5 source labels that cannot yet generate spell JSONL
because the rules DB lacks a matching rulebook are marked
`candidate-import-rulebook`.

When those source labels are reviewed, add rulebook identities through
structured JSONL under `data/rules-patches/pending/rulebooks/`, validate/apply
them with `rules:rulebooks:*`, and move accepted files to
`data/rules-patches/applied/rulebooks/` before rewriting the rules manifest.
The source-label review JSONL itself is not an insert/update patch.

Probe IMarvinTPA for English short-description candidates:

```bash
npm run -w data-tools en:summaries:candidates
npm run -w data-tools en:summaries:probe
npm run -w data-tools en:summaries:probe -- --candidate "Spider Poison" --candidate "Blood Wind"
npm run -w data-tools en:summaries:probe -- --input imarvin/short-desc/candidates.json --limit 20
npm run -w data-tools en:summaries:probe -- --input imarvin/short-desc/candidates.json --offset 0 --limit 20 --delay-ms 1500 --output-name imarvin-00000-00020
npm run -w data-tools en:summaries:sources -- --input imarvin/short-desc/candidates.json --delay-ms 1500
npm run -w data-tools en:summaries:sources -- --input imarvin/short-desc/candidates.json --source-offset 0 --source-limit 20 --output-name source-index-00000-00020 --delay-ms 1500
```

Run the Chinese CHM parser workflow:

```bash
npm run -w data-tools zh:preprocess
npm run -w data-tools zh:parse
npm run -w data-tools zh:parse:test
npm run -w data-tools zh:backcheck
npm run -w data-tools zh:qa
```

Extract Chinese short-description candidates from local CHM overview pages:

```bash
npm run -w data-tools zh:summaries:extract
npm run -w data-tools zh:summaries:extract -- --classListInput ../data/chm-raw-full/职业法术列表 --domainListInput ../data/chm-raw-full/领域法术 --outDir out/zh-parser/summary
```

Run short-description QA over already-generated Chinese and English reports:

```bash
npm run -w data-tools summaries:qa
```

Build the normalized import JSONL after extraction and QA review:

```bash
npm run -w data-tools summaries:normalize
```

Run short-description cleanup QA and same-name reuse candidate generation:

```bash
npm run -w data-tools summaries:source-gap-candidates
npm run -w data-tools summaries:source-gap-apply
npm run -w data-tools summaries:source-gap-apply -- --write
npm run -w data-tools summaries:reuse-candidates
npm run -w data-tools summaries:reuse-apply
npm run -w data-tools summaries:reuse-apply -- --write
npm run -w data-tools summaries:punctuation
npm run -w data-tools summaries:punctuation -- --write
```

Import normalized short descriptions into the local content DB:

```bash
npm run -w data-tools summaries:import -- --dry-run
npm run -w data-tools summaries:import
```

## Data Paths

These tools read local-only source data from `data/` and write
generated reports or parser output under `data-tools/out/`.

## Command Lifecycles

Not every data-tool script has the same maintenance burden.

- **Maintained commands** are part of the repeatable project workflow. Examples:
  `test:portable`, `acceptance:local`, `rules:manifest:*`,
  `rules:spells:*`, `summaries:*`, `zh:qa`, and parser/generator commands that
  are documented as current inputs to a release or acceptance gate.
- **Local acceptance commands** are maintained, but depend on ignored local data
  or SQLite files. Keep them explicit and do not wire them into root
  `npm run verify`.
- **Dormant local commands** are source-consumed workflows kept for reruns when
  source data or parser logic changes. They should keep typechecking and command
  compatibility, but they are not active acceptance gates.
- **One-time/ad hoc scripts** are investigation, migration, or backfill helpers.
  Keep them out of always-on validation. If one becomes part of future feature
  work, promote it to a documented maintained command and add focused helper
  tests at that point.

Harness work should follow that lifecycle. Test reusable parsing, validation,
mapping, and schema helpers behind maintained commands; do not spend test
coverage on scripts whose only job was a single historical data move.

When adding a new `package.json` script, add it to `scripts.manifest.json` with
its owning module and lifecycle. Use `one-time/ad hoc` only in docs or future
manifest revisions for scripts that should not be treated as maintained package
commands.

The current Chinese CHM full-parse and summary-extraction workflow is marked
`dormant-local` after the v3.4 source pass: `zh:preprocess`, `zh:parse`,
`zh:backcheck`, and `zh:summaries:extract` are kept for source/parser reruns,
while `zh:qa` stays maintained because it remains useful after CHM source
cleanup.

Current CHM parser defaults:

- raw CHM HTML: `data/chm-raw/` (local ignored static input)
- cleaned CHM HTML: `data/chm-clean/`
- full raw CHM decompile for source inventory: `data/chm-raw-full/` (local
  ignored static input)
- parser test input: `data/chm-test/`
- CHM mapping and alias JSON: `data/chm-mapping/`
- IMarvinTPA source data: `data/imarvin/short-desc/`
- maintained short-description review decisions:
  `data/short-desc-review/`
- parser output: `data-tools/out/zh-parser/`
- mechanical QA output: `data-tools/out/zh-parser/qa/`
- short-description extraction output: `data-tools/out/zh-parser/summary/`
- normalized short-description import JSONL:
  `data/short-desc-normalized/summaries.generated.jsonl`
- reviewed-but-not-yet-merged summary rows:
  `data/short-desc-normalized/pending/`

`data/chm-raw/` and `data/chm-raw-full/` may exist locally under the nested
`data/` directory, but they are static inputs and should stay ignored rather
than maintained as source-of-truth files. `data/chm-raw-full/` is not part of
the current full-description parser input. Use it for source discovery and
future short-summary extraction planning before promoting adopted pages into a
maintained clean or summary source path.

CHM preprocess and parse commands scan nested directories and preserve relative
paths in cleaned output and parser source keys. Word/CHM companion directories
ending in `.files` are skipped.

If a nested source file does not include an explicit book label in its spell
headers, the parser may infer one from the top-level source directory when that
directory is mapped to a known rulebook. For example, `九剑/` is treated as the
CHM label for `Tome of Battle` (`ToB`).

The rules DB path comes from `RULES_DATABASE_URL`; see `server/.env` and
`docs/operations/data-setup.md`.

`test:portable` is the clone-friendly data-tools harness. Local JSON mapping
files under `data/chm-mapping/` are optional runtime inputs; built-in mappings
remain available when the nested local data repo is absent.

Rules DB patch SQL files live under `data/rules-patches/`. The SQL
runner rejects paths outside that directory. Use `rules:sql:dry-run` before
`rules:sql:apply`; dry-run copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Structured spell patch JSONL files also live under
`data/rules-patches/`, normally in `pending/spells/` before apply and
`applied/spells/` after the locked rules baseline is updated. `insertSpell`
inserts the base spell row plus descriptors and class/domain levels, then
rebuilds derived spell indexes. `updateSpell` is intentionally narrow: it can
update a normalized `slug`, a non-empty raw `extraComponents` value, or a paired
non-empty `description` and `descriptionHtml` replacement. It rejects unknown
fields, unpaired text updates, empty updates, and no-op changes; it never
changes levels, descriptors, or unlisted spell columns. Validation opens the
configured rules DB read-only; dry-run applies to a temporary copy.
Because these patch files can contain source text, they are managed by the
nested local `data/` repo. Keep patch schemas, validators, generators, reports,
and redacted fixtures in the parent project repo.

Structured rulebook patch JSONL files live under the same root, normally in
`pending/rulebooks/` before apply and `applied/rulebooks/` after the locked
rules baseline is updated. The supported operation is `insertRulebook`, which
inserts a reviewed `dnd_rulebook` row after validating id, edition id, name,
abbr, slug, and duplicate collisions. Rulebook patches do not rebuild spell
indexes.

The optional `spells-full` source dump lives under
`data/spells-full/` when present locally. It is ignored by the parent repo and
may be versioned in the nested local `data/` repo. Use `spells-full:inspect`
and `spells-full:generate` to create reviewable structured patch candidates
from it. The `short-desc-rules-gaps` target consumes
`data-tools/out/short-desc-qa/review-queues/en-rules-db-gaps.jsonl`, infers
target rulebooks from reviewed IMarvinTPA source labels, and only writes patch
candidates when the parsed spell, rules DB lookups, class/domain levels,
schools, subschools, descriptors, and slug checks all pass.

For v1.1 full-corpus work, `spells-full:inspect -- corpus-inventory` groups
source appearances as `ready`, `duplicate`, `mismatch`, `manual-review`, or
`deferred`. `spells-full:generate -- corpus-inventory --write-patch <path>`
writes only the `ready` rows to JSONL under `data/rules-patches/`; DB apply,
content DB rebuild, and production activation stay outside the data-pipeline
command. The same generate command writes rejected and ambiguous review JSONL
under `data/spells-full/` so confirmed non-import rows and unresolved rows are
not mixed back into the ready patch.

For v1.2 source-review work, `spells-full:inspect -- source-package` inventories
the local v6.01 source package without database access. Treat the v6.01 list
file as the package-level source/name index. The v6.01 full text is retained as
source material, but this command does not parse it into structured spell-body
rows. The committed review record lives under `docs/releases/v1.2/`; the JSON
report under `data-tools/out/spells-full/` is rebuildable evidence.

Run `spells-full:rulebooks` after generating corpus inventory when deferred
source labels need review. Its JSONL output belongs in the nested local `data/`
repo alongside other review decisions; the companion
`source-rulebooks-ambiguous.generated.jsonl` is the focused source-label queue
for edition/source ambiguity.

`en:summaries:probe` performs a small, rate-limited live probe against
IMarvinTPA's spell search. It defaults to one candidate at a time with at least
750 ms between HTTP requests, and rejects concurrency above 3. Reports are
written under `data-tools/out/en-summaries/`, which is ignored by the parent
repo. Use `--offset`, `--limit`, and `--output-name` for resumable slow-crawl
chunks with stable report filenames. Candidate JSON inputs are local data and
should live under `data/` when kept.

`en:summaries:candidates` writes local-only rules DB candidate JSON under
`data/imarvin/short-desc/candidates.json` by default. It excludes Tome of Battle
maneuver names unless `--include-tob` is passed.

`en:summaries:sources` fetches IMarvinTPA's source-book index and each source's
`Small=5` line view, then joins the indexed rows against the local candidate
JSON. It is also rate-limited and writes the source-index rows as local source
data split by our local rules DB edition categories under
`data/imarvin/short-desc/source-index/` by default. It also writes a compact run
report under `data-tools/out/en-summaries/` and does not mutate SQLite
databases. The canonical `source-index` directory accepts complete crawls only;
`--source-offset` or `--source-limit` requires a distinct `--output-name`.
Source output names must be safe directory basenames and cannot collide with
protected short-description inputs. Every accepted output is built in a sibling
staging directory and activated by directory rename only after its source files
and manifest are complete, so a failed crawl or staging write leaves the prior
target intact.

`zh:qa` is a mechanical source and parser-output QA report. It checks parser
hard gates, raw/clean file drift, noisy source labels, empty or very short
descriptions, unexpectedly long bold text, duplicate source keys, obvious
mojibake markers, and broader coverage counts. It does not perform human
translation review.

`zh:summaries:extract` is a read-only v3.4 extractor for short-description
candidates. It reads class spell overview pages from
`data/chm-raw-full/职业法术列表/`, domain spell overview pages from
`data/chm-raw-full/领域法术/`, reads the ToB maneuver overview from
`data/chm-clean/九剑/招数列表.htm`, reuses the current CHM alias/matching helpers,
and writes `candidates.json`, `matched.json`, `unmatched.json`,
`duplicates.json`, `conflicts.json`, `alias-audit.json`, and `summary.json` under
`data-tools/out/zh-parser/summary/`.

`summaries:qa` reads the generated Chinese summary reports and the local English
IMarvinTPA source-index directory, then writes `summary.json`, `issues.json`, and
JSONL review queues under `data-tools/out/short-desc-qa/`. It does not fetch
network sources. Generate or refresh the English source index with
`en:summaries:sources` before relying on cross-language coverage queues. If
validated subagent or human decisions exist under
`data/short-desc-review/qa/`, the command validates their stable keys and
decisions, records review coverage in `summary.json`, and writes follow-up
queues such as `import-blockers.jsonl`, `en-add-candidates.jsonl`, and
`en-rules-db-gaps.jsonl`. English add-candidate decisions that are covered by
the current IMarvinTPA name-matching rules are moved to
`en-resolved-candidates.jsonl`; reviewed rules DB gaps that are now covered by
current local rules DB rows are moved to `en-resolved-rules-db-gaps.jsonl`;
conservative source-mismatch title aliases that are covered by the same matching
rules are moved to
`en-resolved-source-mismatches.jsonl`.

`summaries:strict35-ready` consumes reviewed
`data/short-desc-review/qa/en-strict35-missing.decisions.jsonl` rows and the
local IMarvinTPA source index, then writes the currently consumable subset to
`data/short-desc-review/qa/en-strict35-ready.generated.jsonl`. Rows that already
have an accepted normalized summary are marked `already_covered`; rows that are
ready but not yet merged into the import boundary are also written to
`data/short-desc-normalized/pending/en-strict35-ready.generated.jsonl`. The
default source scope is the current official 3.5 working set:
`core-35`, `supplementals-35`, `eberron-35`, and `forgotten-realms-35`.

`summaries:normalize` is the import boundary for v3.4 spell summaries. It reads
Chinese extractor output plus conflict-review decisions from
`data/short-desc-review/zh-conflicts/` and the local IMarvinTPA source-index
data, then writes one normalized JSONL row shape for both languages under
`data/short-desc-normalized/summaries.generated.jsonl`. It only emits accepted
rows with local `spellId` and `rulebookId`; unresolved Chinese conflicts,
English rules DB gaps, and sources that cannot be mapped to local rules DB rows
are reported as skipped in
`data-tools/out/short-desc-normalized/summary.json`.

`rules:manifest:write` updates `data/rules-db-manifest.json` with the current
local rules DB fingerprint, table counts, patch file hashes, and structured
rulebook/spell-patch presence checks. `rules:manifest:verify` fails when the
local rules DB, patch files, index-table counts, or structured patch presence
drift from that manifest. Command reports are generated under
`data-tools/out/rules-manifest/`.

`rules:content:audit` is the read-only legacy dirty-field inventory for v3.5
normalization. It reads spell taxonomy, components, mechanics strings, and
class/domain list extras from `RULES_DATABASE_URL`, runs the same transform used
by generation, and writes issue counts plus samples under
`data-tools/out/rules-content/`.

`rules:content:generate` is the repeatable generated-content boundary for v3.5
normalized rules content. It writes a single JSON artifact with normalized
rulebooks, spells, appearances, taxonomy facets, class/domain list entries,
component rows, mechanics facets, and review issues. The transform preserves raw
legacy strings beside normalized categories and only emits a replacement-safe
`normalizedText` when `displayCoverage` is `complete`. Conservative grammars
cover simple casting times, ranges, durations, saving throws, and spell
resistance; target/effect/area remain raw fallback until their full semantics
can be represented. Full artifacts require complete canonical publication
metadata coverage and carry generation-time source scope, totals, repository
state, and input hashes. Explicit `--audit-only` artifacts are limited and
non-importable.

`rules:content:import` is the content DB mutation boundary for normalized rules
content. It requires the rules-content generated tables from
`server/db/content` migrations, including `SpellContent`,
`SpellTaxonomyFacet`, `SpellMechanicFacet.normalizedText`,
`SpellMechanicFacet.displayCoverage`, and `RulesContentIssue`. The dry run fails
with a migration instruction if those display columns are absent. Without
`--dry-run`, it replaces
only those generated tables; it does not touch i18n rows, app-state rows, the
rules DB, or the nested local data repo. It verifies current input hashes
against the artifact before either dry-run or live import and preserves
generation provenance separately from importer state.

`rules:content:review` is the read-only content DB inventory for post-import
normalized facet review. It reports taxonomy/component/mechanic review counts,
issue-code counts, mechanics display coverage counts and samples, Tome of
Battle-like taxonomy rows, and readiness hints for future filter-contract work.
Reports stay under `data-tools/out/rules-content/` and are not parent-repo source
artifacts.

`rulebooks:labels:audit` is the read-only rulebook display-label review report
for v3.5. It compares legacy `dnd_rulebook` identity fields, current
`RulebookContent.displayAbbr/displayName`, Chinese `I18nRulebookText.name`,
CHM source-label mappings, and the maintained publication-label JSONL at
`data/rulebook-labels/chm-publications.jsonl`, then writes
`data-tools/out/rulebook-labels/rulebook-label-audit.json`. It flags source
abbreviation artifacts such as `Sc_`, publication display-abbreviation
mismatches,
duplicate proposed display abbreviations, and missing Chinese full names without
changing API contracts or UI consumers.

`rulebooks:publications:seed` is the write-capable seed command for the
canonical local publication metadata JSONL at
`data/rulebook-publications/publications.jsonl`. It reads rules-clean
`dnd_rulebook` identity/publication fields and CHM publication labels, then
writes one row per rules-clean rulebook keyed by `legacyRulebookId`. The seed is
a review starting point: publication dates, URLs, and cover-image paths inherit
from rules-clean where available and remain `review` until accepted in the data
repo. Review rows preserve those values for QA, but generated content only
exposes the detail fields after the row is marked `accepted`. The seed command
refuses to overwrite an existing canonical JSONL unless `--force` is passed, so
manual ISBN and source URL enrichment is not accidentally lost. Use optional
`isbn10`, `isbn13`, and `metadataSources` fields in the data repo to record
publication-date provenance; those fields are validation/provenance data and are
not currently API-facing. Treat seeded `displayOrder` values as deterministic
fallbacks only: they are category offsets plus rules-clean legacy ids, and they
do not represent release order.

`summaries:import` is the content DB mutation boundary for spell summaries. It
reads only `data/short-desc-normalized/summaries.generated.jsonl`, validates the
accepted normalized row shape, and upserts rows into
`I18nSpellSummaryText` by `spellId + lang + variant`. It supports `--dry-run`,
does not delete existing summary or full-description rows, and writes audit
reports under `data-tools/out/short-desc-import/`.

`summaries:punctuation` is a deterministic cleanup QA pass over the normalized
JSONL. It reports summaries missing sentence-final punctuation and, with
`--write`, appends `.` for English or `。` for Chinese. It writes
`punctuation-summary.json` and `review-queues/summary-punctuation.jsonl` under
`data-tools/out/short-desc-qa/`. Run it after `summaries:source-gap-apply
-- --write` and `summaries:reuse-apply -- --write` so reused rows receive the
same final punctuation cleanup as source rows.

`summaries:source-gap-candidates` finds English IMarvinTPA source-index rows
that have a short description but do not match a local spell in their scoped
source book, then looks for exact-name or established inverted-name matches
among scoped local spells that are missing English summaries. It writes a review
queue under `data-tools/out/short-desc-qa/review-queues/`.

`summaries:source-gap-apply` consumes reviewed
`data/short-desc-review/source-gap-reuse/*.decisions.jsonl` files. It writes
accepted rows back into the normalized JSONL only with `--write`, preserving
cross-book provenance through `sourceKind: "source-gap-reuse"`. Use this only
for explicit source-gap reuse; it should not become a fuzzy source matcher.

`summaries:reuse-candidates` finds same-name spell rows within the configured
rules DB edition scope, currently `core-35` and `supplementals-35`, where one
row has an accepted summary and another lacks that language/variant summary. It
excludes ToB by default because maneuver summaries are a separate content track.
Rows whose source and target rules DB descriptions match exactly are emitted as
high-confidence auto decisions; all other candidates are chunked for subagent or
human review under `review-queues/summary-reuse-candidates/`.

`summaries:reuse-apply` consumes auto decisions from generated QA output and
reviewed `data/short-desc-review/summary-reuse/*.decisions.jsonl` files. It
writes accepted reuse rows back into the normalized JSONL only with `--write`,
preserving reuse provenance through `sourceKind: "summary-reuse"`. A reviewed
reuse decision may include `summaryText` to override the source summary when
source and target share the same mechanism but the target rules DB text uses
different numbers.

`summaries:coverage-report` writes a per-rulebook coverage report to
`data-tools/out/short-desc-qa/book-coverage-report.{json,md}`. It compares the
rules DB spell list against accepted normalized Chinese and English summaries,
and also reports English/Chinese source rows that have short descriptions but
do not match a spell in the scoped rules DB books. English source rows are split
between true scoped-DB misses and source-book mismatches that match a spell in
another scoped book. The default scope is the current official 3.5 working set:
`core-35`, `supplementals-35`, `eberron-35`, and `forgotten-realms-35`; pass
`-- --scope all` for a whole-DB backlog.

## Safety

- `inspect:rules` opens the SQLite database in read-only mode.
- `test:portable` uses inline fixtures and does not read local data or SQLite
  databases.
- `acceptance:local` runs local read/dry-run acceptance commands only; it does
  not perform write-capable imports.
- `rules:content:audit` and `rules:content:generate` open the rules DB
  read-only and write generated reports/artifacts under `data-tools/out/`.
- `rules:content:parity` opens the rules DB and content DB read-only, compares
  full local normalized content parity, and writes a report under
  `data-tools/out/rules-content/`.
- `rules:content:review` opens the content DB read-only and writes a normalized
  facet review report under `data-tools/out/rules-content/`.
- `rulebooks:labels:audit` opens the rules DB and content DB read-only and
  writes a review report under `data-tools/out/rulebook-labels/`.
- `rules:content:import -- --dry-run` validates the generated normalized content
  artifact and target content DB tables without mutating SQLite.
- `rules:content:import` is write-capable against `CONTENT_DATABASE_URL` and
  replaces only generated normalized rules content tables. It also records
  `RulesContentBuild` provenance hashes and parent/data commit ids for local
  artifact comparison.
- `content:search:rebuild -- --dry-run` validates the content search schema and
  generated document counts without mutation.
- `content:search:rebuild` replaces only the derived FTS documents and index
  state in `CONTENT_DATABASE_URL`; it does not change prepared source rows.
- `rules:spells:validate` opens the SQLite database in read-only mode and
  writes a JSON report under `data-tools/out/rules-patches/`.
- `rules:rulebooks:validate` opens the SQLite database in read-only mode and
  writes a JSON report under `data-tools/out/rules-patches/`.
- `rules:spells:apply -- --dry-run` applies to a temporary database copy.
- `rules:spells:apply` is write-capable and prints the target DB path before
  mutating it. It preloads every required derived-index SQL script, then
  commits spell inserts, updates, and index rebuilds in one transaction so a
  rebuild failure leaves all of those rows unchanged.
- `rules:rulebooks:apply -- --dry-run` applies to a temporary database copy.
- `rules:rulebooks:apply` is write-capable and prints the target DB path before
  mutating it.
- `spells-full:*` reads local source data and writes reports or patch
  candidates; it does not mutate SQLite databases.
- `en:summaries:probe` fetches only requested candidate searches and writes a
  report; it does not mutate source data or SQLite databases.
- `en:summaries:sources` fetches source-index pages and writes generated review
  output plus local source-index JSON only; it does not mutate SQLite databases.
  It rejects root-equivalent, path-like, reserved, protected-input, and
  non-directory targets; partial crawls cannot replace canonical `source-index`,
  and accepted writes stage before same-parent activation.
- `summaries:normalize` writes local JSONL/report files only; it does not mutate
  SQLite databases.
- `summaries:punctuation` without `--write` writes reports only; with `--write`
  it mutates the normalized local data JSONL.
- `summaries:reuse-candidates` writes generated QA queues and does not mutate
  SQLite databases or normalized data.
- `summaries:source-gap-candidates` writes generated QA queues and does not
  mutate SQLite databases or normalized data.
- `summaries:source-gap-apply` without `--write` writes reports only; with
  `--write` it mutates the normalized local data JSONL.
- `summaries:reuse-apply` without `--write` writes reports only; with `--write`
  it mutates the normalized local data JSONL.
- `summaries:import -- --dry-run` validates and counts content DB changes
  without mutating SQLite databases.
- `summaries:import` is write-capable against `CONTENT_DATABASE_URL`
  (`APP_DATABASE_URL` fallback during the split) and upserts only
  `I18nSpellSummaryText` rows.
- `rules:sql:dry-run` never mutates the configured rules DB.
- `rules:sql:apply` and `rules:index:rebuild` are write-capable and must be run
  intentionally.
- Parser commands may write generated output under `data-tools/out/zh-parser/`.
- `zh:summaries:extract` writes generated review output only; it does not
  mutate source data or SQLite databases.
- `summaries:qa` reads generated reports and maintained review decisions, then
  writes generated QA output only; it does not mutate source data, fetch network
  sources, or touch SQLite databases.
- Future rules DB patch commands must clearly distinguish dry-run validation
  from write-capable imports.
