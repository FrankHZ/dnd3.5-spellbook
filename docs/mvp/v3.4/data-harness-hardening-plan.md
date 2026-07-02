# Data Harness Hardening Plan

Status: implemented portable v3.4 slice; remaining parser/temp-DB fixture work
is optional follow-up.

This plan covers small, repeatable checks around `data-tools` and local-data
acceptance. It should make data work safer without pulling local CHM sources or
SQLite databases into always-on root verification.

## User Outcome

Agents can change parser, source-label, and rules-patch tooling without
silently breaking the data pipeline or creating parallel sources of truth.

The target is autonomy stability: a future feature can ask for a data change and
get a reviewable deliverable with tests close to the behavior that changed.

## Current Baseline

Root validation currently runs:

```bash
npm run verify
```

That covers:

- shared contract build and runtime import smoke
- `data-tools` TypeScript checks
- server API tests
- web tests
- web typecheck

`data-tools` also has useful local commands:

- `test:portable`
- `acceptance:local`
- `zh:parse`
- `zh:qa`
- `zh:backcheck`
- `zh:parse:test`
- `rules:spells:validate`
- `rules:spells:apply -- --dry-run`
- `spells-full:inspect`
- `rules:sql:dry-run`
- `rules:index:rebuild -- --dry-run`

The remaining gap is deeper fixture coverage for parser integration and
temp-database write paths. The first portable pure-helper slice is covered by
`test:portable`, while local short-description/rules acceptance is bundled by
`acceptance:local`.

## Boundaries

- Keep portable fixture tests separate from local-data acceptance commands.
- Distinguish maintained data-tool commands from one-time or ad hoc migration
  scripts. Harness maintained commands and shared pure helpers; do not spend
  coverage on one-time scripts unless they are promoted into the maintained
  workflow.
- Do not require `data/chm-clean/`, `data/spells-full/`, or
  `server/data/db/` for root `npm run verify`.
- Do not commit generated parser reports or local source data to the parent
  repo.
- Do not mutate configured SQLite databases during tests.
- Use temp databases for write-path fixture tests.
- Keep test fixtures small and redacted.

## Goals

- Add a dedicated portable `data-tools` test command.
- Cover pure parser and mapping helpers before broad CLI integration tests.
- Make source-label normalization consistent and tested.
- Add rerunnable checks for local CHM parser acceptance reports.
- Add fixture-backed checks for structured spell patch validation and dry-run
  behavior.
- Keep local source-data checks explicit and documented.
- Record which command lifecycles deserve harness investment so one-time data
  cleanup scripts do not become permanent testing obligations.

## Non-Goals

- Do not create a large end-to-end data rebuild harness first.
- Do not make root `verify` depend on local ignored data.
- Do not solve CI fixture database design in this pass.
- Do not test exact full spell descriptions or copyrighted source text.
- Do not replace existing data-tools commands unless the replacement preserves
  command compatibility.
- Do not add tests for one-time data cleanup or investigation scripts solely to
  improve coverage.

## Work Phases

### 1. Add Portable Data-Tools Tests

Add a `data-tools` test runner and keep it fixture-only.

Suggested command shape:

```bash
npm run -w data-tools test -- --run
```

Implemented command:

```bash
npm run -w data-tools test:portable
```

Good first tests:

- `normalizeBookLabel`
- `mapBookLabelToAbbr`
- `parseSpellHeader`
- English name normalization for curly quotes and punctuation
- paragraph/header rejection for long non-header text
- `.files` companion directory skipping if the traversal helper is exported

Keep fixtures tiny. Prefer inline strings for parser helper tests.

### 2. Normalize Source Labels Consistently

`normalizeBookLabel` exists, but not every call path clearly goes through the
same mapping helper.

Make one canonical path for source-label handling, then test awkward labels:

- whitespace around labels
- full-width punctuation
- quote wrappers
- built-in labels such as `九剑`
- built-in labels such as `模型手册`
- mapped labels from `data/chm-mapping/`

The goal is not just passing tests; it is avoiding future ad hoc source-label
fixes in each parser script.

### 3. Add Local CHM Acceptance Checks

Keep local-data checks explicit because they depend on ignored source material.

Suggested command shape:

```bash
npm run -w data-tools zh:accept
```

Implemented local v3.4 closeout bundle:

```bash
npm run -w data-tools acceptance:local
```

It runs `typecheck`, `rules:manifest:verify`, `summaries:qa`, and
`summaries:import -- --dry-run`. It intentionally does not run CHM parser
commands because those depend on ignored raw/clean CHM inputs and are only
needed after parser/source changes.

Possible behavior:

1. run or require fresh `zh:parse`
2. run `zh:backcheck`
3. run `zh:qa`
4. assert hard parser counters and QA error/warning counters are zero
5. tolerate informational review markers

The command may write reports under `data-tools/out/zh-parser/`, but it should
not modify app or rules databases.

### 4. Add Structured Patch Fixture Tests

Structured patch validation is useful before a patch is applied, but rerunning
an already-applied insert patch against the live rules DB should fail with
duplicates. That is expected and should not be treated as a regression.

Add fixture tests around a tiny temp SQLite database or extracted pure
validation functions.

Good first cases:

- duplicate spell id
- duplicate `name + rulebook`
- missing rulebook lookup
- missing class/domain/descriptor lookup
- slug warning behavior
- dry-run does not mutate the configured source DB

Do not use content-bearing local patch files as test fixtures in the parent
repo.

### 5. Add Spells-Full Report Checks Later

`spells-full` currently depends on local ignored source data. Keep it as an
acceptance workflow until a tiny redacted fixture is useful.

When hardened, choose one path:

- fixture-backed generator tests that do not read `data/spells-full/`
- or a local acceptance checker that asserts the current declared miss state

Do not rewrite structured patches as part of a check command unless the command
name clearly says it writes patch candidates.

## Verification Policy

Portable checks can enter root `npm run verify`.

Local acceptance commands should remain explicit:

```bash
npm run -w data-tools test:portable
npm run -w data-tools acceptance:local
npm run -w data-tools zh:parse
npm run -w data-tools zh:qa
npm run -w data-tools zh:backcheck
npm run -w data-tools rules:spells:validate -- <patch.jsonl>
npm run -w data-tools rules:spells:apply -- --dry-run <patch.jsonl>
npm run -w data-tools spells-full:inspect -- known-misses
```

If `zh:accept` is added, it should be documented as local acceptance, not as a
portable CI gate.

## Acceptance Criteria

- `data-tools` has a portable test command that passes without local ignored
  source data.
- Root `npm run verify` includes only portable `data-tools` checks.
- Source-label normalization has direct tests and one canonical mapping path.
- CHM parser local acceptance can assert zero hard parser misses, zero QA
  errors, and zero QA warnings while allowing info markers.
- Structured spell patch validation has rerunnable fixture coverage or extracted
  pure-function coverage.
- Dry-run write paths use temp databases and do not mutate configured SQLite
  files.
- `spells-full` hardening is explicit about fixture-backed tests versus
  local-data acceptance.
- `docs/harness.md` and `data-tools/README.md` reflect any new durable commands.

## Open Questions

- Should `data-tools` use Vitest like `server` and `web`, or a smaller Node test
  runner?
- Should `zh:accept` run `zh:parse` itself, or only validate existing parser
  output for faster iteration?
- Should structured patch tests extract validation logic into smaller modules
  before adding temp-DB tests?
- Should `spells-full` get a redacted fixture now, or wait until the next
  missing-spell import pass?
