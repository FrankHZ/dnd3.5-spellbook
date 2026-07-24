# v1.4 PHB Translation And QA Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: planned; blocked on integrated Gate 2 English source acceptance.

## Purpose

Translate and proofread the accepted effective PHB 3.5 English corpus rather
than the current DB by assumption. Produce accepted Chinese spell names,
bodies, and short descriptions with source-page/hash provenance and a reusable,
source-safe QA workflow.

## Ownership

- Owning version: v1.4.
- Owning domain: `i18n-translation`.
- Primary implementation branch: a focused `codex/i18n-phb-translation` branch
  created only after Gate 2 acceptance.
- Upstream plan: [phb-source-and-errata-plan.md](./phb-source-and-errata-plan.md).
- Downstream plan: [phb-content-activation-plan.md](./phb-content-activation-plan.md).
- Related docs: `docs/i18n.md`, `data-tools/README.md`, and `docs/harness.md`.

## Agent Context

- Main gate outcome: accepted Chinese PHB rows with complete translation and
  proofreading decisions, not a raw machine-translation dump.
- Required reading: `AGENTS.md`, `.agents/roles/i18n-translation.md`, this plan,
  [integrated-plan.md](./integrated-plan.md), accepted English QA report, and
  `docs/i18n.md`.
- Expected edit surface: translation-oriented data-tool schemas/QA, a reusable
  repo-local skill, redacted fixtures/tests, this plan, and i18n/harness docs.
  Real translations and queues remain in the data repo.
- Validation: source hash alignment, row-state completeness, terminology and
  structural QA, rerun stability, redaction checks, and local-data acceptance.
- Non-goals: no source redefinition, non-PHB translation, UI redesign, or DB
  activation.
- Handoff owner: `main-gate`, then `backend-db` after Gate 3 acceptance.

## Translation Boundary

- Eligible input is only the Gate 2 accepted, field-resolved effective English
  row. Translation does not reopen PHB/SRD/DB authority decisions.
- Chinese scope is spell name, description body, and reconciled spell-level
  short description. English stat-block fields are extracted and compared for
  source QA, but broad localized mechanics-field redesign is not added to v1.4.
- Every translation row retains spell identity, PHB page, effective English
  hash, PHB/errata/SRD manifest hashes, field-source provenance, translator,
  reviewer, QA status, and final Chinese hash.
- Translation generation and proofreading are separate states. A generated row
  cannot self-promote to accepted.
- Large corpus reading/review must use bounded context packets and summarized
  handoffs; do not load the complete source corpus into the main/librarian
  context.

## Plan

### Slice 1: Schema, Terminology, And Queue Contract

- Define translation, proofreading, decision, and accepted-row schemas.
- Reuse current Chinese game terminology and mechanics localization where it
  is authoritative; record PHB-specific terminology decisions in the data repo.
- Define `pending` and `manual-review` as non-terminal corpus-row states.
  `rejected` ends one translation/review attempt but does not complete the
  corpus row. An eligible row is release-complete only when `accepted`;
  `not-applicable` requires an explicit main-gate reason for a genuinely absent
  optional source such as a non-existent summary occurrence. Unresolved review
  is never importable.
- Generate deterministic batches from accepted English hashes so source drift
  invalidates stale translations.

### Slice 2: Bounded Workflow Rehearsal

- Rehearse translation, independent proofreading, correction, and QA on a
  bounded batch drawn from the already accepted English corpus.
- Include long bodies, numbers/dice, references, punctuation, HTML/paragraph
  structure, and short descriptions.
- Confirm reviewer handoff and rerun behavior before broad translation.

This is a translation workflow rehearsal, not permission to bypass the full
English acceptance gate.

### Slice 3: Full PHB Translation And Proofreading

- Translate accepted names, bodies, and summaries in deterministic batches.
- Require a separate proofreading decision for every final row.
- Run omission/addition checks, number/dice/unit parity, placeholder and
  untranslated-fragment checks, terminology consistency, paragraph/HTML
  structure checks, duplicate-name review, and source-hash alignment.
- Return rejected or uncertain rows to manual review; do not silently fall back
  to generated text inside the accepted artifact.

### Slice 4: Reusable Skill And Accepted Handoff

- Add a repo-local `corpus-translation-qa` skill after the workflow is proven.
  Keep it generic and stable: point to existing role/plan/operations entry
  points, define batching and handoff rules, and avoid embedding PHB text or a
  second copy of release-specific commands.
- Produce accepted Chinese body/name and short-description handoff rows in the
  data repo plus a source-free aggregate report.
- Prove rejected, unresolved, stale-source, or unproofread rows cannot enter the
  accepted handoff.

## Target Command Surface

Implementation should provide maintained commands equivalent to:

```bash
npm run -w data-tools phb:translation:queue
npm run -w data-tools phb:translation:qa
npm run -w data-tools phb:translation:coverage
npm run -w data-tools phb:translation:accepted
```

## Acceptance Criteria

- Gate 2 English acceptance predates and hashes every translation input.
- Every eligible PHB name/body/available-summary row is accepted after
  proofreading; rejected attempts and manual-review rows do not satisfy release
  coverage, and acceptance has zero unexplained missing rows.
- Every accepted row passes structural, numeric, terminology, source-alignment,
  and independent-review gates.
- Changing accepted English or errata hashes invalidates affected translation
  acceptance.
- Only accepted rows appear in the activation handoff.
- The reusable skill, commands, schemas, redacted fixtures, and aggregate
  report contain no PHB or translated corpus text.
- i18n checks, focused data-tool tests, typecheck, portable tests, and
  local-data acceptance pass.

## Doc Updates

- Update `docs/i18n.md` with the durable corpus translation/review workflow.
- Update `data-tools/README.md` and `docs/harness.md` for maintained commands
  and acceptance gates.
- Update `docs/operations/public-repo-notes.md` only if local data boundaries
  change.
- Update `docs/roadmap.md` only if release ordering changes.

## Open Questions

No scope question blocks assignment. Main gate must attach the accepted Gate 2
artifact identities and batching limits to the specialist context packet.

## Follow-Up Candidates

- Additional rulebook translation may reuse the proven skill in a later
  release after v1.4 freeze; it is not an automatic continuation.

## Completion Notes

Record accepted counts, unresolved count, skill path, validation, and merged PR
links after implementation review. Do not include translation samples here.
