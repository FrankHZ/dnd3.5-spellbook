# v1.4 Integrated Plan

> Plan maintenance rule: this document owns sequencing and cross-plan decisions,
> not implementation progress. Update only for scope, sequence, ownership, or
> cross-plan decisions; implementation branches update their child plans.

Status: replanned for dice database text replacement; implementation pending.

## Outcome And Sequence

Replace CHM Chinese spell text with matched, accepted dice database text. Use
English for substantive discrepancy QA without requiring complete PDF extraction,
universal human review, or corpus retranslation.

```text
source inventory + target coverage
  -> representative parse/match/diff pilot
  -> full comparison + English-assisted discrepancy QA
  -> accepted replacements + explicit fallback set
  -> disposable content build + search + consumer checks
  -> release acceptance and separate operator activation handoff
```

D1-D4 below are the active sequence. Old PHB Gate 0-4 is suspended, not completed.

## D1: Intake And Identity

Owner: data-pipeline; approver: main-gate.

- Inventory `data/spells-dice-db-by-mo/` without moving or rewriting raw input.
  Record known credit/version and unknown metadata, then commit the intended
  snapshot in nested data before accepting a handoff.
- Match to existing IDs with publication/edition evidence and reviewed aliases.
  Name similarity alone cannot resolve reprints or homonyms.
- Pilot ordinary records, duplicate names, absent/ambiguous English names,
  tables, malformed boundaries, and unmatched records before a full run.
- Account for raw records, unique targets, duplicate candidates, unsupported/new
  entries, and existing targets without candidates separately.

Exit: accepted parse/mapping policy and complete coverage/difference inventory.
See [dice-source-intake-plan.md](./dice-source-intake-plan.md).

## D2: Discrepancy QA

Owner: i18n-translation; approver: main-gate.

- Exact and narrowly defined formatting-only records may be accepted by
  deterministic checks in batches, without a human click per record.
- Agents resolve substantive differences using aligned English evidence and
  record source, field, outcome, and reason. The existing English DB is useful
  evidence, not an assertion of infallibility.
- Missing/conflicting English or edition mismatch leaves an explicit unapplied
  exception with CHM fallback unless targeted evidence resolves it.
- Human review is limited to unresolved identity/edition/semantic questions.
  Uncertainty in one row must not block independent accepted replacements.
- Keep proposed/accepted/rejected review states. Deferral is an unapplied
  disposition, not accepted content. Input or target changes require
  re-evaluation of affected decisions using existing provenance mechanisms.

Exit: accepted replacements and explicit fallback reasons, with main-gate
acceptance of coverage by publication and remaining exceptions.
See [dice-text-qa-plan.md](./dice-text-qa-plan.md).

## D3: Content Build And Compatibility

Owner: backend-db, supported by data-pipeline.

- Consume one resolved Chinese result per target/field. Source/quality decisions
  occur during data preparation, not in API/web/search at runtime.
- Reuse overlay/import/build mechanisms and current language/variant request
  compatibility. Legacy variant labels must not misrepresent source provenance.
- Preserve English, structured rules, IDs, publication metadata, and summaries.
  Corrections to them require a separate scope decision and accepted patch.
- Do not use CHM-wide deletes for selective replacement. Dry-run on disposable
  DBs and prove fallback preservation, transactions, idempotency, and restoration
  of the previous content artifact.

Exit: accepted local build and parity; rebuild Search after all text imports.
See [dice-content-activation-plan.md](./dice-content-activation-plan.md).

## D4: Release Acceptance

Owner: main-gate, supported by backend-db, frontend-design, and librarian.

- Verify accepted/fallback/missing-Chinese/duplicate-name/table cases in API
  and EN/ZH UI: Browse, Detail, Search, spellbooks, and prepared spells.
- Report replacement and fallback totals by book/reason. Detailed text/QA
  evidence stays local; public reports contain only source-free aggregates.
- Run relevant focused checks and remote portable CI. Freeze and operator
  activation are later explicit actions, outside this planning session.

## Architecture And Authority

| Surface | Authority / allowed use | Forbidden substitution |
| --- | --- | --- |
| Chinese candidates | Supplied dice records after mapping and QA | Accepting raw records by default |
| Current Chinese | Comparison and coverage fallback | Deleting uncovered CHM rows |
| English | Edition-aligned discrepancy evidence | Mandatory PHB/SRD pipeline or blanket English rewrite |
| Identity / rules | Existing IDs, book relations, normalized mechanics | Creating entities or changing rules from name guesses |
| Accepted text | Resolved data-preparation output | Runtime source-quality arbitration |
| Source / decisions | Nested data repo and existing provenance | Corpus or runtime DBs in parent Git |

Data-pipeline owns matching, i18n-translation owns semantic QA, backend-db owns
import/read compatibility, and main-gate resolves cross-domain conflicts.
New entities, broad English source acquisition, structured mechanics changes,
or a new review platform require a scope decision before implementation.

## Suspended Track Boundary

Pause PHB extraction, MinerU recall, layout decisions, SRD effective-row work,
PHB translation, and the review-console acceptance queue. Preserve code, tests,
artifacts, and unmerged PR #113. Do not rerun old commands, bulk-accept residuals,
or make that PR a hidden dependency. Disposition/resumption conditions are in
[README.md](./README.md#suspended-pdf-work).
