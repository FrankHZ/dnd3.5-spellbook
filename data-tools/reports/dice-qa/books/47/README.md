# Savage Species DB-English QA

Issue [#155](https://github.com/FrankHZ/dnd3.5-spellbook/issues/155), v1.4,
rulebook 47, targets 3187–3245. [qa-report.json](./qa-report.json) records exact
private evidence, reproducible checks and boundaries. [coverage.json](./coverage.json)
is the source-free formal validator result.

All 59 targets and 59 owned occurrences received complete DB-English semantic
review. All 159 aligned segments have complete Chinese translations. The formal
proposal contains 58 names and bodies; target 3204 has a complete reviewed
translation stored privately but remains unactivated because its occurrence
does not reconcile safely. Its two existing English fallback fields remain.
Nine additional canonical parameter/body conflicts or ambiguities are documented
without changing canonical English or mechanics. These are explicit residuals,
not unperformed review concealed by zero pending counts.

Private evidence binds complete English inputs, Chinese clauses, corrections,
full-body audits and exact proposed HTML. Natural paragraphs and lists retain
embedded creature statistics and references. Formal `accepted` means validated
proposal pending main-gate acceptance. This is DB-English QA, not original-book
verification or operator write authorization. All QA precedes separately
authorized unified migration/consumption work; paused #529 is not a dependency.
