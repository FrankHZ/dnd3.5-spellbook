# v3.8

Status: planning open.

v3.8 is a focused normalized query and filter-consumer release. The mainline is
to settle a backend normalized filter/query contract first, then let the
frontend consume that stable vocabulary. A separate CJS/ESM and alias cleanup
spike can run alongside it, but should not block the contract or frontend
deliverables unless it finds an active deploy/runtime risk.

## Committed Scope

1. Define the normalized filter/query contract for server APIs and shared DTOs.
2. Decide which normalized fields are public-query vocabulary, which have
   fallback semantics, and which remain review-only.
3. Update the frontend Browse/Search filter consumer only after the backend
   vocabulary and fallback behavior are stable.
4. Allow a small frontend filter UX and spell-card polish pass without turning
   v3.8 into another broad design refresh.
5. Run an independent module-boundary cleanup spike for server aliases,
   `tsc-alias`, and contracts runtime consumption.

## Track Order

1. Backend normalized query contract is the mainline.
2. Frontend filter and small UI/UX work is the consumer.
3. CJS/ESM plus alias cleanup is an independent infrastructure spike.

The frontend branch should not invent filter vocabulary or parse legacy source
strings. The infrastructure spike should not force a full ESM migration unless
it proves the current boundary keeps creating real deploy/runtime risk.

## Non-Goals

- Do not do large-scale content import or `data/spells-full` completion.
- Do not do bulk Chinese/English translation or proofreading QA.
- Do not do a full UI redesign.
- Do not force a full server ESM migration.
- Do not expose review-only dirty mechanics as public filters.
- Do not add new DB artifact delivery or content-release automation.

## Plans

- [normalized-query-contract-plan.md](./normalized-query-contract-plan.md)
- [frontend-filter-consumer-plan.md](./frontend-filter-consumer-plan.md)
- [module-boundary-cleanup-spike.md](./module-boundary-cleanup-spike.md)

## Working Rule

Use `normalized-query-contract-plan.md` as the v3.8 source of truth for public
query vocabulary and fallback semantics. Use
`frontend-filter-consumer-plan.md` for frontend Browse/Search consumption and
small polish. Use `module-boundary-cleanup-spike.md` for server alias and
runtime-boundary investigation.

Do not create or update `integrated-plan.md` unless v3.8 scope, delivery order,
or ownership boundaries change enough that the child plans conflict.
