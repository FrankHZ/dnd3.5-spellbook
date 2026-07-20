# v1.4 PHB Source And Errata Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: in progress; Gate 0 and the Slice 3 page-extraction substage are
accepted. Gate 1 is reopened pending a fresh end-to-end main-gate review after
provenance hardening; Slice 4 remains blocked.

## Purpose

Build a repeatable, source-first PHB 3.5 extraction and English QA pipeline for
spell descriptions, stat-block fields, pages, and class spell-list short
descriptions. Treat the official PHB errata as a separately pinned and reviewed
correction layer before any translation begins.

## Ownership

- Owning version: v1.4.
- Owning domain: `data-pipeline`.
- Primary implementation branch: a focused `codex/data-phb-source-qa` branch.
- Related docs: `data-tools/README.md`, `docs/operations/import-workflow.md`,
  `docs/operations/db-content-workflow.md`, and
  `docs/operations/public-repo-notes.md`.
- Upstream dependency: pinned local PHB 3.5 PDF and official errata bytes.
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
- Resolve every manual-review row and preserve accepted/rejected decisions in
  the data repo.

Validation: both source and DB set totals balance, category totals balance,
there are zero unexplained misses/extras, and no unresolved manual-review row
remains at handoff.

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
npm run -w data-tools phb:source:extract
npm run -w data-tools phb:source:compare
npm run -w data-tools phb:source:report
```

Names may change during implementation only if `data-tools/README.md`, the
script manifest, tests, and this plan are updated together.

## Acceptance Criteria

- Both source artifacts are pinned and hash-verified.
- Every in-scope description, field, page, and short-description occurrence is
  extracted or has an explicit terminal issue decision.
- Every relevant errata row has an explained disposition and provenance.
- The pilot covers the approved difficult cases before the full run.
- Every extracted/current PHB spell enters exactly one balanced comparison
  category and no unresolved manual-review row remains.
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

No scope question blocks assignment. The implementation context packet must
name the exact local PHB and errata files, hashes, and proposed pilot manifest
before write-capable work begins.

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
- `data/phb35/review/pilot-page-extraction-review.json` remains the page-only
  decision. `data/phb35/review/pilot-e2e-review.json` is the accepted Gate 1
  decision location. It is intentionally absent while the hardened row reviews
  remain proposed. The default `npm run -w data-tools phb:pilot:verify` must
  fail until a fresh committed end-to-end review is accepted; full-PHB
  extraction, full English acceptance, translation, and DB activation remain
  unauthorized.
