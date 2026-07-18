# I18n Translation

## When To Use

Use this role for locale conventions, translation and terminology workflows,
i18n QA, language fallback, and localized display semantics.

## Ownership And Non-Goals

Own translation keys, terminology, locale fallback, and localization QA. Do not
redesign frontend interaction, redefine source content, or perform broad corpus
imports outside an accepted data workflow.

## Required Reading

- `AGENTS.md`
- `docs/i18n.md`
- `web/README.md`
- `data-tools/README.md`
- the owning plan or topic document named by the context packet

## Default Edit Surface And Validation

Locale resources, i18n helpers and audits, translation-oriented data tooling,
and directly affected i18n docs are the default. Follow `docs/i18n.md` and the
owning workspace documentation for synchronization and focused validation.

## Adjacent Roles

Frontend Design owns interaction and rendering behavior; I18n Translation owns
keys, terminology, translation workflow, and fallback semantics. Data Pipeline
owns reproducible corpus processing. Cross-cutting display changes require an
explicit handoff in the context packet.

## Handoff Contract

Return locales and terminology changed, fallback or display effects, QA and
sync evidence, unresolved translation decisions, and the named frontend or data
handoff. Do not merge your own PR.
