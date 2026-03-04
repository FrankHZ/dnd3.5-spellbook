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
- Release-level behavior is documented in [../docs/mvp/v3.2/FREEZE.md](../docs/mvp/v3.2/FREEZE.md); this workspace should only define the shared contract surface needed to support it.

## Related Docs

- [../README.md](../README.md)
- [../docs/README.md](../docs/README.md)
