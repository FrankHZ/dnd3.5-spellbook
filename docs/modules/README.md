# Module Design Docs

These docs describe the high-level module boundaries of the current app.

They are not feature specs and should not replace nearby workspace READMEs,
`docs/features.md`, or focused MVP plans. Use them when a change crosses module
boundaries or when a future module-doc agent needs to decide whether an accepted
merge changed a durable design boundary.

## Modules

- [server.md](./server.md): Express API, Prisma clients, runtime data access,
  and backend validation.
- [web.md](./web.md): React Router frontend, feature surfaces, local browser
  state, i18n display helpers, and frontend validation.
- [contracts.md](./contracts.md): shared DTO package used by server and web.
- [data-tools.md](./data-tools.md): parser, import, rules patch, short
  description, and portable/local data harness tooling.
- [delivery.md](./delivery.md): CI, deployment, local validation, and release
  wrapper boundaries.

## Ownership Rules

- Keep user-facing behavior in `docs/features.md`.
- Keep feature implementation plans in the active MVP topic docs.
- Keep workspace command details in the workspace READMEs.
- Keep operational deployment steps in `docs/operations/deployment.md`.
- Update these module docs only when a merge changes durable ownership,
  contracts, validation boundaries, or cross-module data flow.

## Automation Status

v3.5 establishes this module-doc target surface. A future non-blocking agent job
should review accepted `main` diffs and open docs-only updates when these files
need to change. Until that runner exists, update this directory manually during
planning or acceptance review.
