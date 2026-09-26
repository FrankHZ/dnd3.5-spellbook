# v1.4 Dice Text QA Plan

> Plan maintenance rule: implementation branches update this owning plan and
> affected topic docs. Update roadmap only when active ordering changes; update
> integrated-plan only for scope, sequence, ownership, or cross-plan decisions.

Status: planned; depends on the accepted D1 intake/matching handoff.

## Purpose And Ownership

The QA task accepts Chinese replacement text using comparison and targeted
English QA. It does not translate the entire English corpus or require users
to approve every record. Main-gate accepts coverage and unresolved exceptions
before [dice-content-activation-plan.md](./dice-content-activation-plan.md).

## Task Context

- Relevant references: `AGENTS.md`, this plan,
  [dice-source-intake-plan.md](./dice-source-intake-plan.md), the integrated
  authority table, `docs/i18n.md`, and accepted source/mapping evidence.
- Future edit surface: bounded QA helpers and synthetic tests in data-tools,
  nested-data decisions/corrections, and the owning workflow documentation.
- Validate classification, evidence alignment, changed-input invalidation, and
  source-free coverage reports. Main-gate owns handoff.
- Non-goals: global terminology rewrite, new spell IDs, structured rules changes,
  bulk translation, new PDF extraction, or a general annotation console.

## Evidence And Decision Policy

Compare dice Chinese against current CHM Chinese by matched spell and field.
English is evidence for resolving substantive differences, including potential
CHM errors; it is not automatically rewritten by the Chinese replacement.

| Case | Treatment |
| --- | --- |
| Exact or safe formatting-only | Deterministic batch acceptance after structural checks |
| Substantive Chinese difference | Agent QA against aligned English, with recorded reason |
| No current Chinese counterpart | English-assisted coverage-addition QA for existing target |
| Different name / publication / revision | Resolve identity first; no cross-edition guess |
| Missing table, fragment, or unresolved reference | Repair from available evidence or retain CHM |
| English unavailable or contradictory | Targeted evidence lookup, otherwise defer and preserve fallback |

Safe formatting normalization may cover line endings, equivalent whitespace,
and inert wrappers. It must not erase negation, number/dice/unit/range changes,
conditions, targets, duration, tables, ordering, or paragraph omissions. Token
multiset equality alone is not semantic or formatting equivalence.

For substantive cases use current matched English as the first comparison.
Check source publication/edition, reprints, and aliases. Existing local English
source artifacts may resolve a disputed field when traceable and applicable;
official SRD is evidence only for applicable SRD entries, not default authority
for every book. Do not make paused PHB/SRD Gate 2 or PR #113 outputs mandatory.
If the English DB itself appears wrong, retain the discrepancy as a separate
correction candidate rather than silently rewriting English or Chinese to fit it.

QA may accept dice text, accept a justified corrected candidate, or reject/defer
the replacement and retain CHM. Preserve original supplied bytes and record
corrections separately. English verification must cover the relevant semantic
claim, not merely note that an English name exists. Existing summaries remain
unchanged; do not invent missing summaries from first sentences.

## Review Workload

Run deterministic structural checks across all candidates, then group
substantive differences by recurring pattern/publication for agent QA. Record
batch rules and affected IDs so results remain inspectable. Spot-check clean
categories and expand checking if a defect is found; sampling cannot excuse a
known unresolved semantic difference in an applied replacement.

Only genuinely unresolved identity, edition, or meaning conflicts go to the
user. Report their count and examples before proposing more manual work.
Defer isolated conflicts with explicit CHM fallback rather than recreating a
whole-corpus human acceptance queue. Main-gate reviews aggregate coverage and
material holes before declaring the chosen replacement set release-ready.

## Handoff Contract

For every candidate keep target ID/field, input revision and locator, current
Chinese baseline, relevant English evidence when needed, classification,
proposed/accepted/rejected status, reviewer or deterministic rule, and reason.
Deferral is an unapplied disposition and does not count as accepted content.

Use current decision/provenance mechanisms, or the smallest extension needed
to bind decisions to their actual input/target. Changed source text, mapping,
comparison baseline, or material English evidence requires re-evaluation of
affected decisions. Do not trust a status copied from an unrelated PHB queue.

The activation handoff contains accepted replacements plus the explicit
fallback/exclusion set. Counts reconcile by publication and target. Names,
stat-block text, and body may retain an existing field only with an explicit
field decision; no accidental mixed-source partial row should hide missing
content. Preserve all meaningful table data or leave the affected replacement
unapplied.

## Acceptance And Validation

- Every applied row has accepted structural and semantic disposition.
- Exact/formatting paths cannot swallow mechanics/omission/table changes.
- Substantive cases have aligned English evidence and a reasoned outcome.
- Ambiguous, stale, malformed, or unresolved cases cannot enter applied output.
- Coverage reports distinguish replacements from CHM/English fallback and
  unsupported records, with no unexplained gaps or corpus text in parent Git.
- Focused synthetic QA tests and data-tools checks cover both safe batches and
  counterexamples; local QA is read-only until a separate data handoff.

## Doc Updates And Follow-Ups

Update this plan and affected data/i18n/harness workflow docs as implementation
lands. UI locale JSON is not the storage for spell text. A reusable skill is
optional if a repeated workflow proves useful, not a release gate. Full
retranslation, independent PDF proofing, and non-text mechanics corrections are
deferred scope, not hidden prerequisites.
