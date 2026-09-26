# v1.4 Dice Source Intake Plan

> Plan maintenance rule: implementation branches update this owning plan and
> affected topic docs. Update roadmap only when active ordering changes; update
> integrated-plan only for scope, sequence, ownership, or cross-plan decisions.

Status: planned; read-only discovery completed, no parser/import acceptance.

## Purpose And Ownership

The intake task turns the supplied TXT package into reproducible, mapped Chinese
replacement candidates and a complete comparison inventory. Main-gate accepts
the handoff to [dice-text-qa-plan.md](./dice-text-qa-plan.md).

## Task Context

- Relevant references: `AGENTS.md`, this plan, the integrated
  authority table, `data-tools/README.md`, and
  `docs/operations/db-content-workflow.md` / `import-workflow.md`.
- Expected future edits: a bounded text-source adapter under data-tools,
  matching helpers only where needed, synthetic fixtures, and this plan/topic
  docs. Real source, mappings, and decisions belong in nested data.
- Validate with focused parser/matcher tests, data-tools typecheck, and explicit
  read-only local inventory. Main-gate owns handoff; no DB writes or deployment.
- Non-goals: English correction, new entities, corpus translation, PDF work,
  building a new review platform, or importing the package in this plan session.

## Discovery Evidence

September 25 read-only inventory found 105 flat TXT files, 5,544,957 bytes,
strict UTF-8 without BOM, and CRLF line endings in
`data/spells-dice-db-by-mo/`. It is currently untracked on nested-data branch
`codex/data-phb-srd-authority`; that branch also contains paused PHB work.
Do not switch/reset/delete its contents or imply it is a clean accepted input.
Future intake must explicitly choose and commit the intended data snapshot
without accidentally adopting unrelated PHB outputs.

A header-pattern scan found 5,611 candidate lines, including 96 atypical or
field/body false positives. Of 5,103 candidates with a Latin middle group,
659 English keys repeat across 1,460 occurrences. These are discovery figures,
not parsed records, unique spell counts, or accepted coverage. File stems cover
105 labels; candidate headers expose 107 labels. The package includes core,
supplements, periodicals, web articles, and settings, requiring explicit mapping
against existing supported publications rather than a PHB-only assumption.

Normal records resemble a Chinese name, parenthesized English name and book
label, then Chinese stat fields and body. Field labels and ordering vary;
English names and school-like lines are not guaranteed. No package manifest,
per-row IDs, or systematic author/page metadata was found. Use actual source
file and line/ordinal evidence; do not invent attribution, edition, or page data.

## Reuse Before New Code

- `data-tools/src/zh-parser/header.ts`: parenthesis/name parsing and field-label
  exclusion candidates.
- `data-tools/src/zh-parser/match.ts`: publication-aware English matching,
  aliases, and ambiguous/unmatched outcomes.
- `data-tools/src/zh-parser/types.ts`: current matchable record shape.
- `data/chm-mapping/`: existing label/alias data may seed mappings after review;
  it is not automatic authority for all dice-source labels.

The current CLI/segmenter consumes cleaned HTML with paragraph/bold boundaries;
TXT cannot be passed through unchanged. Keep the adapter narrow and share
helpers only where semantics match. Generated reports belong in data-tools/out;
maintained source mappings and accepted decisions belong in nested data.

## Implementation Slices

### 1. Input And Scope Inventory

Record package location, file inventory, encoding, available credit/version,
source revision, and reproducible record locators. Use the existing provenance
facilities; a new hashing/manifest framework is unnecessary. Report unknown
metadata and every unmapped publication. Do not move the input just to make
its directory name fit a convention.

Inventory all files, but target only existing supported spell/publication
identities. Separate unsupported/new records, edition mismatches, and source
records with no existing target. No automatic insertions or guessed book IDs.

### 2. Representative Parse/Match/Diff Pilot

Cover at least one example of ordinary text, repeated name across books,
missing English, alternate field labels, header-like body text, table/cross-
reference content, and unmatched publication. Preserve unparsed spans and
report them; do not silently drop tail paragraphs or flatten meaningful tables.

Resolve publication/edition before name/alias matching. Any cross-book fallback
must be explicit and reviewed, never a global English-name first match.
Existing spell IDs stay stable. Multiple candidates for one target require an
explicit precedence/duplicate decision; keep the evidence for each occurrence.

### 3. Full Coverage And Difference Handoff

Produce per-target candidates with Chinese name/body, source locator,
publication/edition mapping, existing target ID, comparison baseline, parser
issues, and classification. Preserve source text separately from renderable
HTML/plain text. Validate safe rendering without discarding rules content.

Separate exact, formatting-only, substantive, missing-current-Chinese,
ambiguous/unmatched, malformed/incomplete, and out-of-scope cases. A new Chinese
coverage candidate with no CHM comparator still needs English-assisted QA.
Account for both source occurrences and target spells; unexplained skips fail
intake. Missing tables or unresolved references cannot pass as formatting-only.

## Acceptance And Validation

- Input snapshot and mappings are reproducible and source-safe.
- Record segmentation tests catch false headers, truncated bodies, encoding
  errors, and malformed tables; match tests catch homonyms and reprints.
- Every source occurrence and target spell has a disposition, including fallback.
- Repeated runs preserve stable identities and equivalent candidates; changed
  inputs cannot silently reuse accepted decisions for different text.
- No runtime DB, canonical English/mechanics, or source input is modified.
- Run `npm run typecheck:data-tools` and focused helper tests; run maintained
  portable data checks when wiring the adapter into maintained commands.
  Classify any new command in data-tools/scripts.manifest.json.

## Doc Updates And Deferred Work

Update this plan, data-tools README and import-workflow with implemented commands
only when they exist. Add public-safe fixture coverage to the existing harness.
Source credits need confirmation when unavailable; do not claim ownership from
the folder name alone. New entities, broad edition conversion, and PDF-based
recovery remain outside this release unless main-gate explicitly expands scope.
