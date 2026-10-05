# Cityscape DB-English Handoff Preflight Evidence

Issue [#527](https://github.com/FrankHZ/dnd3.5-spellbook/issues/527) checks the
main-gate accepted #160 / PR #526 input, without applying an overlay. The fixed
private acceptance is `b8d0dc3f85015533c3e57a293f7a96d5de2d7cb7`, prepared input
`6d28f9391273979a35a6bcc86971f0aac5b9f2c8`, source/map
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`, and reviewed public head
`4468c94376828f93f4b9664d6fddaf21ab52f787`. Detailed evidence stays in the private
`dice-handoffs/issue-527/` directory.

## Read-only Result

The maintained entry authenticated complete committed inputs and reran formal
QA over 105 source files / 5,606 candidate occurrences. Cityscape has eight
accepted names and bodies, covering 64 segments / 67 English physical lines:
seven fully Chinese bodies and target 361's mixed body, with one literal English
clause and its unresolved record retained. #160 continues to own that conflict;
this is DB-English acceptance, without original-book verification or a mechanics
ruling.

The current DBs have no Chinese target rows, so the proposal contains eight
effective-overlay insertions. It includes exact after values, absent before
rows, locked English/mechanics, CHM baseline snapshots and accepted evidence
locators. SC and non-target records stay outside the target set. The operator
connections were read-only/query-only; main DB file metadata stayed unchanged.
The content DB contains 1,992 SC text rows and 4,236 non-target text rows.

Root, package and existing other-worktree invocations produced byte-identical
proposals. Each final invocation took about 3.2 seconds, peaked at 368–380 MiB
RSS and emitted about 49 KB, within the one-minute / 512 MiB / 5 MiB budget.
No DB copy, operator write, app-state access, PDF task or private push occurred.

## Validation

`dice:handoff:test`, `dice:qa:test`, `rules:content:step:test`,
`content:sequence:test` and data-tools typecheck passed. Synthetic regression
uses genuine all-source QA, temporary Git evidence and small SQLite databases.
It rejects missing/duplicate/cross-book inputs, altered derived text, stale
source/English/mechanics/Chinese baseline, missing residuals, arbitrary revisions,
write flags, wrong roles, writable handles, aliases and output collisions.
Complete synthetic DB bytes, including SC provenance, summaries, build metadata
and relationships, remain unchanged. The existing annotated-predecessor and SC
acceptance code is unchanged. Remote `ci:portable` remains the PR merge gate.

## Concrete Next Boundary

`content:sequence.ts` owns normalized → summaries → search;
`rules-content/import-step.ts` rejects replacing an annotated predecessor.
Neither provides a selective Chinese overlay stage. The next writer needs
transactional revalidation of this accepted input and current before/after rows,
exact repeat/recovery, retained normalized build metadata, protected SC and
non-target fields, and FTS coordination through the existing search builder.

`spells.provenance.ts:205` onward can already validate generic/native field
locators, but its returned generic shape carries no DB-English review basis or
mixed-body residual. The SC final branch requires its own fixed revision. The
current mapper calls this validator for effective names/bodies. A narrow consumer
extension must represent DB-English review and the retained clause accurately,
then prove default/explicit variants and search behavior. The preflight emits no
persisted provenance envelope and reports activation/importability as false.
