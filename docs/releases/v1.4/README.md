# v1.4 Release Plan

Status: planned.

v1.4 is a source-first translation and proofreading pilot limited to the
_Player's Handbook v.3.5_ (PHB 3.5). It replaces "translate the current English
database" with a gated workflow that first proves the English source against a
pinned PHB PDF and the official PHB errata, then translates only accepted
source rows.

## Release Boundary

v1.4 owns three implementation tracks with hard stage gates:

1. **PHB source and errata QA**

   Pin the exact PHB 3.5 PDF and official errata artifacts by SHA-256. Extract
   spell bodies, stat-block fields, description pages, and class spell-list
   short-description occurrences. Apply reviewed errata as a separate,
   auditable correction layer and compare the effective English source with
   the current DB.

2. **PHB Chinese translation and proofreading**

   Begin only after the full English source gate closes. Translate and review
   accepted PHB spell names, bodies, and short descriptions with source-page
   provenance, terminology checks, review queues, and terminal row decisions.

3. **Accepted content activation and consumer verification**

   Apply only accepted English corrections and accepted Chinese overlays
   through the existing rules/content workflows. Preserve current Chinese CHM
   fallback for uncovered rows, rebuild search content, and prove the existing
   frontend consumes reviewed PHB body and short-description data without a UI
   redesign.

The cross-role ordering is canonical in
[integrated-plan.md](./integrated-plan.md). It exists because source QA,
translation, and activation are sequential gates; it is not an implementation
ledger.

## Source Authority

For v1.4 PHB content, use this precedence:

1. the pinned PHB 3.5 PDF base source;
2. accepted, applicable entries from the pinned official PHB errata artifact;
3. explicit manual decisions for unresolved extraction or source conflicts;
4. the current DB only as comparison input and fallback, never as the
   untranslated source by assumption.

The implementation must record both source hashes. Errata must not silently
overwrite extracted text: retain the base extraction, the errata decision, and
the resulting effective-source hash.

## Data Boundary

- PHB/errata PDFs, extracted text, source-bearing JSONL, translations, review
  queues, and accepted content rows live only in the nested local `data/` repo.
- The public parent repo owns extraction/import code, schemas, QA rules,
  minimal synthetic or redacted fixtures, and aggregate reports without spell
  text.
- Runtime SQLite files remain ignored under `server/db/local/`.
- Content DB activation remains an explicit operator step and is not added to
  automatic CD.

## Ownership

- `data-pipeline`: pinned-source manifests, extraction, errata overlay,
  comparison, the representative pilot, full English QA, and reproducibility.
- `i18n-translation`: Chinese terminology, translation/proofreading queues,
  row decisions, translation QA, and the reusable corpus-translation skill.
- `backend-db`: accepted patch/overlay schemas, content DB apply, provenance,
  fallback/read behavior, search rebuild, and API acceptance.
- `frontend-design`: only a bounded consumer compatibility check if existing
  display code needs adjustment; no redesign or new visual system.
- `librarian`: release plans, cross-doc coherence, and freeze sweep.
- `main-gate`: approves the pilot manifest, closes each stage gate, resolves
  cross-role decisions, and decides merge/freeze readiness.

## Track Order

1. Pin both source artifacts and approve an approximately ten-spell pilot that
   covers page breaks, multi-column extraction, wrapped/long fields, class-list
   tables, duplicate summary occurrences, and ordinary controls.
2. Prove the extraction, errata, comparison, and report pipeline on the pilot.
3. Run full PHB English source QA. Every extracted PHB row and every current
   PHB DB spell must receive an explained status; unresolved manual review
   blocks the English gate.
4. Translate and proofread only the accepted effective English corpus.
5. Apply accepted rows, rebuild derived content/search artifacts, verify API
   fallback and frontend consumption, then run release acceptance.

## Non-Goals

- Do not include DMG, Spell Compendium, PHB II, supplements, periodicals, or
  other rulebooks.
- Do not translate the existing DB corpus before English source acceptance.
- Do not use the combined `spells-full` dump or CHM content as PHB authority.
- Do not publish source text, PDF pages, or translations in the parent repo.
- Do not redesign Spell Detail, cards, Browse, Search, or language settings.
- Do not add automatic production DB deployment.

## Plans

- [integrated-plan.md](./integrated-plan.md)
- [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md)
- [phb-translation-qa-plan.md](./phb-translation-qa-plan.md)
- [phb-content-activation-plan.md](./phb-content-activation-plan.md)

## Release Acceptance

v1.4 may freeze only when:

- the PHB PDF and official errata artifacts have fixed identity metadata and
  SHA-256 hashes in the nested data repo;
- every PHB spell description, relevant stat-block field, and class-list
  short-description occurrence has traceable PDF page-index and printed-page
  provenance;
- the English comparison has terminal, explained outcomes for the complete
  extracted and current-DB PHB sets with no unexplained missing rows;
- every in-scope errata entry is classified as applicable,
  already-incorporated, out-of-scope, or manually resolved;
- no Chinese work began from rows that lacked accepted English source state;
- every in-scope Chinese name, body, and available short description is
  accepted after proofreading; rejected attempts and manual-review rows do not
  count as release-complete, and only accepted rows enter the content artifact;
- extraction, review queues, translation QA, apply, and regression checks are
  rerunnable from documented commands and a reusable repo-local skill;
- aggregate coverage and decision reports contain no source or translated
  spell text in the public repo;
- API and frontend checks prove accepted PHB Chinese body/summary display,
  English behavior, existing CHM fallback, and full-text search remain sound;
- focused data, DB, server, web, i18n, and portable validation pass.

## Handoff Rule

Implementation branches update their owning child plan and affected durable
topic docs. Update [integrated-plan.md](./integrated-plan.md) only when stage
order, scope, ownership, or a cross-track decision changes. Do not turn this
README or the integrated plan into a progress ledger.
