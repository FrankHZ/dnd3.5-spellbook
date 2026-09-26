# Contracts Workspace

Shared TypeScript DTOs, types, and runtime-light exports consumed by `server`
and `web`. Keep application behavior in the consuming workspaces.

Install dependencies from the repository root. Source lives in `src/`; `dist/`
is generated. [package.json](./package.json) owns the commands:

| Task | Command |
| --- | --- |
| Build | `npm run build:contracts` |
| Check runtime package import after building | `npm run check:contracts` |
| Clean generated output | `npm run -w @dnd/contracts clean` |

After DTO changes, rebuild contracts before validating the affected server and
web consumers. The package is ESM; its current runtime-light exports must also
remain consumable by the CommonJS server. For runtime export/module changes,
build the server and run `npm run -w server check:runtime` as well.
Documentation-only changes do not require a build.

Endpoint semantics belong to the [server contracts](../docs/modules/server.md#contracts)
and the exported types, not a second field inventory here.
