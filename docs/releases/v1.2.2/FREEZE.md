# v1.2.2 Freeze

## Status

**v1.2.2 FROZEN**

This document records the final canonical documentation state for the v1.2.2
internal quality-maintenance handoff. Root release metadata is `v1.2.2`.

Production deployment was explicitly outside this freeze. This snapshot makes
no claim that v1.2.2 was activated in production.

## Canonical Source Order

When v1.2.2 documents conflict, treat this freeze document as authoritative
over earlier v1.2.2 planning wording.

Use this precedence order for v1.2.2:

1. `docs/releases/v1.2.2/FREEZE.md`
2. current `AGENTS.md` and `docs/harness.md`
3. current focused operations and module docs changed by accepted fix PRs
4. `docs/releases/v1.2.2/agent-workflow-hardening-plan.md`
5. `docs/releases/v1.2.2/code-and-test-qa-plan.md`
6. `docs/releases/v1.2.2/README.md`

## Frozen Deliverables

1. Seven canonical repository roles, seven thin project-scoped Codex adapters,
   concrete context-packet and handoff rules, and maintained correspondence
   validation.
2. Five bounded read-only role audits with centralized severity, ownership,
   and disposition decisions before implementation.
3. Ten bounded fix batches across backend/DB, data tooling, frontend/i18n, and
   platform boundaries, with failure-focused regression evidence.
4. A merged-state internal maintenance acceptance record with no user-facing
   feature, production deployment, data activation, or permanent QA ledger.

## Final As-Built Summary

### 1. Agent Workflow Hardening

Shipped behavior:

- `.agents/roles/` is the canonical source for seven stable role contracts;
  `.codex/agents/` contains one thin adapter per canonical role.
- Every delegated task names a primary role and carries a concrete context
  packet. Recursive fan-out remains disabled unless a packet explicitly
  permits bounded child delegation.
- `agents:check` derives role identity from canonical filenames and verifies
  adapter basename, declared name, and role-pointer correspondence without
  pretending to validate the complete Codex schema.

Accepted evidence:

- PR #79 merged the workflow implementation and documentation.
- Final correspondence acceptance passed for all seven roles and seven
  adapters; `agents:check`, `ci:portable`, and `verify` passed.

### 2. Code And Test QA

Shipped behavior:

- Five specialist audits ran read-only from parent base
  `ff4f2ff7eb7158d2007178179c15919923769311`.
- PR #80 preserved the temporary audit evidence; PR #81 recorded centralized
  main-gate triage before fixes.
- PRs #82 through #91 merged all ten dependency-ordered fix batches covering
  deterministic server result sets and contracts, data artifact/import/write
  safety, frontend query and persisted-state integrity, localized error and
  accessibility behavior, and deployment transaction integrity.

Final disposition:

| Severity or result | Fixed | Deferred | Closed | Open |
| ------------------ | ----: | -------: | -----: | ---: |
| P0 | 0 | 0 | 0 | 0 |
| P1 | 11 | 0 | 0 | 0 |
| P2 | 14 | 1 | 0 | 0 |
| Unsupported | 0 | 0 | 1 | 0 |
| **Total** | **25** | **1** | **1** | **0** |

- `DP-AUD-007` is the sole deferred item and is parked in
  `docs/stable-backlog.md` for the next reactivation of dormant local CHM
  preprocessing.
- The unsupported hypothetical path was closed and not preserved as backlog
  noise.
- The temporary findings pack was removed; no permanent parallel ledger
  remains.

### 3. Regression And Runtime Acceptance

Accepted evidence:

- Deployment helper tests passed `7/7`.
- Server tests passed across 19 files and 98 tests; web tests passed across 38
  files and 158 tests.
- Data-tool acceptance passed 5 artifact tests, 4 short-description write-
  safety tests, and 18 harness checks.
- Disposable portable import applied 11 migrations and imported 30 spells.
- i18n validation passed across 16 namespaces; the independent i18n review in
  PR #91 found no issues and required no `docs/i18n.md` change.
- Contracts, Prisma generation, typechecks, frontend build, server build, and
  built-runtime import gates passed.

### 4. Local Data And Browser Acceptance

Local acceptance used content DB SHA-256
`0bd3016649c6175052fe50903de7030256dcb479a6d4d8716e03b90e28f2a3a1`.

| Check | Accepted result |
| ----- | --------------- |
| Rules patch manifest | 13 patches |
| Spell structured operations | 223 / 223 |
| Rulebook structured operations | 41 / 41 |
| Content generation | 5,097 spells / 3,560 issues |
| Rulebook review | 151 total; 127 visible; 81 keep; 46 review; 24 defer |
| Short-description safety | 0 blockers; 6,572 unchanged in dry-run |

Browser smoke passed in English and Chinese at desktop and mobile widths for
Browse, name Search, full-text Search, Spell Detail `2603`, Publications,
Favorites, Prepared, Settings, and About. No alerts or mobile horizontal
overflow appeared. Prepared copy remained disabled while empty; Chinese
pagination labels and Sheet close labels were confirmed.

## Validation Evidence

| Check | Result | Notes |
| ----- | ------ | ----- |
| `npm run agents:check` | Pass | 7 canonical roles / 7 adapters |
| `npm run ci:portable` | Pass | Portable release gate passed on merged state |
| `npm run verify` | Pass | Root verification gate passed on merged state |
| Deployment tests | Pass | 7 / 7 |
| Server tests | Pass | 19 files / 98 tests |
| Web tests | Pass | 38 files / 158 tests |
| Data tests | Pass | 5 artifact + 4 short-description safety + 18 harness |
| Portable import | Pass | 11 migrations / 30 spells |
| `npm run i18n:check` | Pass | 16 namespaces |
| Build and runtime gates | Pass | Contracts, Prisma, typechecks, web/server build, runtime import |
| Local acceptance | Pass | Hash, patches, operations, corpus, rulebook, and dry-run counts above |
| Browser smoke | Pass | EN/ZH, desktop/mobile, all listed critical surfaces |
| `node scripts/release-metadata.mjs --label` | Pass | `v1.2.2` |
| `npm run test:release-metadata` | Pass | Root package assertion and deploy-helper wiring |

## Known Deferred Work

- `DP-AUD-007` remains a non-blocking `data-pipeline` candidate in
  `docs/stable-backlog.md`; require staged-tree replacement or a generated-file
  manifest plus deletion/rename regression before reactivating the dormant CHM
  workflow.
- v1.3 sitewide UX/style planning is next. No v1.3 plan is created by this
  freeze.
- Full spell-body, spell-name, and short-description translation/proofreading
  QA remains later scope.
- Production deployment and activation remain separate operator-owned work and
  were not part of v1.2.2 acceptance.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Use this snapshot for v1.2.2 as-built maintenance behavior and counts; use
  v1.2.1 production evidence for the latest frozen deployed release state.
- Do not add active scope or a replacement findings ledger to this frozen
  folder.
- Do not treat older v1.2.2 plan wording as newer than this snapshot.
