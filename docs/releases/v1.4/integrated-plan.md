# v1.4 Integrated Plan

> Plan maintenance rule: this document owns early sequencing and cross-plan
> conflict decisions, not implementation progress. Implementation branches
> update their child plan and affected topic docs. Update this file only when
> release scope, delivery sequence, ownership, or cross-plan decisions change.

Status: planned.

## Purpose

Coordinate the hard gates between PHB source extraction, errata review, local
PDF evidence review, English acceptance, Chinese translation/proofreading, and
accepted content activation. No downstream agent may infer that an upstream
artifact is accepted merely because it exists.

## Canonical Sequence

```text
pinned PHB PDF + pinned official errata
  -> representative extraction/compare pilot
  -> full MinerU structured extraction
  -> block-bounded PDF.js text-fidelity projection and verification
  -> errata-effective English source
  -> pinned official SRD 3.5 adjudication
  -> localhost PDF review service/API/consumer acceptance
  -> English source QA exception review and acceptance
  -> Chinese translation + independent proofreading
  -> accepted-only DB/content activation
  -> API/frontend/search acceptance
  -> freeze
```

## Stage Gates

### Gate 0: Source Lock

Owner: `data-pipeline`; approver: `main-gate`.

- Record file identity, edition/printing evidence, byte size, SHA-256, and local
  data-repo location for the PHB PDF and official errata artifact.
- Record the official discovery URL and retrieval date as metadata, while the
  local bytes and hash remain the reproducibility boundary.
- Define errata relevance and double-application handling for a PDF that may
  already include some corrections.

Exit: both inputs are pinned and independently hash-verifiable.

### Gate 1: Representative Pilot

Owner: `data-pipeline`; approver: `main-gate`.

- Approve a manifest of about ten PHB spells/cases before broad extraction.
- Cover normal single-page text, cross-page text, column transitions, wrapped
  or long stat-block fields, class-list tables, repeated summary occurrences,
  and at least one errata-relevant case when available.
- Demonstrate deterministic extraction, provenance, comparison categories,
  and report redaction.

Exit: the pilot reruns byte-for-byte where outputs are deterministic, and all
pilot rows have reviewed outcomes.

### Gate 2: Full English Source QA

Owner: `data-pipeline`; approver: `main-gate`.

- Extract the full in-scope PHB corpus and relevant errata decisions.
- Treat MinerU as the primary structured extractor and PDF.js as an independent
  exact-character/coordinate baseline projected only inside MinerU blocks.
  Neither engine replaces the pinned PDF as source authority, and PDF.js-only
  rows cannot close this gate.
- Reconcile PDF descriptions, class-list occurrences, and current PHB DB rows.
- Pin and parse the official SRD 3.5 spell corpus as an independent
  adjudication source while keeping PHB+errata as display authority.
- Classify each comparison as `exact-match`, `formatting-only`,
  `substantive-mismatch`, `missing-in-db`, `extra-in-db`, or `manual-review`.
- Let data-pipeline resolve deterministic three-way agreement, reviewed
  Product Identity aliases, and errata-backed agreement. Route only residual
  source conflicts to main-gate, then preserve every decision and its current
  evidence fingerprint in the data repo.
- Before reviewing the residual exceptions through a browser, accept the
  localhost-only review service/API and bounded React consumer in
  [phb-pdf-review-console-plan.md](./phb-pdf-review-console-plan.md). Console
  saves are decision-file edits, not Gate 2 acceptance; rerun the canonical
  compare/adjudication/report chain afterward.

Exit: complete set accounting, zero unexplained misses, accepted effective
English rows, and no translation work started early.

### Gate 3: Chinese Translation And Proofreading

Owner: `i18n-translation`; approver: `main-gate`.

- Translate only Gate 2 accepted effective-source rows.
- Keep translation and proofreading decisions separate and attributable.
- Resolve terminology, omission, placeholder, punctuation, number/dice, HTML,
  and source-alignment checks.
- Produce accepted name/body/summary rows plus a zero-unexplained-gap report.

Exit: every eligible in-scope name, body, and available summary is accepted
after proofreading; no rejected attempt, manual-review row, or unreviewed row
counts as release-complete.

### Gate 4: Activation And Consumer Acceptance

Owner: `backend-db`; approver: `main-gate`.

- Dry-run and apply accepted English corrections and accepted Chinese overlays
  through maintained workflows.
- Regenerate content/search artifacts and record parent/data/source hashes.
- Prove accepted PHB reviewed overlays are preferred per spell while existing
  Chinese CHM rows remain fallback outside accepted coverage.
- Verify existing frontend detail and short-description consumers need no new
  user-facing variant setting or broader UI work.

Exit: local artifact parity, regression checks, frontend/API smoke, and an
explicit operator handoff for any later remote DB activation.

## Cross-Plan Decisions

- Existing DB English is comparison input, not translation authority.
- Errata is a versioned correction layer over the pinned PDF, not a silent text
  replacement or a second free-standing corpus.
- MinerU supplies the primary full-corpus reading order, field, body, and table
  structure. PDF.js may restore exact source characters only inside those
  blocks and supplies independent recall/coordinate evidence; it cannot define
  spell segmentation, reorder content, or override structured tables.
- Official SRD 3.5 is a hash-pinned independent adjudication source, not the
  displayed PHB corpus. It may prove mechanics agreement but cannot replace PHB
  page/layout evidence or silently rename Product Identity spells.
- Main gate approves the SRD adjudication policy and residual exceptions; the
  data-pipeline owner is responsible for deterministic row resolution and the
  resulting review bundle.
- The PDF review console consumes data-tools candidates and validators through
  a narrow local API. It binds only to loopback, exposes only allowlisted
  source/queue ids, writes only decision JSONL in the nested data repo, and is
  never deployed or connected to production DB state.
- Short descriptions are extracted as list-owner/level/page occurrences first.
  A spell-level candidate is accepted only after duplicate occurrences are
  reconciled.
- The parent repo never receives source-bearing or translated corpus rows.
- The `phb35-reviewed` provenance variant is an internal accepted overlay, not
  a new frontend setting. Backend read logic prefers it per covered PHB spell
  and preserves the requested/current CHM fallback for other rows.
- Full PHB English acceptance precedes all corpus translation. A successful
  ten-spell pilot does not authorize early translation.
- Production content activation is not part of automatic CD.

## Conflict Routing

- Source identity, extraction, matching, or set-accounting conflict:
  `data-pipeline` -> `main-gate`.
- Review candidate, fingerprint, local API, or decision-write conflict:
  `data-pipeline` -> `main-gate`; bounded review UI behavior:
  `frontend-design` -> `main-gate`.
- Terminology, translation, or proofreading conflict: `i18n-translation` ->
  `main-gate`.
- Schema, variant, fallback, API, or apply conflict: `backend-db` ->
  `main-gate`.
- Scope expansion to another publication or UI redesign: reject from v1.4 and
  park in the owning plan or `docs/stable-backlog.md`.

## Freeze Gate

The librarian may prepare a v1.4 freeze only after all five gates are accepted,
the public reports are confirmed source-free, the required durable workflow
docs and reusable skill are updated, and production activation state is stated
without implication or guesswork.
