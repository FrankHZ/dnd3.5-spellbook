# v1.2.2 Code And Test QA Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected durable docs, and
> `docs/roadmap.md` only when active ordering changes. v1.2.2 has no
> `integrated-plan.md`.

Status: **accepted as built**. Five read-only role audits completed at
parent-repository base `ff4f2ff7eb7158d2007178179c15919923769311`; main-gate
triage and all ten bounded fix batches are merged. See
[FREEZE.md](./FREEZE.md) for the canonical v1.2.2 snapshot.

## Purpose

- Run a structured cross-repository quality audit using the accepted canonical
  roles and context-packet workflow.
- Turn credible failure modes into bounded fixes and regression evidence.
- Close release-significant findings without creating an open-ended refactor or
  arbitrary coverage campaign.

## Ownership

- Owning version: v1.2.2.
- Owning domain: repository-wide code and test quality.
- Primary coordinator: main gate.
- Audit roles: `backend-db`, `data-pipeline`, `frontend-design`,
  `i18n-translation`, and `platform`.
- Documentation/freeze owner: `librarian` after implementation acceptance.
- Upstream dependency: accepted v1.2.2 Agent Workflow Hardening.
- Handoff owner: main gate.

## Agent Context

- Main gate outcome: gather parallel evidence without parallel edits, triage
  once, then dispatch only accepted, domain-owned fixes.
- Required reading: `AGENTS.md`, `.agents/roles/README.md`, this plan, each
  assigned canonical role, and the task-specific context packet.
- Expected audit surface: the whole repository divided by the role matrix
  below; audit agents are read-only.
- Expected fix surface: one focused domain/failure mode per branch after
  triage.
- Validation: failure-focused regression tests, smallest relevant local checks,
  then the release gate and critical-page smoke.
- Non-goals: test-count targets, blanket formatting, speculative findings,
  broad architecture rewrites, user features, or agents fixing findings before
  main-gate disposition.
- Handoff: structured findings or fix evidence, tests run, residual risk,
  unresolved questions, and no self-merge.

## Problem

The repository has useful unit and portable coverage, but it has grown across
contracts, three Prisma/SQLite boundaries, data generation, frontend URL and
state behavior, i18n, CI, and production packaging. A single unbounded review
would mix ownership domains and encourage opportunistic refactors. Parallel
implementation would also duplicate fixes before severity and root cause are
agreed.

This pass therefore separates read-only discovery, centralized triage, and
domain-owned remediation.

## Severity And Disposition

Use one shared severity rubric:

- **P0:** active data loss, remote compromise, or production-wide outage risk
- **P1:** credible correctness, security, deploy, or workflow failure with
  meaningful user/operator impact
- **P2:** maintainability or coverage gap likely to produce a future regression
  but not currently release-critical
- **P3:** low-risk cleanup, style consistency, or broad improvement candidate

Release disposition:

- P0/P1: must be fixed and regression-tested before v1.2.2 freeze.
- P2: must be fixed or explicitly deferred with owner, rationale, and parking
  location.
- P3 and broad refactors: move to Follow-Up Candidates or
  `docs/stable-backlog.md`; they do not expand this release.
- Speculative, duplicate, or unsupported observations are closed during
  triage, not preserved as backlog noise.

## Audit Matrix

Every audit receives a role plus a bounded context packet and remains
read-only.

| Role | Audit surface | Explicit boundary |
| ---- | ------------- | ----------------- |
| `backend-db` | API and contracts, controllers/services, error contracts, Prisma schemas/clients, rules-clean/content/app-state runtime boundaries, legacy read-source fallback | Do not redesign data generation/import tooling |
| `data-pipeline` | data-tools, source/patch/import flow, fixture and migration parity, script manifest, repeatability, artifact provenance | Do not change server API semantics or source data during audit |
| `frontend-design` | browser state, storage, API consumers, URL contracts, loading/error states, critical interactions, and focused tests | Do not start visual redesign or bulk copy changes |
| `i18n-translation` | locale organization, display adapters, fallback behavior, key audits, bilingual regression coverage | Do not start corpus translation/proofreading or redesign UI |
| `platform` | CI, runtime build/import checks, dependency boundaries, environment/config consistency, deployment and DB helper scripts | Do not change production configuration during audit |

The main gate owns cross-domain findings, duplicate removal, severity, fix
ownership, and defer decisions. Raw role handoffs were preserved temporarily
while triage and fixes were active; proposed severities were not final.
Librarian does not maintain a second disposition ledger.

## Finding Handoff

Each audit returns only actionable, evidence-backed findings in this shape:

- stable finding ID and proposed P0-P3 severity
- concise failure statement
- file/line or command evidence
- user, data, runtime, deploy, or maintenance impact
- existing missing/insufficient regression coverage
- recommended owning role and smallest safe fix surface
- confidence and unresolved question, if any

Do not return general praise, style preferences, test-count observations, or a
large refactor proposal without a demonstrated failure mode.

Finding details stayed in review/task handoffs, the temporary evidence pack,
and owning fix PRs. This plan's Completion Notes record only the final
disposition summary and accepted PRs. The temporary evidence pack was deleted
before freeze after the accepted deferred item moved to
`docs/stable-backlog.md`; no permanent parallel QA ledger was added.

## Plan

### Slice 1: Baseline And Context Packets

- Main gate records the audit base commit and confirms the worktree is clean.
- Run the current portable baseline before audit so pre-existing failures are
  separated from findings.
- Create one context packet for each audit role with its surface, non-goals,
  evidence standard, and handoff owner.
- No audit agent may recursively delegate unless its packet explicitly allows
  one bounded read-only subtask.

### Slice 2: Parallel Read-Only Audits

- Dispatch the five role audits in parallel.
- Agents may inspect code, tests, config, migrations, fixtures, and current
  docs, and may run non-mutating checks.
- Agents do not edit files, create fix branches, change local DBs, or modify
  remote configuration during this slice.
- Each role returns the Finding Handoff format above.
- After all five read-only audits finished, each role preserved its completed
  handoff in the temporary evidence pack; that documentation-only capture did
  not authorize fixes or further discovery.

### Slice 3: Main-Gate Triage

- De-duplicate findings and identify shared root causes.
- Reproduce credible P0/P1 findings or require equivalent direct evidence.
- Assign final severity and one owning role.
- Mark each item `fix`, `defer`, or `close`; only accepted fixes become branches.
- Define the expected regression evidence and edit surface before handoff.

### Slice 4: Bounded Fix PRs

- Open focused domain branches after triage, normally one coherent failure mode
  per PR.
- Reuse existing abstractions and tests; do not bundle unrelated cleanup.
- Add or adjust tests only where they prove the accepted failure mode.
- The implementing role returns diff summary, commands/results, residual risk,
  and unresolved questions to main gate.
- No implementing role accepts or merges its own PR.

### Slice 5: Release Acceptance

- Confirm every P0/P1 is fixed and every P2 has an explicit disposition.
- Move accepted non-blocking P3/refactor candidates out of the release gate.
- Run the full validation matrix from a clean merged state.
- Smoke critical pages locally in Chinese and English at desktop and mobile
  widths where the accepted fixes could affect behavior.
- Librarian performs the final docs/freeze consistency sweep.

## Validation Matrix

The final release gate includes:

```text
npm run agents:check
npm run ci:portable
npm run verify
npm run -w web build
npm run i18n:check
npm run build:server
npm run -w server check:runtime
```

`ci:portable` remains the remote merge gate; the explicit commands above make
the v1.2.2 acceptance evidence readable even where some work is already nested
inside that gate. Run local-data acceptance only when an accepted fix touches
local data, migrations, import behavior, or generated content.

Critical local smoke covers Browse, name/full Search, Spell Detail,
Publications, spellbooks/favorites, prepared spells, Settings, and About/Status.
Use focused smoke for unaffected surfaces rather than inventing an E2E suite in
this release.

## Acceptance Criteria

- Agent Workflow Hardening is accepted and merged before any QA audit starts.
- Five bounded role audits complete from the same base commit with structured,
  evidence-backed handoffs.
- Main gate de-duplicates and assigns final severity/ownership before fixes.
- No audit agent edits files or broadens its context packet.
- All P0/P1 findings are resolved with regression evidence.
- Every P2 is fixed or deferred with a concrete rationale and parking location.
- P3, test-count-only observations, and broad refactors do not expand release
  scope.
- Fix PRs are narrow, reuse existing patterns, and are reviewed by main gate.
- No role merges its own PR and recursive delegation remains opt-in.
- The validation matrix passes on the accepted merged state.
- Critical-page smoke passes for affected English/Chinese and desktop/mobile
  behavior.
- Durable docs change only where an accepted fix changes behavior, workflow,
  commands, ownership, or validation truth.
- Temporary raw audit files are removed or collapsed into Completion Notes
  before freeze.

## Doc Updates

- Update this plan with final disposition counts, accepted fix PRs, validation,
  and non-blocking follow-ups.
- Use temporary evidence only while triage and fix PRs are active; remove it
  before freeze after durable follow-ups are parked.
- Update owning topic/operations/module docs only when accepted fixes change
  durable truth.
- Update `docs/roadmap.md` only when release ordering or status changes.
- Do not add a permanent audit ledger, integrated plan, test-count dashboard,
  or copied role documentation.

## Open Questions

- None for audit handoff. Main gate resolves finding severity and ownership
  after evidence arrives.

## Follow-Up Candidates

No follow-up remains local to this frozen plan. `DP-AUD-007` was preserved in
`docs/stable-backlog.md` for the next reactivation of the dormant local CHM
preprocessing workflow.

## Historical Audit Evidence

The temporary findings pack was removed from the current tree at freeze so it
would not become a second active QA ledger. The detailed reports remain
available at immutable Git history:

- [pre-freeze findings index](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/README.md)
  records the final dispositions and dependency-ordered fix batches;
- [backend/DB](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/backend-db.md),
  [data pipeline](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/data-pipeline.md),
  [frontend design](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/frontend-design.md),
  [i18n/translation](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/i18n-translation.md),
  and [platform](https://github.com/FrankHZ/dnd3.5-spellbook/blob/9456fbe9cf1b31977ec175b112e045c7832285d1/docs/releases/v1.2.2/qa-findings/platform.md)
  preserve the five specialist handoffs;
- [PR #80](https://github.com/FrankHZ/dnd3.5-spellbook/pull/80) preserves the
  raw audit publication history, while
  [PR #81](https://github.com/FrankHZ/dnd3.5-spellbook/pull/81) preserves
  main-gate triage and disposition history.

Use these links for forensic detail. The Completion Notes below and
[FREEZE.md](./FREEZE.md) remain authoritative for the accepted release result.

## Completion Notes

Accepted history:

- PR #79 merged Agent Workflow Hardening. PR #80 preserved the five read-only
  audit handoffs, and PR #81 recorded final main-gate triage.
- Ten dependency-ordered fix batches merged in PRs #82, #83, #84, #85, #86,
  #87, #88, #89, #90, and #91.
- Final dispositions covered 27 findings: P0 `0`; P1 `11 fixed`; P2 `14 fixed`
  and `1 deferred`; `1 closed` as an unsupported hypothetical path. In total,
  25 findings were fixed, one was deferred, and one was closed. No P0 or P1
  remains open.
- The deferred item is `DP-AUD-007`, owned by `data-pipeline` and parked in
  `docs/stable-backlog.md`. The closed item was not retained as backlog noise.
- Merged-state acceptance passed `agents:check` (`7/7`), `ci:portable`,
  `verify`, deployment-script tests (`7/7`), server tests (19 files / 98
  tests), web tests (38 files / 158 tests), data-tool safety and harness tests,
  portable import, i18n checks, build/runtime gates, local-data acceptance, and
  English/Chinese desktop/mobile browser smoke.
- Independent i18n review in PR #91 found no remaining issue and required no
  `docs/i18n.md` change.
- The temporary evidence pack was removed during freeze; no permanent QA
  ledger remains.

Production deployment was not part of this internal maintenance freeze. The
full command results, local-data counts, and browser scenarios are recorded in
[FREEZE.md](./FREEZE.md).
