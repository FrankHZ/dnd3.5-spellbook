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
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:import -- --dry-run
```

`rules:content:audit` and `rules:content:generate` open the configured rules DB
read-only. The generator writes
`data-tools/out/rules-content/rules-content.generated.json` plus an audit summary
of review-worthy legacy strings. `rules:content:import` reads that generated file
and replaces only the rules-content generated tables in `CONTENT_DATABASE_URL`;
use `--dry-run` after applying content migrations to validate row counts without
mutating SQLite.

Run portable data-tools helper tests:

```bash
npm run -w data-tools test:portable
```

This command is fixture-only and does not require local CHM/raw source data,
the nested `data/` repo, or SQLite databases. It covers pure source-label
mapping, English name normalization, short-description row validation, and
structured spell patch JSONL/schema validation.

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
```

Probe IMarvinTPA for English short-description candidates:

```bash
npm run -w data-tools en:summaries:candidates
npm run -w data-tools en:summaries:probe
npm run -w data-tools en:summaries:probe -- --candidate "Spider Poison" --candidate "Blood Wind"
npm run -w data-tools en:summaries:probe -- --input imarvin/short-desc/candidates.json --limit 20
npm run -w data-tools en:summaries:probe -- --input imarvin/short-desc/candidates.json --offset 0 --limit 20 --delay-ms 1500 --output-name imarvin-00000-00020
npm run -w data-tools en:summaries:sources -- --input imarvin/short-desc/candidates.json --delay-ms 1500
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
`docs/data-setup.md`.

`test:portable` is the clone-friendly data-tools harness. Local JSON mapping
files under `data/chm-mapping/` are optional runtime inputs; built-in mappings
remain available when the nested local data repo is absent.

Rules DB patch SQL files live under `data/rules-patches/`. The SQL
runner rejects paths outside that directory. Use `rules:sql:dry-run` before
`rules:sql:apply`; dry-run copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Structured spell patch JSONL files also live under
`data/rules-patches/`, normally in `pending/spells/` before apply and
`applied/spells/` after the locked rules baseline is updated. The first supported
operation is `insertSpell`, which inserts the base spell row plus descriptors
and class/domain levels, then rebuilds derived spell indexes. Validation opens
the configured rules DB read-only; dry-run applies to a temporary copy.
Because these patch files can contain source text, they are managed by the
nested local `data/` repo. Keep patch schemas, validators, generators, reports,
and redacted fixtures in the parent project repo.

The optional `spells-full` source dump lives under
`data/spells-full/` when present locally. It is ignored by the parent repo and
may be versioned in the nested local `data/` repo. Use `spells-full:inspect`
and `spells-full:generate` to create reviewable structured patch candidates
from it. The `short-desc-rules-gaps` target consumes
`data-tools/out/short-desc-qa/review-queues/en-rules-db-gaps.jsonl`, infers
target rulebooks from reviewed IMarvinTPA source labels, and only writes patch
candidates when the parsed spell, rules DB lookups, class/domain levels,
schools, subschools, descriptors, and slug checks all pass.

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
databases.

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
spell-patch presence checks. `rules:manifest:verify` fails when the local rules
DB, patch files, index-table counts, or structured patch presence drift from
that manifest. Command reports are generated under
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
legacy strings beside normalized categories so future runtime reads do not need
to parse legacy `dnd_spell` text columns.

`rules:content:import` is the content DB mutation boundary for normalized rules
content. It requires the rules-content generated tables from
`server/db/content` migrations, including `SpellContent`,
`SpellTaxonomyFacet`, and `RulesContentIssue`. Without `--dry-run`, it replaces
only those generated tables; it does not touch i18n rows, app-state rows, the
rules DB, or the nested local data repo.

`rulebooks:labels:audit` is the read-only rulebook display-label review report
for v3.5. It compares legacy `dnd_rulebook` identity fields, current
`RulebookContent.displayAbbr/displayName`, Chinese `I18nRulebookText.name`,
CHM source-label mappings, and the optional cleaned CHM publication table at
`data/artifacts/chm-clean/出版物.html`, then writes
`data-tools/out/rulebook-labels/rulebook-label-audit.json`. It flags source
abbreviation artifacts such as `Sc_`, publication display-abbreviation
mismatches,
duplicate proposed display abbreviations, and missing Chinese full names without
changing API contracts or UI consumers.

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
- `rulebooks:labels:audit` opens the rules DB and content DB read-only and
  writes a review report under `data-tools/out/rulebook-labels/`.
- `rules:content:import -- --dry-run` validates the generated normalized content
  artifact and target content DB tables without mutating SQLite.
- `rules:content:import` is write-capable against `CONTENT_DATABASE_URL` and
  replaces only generated normalized rules content tables. It also records
  `RulesContentBuild` provenance hashes and parent/data commit ids for local
  artifact comparison.
- `rules:spells:validate` opens the SQLite database in read-only mode and
  writes a JSON report under `data-tools/out/rules-patches/`.
- `rules:spells:apply -- --dry-run` applies to a temporary database copy.
- `rules:spells:apply` is write-capable and prints the target DB path before
  mutating it.
- `spells-full:*` reads local source data and writes reports or patch
  candidates; it does not mutate SQLite databases.
- `en:summaries:probe` fetches only requested candidate searches and writes a
  report; it does not mutate source data or SQLite databases.
- `en:summaries:sources` fetches source-index pages and writes generated review
  output plus local source-index JSON only; it does not mutate SQLite databases.
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

