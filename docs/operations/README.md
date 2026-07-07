# Operations Docs

This directory is the operations landing point for deployment, remote host
setup, database activation, and public-repo operational cautions.

The canonical operational docs live at the paths linked below. This index keeps
their responsibilities clear.

## Deployment And Remote Host

- [./deployment.md](./deployment.md): v1.0 Cloudflare Workers frontend,
  backend API deploy workflow, manual DB activation, and remote verification.
- [bootstrap-remote.md](./bootstrap-remote.md): one-time remote host bootstrap.
- [../deployment-scripts/](../deployment-scripts/): tracked deployment helper
  scripts copied or synced to the remote host.

## Data And Import Operations

- [./data-setup.md](./data-setup.md): local database roles, runtime DB files,
  fixture boundaries, and content DB setup.
- [./import-workflow.md](./import-workflow.md): maintained app-owned import
  workflow.
- [./rules-db-notes.md](./rules-db-notes.md): practical rules DB inspection
  and patch notes.

## Publication And Repo Hygiene

- [./public-repo-notes.md](./public-repo-notes.md): public repo exclusions
  and publication cautions.
- [./repo-conventions.md](./repo-conventions.md): local wrapper, script, and
  source-of-truth conventions.
