# <Version> Acceptance Checklist

Status: planned acceptance checklist.

This checklist records the evidence needed before freezing `<Version>`. Keep it
focused on acceptance gates and links to evidence. Do not turn it into an
implementation ledger.

## Scope Under Acceptance

- Version:
- Owning plan or roadmap entry:
- Branches or PRs included:
- Explicitly excluded follow-up work:

## Portable Checks

Run these from a clean checkout or current branch before handoff:

```bash
npm run ci:portable
```

Add narrower checks here when the version changes a specific surface:

```bash
# example
npm run test:web
npm run test:server
```

## Local Data Or Deployment Acceptance

Use this section only when the accepted work touches ignored local data,
runtime databases, remote deployment, or operator workflows.

```bash
# example
npm run -w data-tools acceptance:local
```

Record whether each local check is required, skipped, or not applicable.

## Manual Smoke

- Surface:
- Scenario:
- Evidence:

## Known Non-Blockers

- Item:
- Reason it does not block freeze:
- Follow-up owner or doc:

## Freeze Evidence To Record

The final `FREEZE.md` should include:

- final validation command results
- accepted deliverables
- known deferred work
- source-of-truth doc order for the frozen version
