# v1.4 PHB Source And Errata Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: suspended; outside the revised v1.4 acceptance sequence.

The active release now follows [README.md](./README.md) and the `dice-*`
plans. This document preserves the paused PHB design and evidence; its old
Gate references and imperatives apply only after an explicit resumption
scope decision. They are not prerequisites for dice-text intake or QA.

State recorded before suspension: in progress; Gate 0, the complete Gate 1 representative pilot, and the
localhost review-console prerequisite are accepted. The full-source dual-engine
recall boundary is implemented and locally terminal in nested-data commit
`dda575a`; Gate 2 remains reopened at the authority-policy boundary. The
superseded residual exceptions are fail-closed behind the
`official-srd-default-v1` authority revision and cannot be read or edited
through the review service. Field-resolved SRD adjudication must regenerate its
evidence; downstream translation/activation gates remain blocked.

## Purpose

Build a repeatable, source-first PHB 3.5 extraction and English QA pipeline for
spell descriptions, stat-block fields, pages, and class spell-list short
descriptions. Treat the official PHB errata as a separately pinned and reviewed
correction layer before any translation begins.

## Ownership

- Owning version: v1.4.
- Technical area: source preparation and validation.
- Primary source/pilot branch: `codex/data-phb-source-qa`.
- Full-extraction and comparison branch: `codex/data-phb-full-extraction`.
- Related docs: `data-tools/README.md`, `docs/operations/import-workflow.md`,
  `docs/operations/db-content-workflow.md`, and
  `docs/operations/public-repo-notes.md`.
- Upstream dependency: pinned local PHB 3.5 PDF, official errata bytes, and a
  complete hash-pinned official SRD 3.5 spell corpus used as the default adopted
  rules-text source.
- Downstream plans:
  [phb-pdf-review-console-plan.md](./phb-pdf-review-console-plan.md), then
  [phb-translation-qa-plan.md](./phb-translation-qa-plan.md) and
  [phb-content-activation-plan.md](./phb-content-activation-plan.md).

## Task Context

- Main gate outcome: accepted effective English PHB source rows with complete
  set accounting and page/errata provenance.
- Relevant references: `AGENTS.md`, this plan,
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
- Handoff owner: `main-gate`; the review-console slices may begin against the
  current queues, then translation begins only after Gate 2 closes.

## Current Facts

- Existing English DB text is not a verified PHB source and must be compared,
  not assumed authoritative.
- Existing `spells-full` and CHM workflows are useful comparison/tooling
  references but are not adopted rules-text authority.
- The pinned PHB PDF plus accepted errata is immutable reference/evidence.
  Official SRD 3.5 supplies adopted rules body and mechanics-bearing fields by
  default. PHB+errata remains authoritative when SRD content is missing, for
  Product Identity names and aliases, PHB-only content and class-list short
  descriptions, and all page/table/layout structure.
- Effective names use the SRD name by default. A Product Identity or PHB-only
  spell uses the PHB printed name as its effective name and retains the SRD
  counterpart, when present, as an explicit alias; ordinary mapped rows retain
  the PHB counterpart as alias provenance.
- Existing DB prose is comparison input only. DB-only extension notes do not
  enter the effective body; preserving useful commentary as a separately
  modeled annotation is outside v1.4.
- The existing IMarvin SRD short-description index is incomplete and may be
  used as discovery input only. It cannot satisfy the SRD source lock or
  mechanics adjudication contract.
- Extraction engines produce PHB evidence; they do not select adopted rules
  text. MinerU is the primary structured extractor for reading order, fields,
  body blocks, and tables. PDF.js is an independently derived exact-character
  and coordinate baseline. Items inside strict MinerU bboxes may project directly; an
  outside-bbox item or MinerU/source order conflict requires a current,
  fingerprint-bound accepted decision over enumerated MinerU blocks. PDF.js
  must not define spell segmentation or silently resolve a layout conflict.
  Image-adjacent text requires an explicit caption-exclusion decision rather
  than a proximity-only drop.
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
- one field-resolved effective English row with per-field source provenance and
  no unresolved runtime fallback;
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
  set. Project exact text inside strict MinerU bboxes by deterministic
  coordinates. Emit a fingerprinted review row for every outside-bbox item or
  MinerU/source order conflict, and use the raw MinerU text for recall/drift
  comparison. Never replace MinerU reading order or table structure with a
  PDF.js-only parse.
- Before further English residual review, audit MinerU recall against the
  independent PDF.js inventory and pinned PHB pages. Treat every unexplained
  omission, segmentation drift, field drop, or table loss as upstream evidence
  work. Any accepted fix invalidates all affected downstream fingerprints and
  requires a full extraction rerun.
- Run one provenance-bound VLM witness over the complete canonical PHB core
  subset. Keep pipeline output as the sole structured extraction input; compare
  both engines against the same PDF.js item inventory and emit page-grouped,
  fingerprint-bound item/table disagreements. Require current terminal dual
  review before full comparison, and recursively pin that review manifest into
  Gate 2. Do not merge or import VLM blocks automatically.

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
- Pin and parse the complete official SRD 3.5 spell corpus as the default
  adopted rules-text source. Preserve source file/hash provenance and reject
  stale or partial source packages.
- Match PHB and SRD spell identities by normalized exact name or a reviewed,
  explicit Product Identity alias. Do not introduce fuzzy reuse.
- Resolve effective names deterministically: use the SRD name for ordinary
  mapped rows, but override with the PHB printed name for Product Identity and
  PHB-only rows. Preserve the non-effective counterpart as an alias.
- Resolve the three-way matrix per field. Adopt SRD text for body and
  mechanics-bearing fields by default; use PHB+errata for SRD omissions,
  Product Identity names, PHB-only content, class-list short descriptions, and
  page/table/layout structure. Exclude DB-only extensions from the body.
- Emit exactly one effective English row per spell with per-field source and
  decision provenance. Frontend, backend, search, and translation consumers
  receive this row and do not choose between PHB, SRD, or DB at runtime.
- The assigned source task resolves deterministic rows and produces terminal
  proposals with current evidence fingerprints. Main gate approves the
  adjudication policy and reviews only residual exceptions; it is not the
  clerical reviewer for every substantive/manual comparison row.
- Do not bulk-review residual rows from the legacy authority revision. The
  service now requires the `official-srd-default-v1` authority revision in
  queue freshness/fingerprints, so the superseded queue fails closed and
  direct decision writes are rejected. The legacy adjudicator intentionally
  cannot mint the new revision. MinerU recall and the refreshed comparison are
  recorded as terminal before suspension. On explicit resumption, revalidate
  that evidence and resolve the PR #113 findings before adjudication/apply
  and deterministic three-way drift review. Review only the
  regenerated genuine exceptions through the accepted localhost console or an
  equivalent fingerprint-safe data-tools command. The console must reuse the
  canonical candidate/validation logic and cannot turn a saved decision into
  Gate 2 acceptance without the normal rerun. A layout decision requires a
  full rerun beginning at `phb:source:extract`; the English residual queue must
  remain unavailable until extraction, comparison, SRD adjudication, and SRD
  apply are mutually current again. An English residual save makes the
  row-review manifest stale; after residual-only review, rerun
  `phb:source:compare` before `phb:source:report`.
- Preserve every terminal decision and residual exception in the data repo.

Validation: the MinerU input/output/runtime chain and PDF.js baseline are both
current; every engine difference is deterministic or explicitly reviewed; PHB,
SRD, and DB set totals balance under explicit alias/absence accounting;
category and adjudication totals balance; changing either extraction evidence,
any SRD source byte, parsed row, alias, authority rule, effective-row field, or
three-way evidence resets the affected decision; there are zero unexplained
misses/extras, every spell has one effective row, and no unresolved exception
remains at handoff.

### Slice 5: English Acceptance Handoff

- Produce accepted effective English rows for downstream translation.
- Prove every effective row is complete and field-resolved before handoff; no
  downstream runtime source-selection rule is permitted.
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
npm run -w data-tools phb:mineru:run-batch -- --label <label> --source-id phb35-core
npm run -w data-tools phb:mineru:dual:build -- --batch-manifest <data-relative-run-manifest>
npm run -w data-tools phb:mineru:dual:verify -- --require-terminal
npm run -w data-tools phb:source:compare
npm run -w data-tools phb:srd:verify
npm run -w data-tools phb:srd:extract
npm run -w data-tools phb:srd:adjudicate
npm run -w data-tools phb:srd:apply
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
- Every accepted spell has exactly one effective English row with per-field
  provenance. Official SRD text is the default for rules text; PHB+errata
  exceptions match the authority matrix, and DB-only extensions are absent
  from the body.
- Any console-recorded decision survives its required canonical rerun with the
  same current fingerprint; stale or invalid decisions fail closed before the
  English report is proposed.
- Any layout decision restarts canonical regeneration at full
  `phb:source:extract`; stale English residual rows cannot be read or edited
  until the regenerated compare/adjudication/apply chain validates.
- After the final English residual decision, `phb:source:compare` refreshes the
  stale row-review manifest before `phb:source:report`; report cannot consume
  the decision JSONL directly while that manifest is stale.
- MinerU recall or authority-matrix changes reopen Gate 2 at full
  `phb:source:extract`; a legacy-authority residual snapshot is not accepted
  review input until the full downstream chain is regenerated.
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
  later source-first scope; this suspended track remains PHB-only.

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
  comparison, its 243-row queue, and subsequent SRD terminal candidates were
  provisional until the replacement full MinerU run regenerated their evidence
  fingerprints.
- The replacement full run uses pinned MinerU 3.4 over all 126 in-scope pages
  and records 4,493 ordered blocks, including all 59 table blocks. Its
  block-bounded PDF.js projection records token recall `0.970167` and precision
  `0.977233`; entity extraction reproduces 605 descriptions, 1,216 printed
  list rows, 1,235 occurrences, seven detached named tables, and seven excluded
  description image blocks with zero parser or set-reconciliation issue.
- All 59 MinerU table artifacts are fingerprinted and page-linked into affected
  spell review evidence. The regenerated 605-row comparison retains 65 exact,
  297 formatting-only, 163 substantive, and 80 manual categories. Three-way
  adjudication applied 69 newly current terminal candidates, leaving 530
  accepted decisions and 75 residual exceptions. At that snapshot, Gate 2
  remained open for those exception decisions.
- Data-repo commit `5fa62a2` records the complete MinerU extraction, regenerated
  comparison, table-linked row evidence, and current adjudication matrix.
  Commit `bbdc949` applies the 69 new terminal candidates while preserving all
  168 current SRD-backed decisions across future adjudication reruns.
- Main-gate follow-up removed two silent layout heuristics. The full run now
  records 126 accepted outside-bbox PDF.js item decisions and two accepted
  MinerU/source order overrides. Every decision fingerprints the source item,
  eligible MinerU blocks, and selected block or anchor; proposed or stale rows
  block extraction, and the layout-review manifest is recursively re-hashed by
  comparison and report verification.
- A second follow-up records three explicit illustration-caption exclusions
  that were formerly suppressed only by image distance. Layout status is now a
  closed runtime enum, and both generation and recursive report verification
  reject unknown values rather than treating them as terminal.
- Data-repo commits `95c9ecd` through `58d1b59` record the reviewed layout
  evidence, correct three initially mis-grouped list runs, regenerate the
  605-row comparison without semantic drift, and restore 168 SRD-backed
  terminal decisions with 75 residual exceptions.
- The later authority decision makes official SRD rules text the default
  adopted content while retaining PHB+errata as immutable evidence and the
  source for defined exceptions. Together with the pending MinerU recall audit,
  this reopens Gate 2 and supersedes the 75-row queue as active bulk-review
  input until a full rerun regenerates it.
- The first bounded recall pilot compares three MinerU 3.4 candidates on PHB
  source page index 182 (viewer page 183, printed page 182). The accepted
  pipeline configuration and GPU hybrid candidate both miss the same eight
  strict-bbox PDF.js items. The pure VLM candidate covers all 251 content items
  and reaches `1.0` dehyphenated token recall and precision. The source-free
  harness report contains only counts and text hashes; the nested data repo
  records the exact candidate hashes in
  `phb35/review/mineru-recall-pilot.json`.
- That one-page result is proposed evidence, not a runtime switch or Gate 2
  acceptance. Before rerunning the full corpus, the data pipeline must generate
  runtime provenance from the actual command and environment, then repeat the
  VLM audit over representative description, table, and image-adjacent pages.
- The representative recall follow-up runs provenance-bound VLM candidates on
  source page indexes 206, 219, and 265, covering ordinary descriptions and
  stat blocks, four dense tables, a separate table/image page, outside-bbox
  layout, and both accepted image-adjacent caption exclusions. The generated
  page-run manifests bind MinerU `3.4.0`, Python `3.12.13`, the RTX 3080 Ti,
  package versions, config hash, exact model revision, command arguments, logs,
  input mapping, and content-list hash.
- VLM reduces page 206 from four normalized-text misses to the one already
  accepted caption exclusion; page 265 leaves only its accepted caption
  exclusion under both candidates. On table-dense page 219, VLM reaches exact
  `1.0` token recall/precision but regresses strict-bbox misses from `3` to
  `74`. Source review also finds one row-count drift in each backend on
  different tables: pipeline reports `6x2` where the source is `5x2`, while
  VLM reports `4x5` where the source is `3x5`.
- The reviewed evidence is recorded in nested-data
  `phb35/review/mineru-recall-representative-pilot.json`. It completes the
  requested representative coverage but does not authorize a VLM runtime
  replacement. It motivates the implemented fail-closed dual-engine contract:
  pipeline remains the structured layout source, VLM is only a recall witness,
  and every pipeline/VLM/PDF.js disagreement emits fingerprint-bound evidence
  rather than silently selecting or merging output.
- The full witness runs MinerU `3.4.4` once over all 123 canonical PHB core
  subset pages with model revision
  `bff20d4ae2bf202df9f45284b4d43681555a97ed`. Batch manifest
  `b7bc06bdebd6df5945fc225ddc064044b8451f7cba01669ea8d0f54bee317a2d`
  pins source/input mapping, MinerU and Python executable hashes, config,
  runtime packages, 13 model files totaling 2,328,028,720 bytes, actual
  argv/cwd/environment, portable invocation forms, four-hour task timeout,
  final publication path, logs, and the complete content-list hash.
- The full extraction now has 238 terminal layout decisions: 230 projections,
  six image exclusions, and two order overrides. Every PDF.js item whose full
  bbox overlaps an image requires an explicit accepted projection or caption
  exclusion, including items whose center also lies in a MinerU content block.
  It preserves 605 spells, 1,216 printed list rows, 1,235 occurrences, 59
  MinerU tables, seven detached tables, seven excluded image blocks, and zero
  extraction/set issues.
- The current dual queue contains 115 item-recall rows and 28 table-structure
  rows across the 123 core pages. Source review retains pipeline structure for
  every table disagreement; all 143 rows are fingerprint-current and terminal.
  The refreshed witness content list is byte-identical to the reviewed run and
  produced zero row additions, removals, or table evidence-payload changes
  before batch and layout provenance were refreshed.
- Nested-data commit `dda575a` records the layout fixes, terminal full-source
  dual review, and refreshed comparison chain. Full comparison balances
  605/605 source and DB rows with 65 exact, 297 formatting-only, 163
  substantive, and 80 manual rows. `phb:source:report` remains fail-closed
  because SRD adjudication still pins the previous comparison, which is the
  intended next authority-policy boundary rather than unfinished recall work.

## Paused PR Handoff

PR #113 (`codex/data-phb-srd-authority`, head `2efa0d1`) is open and unmerged
as observed on September 25, 2026. Its summary reports 605 effective rows,
596 accepted decisions, and nine proposed shared-table exceptions; these are
branch results, not current-main acceptance. Nested data is on that branch at
`262b37e`. Preserve it separately from the new dice intake.

The recorded review identifies two P1 issues: effective-row verification trusts
stored fingerprints rather than independently checking changed row content,
and manual decisions are not durably bound to changed adjudication/effective
row evidence. A P2 finding concerns missing effective-verifier and commit/apply
boundaries in the operations doc. Passing CI does not resolve these findings.
Do not accept or reuse those outputs as validated authority. The recommended
close-unmerged disposition is recorded in the release README; this planning
session leaves PR state unchanged.

## Paused Workflow Execution Safeguards

These requirements moved from root agent guidance to keep active instructions
focused. They remain applicable if the PDF work is explicitly resumed. Recheck
all evidence against the then-current code and data; the retained records do
not claim that unmerged PR work or old local acceptance remains current.

For the suspended PHB workflow, distinguish the page-extraction pilot from the
end-to-end Gate 1 pilot. A page review cannot authorize full-PHB extraction.
Build the end-to-end evidence with `phb:source:compare -- --pilot`, resolve all
ten case reviews, then use `phb:source:report -- --pilot` to propose the final
review. The report command must fail while any case remains proposed.
Each row decision must carry the generated evidence fingerprint; comparison
content, category, evidence ids, or review flags changing must reset it to
`proposed`. The verifier must also re-hash the current committed errata
inventory and the currently configured rules/content SQLite files.
The full-run boundary must require `npm run -w data-tools phb:pilot:verify`,
which accepts only clean, committed, non-stale, accepted source/pilot manifests
and an accepted end-to-end review.
The default full extraction must continue to hard-gate the independently
derived 605-spell description/list sets, 1,216 printed rows, 1,235 expanded
occurrences, zero parser/set issues, 59 MinerU table blocks, seven detached
named tables, and seven excluded description image blocks. MinerU owns block
order, spell segmentation, and table structure. PDF.js exact-character items
inside strict MinerU bboxes may project directly; every outside-bbox item and
MinerU/source order conflict requires a current, fingerprint-bound accepted
layout decision targeting an enumerated MinerU block or anchor. Image-adjacent
caption exclusions are explicit layout decisions, never distance-only drops.
Only `proposed`, `accepted`, and `rejected` are valid review statuses; unknown
values must fail extraction and recursive verification. Full comparison may auto-accept
only exact and formatting-only
rows after preserving combined target/effect/area labels and table layout
boundaries; token-multiset equality is not formatting evidence. Unparsed shared
tables remain manual, and every MinerU/detached table reference must be included
in the affected row evidence chain.
Substantive or manual rows remain fingerprint-bound review work. The full
report must recursively re-hash description/list issues, errata output, pilot
summon evidence, comparison inputs, and row-review evidence, and must fail
until every current row is terminal; a successful extraction or comparison
does not close Gate 2.

Use `phb:mineru:run-page` for new MinerU recall candidates so the actual
executable, argv, cwd, environment, config, package versions, CUDA device,
model revision, sorted per-file model-tree hashes, input, logs, and output
hashes are bound in an ignored run manifest. Record and verify portable argv
and environment forms separately from the executed absolute invocation. Pass
that manifest to `phb:mineru:recall`; legacy label-only candidates are
descriptive and cannot authorize a runtime change. The representative class-list,
description, table, and image-adjacent pilot rejects a candidate-wide VLM
switch. For the full witness, use one unbounded
`phb:mineru:run-batch`, generate the fingerprint-bound queue with
`phb:mineru:dual:build`, and require
`phb:mineru:dual:verify -- --require-terminal` before full comparison. Keep
pipeline output as structured layout and treat VLM only as a recall witness.
The batch and dual manifests must pin current inputs, exact page mapping,
runtime/model/config, outputs, layout evidence, and review rows. Never silently
choose, merge, or import VLM text, bboxes, or tables.
The batch manifest records the actual transient staging command separately from
the final atomic publication path, pins MinerU, Python, config, and every model
file by hash, and gives the runtime probe and parent process finite timeouts.
Dual item review may auto-accept exact text inside non-image structural blocks, but
image-overlap text always requires an explicit accepted projection or caption
exclusion. Terminal dual verification also requires the recursively verified
layout queue to be terminal; structural-text matches cannot waive that gate.
If table review exposes a pipeline defect, fix and regenerate the pipeline; do
not use a terminal dual-review status to waive the defect.

For the suspended PHB authority contract, keep PHB+accepted errata immutable as
reference/evidence while adopting official SRD 3.5 rules text by default.
PHB+errata still owns missing-SRD content, Product Identity names and aliases,
PHB-only content and class-list summaries, and page/table/layout structure.
Data-pipeline must resolve mixed cases per field into one provenance-bearing
effective row; server, web, search, and translation consumers must not choose a
source at runtime. DB-only extension notes do not enter the body. Residual rows
from the legacy authority revision must not be bulk-accepted.
The service now requires the code-owned `official-srd-default-v1` authority
revision in queue freshness/fingerprints, so the old queue fails closed for
list, detail, and decision requests; the legacy adjudicator cannot mint that
revision. On explicit resumption, revalidate the current extraction and
comparison before rebuilding adjudication and the exception queue. Unmerged
PR #113 is not an accepted implementation of those steps.
