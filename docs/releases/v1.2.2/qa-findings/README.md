# v1.2.2 QA Working Evidence

Status: temporary working evidence. Not a durable findings ledger.

This directory preserves the five role-audit handoffs from the v1.2.2 Code
And Test QA pass so main-gate triage and later fix PRs do not depend on task
context. All audits use parent-repository base commit
`ff4f2ff7eb7158d2007178179c15919923769311`.

Role files preserve raw evidence and proposed severities:

- `backend-db.md`
- `data-pipeline.md`
- `frontend-design.md`
- `i18n-translation.md`
- `platform.md`

Proposed severities in role files are not final. The main gate owns duplicate
removal, final severity, disposition, fix ownership, and regression
expectations. Accepted fixes must cite their source finding IDs in their PRs.

Before the v1.2.2 freeze, collapse final counts, accepted PRs, validation, and
residual risk into `../code-and-test-qa-plan.md` Completion Notes. Then remove
this directory. Deferred work worth retaining moves to the owning plan's
Follow-Up Candidates or `docs/stable-backlog.md`; closed or unsupported
observations are not preserved as backlog noise.

## Main-Gate Disposition

Triage base: parent-repository commit
`fa12900139d4962762f8fca693b43197c792cf6d` after PR #80 merged the raw
evidence pack.

Final count:

- P1: 11, all `fix`
- P2: 15, with 14 `fix` and one explicit `defer`
- Closed: one unsupported hypothetical path
- Fix batches: 10 across three dependency-ordered waves

| Finding | Final | Disposition | Batch | Main-gate decision |
| ------- | ----- | ----------- | ----- | ------------------ |
| `BDB-001` | P1 | fix | `QA-B1` | Reproduced user-visible duplicate results and unstable totals. |
| `BDB-002` | P1 | fix | `QA-B1` | The supported rollback source must preserve all-level grouping. |
| `BDB-003` | P2 | fix | `QA-B2` | Shared request semantics and variant matching currently disagree. |
| `BDB-004` | P2 | fix | `QA-B2` | Stable runtime error codes belong in the shared contract. |
| `DP-AUD-001` | P1 | fix | `QA-D1` | A successful rebuild can erase accepted publication metadata. |
| `DP-AUD-002` | P1 | fix | `QA-D1` | A supported limited artifact can replace the complete content DB. |
| `DP-AUD-003` | P1 | fix | `QA-D2` | Maintained flags can delete an over-broad nested-data target. |
| `DP-AUD-004` | P2 | fix | `QA-D1` | Provenance is incorrect, but does not itself alter content rows. |
| `DP-AUD-005` | P1 | fix | `QA-D3` | A failed derived-index rebuild can leave committed partial writes. |
| `DP-AUD-006` | P2 | fix | `QA-D1` | Real migration/import constraints need one disposable acceptance path. |
| `DP-AUD-007` | P2 | defer | follow-up | Dormant CHM preprocessing is outside the active release path; park output reconciliation in the QA plan. |
| `FE-S2-001` | P1 | fix | `QA-W1` | Rendered pagination links lose active Browse/Search scope. |
| `FE-S2-002` | P2 | fix | `QA-W1` | Retained results can temporarily contradict the visible request. |
| `FE-S2-003` | P2 | fix | `QA-W1` | Initial Browse loading state is deterministically misclassified. |
| `FE-S2-004` | P1 | fix | `QA-W2` | Same-version malformed storage can make every route inaccessible. |
| `FE-S2-005` | P1 | fix | `QA-W2` | Prepared copy can report success with incomplete output. |
| `FE-S2-006` | P2 | fix | `QA-W1` | Publications should not fail with an unrelated bootstrap endpoint. |
| `I18N-QA-001` | P2 | fix | `QA-I2` | Critical Chinese error states bypass localized fallback copy. |
| `I18N-QA-002` | P2 | fix | `QA-I2` | Collection import recovery text is English-only in Chinese mode. |
| `I18N-QA-003` | P2 | fix | `QA-I1` | The maintained audit can accept an unusable plural variant. |
| `I18N-QA-004` | P2 | fix | `QA-I1` | Missing Chinese overlays can violate compact abbreviation fallback. |
| `I18N-QA-005` | P2 | fix | `QA-I2` | Shared accessibility labels remain English-only in Chinese mode. |
| `V122-PLAT-001` | P1 | fix | `QA-P1` | Live SQLite replacement lacks quiescing and automatic rollback. |
| `V122-PLAT-002` | P1 | fix | `QA-P1` | Validated and deployed Git commits can diverge. |
| `V122-PLAT-003` | closed | close | none | Current supported deployment installs dev dependencies; no production-only install contract or demonstrated failure exists. |
| `V122-PLAT-004` | P2 | fix | `QA-B2` | Missing required rules DB configuration should fail at startup. |
| `V122-PLAT-005` | P2 | fix | `QA-P1` | Failed Nginx validation leaves an invalid active candidate installed. |

## Fix Batches

Each branch owns only the listed findings. A specialist may narrow the
implementation further, but may not absorb another batch or change final
disposition without returning to the main gate.

| Wave | Batch | Primary role | Findings | Expected branch | Boundary or dependency |
| ---- | ----- | ------------ | -------- | --------------- | ---------------------- |
| 1 | `QA-B1` | `backend-db` | `BDB-001`, `BDB-002` | `codex/server-spell-result-sets` | Server result-set correctness only. |
| 1 | `QA-D1` | `data-pipeline` | `DP-AUD-001`, `DP-AUD-002`, `DP-AUD-004`, `DP-AUD-006` | `codex/data-rules-content-artifacts` | Generated artifact scope, provenance, and disposable import acceptance. |
| 1 | `QA-W1` | `frontend-design` | `FE-S2-001`, `FE-S2-002`, `FE-S2-003`, `FE-S2-006` | `codex/web-query-state-integrity` | URL and asynchronous query-state correctness; no styling work. |
| 1 | `QA-P1` | `platform` | `V122-PLAT-001`, `V122-PLAT-002`, `V122-PLAT-005` | `codex/infra-deploy-integrity` | Tracked deployment helpers/workflow only; no remote mutation. |
| 2 | `QA-B2` | `backend-db` | `BDB-003`, `BDB-004`, `V122-PLAT-004` | `codex/server-api-contract-config` | Contracts, localized resolve semantics, error DTO, and required DB config. |
| 2 | `QA-D2` | `data-pipeline` | `DP-AUD-003` | `codex/data-short-desc-write-safety` | Short-description source target safety only. |
| 2 | `QA-D3` | `data-pipeline` | `DP-AUD-005` | `codex/data-spell-apply-atomicity` | Run after `QA-D2`; structured spell apply transaction only. |
| 2 | `QA-W2` | `frontend-design` | `FE-S2-004`, `FE-S2-005` | `codex/web-persisted-copy-state` | Persisted preference validation and Prepared copy readiness. |
| 2 | `QA-I1` | `i18n-translation` | `I18N-QA-003`, `I18N-QA-004` | `codex/i18n-audit-display-guards` | Locale audit and rulebook display fallback only. |
| 3 | `QA-I2` | `frontend-design` | `I18N-QA-001`, `I18N-QA-002`, `I18N-QA-005` | `codex/web-i18n-errors-accessibility` | Run after `QA-B2`, `QA-W1`, and `QA-W2`; frontend owns pages/parsers/wrappers, with required `i18n-translation` review for locale and fallback semantics. |

Wave 1 batches are mutually independent and may run in parallel. Within later
waves, same-role batches run sequentially, and the dependencies above prevent
frontend/i18n work from duplicating contract, Pager, persisted-state, or locale
changes.
