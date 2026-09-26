# Import Workflow

Task-specific operations for local source preparation and content imports.
Choose the relevant section; these are not a startup checklist. Executable
commands live in [data-tools/package.json](../../data-tools/package.json) and
[server/package.json](../../server/package.json).

## Before A Write

- The task must explicitly authorize local DB writes. Source generation,
  review, dry-run success, and an accepted PR do not authorize production
  activation. Use [deployment](./deployment.md) for separately authorized
  remote operations.
- Configure DB roles and migrations using [data setup](./data-setup.md).
  `APP_DATABASE_URL` is a compatibility alias for content only. Never use
  content reset/import commands on app-state or substitute a fresh upstream
  rules DB for the locked rules baseline.
- Keep source, patch, review, and normalized JSONL in the nested `data/` repo;
  keep generated reports in `data-tools/out/`. Neither local runtime DBs nor
  source-bearing output belong in the public parent repo.
- Inspect the exact inputs and target DB before mutation. Dry-run semantics
  differ by command; the server's Chinese importers do not have a dry-run mode.

For provenance, portable fixture coverage, and handoff checks, read the relevant
part of [DB content workflow](./db-content-workflow.md).

## CHM And Entity Translations

Use this retained source workflow only when CHM inputs or parser behavior need
a rerun. It does not accept dice TXT files.

| Input/output | Location |
| --- | --- |
| Raw HTML, ignored static input | `data/chm-raw/` |
| Cleaned HTML | `data/chm-clean/` |
| Small parser input | `data/chm-test/` |
| Book mappings and extra/global aliases | `data/chm-mapping/` |
| Entity dictionaries | `data/i18n/` |
| Parser output and mechanical QA | `data-tools/out/zh-parser/` |

Preprocess changed raw HTML with `npm run -w data-tools zh:preprocess`, then
run `npm run -w data-tools zh:parse` and `npm run -w data-tools zh:qa`.
For a small local input run use `npm run -w data-tools zh:parse:test`.
`npm run -w data-tools zh:backcheck` reports missing Chinese coverage.
Preprocessing assumes GB2312 and writes UTF-8. Both stages preserve relative
paths and skip `.files` companion directories. A mapped top-level directory
may supply a missing book label (for example, `九剑/` maps to Tome of Battle).

Review `stats.json`, `unmatched.json`, `candidates.json`, and `qa/summary.json`
before import. `matched.json` is the CHM importer input. Mechanical `zh:qa`
is not translation acceptance; long bold text alone is informational.
Optional local alias/mapping JSON is not a portable-test prerequisite.

After review and explicit content-write authorization:

```bash
npm run -w server db:content:import:zh-entities
npm run -w server db:content:import:zh-chm
```

The entity importer reads classes, domains, rulebooks, descriptors, schools,
and subschools from `data/i18n/` (or `ZH_ENTITY_I18N_DIR`). It checks rules ids
and warns on missing coverage or stale English names, then deletes/recreates
`lang=zh, variant=default` rows in each imported entity table.

The CHM importer reads matched spell ids, names, and sanitized descriptions,
stores HTML plus plain text, and writes `lang=zh, variant=chm`. **It first
deletes every `I18nSpellText` row with `lang=zh`, across all variants**, plus
legacy `lang=zh-chm` rows. It cannot preserve another Chinese overlay by itself.
Use canonical `db:content:*` names; `db:app:*` and server `tool:*` wrappers are
compatibility aliases, not another import workflow.

## Rules Patches

Patch inputs must stay under `data/rules-patches/`. Use `pending/spells/`,
`pending/rulebooks/`, or `pending/legacy-sql/` before apply, and the corresponding
`applied/` directory after acceptance. Do not rerun already-applied patches to
rebuild content; regenerate content from the accepted rules baseline instead.

For structured patches, replace the example filename with the exact reviewed
file. Apply required rulebooks before regenerating spell patches that refer to
them. Validate and dry-run before the explicitly authorized write:

```bash
npm run -w data-tools rules:manifest:verify
npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/example.jsonl
npm run -w data-tools rules:rulebooks:apply -- pending/rulebooks/example.jsonl
npm run -w data-tools rules:spells:validate -- pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/example.jsonl
npm run -w data-tools rules:spells:apply -- pending/spells/example.jsonl
```

Validators read the rules DB; apply dry-runs operate on a temporary copy.
`insertSpell` creates base and relationship rows and rebuilds derived indexes.
`updateSpell` permits only `slug`, non-empty raw `extraComponents`, or paired
non-empty `description`/`descriptionHtml` updates; unknown fields are rejected.
Spell apply commits row changes and derived-index rebuilds in one transaction.
`insertRulebook` adds a reviewed identity after validating its edition and fields.

Move successfully applied files from pending to applied in the nested data
repo, then run `npm run -w data-tools rules:manifest:write` followed by
`npm run -w data-tools rules:manifest:verify`. The manifest binds the rules DB,
patch files, counts, and structured patch presence. Rewriting it must not be
used to hide unexplained drift.

For a reviewed SQL patch use `npm run -w data-tools rules:sql:dry-run -- pending/legacy-sql/example.patch.sql`
before `npm run -w data-tools rules:sql:apply -- pending/legacy-sql/example.patch.sql`.
The dry run leaves the configured rules DB unchanged. Explicit derived-index
maintenance uses `npm run -w data-tools rules:index:rebuild -- --dry-run`
before `npm run -w data-tools rules:index:rebuild`.

### Spells-Full Candidates

The optional source package lives under `data/spells-full/` and stays private.
Use `npm run -w data-tools spells-full:inspect -- source-package` to inventory
v6.01 source files and compare their name index with `spells-parsed.json`.
It does not open SQLite or parse v6.01 full text into structured spell bodies.

For source appearances matched against the local rules DB, use:

```bash
npm run -w data-tools spells-full:inspect -- corpus-inventory
npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl
npm run -w data-tools spells-full:rulebooks
```

Generation writes only ready rows as patch candidates. Rejected and ambiguous
rows, and deferred/ambiguous source-label decisions, remain separate under
`data/spells-full/`; reports go to `data-tools/out/spells-full/`. Source-label
review is not a rulebook insertion. These commands never apply DB patches or
activate content. The `short-desc-rules-gaps` generate target consumes reviewed
summary gaps and emits candidates only after identity/mechanics checks pass.

## Normalized Content And Search

The canonical publication metadata is
`data/rulebook-publications/publications.jsonl`, one row per rules rulebook.
Initialize it only when needed with `npm run -w data-tools rulebooks:publications:seed`.
Seeding is a review starting point and refuses overwrite without `--force`;
retain manual ISBN/source enrichment in `isbn10`, `isbn13`, and `metadataSources`.
Only accepted rows publish year/date/URL/image details. `publicationDisplayOrder`
is a deterministic manual/fallback value, not publication chronology. Consumers
use generated publication metadata rather than inferring groups from raw labels.
`npm run -w data-tools rulebooks:labels:audit` compares current display labels
read-only and writes a local report.

For an authorized full content rebuild, prepare schema using data setup, then
import reviewed entity translations, CHM text, and normalized summaries using
their sections above/below. Finish with:

```bash
npm run -w data-tools rules:content:audit
npm run -w data-tools rules:content:generate
npm run -w data-tools rules:content:import -- --dry-run
npm run -w data-tools rules:content:import
npm run -w data-tools content:search:rebuild -- --dry-run
npm run -w data-tools content:search:rebuild
npm run -w data-tools rules:content:parity
npm run -w data-tools rules:content:meta
```

Audit/generate read the rules DB and write artifacts under
`data-tools/out/rules-content/`. Full generation requires canonical publication
coverage. `rules:content:generate -- --audit-only [--limit N]` writes a separate
limited, non-importable artifact; `--limit` alone is invalid.

Import validates current rules DB, canonical-input, and migration hashes even
in dry-run, and requires the current content schema. A live import replaces
only generated normalized tables, not i18n overlays, rules, app-state, or source
data. `RulesContentBuild` preserves generation-time parent/data repository
state and hashes, with importer state recorded separately in `buildMetaJson`.

Mechanics retain raw source strings. Only `displayCoverage=complete` exposes
replacement-safe canonical English `normalizedText`; `partial` and `review`
keep raw fallback, while `empty` has no display. Parser `reviewStatus` is not
display coverage. `npm run -w data-tools rules:content:review` inventories these
facets read-only; `detail_only` output must not be promoted into public filters.

Rebuild FTS after **all** text, summary, and normalized-content imports, and
again after later relevant changes. Dry-run validates schema/readability and
document counts; live rebuild replaces only derived `SpellSearchDocument` and
`SpellSearchIndexState` rows. Parity/meta commands are read-only and report
normalized consistency and artifact provenance. Restart an API after swapping
DB files before using cached endpoints as evidence.

## Short Descriptions

The import boundary is
`data/short-desc-normalized/summaries.generated.jsonl`. Maintained review
inputs live under `data/short-desc-review/`; generated QA queues are not
accepted source data.

### Gather And Review Sources

- `npm run -w data-tools zh:summaries:extract` reads class/domain overview pages
  from ignored `data/chm-raw-full/` and the ToB overview from `data/chm-clean/`.
  It writes matched/unmatched/conflict/alias reports under
  `data-tools/out/zh-parser/summary/`, without changing source or SQLite.
  Full-description parsing still uses `chm-clean`, not `chm-raw-full`.
- `npm run -w data-tools en:summaries:candidates` writes local candidate JSON
  under `data/imarvin/short-desc/`; ToB is excluded unless explicitly included.
- `npm run -w data-tools en:summaries:probe` performs a rate-limited candidate
  probe; `--offset`, `--limit`, and `--output-name` support bounded runs.
- `npm run -w data-tools en:summaries:sources` fetches the source-book index and
  writes canonical `data/imarvin/short-desc/source-index/` only for complete
  crawls. Partial crawls require a distinct safe `--output-name`, cannot replace
  canonical/protected inputs, and publish from sibling staging only on success.
  Both fetch commands are rate-limited and do not write SQLite.
- `npm run -w data-tools summaries:qa` reads existing Chinese reports, the
  English source index, and validated decisions under `short-desc-review/qa/`.
  It writes coverage/blocker/review queues without fetching sources or changing
  DBs. Refresh the source index before relying on cross-language coverage.

### Normalize And Apply Reviewed Decisions

`npm run -w data-tools summaries:normalize` consumes Chinese conflict decisions
and English source rows. It emits only accepted rows with local `spellId` and
`rulebookId`; unresolved conflicts/gaps are reported as skipped.

`npm run -w data-tools summaries:strict35-ready` consumes reviewed
`qa/en-strict35-missing.decisions.jsonl`, marks already-covered rows, and writes
not-yet-covered rows under `short-desc-normalized/pending/`. Review and merge
accepted pending rows into the canonical JSONL; rerun to confirm pending output
is empty. Pending output is never automatically imported.

| Review operation | Candidate/report command | Apply command |
| --- | --- | --- |
| Explicit source-gap reuse | `summaries:source-gap-candidates` | `summaries:source-gap-apply` |
| Same-name reuse | `summaries:reuse-candidates` | `summaries:reuse-apply` |
| Final punctuation | `summaries:punctuation` | same command with `--write` |
| Per-book coverage | `summaries:coverage-report` | none |

Invoke these through `npm run -w data-tools <command>`. Apply commands report
without mutation unless passed `-- --write`; then they update the normalized
JSONL, not SQLite. Source-gap reuse requires explicit decisions and preserves
`sourceKind: source-gap-reuse`; it is not fuzzy matching. Same-name reuse
preserves `sourceKind: summary-reuse`, auto-accepts only exact-description
matches, and otherwise requires review; decisions may override summary text
when source/target numbers differ. ToB is excluded by default. Run punctuation
after reuse passes so reused rows receive the same final punctuation handling.
Coverage defaults to the official 3.5 working set; `-- --scope all` broadens it.

### Import Accepted Summaries

```bash
npm run -w data-tools summaries:import -- --dry-run
npm run -w data-tools summaries:import
```

Live import requires explicit content-write authorization. It reads only the
canonical normalized JSONL and upserts `I18nSpellSummaryText` by
`spellId + lang + variant`, without deleting full descriptions or existing
summary rows. Rebuild FTS after this and other content imports finish.

## Dice Text Boundary

The TXT package at `data/spells-dice-db-by-mo/` is proposed input under
[intake issue #119](https://github.com/FrankHZ/dnd3.5-spellbook/issues/119).
Commit the byte-preserved source snapshot and review the private
`data/dice-intake/publication-map.json` against existing rulebooks before running
the read-only inventory:

```powershell
npm run -w data-tools dice:intake -- --data-root <absolute-data-repo> --rules-db <absolute-rules-clean.sqlite> --content-db <absolute-content.sqlite> --report-dir out/dice-intake
```

The command reads both SQLite files with read-only/query-only connections. It
requires clean, committed source and map inputs. It writes private source and
target inventories, candidate records, and representative pilot cases under
`data/dice-intake/`; commit those in the nested data repo for the QA handoff.
The source-free aggregate is `data-tools/out/dice-intake/coverage.json`.
Every candidate keeps its source revision and line locator, raw body, escaped
`<pre>` rendering, publication mapping, field-level CHM comparison, and parser
problems. Header-shaped lines without a convincing spell signature remain in
the surrounding raw text and appear as located `unparsedSpans` for review.
Only exact English names within resolved publications attach to target IDs;
Chinese names and retained CHM English aliases are review hints. Duplicate
targets remain review-required, and unsupported or ambiguous publications keep
their explicit dispositions. No candidate is accepted by this command.

After field-level English-assisted review, keep the detailed decisions in the
private `data/dice-qa/` directory. Validate the complete decision set and
derive accepted fields plus explicit fallback fields with:

```powershell
npm run -w data-tools dice:qa -- --data-root <absolute-data-repo> --rules-db <absolute-rules-clean.sqlite> --content-db <absolute-content.sqlite> --reviews <absolute-review-jsonl> --boundaries <absolute-boundary-jsonl> --full-body-audit <absolute-audit-jsonl> --report-dir out/dice-qa
```

The QA command reads both SQLite databases read-only, enumerates every raw TXT
independently of the candidate ledger, and checks parsed records and unparsed
spans against the source inventory. It then checks every candidate against its
committed TXT bytes, map revision, target publication, current CHM name/body,
and material English name/body and spell mechanics, including components,
school, subschool, and descriptors. Accepted fields require
a reviewer, reason, aligned English excerpt, and the exact reviewed candidate
text. A corrected candidate must be separately reviewed before acceptance.
Formal QA also requires a full-body audit record for every accepted body,
bound to the effective replacement and aligned English evidence. The report
counts accepted bodies still lacking that audit during `--check-incomplete`.
`--boundaries` covers every located unparsed span with a source-bound decision;
its enclosing candidate's body decision must agree with that disposition.
Pass `--corrections <absolute-corrections-jsonl>` when accepting such a correction;
the correction records bind source text, CHM baseline, corrected text, reviewer,
reason, and an aligned English excerpt.
Pass `--duplicates <absolute-resolutions-jsonl>` for targets with multiple
candidate occurrences. Each resolution names every source occurrence and the
single selected source, or explicitly selects none; other occurrences cannot
produce accepted fields.
The command writes `data/dice-qa/accepted.jsonl` and `fallback.jsonl`; its
`out/dice-qa/coverage.json` report contains counts by book and field but no
source text. A deferred or rejected field retains its current CHM or English
fallback, including when the other field was accepted. This validation does not
import or activate any spell text.
During review, `--check-incomplete` validates the entire current decision file
and writes only the source-free coverage report, including a pending-field count.
Without that flag, pending review rows fail before accepted/fallback files are
written.

[Activation issue #121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns the accepted-input, variant/request compatibility, and tested import-order
requirements. Do not feed TXT into the HTML parser or use the CHM importer for
selective replacement. Preserve uncovered CHM and English fallback, canonical
English, mechanics, summaries, existing identities, and source provenance.
Runtime consumers do not adjudicate competing sources.

## Suspended PHB Work

PDF/MinerU/SRD extraction, translation, and manual queues remain suspended;
they are not dice prerequisites. Keep their implementation and tests. Only an
explicit resumption scope should read the retained
[PHB execution safeguards](../releases/v1.4/phb-source-and-errata-plan.md#paused-workflow-execution-safeguards)
and [console operation boundary](../../review-console/README.md).
Existing fingerprints, source-authority rules, and terminal gates remain
required. Old residuals and unmerged PR #113 outputs are not accepted inputs.
