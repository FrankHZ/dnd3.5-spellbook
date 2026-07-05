# v3.9

Status: active plan.

v3.9 is a focused normalized mechanics and query fullstack completion release.
The mainline is to finish the next accepted mechanics contract in data-tools,
shared DTOs, server API query/meta filters, and frontend Browse/Search
controls. This is not a reopen of v3.8 polish.

The latest frozen shipped snapshot remains `docs/mvp/v3.8/FREEZE.md`.

## Committed Scope

1. Decide and promote the next safe normalized mechanics vocabulary from the
   read-only rules-content review inventory.
2. Start with mechanics readiness and bucket semantics for `casting_time` and
   `range`, because the current report says they need normalization but are
   plausible public filters.
3. Close or explicitly classify the six `components.other_or_extra` review rows
   before broad mechanics expansion.
4. Carry accepted mechanics through data-tools normalization, contracts, server
   query/meta APIs, and Browse/Search frontend controls.
5. Keep Spell Detail display fallback limited to mechanics fields whose
   normalized display is explicitly supported by the promoted contract.

## Track Order

1. Backend normalized mechanics contract is the mainline.
2. Frontend normalized mechanics consumer follows only after the server exposes
   stable vocabulary and fallback behavior.
3. Librarian plan and freeze sweeps own cross-doc navigation and version
   records. Specialist implementation branches should update only their owning
   child plan and directly affected topic docs unless scope, sequencing, or
   release state changes.

Do not create `integrated-plan.md` unless the child plans start conflicting on
scope, delivery sequence, or ownership.

## Immediate Candidate Decisions

- First candidate spike: mechanics readiness and bucket contract. Begin with
  `casting_time` and `range`. Require explicit consumer semantics before
  promoting `duration`, `savingThrow`, or `spellResistance`; defer
  `target` / `effect` / `area` unless a later focused plan narrows them.
- Second candidate spike: `components.other_or_extra`. Normalize and close the
  six review rows if they are safe, or explicitly classify them before
  mechanics expansion.

## Non-Goals

- Do not add content artifact or versioned DB release automation.
- Do not add static/offline generation.
- Do not start large translation or proofreading QA.
- Do not broaden security, deploy, or dependency audit cleanup into v3.9 unless
  it becomes a direct blocker.
- Do not force a full server ESM migration.
- Do not expose high-volume dirty mechanics as public filters before accepted
  bucket and fallback semantics exist.

## Plans

- [normalized-mechanics-contract-plan.md](./normalized-mechanics-contract-plan.md)
- [frontend-normalized-mechanics-consumer-plan.md](./frontend-normalized-mechanics-consumer-plan.md)

## Acceptance And Validation

Expected validation for the full v3.9 line:

- data-tools review and acceptance for promoted normalized facets
- `npm run build:contracts` and `npm run check:contracts` when shared DTOs
  change
- server API tests for accepted query params, meta vocabulary, and fallback
  behavior
- web URL/API helper tests for promoted mechanics filters
- `npm run typecheck:web`
- `npm run -w web build`
- `npm run i18n:check` for new labels
- browser smoke for Browse/Search on desktop and mobile widths

## Working Rule

Use `normalized-mechanics-contract-plan.md` as the v3.9 source of truth for
public mechanics vocabulary, bucket semantics, fallback behavior, and
data-tools/backend acceptance gates. Use
`frontend-normalized-mechanics-consumer-plan.md` for Browse/Search controls,
URL/API helper behavior, scope summary, responsive sidebar density, and limited
Spell Detail display fallback.

Do not create or update `integrated-plan.md` unless v3.9 scope, delivery order,
or ownership boundaries change enough that the child plans conflict.
