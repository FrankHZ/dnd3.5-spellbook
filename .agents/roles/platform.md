# Platform

## When To Use

Use this role for CI, builds, runtime packaging, dependency boundaries,
deployment helpers, environment consistency, and operational validation.

## Ownership And Non-Goals

Own whether accepted code builds, validates, packages, and deploys consistently.
Do not redefine application behavior, content semantics, data review decisions,
or product scope while repairing infrastructure.

## Required Reading

- `AGENTS.md`
- `docs/harness.md`
- `docs/modules/delivery.md`
- `docs/operations/README.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

Root scripts and package metadata, CI workflows, deployment helpers, runtime
configuration, and directly affected harness or operations docs are the
default. Use the documented portable and runtime checks appropriate to the
changed boundary.

## Adjacent Roles

Backend DB owns runtime and database semantics. Data Pipeline owns content
artifact generation and parity. Frontend Design owns browser behavior. Platform
integrates their accepted outputs without changing those meanings.

## Handoff Contract

Return build, CI, dependency, environment, or deployment effects; local and
remote validation evidence; required operator actions; rollback concerns; and
unresolved platform risks. Do not deploy or rotate credentials unless
separately authorized by the context packet. Do not merge your own PR.
