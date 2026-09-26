# v1.4 Release Plan

Status: replanned; implementation and content activation have not started.

v1.4 replaces CHM-derived Chinese spell text with the supplied community dice
database text where matching and QA support it. English resolves substantive
differences; the release does not retranslate the entire corpus. PDF extraction
and manual layout review are suspended because their review cost is too high.

## Release Boundary

- Cover the supplied package across publications already represented in the
  application's supported corpus; the release is no longer PHB-only.
- Replace matched Chinese names and description text, including stat-block
  text within descriptions. Preserve paragraph and table meaning.
- Keep current CHM text for missing, ambiguous, rejected, or deferred
  replacements, and current English fallback where Chinese is absent.
- Use existing English for discrepancy QA, checking publication and edition
  alignment. Escalate only conflicts the available evidence cannot resolve.
- Preserve spell IDs, book associations, structured mechanics, existing English,
  and short-description sources. A change to those requires a separately
  scoped correction; this release replaces Chinese text.
- No automatic new spells/publications, PDF extraction, full retranslation,
  review-console expansion, public UI redesign, or automatic DB deployment.

The package is at `data/spells-dice-db-by-mo/`, not under `data/artifacts/`.
It is input awaiting intake, not accepted import data. Keep supplied bytes
intact and commit the intended input snapshot in the nested data repo before
implementation acceptance. No corpus text belongs in the public parent repo.

## Active Plans And Ownership

- [integrated-plan.md](./integrated-plan.md): main-gate scope, authority,
  sequence, and cross-domain decisions.
- [dice-source-intake-plan.md](./dice-source-intake-plan.md): data-pipeline
  source inventory, parsing, identity mapping, and difference accounting.
- [dice-text-qa-plan.md](./dice-text-qa-plan.md): i18n-translation
  English-assisted discrepancy QA and accepted Chinese text decisions.
- [dice-content-activation-plan.md](./dice-content-activation-plan.md):
  backend-db accepted import, request compatibility, search, and consumer checks,
  with data-pipeline and bounded frontend support.

Librarian owns navigation and release docs; main-gate accepts each handoff.
A plan is not proof of implementation or accepted content.

## Release Acceptance

1. Reproducible source snapshot, publication mapping, record boundaries, and
   target set. Every source record and target has an explained disposition;
   raw record counts are not unique spell counts.
2. Exact and safe formatting-only cases pass deterministic checks in batches.
   Substantive differences receive recorded English-assisted QA. Only unresolved
   identity, edition, or semantic conflicts need user review.
3. Every replacement is accepted and tied to its source and QA inputs.
   Excluded/deferred rows have reasons and fallback coverage, and are not
   counted as replacements. Main gate accepts aggregate coverage by book and
   the remaining exceptions; a small accepted subset cannot silently stand in
   for the agreed release coverage.
4. Dry-run evidence proves accepted-only changes, stable IDs, no loss of
   uncovered Chinese, unchanged English/mechanics/summaries, and repeatability.
5. Chinese names/detail text and full-text Search consume accepted text.
   Language/variant requests, collections, and prepared spells remain compatible.
   Provenance truthfully distinguishes dice text from CHM.
6. Focused data/import/API checks and EN/ZH browser smoke pass. Remote content
   activation remains a separate operator handoff. This planning change neither
   freezes nor deploys v1.4.

## Suspended PDF Work

Retain the existing implementation and these plans as paused reference:

- [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md)
- [phb-pdf-review-console-plan.md](./phb-pdf-review-console-plan.md)
- [phb-translation-qa-plan.md](./phb-translation-qa-plan.md)
- [phb-content-activation-plan.md](./phb-content-activation-plan.md)

Their old Gate 0-4 requirements apply only after explicit resumption. They
neither block nor authorize dice-text work. Existing portable tests stay;
suspension does not weaken old validation or permit residual bulk acceptance.

[PR #113](https://github.com/FrankHZ/dnd3.5-spellbook/pull/113) belongs to the
suspended track. At the September 25 planning review it is open at `2efa0d1`,
with passing CI but two recorded P1 provenance findings and one P2 workflow-doc
finding. It is neither a prerequisite nor accepted evidence for this release.
Recommended disposition: close unmerged and preserve its branch/data for possible
resumption. This documentation change does not close or merge it. Resumption
requires a new scope decision and revalidation of the findings; old CI alone
is insufficient. The detailed paused-source plan records that handoff.

## Maintenance

Implementation branches update their child plan and affected topic docs.
Change the integrated plan only for scope, sequence, ownership, or cross-plan
decisions. Shipped release metadata remains v1.3.0 until later acceptance.
