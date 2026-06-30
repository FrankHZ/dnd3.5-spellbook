# Data Tools Workspace

This workspace owns data preparation, inspection, parser, and future rules DB
patch tooling.

It is separate from the `server` workspace so API runtime code stays focused on
serving requests.

## Commands

Current v3.4 planning for data-tooling work lives in:

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
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:sql:apply -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools rules:index:rebuild
```

Validate and apply structured missing-spell patches:

```bash
npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl
```

Inspect and generate structured patches from local `spells-full` data:

```bash
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools spells-full:generate -- known-misses --write-patch spells/spells-full-known-misses.jsonl
npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch spells/short-desc-rules-gaps.generated.jsonl
```

Probe IMarvinTPA for English short-description candidates:

```bash
npm run -w data-tools en:summaries:candidates
npm run -w data-tools en:summaries:probe
npm run -w data-tools en:summaries:probe -- --candidate "Spider Poison" --candidate "Blood Wind"
npm run -w data-tools en:summaries:probe -- --input short-desc/imarvin-candidates.json --limit 20
npm run -w data-tools en:summaries:probe -- --input short-desc/imarvin-candidates.json --offset 0 --limit 20 --delay-ms 1500 --output-name imarvin-00000-00020
npm run -w data-tools en:summaries:sources -- --input short-desc/imarvin-candidates.json --delay-ms 1500
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

## Data Paths

These tools read local-only source data from `data/` and write
generated reports or parser output under `data-tools/out/`.

Current CHM parser defaults:

- raw CHM HTML: `data/chm-raw/` (local ignored static input)
- cleaned CHM HTML: `data/chm-clean/`
- full raw CHM decompile for source inventory: `data/chm-raw-full/` (local
  ignored static input)
- parser test input: `data/chm-test/`
- CHM mapping and alias JSON: `data/chm-mapping/`
- parser output: `data-tools/out/zh-parser/`
- mechanical QA output: `data-tools/out/zh-parser/qa/`
- short-description extraction output: `data-tools/out/zh-parser/summary/`

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

Rules DB patch SQL files live under `data/rules-patches/`. The SQL
runner rejects paths outside that directory. Use `rules:sql:dry-run` before
`rules:sql:apply`; dry-run copies the target DB to a temporary file and leaves
`RULES_DATABASE_URL` unchanged.

Structured spell patch JSONL files also live under
`data/rules-patches/`, normally in `spells/`. The first supported
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
`data/short-desc/` by default. It excludes Tome of Battle maneuver names unless
`--include-tob` is passed.

`en:summaries:sources` fetches IMarvinTPA's source-book index and each source's
`Small=5` line view, then joins the indexed rows against the local candidate
JSON. It is also rate-limited, writes generated reports under
`data-tools/out/en-summaries/`, and does not mutate local source data or
SQLite databases.

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

`summaries:qa` reads the generated Chinese summary reports and English
IMarvinTPA source-index reports, then writes `summary.json`, `issues.json`, and
JSONL review queues under `data-tools/out/short-desc-qa/`. It does not fetch
network sources. Generate or refresh the English reports with
`en:summaries:sources` before relying on cross-language coverage queues. If
validated subagent or human decisions exist under
`data-tools/out/short-desc-qa/review-results/`, the command validates their
stable keys and decisions, records review coverage in `summary.json`, and writes
follow-up queues such as `import-blockers.jsonl`, `en-add-candidates.jsonl`, and
`en-rules-db-gaps.jsonl`. English add-candidate decisions that are covered by
the current IMarvinTPA name-matching rules are moved to
`en-resolved-candidates.jsonl`; conservative source-mismatch title aliases that
are covered by the same matching rules are moved to
`en-resolved-source-mismatches.jsonl`.

## Safety

- `inspect:rules` opens the SQLite database in read-only mode.
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
  output only; it does not mutate source data or SQLite databases.
- `rules:sql:dry-run` never mutates the configured rules DB.
- `rules:sql:apply` and `rules:index:rebuild` are write-capable and must be run
  intentionally.
- Parser commands may write generated output under `data-tools/out/zh-parser/`.
- `zh:summaries:extract` writes generated review output only; it does not
  mutate source data or SQLite databases.
- `summaries:qa` reads generated reports and writes generated QA output only; it
  does not mutate source data, fetch network sources, or touch SQLite databases.
- Future rules DB patch commands must clearly distinguish dry-run validation
  from write-capable imports.

