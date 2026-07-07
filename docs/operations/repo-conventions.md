# Repo Conventions

This document records a few lightweight repository conventions that are easy to miss when reading code alone.

## Root `.bat` Convention

The root `.gitignore` currently ignores:

```text
*.bat
```

That means root-level batch files are treated as local, machine-specific helper scripts.

Current convention:

- tracked canonical operational scripts live in `docs/deployment-scripts/*.sh`
- ignored root-level `.bat` files are personal convenience wrappers only
- documentation should point to the tracked `.sh` scripts, not the ignored `.bat` files, as the source of truth

## Documentation Convention

The repository keeps docs intentionally lightweight:

- `README.md` files are navigation and short operational entry points
- root `AGENTS.md` is the agent-facing execution guide
- `docs/` contains canonical release, data, import, and operations docs
- `docs/features.md` records the stable user-facing feature map
- `docs/harness.md` records validation strategy and test-harness priorities
- when docs conflict, prefer the newer focused canonical doc instead of older incidental mentions

New docs should usually be topic-based and durable. Avoid adding new session-log
style MVP notes for ordinary follow-up work. Historical MVP docs under
`docs/mvp/` should be treated as release history, not the day-to-day working
surface for agents.

## Current Release Convention

For the current v1.0 pre-stable release line:

- deployment is manual
- content DB rebuilds normally start from scratch
- security hardening and rollback playbooks are intentionally deferred to the stable-version track
