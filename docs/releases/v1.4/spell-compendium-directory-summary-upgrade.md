# SC accepted directory summary upgrade

The maintained [final writer](../../operations/sc-final-source-binding.md#upgrade-an-already-accepted-annotated-summary-state)
upgrades the exact source-bound annotated 6,572-summary predecessor to the
accepted complete 6,837-summary inventory. Only 265 new summary rows and existing
summary acceptance metadata may change. Generic annotated summary replacement
remains unsupported. Final body/name/reader-note and normalized build authority
must validate before and after the immediate transaction.

The private reproduction entry is `dice-qa/books/86/issue-453/run.ps1`. Supply
absolute `-CodeRoot`, `-RuntimeRoot`, `-DataRoot`, exact `-PrivateRevision`, a new
`-Label` and `-Mode build`, `prepare`, `upgrade` or `consumers`. `prepare` creates
one issue-owned target from read-only disposable #339 originals and fixed
normalized artifact/manifest private `e2c4075c1e20f83ff5b84ac0833b166e2dfca613`;
it reconstructs the accepted old annotated state from authenticated final
name/body, reader notes and old summaries. It refuses existing output targets.
`upgrade` runs maintained source replay, check/apply/repeat/validate from root
and package, preserves occupied protected values in memory, rebuilds/checks FTS
and writes source-bearing proof only in the private owned directory. `consumers`
uses the real built API with native read-only rules/content allowlisting.

Main-gate's `dice-qa/books/86/issue-453/activate.ps1` accepts explicit absolute
code/runtime/data, rules/content DB, normalized artifact and manifest paths,
exact `-PublicRevision` and `-Mode Check` (default), `Apply` or `Validate`.
Use the already accepted full operator artifact and its matching manifest;
do not regenerate rules or replace normalized tables for this summary slice.
Check authenticates sources/current annotations read-only. Apply repeats that
check, transactionally upgrades, proves a zero-write repeat, validates the full
after state, rebuilds/checks derived FTS and reruns final source validation.
Summary failure rolls back rows and metadata. FTS failure leaves the accepted
summary transaction committed and can resume derived-index repair; never strip
annotations or run CHM as recovery. Run fresh-connection allowlisted real API
consumers after the completed search update.

Actual operator writes belong to main-gate after exact PR/CI/independent rehearsal
acceptance under the user's existing authorization. This task does not write
operator/stable/app-state DBs, modify rules content, deploy or accept #354's
pending relationships. #345 must refresh summary revision, gap/coverage/data
proof and exporter output from the same new state. Preserve its fixed
`873418b`/private `8e3f2ff` handoff; source/structure checks grant no HTML visual
acceptance and no workaround to the HTML boundary.
