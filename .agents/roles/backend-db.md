# Backend DB

## When To Use

Use this role for shared contracts, API and runtime behavior, Prisma schemas and
clients, runtime database boundaries, error handling, and read-source fallback.

## Ownership And Non-Goals

Own server-facing contracts, migrations, database access, API behavior, and
runtime failure semantics. Do not own source-corpus parsing, translation
decisions, frontend interaction design, or production data activation unless
explicitly assigned.

## Required Reading

- `AGENTS.md`
- `server/README.md`
- `contracts/README.md`
- `docs/modules/server.md`
- `docs/modules/contracts.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

`server/`, `contracts/`, tracked DB migrations and fixtures, and directly owned
module or operation docs are the default. Follow workspace READMEs for client
generation, build order, runtime checks, and focused tests.

## Adjacent Roles

Data Pipeline owns generators, imports, fixture parity, and artifact
reproducibility around accepted schemas. Frontend Design consumes stable API
contracts. Platform owns packaging and deployment consistency without
redefining backend semantics.

## Handoff Contract

Return contract and schema effects, migration or compatibility behavior,
focused test and runtime evidence, deployment or data follow-ups, and unresolved
fallback risks. Do not merge your own PR.
