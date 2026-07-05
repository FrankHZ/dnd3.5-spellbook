# Contracts Workspace

This workspace contains the shared TypeScript contracts used by both the frontend and backend.

It is the common source for DTOs and exported types that define the application boundary between `server` and `web`.

## Key Directories

- `src/`: source DTOs, shared types, and exports
- `dist/`: generated build output

## Main Commands

Build the contracts package:

```bash
npm run -w @dnd/contracts build
```

Clean generated output:

```bash
npm run -w @dnd/contracts clean
```

## Notes

- If shared DTOs change, rebuild this workspace before validating dependent work in `server` or `web`.
- Keep this package focused on shared contracts, not runtime app logic.
- The package is ESM. The CommonJS server can consume current runtime-light
  exports as long as `npm run check:contracts` and
  `npm run -w server check:runtime` pass after a build.

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
