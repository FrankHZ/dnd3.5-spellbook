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
- Keep source, patch, review, and normalized JSONL in the configured private data repo;
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
`updateSpell` supports spell headers, page, an existing subschool ID or null,
component flags, paired English text/HTML, descriptor replacement, and exact
class-level changes or additions.
Header/page/component updates require matching `expected.spell` values;
descriptor replacement requires the complete old set. Class-level changes
require the old level, and additions require explicit absence. Text headers
can explicitly be cleared with `null` or an empty string. Unknown fields are
rejected. See [structured spell updates](./rules-db-notes.md#structured-spell-updates)
for the patch shape and compatibility rules.
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
`data/dice-intake/`; commit those in the private data repo for the QA handoff.
The source-free aggregate is `data-tools/out/dice-intake/coverage.json`.
Every candidate keeps its source revision and line locator, raw body, escaped
`<pre>` rendering, publication mapping, field-level CHM comparison, and parser
problems. Header-shaped lines without a convincing spell signature remain in
the surrounding raw text and appear as located `unparsedSpans` for review.
Only exact English names within resolved publications attach to target IDs;
Chinese names and retained CHM English aliases are review hints. Duplicate
targets remain review-required, and unsupported or ambiguous publications keep
their explicit dispositions. No candidate is accepted by this command.

After field-level English-assisted review, keep detailed decisions in private
`data/dice-qa/books/<rulebook-id>/`. Each book issue owns its semantic review and
acceptance; merging QA tooling accepts no corpus text. The existing global
command remains available for an explicitly authorized complete-corpus handoff:

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
These English excerpts are checked against the DB and do not verify an external
PDF. For an explicitly authorized book review using PDF evidence, retain the
private page fragments, visual findings and exact effective-field bindings, and
run the independent [supplemental PDF verifier](../../data-tools/pdf-extract/README.md#supplemental-review-verification)
in addition to the unchanged dice QA checks.
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

### Rulebook QA proposals

Select one book with `--rulebook-id <id>`. For example, run Complete Mage (58)
with all-source inputs and book-local reviews:

```powershell
npm run -w data-tools dice:qa -- --data-root <absolute-data-repo> --rules-db <absolute-rules-clean.sqlite> --content-db <absolute-content.sqlite> --rulebook-id 58 --report-dir <absolute-data-repo>/dice-qa/books/58/out
```

The flag defaults review inputs to the following files under
`data/dice-qa/books/58/`, using the same schemas as global QA:

- `decisions.jsonl` is required and must cover every owned candidate occurrence.
- `full-body-audit.jsonl` is required for formal validation, including an empty
  file when no body is proposed for acceptance.
- `corrections.jsonl`, `duplicate-resolutions.jsonl`, and `boundary-decisions.jsonl` may be omitted
  only when no corresponding records are needed. Missing required duplicate
  resolutions or unparsed-boundary decisions still fail validation.

Existing explicit `--reviews`, `--corrections`, `--duplicates`, `--boundaries`,
and `--full-body-audit` paths override those defaults, for example to validate
read-only checkpoint inputs in a tool-owned temporary directory. Use
`--report-dir <absolute-code-worktree>/data-tools/out/dice-qa/books/58` for such
checks. Do not write another task's book directory.

Ownership follows the matched target's rulebook, keeping all duplicate
occurrences together. An unmatched candidate belongs to a book only when it
has exactly one mapped publication and no unmapped publication label; its
existing null target/rulebook identity stays unchanged in the review schema.
Multi-publication and unmapped unmatched inputs require separate unresolved-scope
review. Every existing target in the selected book is included in coverage,
including targets without candidates and their CHM/English fallback.

The command still independently enumerates **all** TXT files and checks the
complete source inventory and regenerated candidate ledger before selecting
the book. Only semantic review coverage and boundary dispositions are scoped.
Missing source/candidate files fail even when they concern another book.
Foreign-book review, correction, duplicate, boundary, or audit rows fail;
another book's pending reviews are not loaded. A missing book decision file,
missing owned row, or empty/unknown scope cannot become an accepted empty result.

SC's recovered #298 handoff has an explicit, bounded revalidation mode:
`--restored-sc-baseline fe089990e2a5eeac69c92e068ca695f10c42ec58` with
`--rulebook-id 86`. It requires the #259 `fresh-qa` review/correction/full-body/
boundary inputs and #292 independent export through their explicit options.
Every consumed source, map, alias and review file must match that real private
Git snapshot; TXT bytes are exact and JSON/JSONL permits only CRLF/LF checkout
normalization. Complete parsing, source coverage, reconciliation and all current
English/mechanics/Chinese and review checks still execute. Historical row-key
namespaces stay intact; coverage records actual source/map Git revisions and
the current input baseline separately. This mode does not authenticate missing
old history or admit later candidate exports. Use the committed private
`dice-qa/books/86/issue-298/reproduce.py` with explicit code and readonly DB paths
for the accompanying patch-copy, complete input and actual PDF verification.
Main-gate must review that restored contract before subsequent batches use it.
See the [source-free current verification report](../releases/v1.4/spell-compendium-restored-baseline-report.md)
for the exact execution and handoff revisions.

Subsequent complete-entry handoffs keep retained fields and specific evidence
gaps separate from new correction exports. The
[SC batch-01 report](../releases/v1.4/spell-compendium-batch-01-report.md),
[SC batch-02 report](../releases/v1.4/spell-compendium-batch-02-report.md),
[SC batch-03 report](../releases/v1.4/spell-compendium-batch-03-report.md),
[SC batch-04 report](../releases/v1.4/spell-compendium-batch-04-report.md),
[SC batch-05 report](../releases/v1.4/spell-compendium-batch-05-report.md) and
[SC batch-06 report](../releases/v1.4/spell-compendium-batch-06-report.md)
record their exact scopes, input contracts, old export blockers and proposed unions.
These handoffs do not widen the restored CLI's fixed input paths or authorize activation.
The [SC evidence handoff](../releases/v1.4/spell-compendium-evidence-handoff-report.md)
reconciles all six batches, the accepted union/complement and concrete private
source requests. Its static navigation preserves unresolved source, consumer and
identity boundaries; it does not authorize evidence collection or activation.

With `--check-incomplete`, the command writes only `coverage.json` and allows
existing `queue:` reviewer markers and missing full-body audits to remain
pending. Evidence-based `deferred` decisions are distinct from those queue
markers. Formal mode rejects pending work and writes `accepted.jsonl` and
`fallback.jsonl` **in the scoped report directory**, never to the global QA
directory. Report directories inside the data repo must belong to the selected
book. Before creating directories or writing files, the command resolves actual
filesystem destinations and existing ancestors, including junctions/symlinks.
Aliases into global QA or another book fail; the selected book/QA directory
itself must not redirect the permitted boundary. Normal external report
directories and new directories within the selected book remain supported.
All three files are proposals until main-gate accepts the corresponding
book issue/PR and exact private revision; a validator's `accepted` field status
does not itself grant source acceptance or activation authority.

`coverage.json` is the source-free artifact for the book's public PR. It records
the rulebook scope, validation mode, source/map Git revisions, complete-source
counts, book/field dispositions, and pending counts with stable key ordering
and no timestamps or corpus text. Include the private checkpoint revision,
tool revision, and exact command in that PR. Re-run the command with those
inputs and compare the regenerated report byte-for-byte to verify it. A
failed or incomplete run does not approve older accepted/fallback exports;
only a successful formal run's `validated-proposal` report is eligible for
main-gate review. Keep source-bearing outputs in private data or ignored
`data-tools/out/`, never in the public PR.

### Independent fallback corrections

An original-book review can find a correction without a dice candidate, or to a
name that the native unchanged-name guard cannot accept. Keep that guard intact.
Use the explicit `--source-bound-fallback-reviews <absolute-jsonl>` option with
`--rulebook-id` and the normal formal QA inputs for a separate field proposal.
Ordinary dice QA does not load this ledger by default.

The [independent review schema](../../data-tools/src/dice-intake/source-bound-fallback.ts)
retains `sourceKey: null` and binds an existing target and publication, actual
current Chinese name/text/HTML, full current English/HTML/mechanics, exact old
field, complete replacement, original-source locators, reviewer and specific
English/Chinese rule pairs. Each `(targetId, field)` is unique and cannot overlap
a native accepted field. Accepted bodies require an embedded full-body audit of
the complete new text, actual old HTML and explicitly escaped `<pre>` projection.
Missing Chinese is reviewed absence, not permission to invent a corrected fallback.
Changed inputs, unreviewed fields and unresolved source evidence fail acceptance.

For SC current-edition Chinese delivery, an explicit owning-book scope decision
may exclude other books' old levels, costs, values, effects, version comparisons
and translator history. Review the complete SC entry and applicable official
errata against actual current text/HTML, canonical English/mechanics and the
previous complete proposal. Record the exact excluded passages and retired
historical source obligations privately. Retirement means out of delivery scope,
not authenticated history. It does not waive evidence for retained operative
rules, inherited clauses, creature abilities, tables or restrictions. Preserve
SC source ambiguities and necessary reader notes through the existing mechanism.

Determine external evidence obligations from the complete actual consumer fields,
references, relationships and display code. A creature name, granted ability or
inheritance declaration directly supported by SC does not by itself require
certifying every external statistic or procedure. Preserve the declaration and
the exact unread-source prior; distinguish faithful transmission from evaluating
forms, legal summons, creature abilities or item properties. If published fields
actually expand a rule that SC does not support, identify the exact field, claim
and missing source and defer that dependency. A keyword search alone cannot
establish this boundary. See [the accepted consumer review](https://github.com/FrankHZ/dnd3.5-spellbook/issues/292).

Keep such a handoff distinct and bound to exact public/private revisions, with
a disposition for every scoped complete body and source-free counts and IDs.
Preserve names, canonical English, mechanics, summaries, identities, current
fallback and all frozen evidence outside the authorized body proposals. A scope
decision does not rewrite previous accepted exports, resolve outstanding source
questions, change the fixed restored QA contract or advance the effective
projection baseline; those require their own accepted integration scope. See
[the initial bounded SC delivery scope](https://github.com/FrankHZ/dnd3.5-spellbook/issues/321).

For an explicitly authorized faithful translation of a known source
conflict, missing explanation or interpretation question, the independent body
schema supports
`accepted-with-source-issues`. Its `retainedSourceIssues` binds the complete body,
each preserved source statement and original page/spans, and separately marked
Chinese project notes with impacts and pending external review. The exported
issues remain `source-unresolved`; this status accepts a translation proposal,
not a rule interpretation. The full-body audit covers the complete body, notes
and escaped HTML. Ordinary `accepted` cannot carry this exception, and the new
status cannot omit it. `pendingSourceEvidence` must still be empty: unavailable
external or historical rules cannot be accepted by adding notes. Independently
verify the actual source statements with the supplemental PDF verifier and
main-gate review before accepting an exact private revision. These checks do not
infer semantic completeness, certify a different printing, or authorize writing
canonical English/mechanics or production content.

For a verified cross-source `conflict`, explicitly list distinct
`retainedSourceIssues.comparisonSourceIds` bound in `sourcePages`. Each opposing
comparison statement must set `contentLocation: "note"`, with its Chinese text
contained in that issue's reviewed `note`; it cannot enter the primary body.
The conflict must also retain a primary-source statement in `bodyText`.
Primary statements use `contentLocation: "body"` (the default for older rows).
Every declared comparison source must be used. Missing declarations, a foreign
body statement, a primary-source note statement, stale note text, or relabeling
an external conflict as an interpretation/omission fails validation. Supply
the real source identity, page, spans and exact quote for both statements and
verify all comparison spans against explicit actual PDFs with the supplemental
verifier before handoff. For declared comparisons, that verifier resolves the
trusted explicit paths and uses filesystem identity to reject different IDs
aliasing the same actual PDF, including primary/comparison and comparison pairs.
This check covers normalized paths and filesystem links; it does not certify
publication identity or compare copies by content. Older rows without comparison
declarations retain their existing verification path.
Neither a declaration nor `originalSourceRead` alone
proves the PDF's identity or resolves the conflict.

Use issue kind `conflict` for opposing source statements (at least two),
`missing-explanation` for a concrete absent explanation, and `interpretation`
for an ambiguous scope or application whose possible readings are not a proven
contradiction. The latter two may bind one actual statement; do not invent an
opposing quotation. Each kind still requires distinct statement locations,
without duplicate span refs or a second copy of the same location set in a
different order. Interpretation notes should identify the question, preserved
wording, possible coordinated reading and unresolved impact, with no unofficial
ruling added to the body or mechanics.

Formal validation writes `source-bound-fallback-accepted.jsonl` and source-free
`source-bound-fallback-coverage.json` in the scoped report directory, separately
from native `accepted.jsonl` and `fallback.jsonl`. Incomplete mode writes coverage
only. These are validated proposals: independently verify original pages/spans
and their target/field bindings, then obtain the owning book issue's main-gate
acceptance of the exact private revision. The native supplemental PDF field
schema uses dice source keys; null-key rows require their independent target/field
verification. A retained named reference without added external rules does not
require certifying the entire referenced book; concrete translation, numerical
or inherited-rule dependencies still require the applicable source.

[Activation issue #121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121)
owns the accepted-input, variant/request compatibility, and tested import-order
requirements. Do not feed TXT into the HTML parser or use the CHM importer for
selective replacement. Preserve uncovered CHM and English fallback, canonical
English, mechanics, summaries, existing identities, and source provenance.
Runtime consumers do not adjudicate competing sources.

### Effective Chinese preflight

`dice:effective` supports only the accepted SC #311/batch-06 handoff, with an
explicit main-gate accepted private commit. An arbitrary commit or `accepted`
label is not acceptance authority. The command binds the actual native and
independent exports and complete 1002-target current snapshot to that commit;
#313 navigation/aggregate reports are not inputs. It calls the same complete
formal QA validation as `dice:qa`, including the fixed #298 restored inputs,
105 TXT files, reconciliation, decisions, corrections, boundaries and audits.
It compares the native export to that result and revalidates all 221 independent
rows against current Chinese/English/HTML/mechanics and the native accepted set.
The fixed restored CLI contract remains unchanged. Historical native deferrals
already superseded by the exact accepted independent handoff remain accepted;
later deferred drafts cannot enter via a different file or mutated export.

Use the accepted 315-patch rules input on a disposable copy produced by the
existing `rules:spells:apply ... --dry-run` command. The unpatched operator rules
file is not the accepted QA input. Keep operator rules/content/app-state read
only. The entry derives complete supplemental evidence directly from the original
accepted private files; no generated evidence input is required:

```powershell
npm run -w data-tools dice:effective -- `
  --accepted-baseline <exact-main-gate-accepted-private-commit> `
  --rules-db <absolute-disposable-patched-rules.sqlite> `
  --content-db <absolute-readonly-content.sqlite> `
  --pdf-python <absolute-pdf-extract-venv-python.exe> `
  --source sc=<absolute-SC.pdf> --source errata=<absolute-SC-errata.pdf> `
  --source phb=<absolute-PHB.pdf> --source phb-errata=<absolute-PHB-errata.pdf> `
  --run sc-check-01
```

Use `npm run dice:effective -- ...` from `data-tools/`. Root `.env`
`DATA_REPO_PATH` selects the independent private repo. Explicit relative file
paths resolve from the code repository root in either cwd; `--source ID=PDF`
paths likewise resolve there in the verifier. `--run` is a fresh lowercase
directory name, not a path. Output is always this checkout's
`data-tools/out/dice-effective-<run>/`; the output root may not redirect through
a filesystem alias. Existing runs are never overwritten. The bounded SC verifier
authenticates 20 original files against the same accepted private commit, using
Git bytes and direct comparison (only JSON/JSONL CRLF/LF normalization is allowed):
the 17 original evidence files used by #311's reconstruction, the two accepted
exports and `issue-259/source-authority.json`. Native fields retain their exact
original pages/spans, reasons and visual review; independent fields retain the
accepted row's sourcePages and surviving original visual binding. Missing or
changed originals fail; generated aggregates never replace them.

Optional `--pdf-evidence <path>` compares an existing generated object with that
complete derived object, including every original binding/page/span and visual
claim. It grants no authority. A real but unrelated span cannot replace an
accepted field's original page, even when the generic supplemental verifier
would accept the field text and find that span in the PDF. The bounded verifier
also reopens SC's accepted printing-identity page and the complete official
errata page against the committed authority contract (4 SC and 147 errata spans).
Missing source IDs, changed actual authority/errata spans or changed authority
input files fail before final output. It then uses the maintained supplemental
verifier to re-read all 327 accepted-evidence pages and bind all 879 fields.
This inexpensive read avoids freshness caches and retains the original tested
coverage; it performs no new semantic or visual review. Its temporary decision
file stays under worktree output and is removed even on failure. No importer
consumes these files.

`effective.jsonl` contains exactly two effective fields per existing target,
with independent `name.origin` and `body.origin`. Each records native sourceKey,
independent null sourceKey plus sourceRef/pages/status, retained CHM sourceKey,
or explicit English fallback. Names and bodies can have different languages
and sources. Native escaped `<pre>` HTML is decoded through the existing
Cheerio HTML mechanism; independent complete text and escaped HTML retain
their full-body audit and source-issue notes. Retained CHM/English text and HTML
are copied verbatim, including tables and mixed historical content. No field
is deleted, translated, moved to another target, or given the other field's
provenance. `coverage.json` contains source-free counts and input revisions:
879 accepted replacements (658 native + 221 independent; 41 names + 838 bodies)
and 1125 complement fields. The complement counts legitimate CHM retention and
English fallback, not quality errors or completion of outstanding review.
These files are explicitly `importable: false`, `activation: false`.

#### Disposable effective writer

`dice:effective:write` uses the same arguments as `dice:effective`, with an
optional `--apply`. It supports only this accepted SC handoff. For example,
use the rules-copy/PDF paths from the preflight command above:

```powershell
npm run -w data-tools dice:effective:write -- `
  --accepted-baseline <exact-main-gate-accepted-private-commit> `
  --rules-db <absolute-disposable-patched-rules.sqlite> `
  --content-db <absolute-readonly-content.sqlite> `
  --pdf-python <absolute-pdf-extract-venv-python.exe> `
  --source sc=<absolute-SC.pdf> --source errata=<absolute-SC-errata.pdf> `
  --source phb=<absolute-PHB.pdf> --source phb-errata=<absolute-PHB-errata.pdf> `
  --run sc-writer-check-01 --apply
```

From `data-tools/`, omit `-w data-tools`. Relative paths still resolve from the
code repository root. There is no writable DB destination argument and no
projection JSON input. The command creates a fresh SQLite backup of the read-only
content input under this worktree's output root, then runs the complete original
QA/source/PDF preflight against that isolated snapshot before any schema or
overlay changes. Missing, stale or changed originals fail with no final run
directory. Scratch directories are removed on failure; existing runs are never
overwritten. The original rules/content databases and app-state stay read-only.

The real writer materializes exactly the existing normalized SC target set as
`I18nSpellText(lang=zh, variant=effective)`. It stores complete names/text/HTML
and nullable `nameProvenanceJson` / `bodyProvenanceJson`. Each JSON records the
actual field language, accepted revision, target/field, original origin, accepted
input locator and evidence locator. Native evidence navigates the exact original
supplemental target/field/sourceKey binding; independent evidence retains its
sourceRef/pages/status. CHM and English fallbacks navigate the current snapshot
and actual source table. English fallback has `language=en`, even though the
composed row is in the Chinese request namespace. Row `sourceKey` is populated
only when both fields share the same non-null origin/key, otherwise null.
Old variants retain their original values, sourceKey and timestamps; their new
provenance columns default to null. No canonical fields, summaries, relationships,
publication metadata, app-state or search data are written.

`plan.json` includes the full source-bearing plan and belongs only in ignored
output/private evidence. `report.json` contains coverage and a separate
`storagePlan` with insert/update/unchanged counts. Without `--apply`, the command
emits only these files and discards the untouched DB copy. With `--apply`, it
also emits `content.experiment.sqlite`. The dry-run and applied plan are compared
directly. Nullable-column SQL upgrade, all effective-row changes and build marker
replacement are one SQLite transaction. An identical second overlay preserves
values and timestamps. Portable tests inject real SQL failures in the middle of
row writes and at the final metadata write, and exercise the real CHM importer.

The tracked content migration is part of normal Prisma generation/migration
setup. This experiment applies its SQL to an old-schema disposable copy without
claiming a production Prisma migration deployment. It replaces that copy's old
`RulesContentBuild` claims with `sourceKind=dice-effective-experiment`, clears
old generation hashes/commits, and records `artifact.scope=limited`,
`importable=false`, `activation=false` with search/consumer/provenance limitations.
This is an inspection handoff, never a deployable full artifact. Existing deploy
helpers validate SQLite tables/integrity; this marker is not a new deployment
authorization or a claim that those helpers reject all experimental DBs.
Full artifact generation/provenance and consumer/search integration remain a
separate delivery. Do not upload or activate this experiment.

#### Follow-up consumers and full build

The existing unique key `(spellId, lang, variant)` preserves the original `chm`
beside the internal `effective` variant. Field provenance storage is implemented
for disposable experiments; DTO mapping and the omitted-variant/default policy
remain follow-up decisions. No source registry or separate translation service
is required.

The writer materializes complete effective fields, preserves the original CHM
variant, and distinguishes English fallback from Chinese translation.
The future omitted-variant policy must work consistently in detail, lists,
search and summary fallback. Explicit `variant=chm` must continue to return the
original CHM row. Current consumers default Chinese requests to `chm`, expose
one sourceKey, and select summary variants separately; this slice changes none
of those behaviors. Canonical English/mechanics, summaries, relationships,
normalized entities and publication metadata remain outside the overlay.

The safe rebuild order is: accepted rules-copy generation and normalized content
import → complete CHM rebuild and other Chinese imports → validated selective
overlay in a transaction → derived search rebuild → provenance/parity and
explicit/default consumer checks. `import-zh-chm.ts` deletes **all** Chinese
spell rows before recreating CHM, including other variants. Running it after
overlay destroys that overlay; rebuilding search too early leaves missing or
stale search text. Disposable SQL counterexamples cover both errors. A writer
must treat the full order as one build contract and require fresh preflight;
these projection checks establish no storage import, API compatibility, default
change, production variant or deployment readiness. #121 and other books remain
separate scopes.

## Suspended PHB Work

PDF/MinerU/SRD extraction, translation, and manual queues remain suspended;
they are not dice prerequisites. Keep their implementation and tests. Only an
explicit resumption scope should read the retained
[PHB execution safeguards](../releases/v1.4/phb-source-and-errata-plan.md#paused-workflow-execution-safeguards)
and [console operation boundary](../../review-console/README.md).
Existing fingerprints, source-authority rules, and terminal gates remain
required. Old residuals and unmerged PR #113 outputs are not accepted inputs.
