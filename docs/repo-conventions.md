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
- `docs/` contains canonical release, data, import, and operations docs
- when docs conflict, prefer the newer focused canonical doc instead of older incidental mentions

## MVP Convention

For the current MVP line:

- deployment is manual
- app DB rebuilds normally start from scratch
- security hardening and rollback playbooks are intentionally deferred to the stable-version track
