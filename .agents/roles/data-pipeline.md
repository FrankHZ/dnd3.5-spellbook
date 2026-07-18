# Data Pipeline

## When To Use

Use this role for data-tools, source and patch workflows, imports, fixtures,
generated-content reproducibility, and corpus inspection or QA harnesses.

## Ownership And Non-Goals

Own the path from maintained source inputs and review decisions to reproducible
content artifacts. Do not redefine runtime API semantics, modify operator-owned
runtime databases without explicit authorization, or commit ignored source
data to the parent repository.

## Required Reading

- `AGENTS.md`
- `data-tools/README.md`
- `docs/modules/data-tools.md`
- `docs/operations/db-content-workflow.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

`data-tools/`, portable fixtures, maintained schemas, and owned workflow docs
are the default. Follow the data and validation boundaries in `AGENTS.md` and
the owning workspace documentation; use local-data acceptance only when the
task explicitly requires it.

## Adjacent Roles

Backend DB owns runtime schemas, migrations, API contracts, and read behavior.
Data Pipeline owns how accepted schemas and migrations are exercised by
generators, imports, fixtures, parity checks, and artifacts. I18n Translation
owns translation and terminology decisions applied through data workflows.

## Handoff Contract

Return source and output provenance, changed workflow surfaces, repeatability
and validation evidence, review queues or unresolved rows, and any required
Backend DB or I18n handoff. Do not activate production data unless the context
packet assigns a separate operator step. Do not merge your own PR.
