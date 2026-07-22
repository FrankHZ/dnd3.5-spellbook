# v1.4 PHB Source And Errata Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: in progress; Gate 0 and the complete Gate 1 representative pilot are
accepted. The first Slice 4 PDF.js run is a provisional inventory, not an
accepted full extraction. Gate 2 is blocked on a full MinerU structured run,
block-bounded PDF.js text-fidelity projection and verification, regenerated
comparison evidence, and the pinned official SRD 3.5 adjudication pass; all
downstream translation/activation gates remain blocked.

## Purpose

Build a repeatable, source-first PHB 3.5 extraction and English QA pipeline for
spell descriptions, stat-block fields, pages, and class spell-list short
descriptions. Treat the official PHB errata as a separately pinned and reviewed
correction layer before any translation begins.

## Ownership

- Owning version: v1.4.
- Owning domain: `data-pipeline`.
- Primary source/pilot branch: `codex/data-phb-source-qa`.
- Full-extraction and comparison branch: `codex/data-phb-full-extraction`.
- Related docs: `data-tools/README.md`, `docs/operations/import-workflow.md`,
  `docs/operations/db-content-workflow.md`, and
  `docs/operations/public-repo-notes.md`.
- Upstream dependency: pinned local PHB 3.5 PDF, official errata bytes, and a
  complete hash-pinned official SRD 3.5 spell corpus used only for independent
  adjudication.
- Downstream plans: [phb-translation-qa-plan.md](./phb-translation-qa-plan.md)
  and [phb-content-activation-plan.md](./phb-content-activation-plan.md).

## Agent Context

- Main gate outcome: accepted effective English PHB source rows with complete
  set accounting and page/errata provenance.
- Required reading: `AGENTS.md`, `.agents/roles/data-pipeline.md`, this plan,
  [integrated-plan.md](./integrated-plan.md), `data-tools/README.md`, and
  `docs/operations/db-content-workflow.md`.
- Expected edit surface: `data-tools/src/phb/` or the closest accepted module,
  script manifest/package commands, portable fixtures/tests, this plan, and
  affected operations docs. Source-bearing outputs stay in `data/`.
- Nearby code/tests: `data-tools/src/rules/`, `data-tools/src/short-desc/`,
  `data-tools/src/harness/portable-tests.ts`, and existing structured patch and
  summary schemas.
- Validation: deterministic pilot/full reports, schema tests, set-accounting
  counts, hash checks, portable tests, typecheck, and local-data acceptance.
- Non-goals: no translation, content DB write, non-PHB publication, or public
  source text.
- Handoff owner: `main-gate`, then `i18n-translation` only after Gate 2 closes.

## Current Facts

- Existing English DB text is not a verified PHB source and must be compared,
  not assumed authoritative.
- Existing `spells-full` and CHM workflows are useful comparison/tooling
  references but are not PHB source authority.
- The effective PHB PDF plus official errata remains the display authority.
  SRD 3.5 is an independent adjudication source, not a replacement display
  corpus: Product Identity omissions and renamed proper-name spells must be
  handled through explicit aliases, and PHB page/layout evidence remains PHB
  only.
- The existing IMarvin SRD short-description index is incomplete and may be
  used as discovery input only. It cannot satisfy the SRD source lock or
  mechanics adjudication contract.
- Extraction engines are evidence producers, not source authority. MinerU is
  the primary structured extractor for reading order, fields, body blocks, and
  tables. PDF.js is an independently derived exact-character and coordinate
  baseline: its text items may be projected only inside MinerU-defined blocks
  to avoid OCR/glyph drift, but it must not define reading order, field/table
  boundaries, or silently resolve a MinerU/source-layout conflict.
- The official
  [Wizards 3rd/3.5-edition support page](https://dnd-support.wizards.com/hc/en-us/articles/360000962623-Dungeons-Dragons-3rd-3-5-and-4th-Edition-Rules-Questions)
  links the collected updates and errata package. Implementation must pin the
  exact local artifact actually reviewed rather than trust a mutable URL alone.
- Real PDFs, extraction rows, and review decisions belong in the nested
  `data/` repo. The public repo may retain only code, schemas, redacted/minimal
  fixtures, and aggregate reports without spell text.

## Planned Data Contract

The nested data repo should use one coherent `phb35/` workspace with separate
source, extracted, review, translation, and accepted areas. Exact filenames may
follow existing data-repo conventions, but the schemas must preserve:

- source artifact id, edition/printing note, size, SHA-256, retrieval metadata;
- entity/spell identity, printed name, zero-based PDF page index, printed page
  number, extraction span, and source hash;
- raw extracted body/field/summary occurrence separately from normalized
  comparison text;
- short-description list owner, spell level, occurrence page, and duplicate
  group;
- errata artifact hash, errata page/entry, affected PHB page/entity, decision,
  and before/after effective-source hashes;
- DB comparison identity and exactly one comparison category;
- SRD artifact/file identity, parsed entity identity, component hashes, and
  explicit PHB-to-SRD alias provenance;
- three-way PHB+errata/SRD/DB component disposition and the deterministic rule
  that produced it;
- review status, reviewer/decision note, and terminal accepted/rejected state.

No public aggregate report may contain the raw or normalized source text.

## Plan

### Slice 1: Pin Source And Errata

- Add a source-manifest schema and verifier for the PHB PDF and official errata
  artifact.
- Record edition/printing evidence, byte size, SHA-256, source URL metadata,
  retrieval date, and local data-repo commit.
- Inventory errata entries relevant to spell descriptions, stat blocks, and
  class spell lists.
- Classify each relevant errata entry as `applicable`,
  `already-incorporated`, `out-of-scope`, or `manual-review`; do not apply it
  twice when the pinned PDF already contains the correction.

Validation: changing either source byte stream invalidates extraction and all
downstream acceptance artifacts.

### Slice 2: Structured Extraction

- Run the pinned MinerU configuration over every in-scope source page and
  preserve its ordered blocks, table structure, source-page mapping, and
  runtime provenance as the primary structured extraction.
- Extract spell headings, stat-block fields, body text, and description page
  provenance from the PHB spell chapter.
- Extract each class spell-list short-description occurrence with list owner,
  level, page, printed name, and row provenance.
- Preserve raw extraction separately from deterministic normalization used for
  comparison. Normalization may collapse layout/whitespace and normalize known
  punctuation, but must not rewrite substantive wording.
- Emit explicit parser issues for page/column boundaries, headings, field
  continuation, footnotes, tables, cross-references, and uncertain spell
  segmentation.
- Derive a separate PDF.js text-layer and coordinate baseline for the same page
  set. Project exact text into MinerU-defined block boundaries by deterministic
  coordinates, and use the raw MinerU text for recall/drift comparison. Emit an
  issue when projection cannot preserve a block unambiguously; never replace
  MinerU reading order or table structure with a PDF.js-only parse.

Validation: schema tests plus redacted/minimal fixtures that cover every
supported layout failure mode.

### Slice 3: Approximately Ten-Case Pilot

- Create a source-bearing pilot manifest in the data repo with selection reason
  for every case.
- Include ordinary control rows and difficult cases: cross-page body, column
  transition, long/wrapped field, table/list row, repeated short-description
  occurrence, and an errata-relevant row when the source supplies one.
- Run extraction, errata overlay, DB comparison, report generation, and rerun
  checks end to end.
- Require main-gate approval of the pilot outcomes before the full-PHB run.

Validation: deterministic output hashes where applicable, no silent parser
drops, and reviewed outcomes for every pilot row.

### Slice 4: Full English Comparison And Decisions

- Require the full in-scope MinerU output and its imported page/block manifest
  before entity extraction. The earlier PDF.js-only full run may seed count and
  identity expectations, but none of its row decisions can close Gate 2.
- Compare MinerU structured output against the independent PDF.js baseline and
  emit explicit block/page issues for unexplained recall or layout differences.
  PDF.js text projection must remain inside MinerU block boundaries. Do not
  synthesize effective text or structure by choosing whichever engine happens
  to match the current DB.
- Determine the PHB spell set independently from both extracted descriptions
  and current DB PHB appearances, then reconcile the sets.
- Compare effective PDF+errata source with current DB spell names, fields,
  bodies, pages, and available short descriptions.
- Record component-level comparison results for identity/name, stat-block
  fields, body, page provenance, and short descriptions. Derive exactly one
  spell-level category by deterministic severity order:
  `manual-review` > `missing-in-db`/`extra-in-db` > `substantive-mismatch` >
  `formatting-only` > `exact-match`.
- Use only these spell-level categories:
  `exact-match`, `formatting-only`, `substantive-mismatch`, `missing-in-db`,
  `extra-in-db`, or `manual-review`.
- Reconcile duplicate short-description occurrences before producing a
  spell-level candidate; disagreement requires a decision, not first-row wins.
- Pin and parse the complete official SRD 3.5 spell corpus as an independent
  adjudication source. Preserve source file/hash provenance and reject stale or
  partial source packages.
- Match PHB and SRD spell identities by normalized exact name or a reviewed,
  explicit Product Identity alias. Do not introduce fuzzy reuse.
- Classify each proposed PHB/DB row through a deterministic three-way matrix:
  PHB+errata and SRD agreement may establish a source-backed DB correction;
  registered Product Identity renames establish alias-backed agreement; SRD
  agreement with an applicable erratum establishes errata-backed agreement;
  SRD absence or unsupported PHB-only layout evidence preserves the existing
  PHB review requirement; genuine three-way drift remains an exception.
- The data-pipeline owner resolves deterministic rows and produces terminal
  proposals with current evidence fingerprints. Main gate approves the
  adjudication policy and reviews only residual exceptions; it is not the
  clerical reviewer for every substantive/manual comparison row.
- Preserve every terminal decision and residual exception in the data repo.

Validation: the MinerU input/output/runtime chain and PDF.js baseline are both
current; every engine difference is deterministic or explicitly reviewed; PHB,
SRD, and DB set totals balance under explicit alias/absence accounting;
category and adjudication totals balance; changing either extraction evidence,
any SRD source byte, parsed row, alias, or three-way evidence resets the
affected decision; there are zero unexplained misses/extras and no unresolved
exception remains at handoff.

### Slice 5: English Acceptance Handoff

- Produce accepted effective English rows for downstream translation.
- Produce structured patch candidates only for accepted substantive DB
  corrections; formatting-only differences do not mutate canonical data by
  default.
- Produce accepted English short-description rows through the maintained
  normalized-summary shape.
- Commit a source-free aggregate report recording hashes, counts, category
  totals, errata dispositions, pilot coverage, unresolved count, and rerun
  command names.

Validation: main gate closes integrated Gate 2 before translation starts.

## Target Command Surface

Implementation should converge on maintained, manifest-classified commands
equivalent to:

```bash
npm run -w data-tools phb:source:verify
npm run -w data-tools phb:source:extract -- --pilot
npm run -w data-tools phb:source:compare -- --pilot
npm run -w data-tools phb:source:extract -- --full --prepare-only
npm run -w data-tools phb:source:extract -- --full --mineru-output <data-relative-output>
npm run -w data-tools phb:source:extract
npm run -w data-tools phb:source:compare
npm run -w data-tools phb:srd:verify
npm run -w data-tools phb:srd:extract
npm run -w data-tools phb:srd:adjudicate
npm run -w data-tools phb:source:report
```

Names may change during implementation only if `data-tools/README.md`, the
script manifest, tests, and this plan are updated together.

## Acceptance Criteria

- The PHB, errata, and complete SRD spell artifacts are pinned and
  hash-verified.
- Every in-scope description, field, page, table, and short-description
  occurrence is extracted from the pinned full MinerU run or has an explicit
  terminal issue decision backed by source-page evidence.
- The independent PDF.js baseline has complete page accounting and zero
  unexplained recall/layout issue. Any accepted text projection is bound to a
  MinerU block; PDF.js never defines spell segmentation, reading order, or
  table structure.
- Every relevant errata row has an explained disposition and provenance.
- The pilot covers the approved difficult cases before the full run.
- Every extracted/current PHB spell enters exactly one balanced comparison
  category and no unresolved manual-review row remains.
- Every deterministic three-way result records its adjudication rule and
  fingerprint-bound evidence; only genuine exceptions require main-gate row
  review.
- The English handoff is accepted before any translation branch consumes it.
- Public fixtures/reports contain no PHB or translated corpus text.
- Focused tests, `npm run typecheck:data-tools`, portable tests, and local-data
  acceptance pass.

## Doc Updates

- Update `data-tools/README.md` and `docs/operations/import-workflow.md` when
  command/data boundaries become durable.
- Update `docs/operations/public-repo-notes.md` if a new ignored local subtree
  or report rule is introduced.
- Update `docs/harness.md` for durable source-hash, redaction, or corpus QA
  gates.
- Update `docs/roadmap.md` only if v1.4 ordering changes.
- Update `integrated-plan.md` only for cross-plan scope/order decisions.

## Open Questions

No scope question blocks assignment. The SRD acquisition record must distinguish
the official Wizards-authored document from its archival download host, pin the
exact reviewed bytes, and record both identities without claiming that the
archive host is the publisher.

## Follow-Up Candidates

- Generalize the proven extractor/review schemas to another rulebook only in a
  later release; v1.4 remains PHB-only.

## Completion Notes

- The accepted source lock pins a 322-page PHB PDF at SHA-256
  `6120cfbe12e61c176e078dd43bfe8819753c66b6c0e7315b0e86e933f4430625`
  and the three-page 2006-02-17 errata at SHA-256
  `ec2e9cd645226f74547b3c83017c22b1a567ff0766c76ac8edce56dd067c1d82`.
  The errata file is byte-identical to the member in Wizards' collected errata
  ZIP; the PHB acquisition URL remains unknown and is not presented as an
  official digital master.
- The spell-relevant errata inventory contains 15 rows: nine applicable and six
  already incorporated. Baleful Polymorph remains explicitly review-required
  because the official replacement contains apparent editorial defects.
- The accepted page-extraction substage of the ten-case pilot produces 23
  selected source pages. Two pinned MinerU 3.4 runs were byte-identical across
  content-list, v2, middle, model, and Markdown outputs; the imported
  `pages.jsonl` was also identical. Core-page PDF.js token recall is `0.973984`
  and MinerU token precision is `0.978041`; errata-page recall is `1.0`.
  Sixteen core table blocks are marked OCR-risk rather than treated as
  authoritative text.
- Data-repo commit `63ac1f7` recorded the first end-to-end acceptance attempt.
  Subsequent main-gate review reopened Gate 1 because summary-only text was not
  a comparison component, multi-page errata extraction read only the first
  page, current inventory/DB identities were not revalidated, and terminal row
  decisions were not fingerprint-bound. The hardened rerun emits 20 entity
  rows and ten comparisons, resets all ten row decisions to `proposed`, and
  removes the stale end-to-end acceptance until fresh review. This proposed
  review queue is recorded in data-repo commit `853131a`.
- The corrected pilot continues to prove 124-row Summon Monster cross-column
  extraction and explicit final-occurrence errata targeting for Polymorph Any
  Object. It additionally records both Dispel Magic short-description wording
  groups as comparison components and supports ordered multi-page errata
  sections such as Divine Favor.
- Data-repo commit `ba54174` records the ten fingerprint-bound terminal row
  decisions and the proposed hardened end-to-end review. Independent main-gate
  review accepted all 112 comparison components, including the two explicit
  manual decisions, and data-repo commit `c4a1e79` records the final Gate 1
  acceptance.
- `data/phb35/review/pilot-page-extraction-review.json` remains the page-only
  decision. `data/phb35/review/pilot-e2e-review.json` is the accepted Gate 1
  decision, and the default `npm run -w data-tools phb:pilot:verify` passes
  against its clean committed hash chain. This authorizes full-PHB extraction
  only; full English acceptance, translation, and DB activation remain gated.
- The first PDF.js-only full run deterministically inventories 126 selected
  pages, 605 spell descriptions, 1,216 printed class/domain rows, 1,235
  expanded occurrences,
  605 independent list names, and ten list-footnote definitions with zero
  parser or set-reconciliation issues. Seven detached named tables and six
  illustration-caption runs are explicit source-layout gates rather than
  silent parser exceptions. These counts are regression expectations for the
  full MinerU run, not accepted Gate 2 extraction evidence.
- Full source and DB sets balance at 605/605 with zero misses or extras. After
  review hardening, the current comparison has 65 exact, 297 formatting-only,
  163 substantive, and 80 manual rows. Exact and formatting-only evidence gives
  362 deterministic terminal acceptances; 243 substantive/manual rows remain
  proposed, so `phb:source:report` correctly refuses to propose Gate 2. These
  rows are an adjudication queue owned by data-pipeline, not 243 mandatory
  main-gate manual decisions.
- Independent data-pipeline and English-summary QA reviewed the remaining
  queues. The findings identify deterministic parser/normalization fixes,
  source-backed DB correction candidates, intentional DB expansions, explicit
  short-description canonical candidates, and the already accepted Gate 1
  Baleful Polymorph decision. The next pass must reconcile these against the
  pinned SRD corpus; main gate then reviews only residual exceptions before
  Slice 5 handoff generation begins.
- Data-repo commit `18faa9a` pins the deterministic full extraction,
  effective errata overlays, list evidence, DB comparison, 605 fingerprinted
  row decisions, and the proposed main-gate QA packet for this handoff.
- Review hardening preserves combined target/effect/area labels, records all
  seven detached tables with PDF.js coordinates, forces the unparsed Summon
  Nature's Ally shared table to manual review, and removes token-multiset body
  equivalence. Gate 2 report verification now recursively follows description
  issues, errata output, pilot summon evidence, comparison inputs, and every
  row-review evidence artifact. Data-repo commit `f26626c` records the hardened
  artifacts and resets all affected decisions against their new fingerprints.
- Architecture review found that the first full run promoted the PDF.js text
  layer from independent baseline to primary parser and did not consume MinerU
  blocks at all. Gate 2 is reopened at the full-extraction boundary. The 605-row
  comparison, its 243-row queue, and subsequent SRD terminal candidates remain
  provisional until a full MinerU run regenerates their evidence fingerprints.
