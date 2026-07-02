# v3.4 Acceptance Checklist

Status: active acceptance checklist for v3.4 closeout.

This checklist records the commands that should be run before freezing v3.4.
It separates portable repository verification from local-data acceptance so the
root harness stays clone-friendly.

## Portable Checks

Run these before handing off a normal code branch:

```bash
npm run verify
npm run -w data-tools test:portable
```

`test:portable` covers fixture-only data-tool helpers:

- source-label normalization and built-in book mapping
- English spell-name normalization and exact alias matching
- normalized short-description JSONL row validation
- structured spell patch JSONL/schema validation that does not require SQLite

## Local Data Acceptance

Run this when validating the v3.4 local short-description and rules DB state:

```bash
npm run -w data-tools acceptance:local
```

That bundle runs:

```bash
npm run -w data-tools typecheck
npm run -w data-tools rules:manifest:verify
npm run -w data-tools summaries:qa
npm run -w data-tools summaries:import -- --dry-run
```

The bundle depends on the local nested `data/` repo and the SQLite paths in
`server/.env`. It is an explicit local acceptance gate, not part of root
`npm run verify`.

## Optional Local Parser Acceptance

Run these after CHM parser or CHM source cleanup changes:

```bash
npm run -w data-tools zh:parse
npm run -w data-tools zh:qa
npm run -w data-tools zh:backcheck
npm run -w data-tools zh:summaries:extract
```

These commands depend on ignored local CHM inputs and write generated reports
under `data-tools/out/`.

## Freeze Evidence To Record

When creating `docs/mvp/v3.4/FREEZE.md`, record:

- final `npm run verify` result
- final `npm run -w data-tools test:portable` result
- final `npm run -w data-tools acceptance:local` result
- accepted summary row count from the import dry-run
- `rules:manifest:verify` pass state
- any known short-description coverage backlog that is not a freeze blocker
