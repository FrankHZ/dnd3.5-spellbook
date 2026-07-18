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
