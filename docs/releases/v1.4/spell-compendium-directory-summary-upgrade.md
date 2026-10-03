# SC accepted directory summary upgrade

The maintained [final writer](../../operations/sc-final-source-binding.md#upgrade-an-already-accepted-annotated-summary-state)
upgrades the exact source-bound annotated 6,572-summary predecessor to the
accepted complete 6,837-summary inventory. Only 265 new summary rows and existing
summary acceptance metadata may change. Generic annotated summary replacement
remains unsupported. Final body/name/reader-note and normalized build authority
must validate before and after the immediate transaction.

The [source-free proof](../../../data-tools/reports/dice-qa/books/86/directory-summary-upgrade.json)
records source-code revision `eda997973b28e4772db6c3091a8f78117274ec5c` and
fixed private evidence. The real reconstructed predecessor produced exactly
265 inserts, zero updates/deletes and a zero-write repeat. All old summary
rows/timestamps, final text/note/provenance rows, normalized values and other
protected tables stayed exact; only the four existing summary acceptance
revision/candidate/count fields changed. Root/package source validation passed.
FTS rebuilt to 13,061 complete documents and repeated without writes.

Each real root/package consumer replay made 6,201 API requests, checked all
6,837 summaries, 961 class targets/1,922 bilingual owner fields, 1,001 final
bilingual body targets/2,002 field envelopes, 40 source-question occurrences
and all 4,096 non-SC fallbacks. Native rules/content connections were forced
read-only; app-state was never opened. Source composition negatives, unknown
annotations, marker/row mixtures, protected-row drift, transaction faults and
accepted-input drift remain covered by portable tests.

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
exact `-PublicRevision`, exact `-PrivateRevision` and `-Mode Check` (default),
`Apply` or `Validate`.
Use the already accepted full operator artifact and its matching manifest;
do not regenerate rules or replace normalized tables for this summary slice.
Check authenticates sources/current annotations read-only. Apply repeats that
check, transactionally upgrades, proves a zero-write repeat, validates the full
after state, rebuilds/checks derived FTS and reruns final source validation plus
allowlisted real API consumers.
Summary failure rolls back rows and metadata. FTS failure leaves the accepted
summary transaction committed and can resume derived-index repair; never strip
annotations or run CHM as recovery. Run fresh-connection allowlisted real API
consumers after the completed search update.

For main-gate's existing operator build, the accepted input pair is private
`307e8b1299e14c456957165b12c46d2c4afe3472`:
`dice-qa/books/86/issue-414/operator-main-gate-8ca3c48.normalized.generated.json`
and `operator-main-gate-8ca3c48.rules-db-manifest.json`. Confirm the pair's exact
Git content and current DB fingerprints read-only before apply. The handoff
does not open or replace rules/app-state for writes. Use the accepted PR's exact
checkout HEAD after merge as `-PublicRevision`, and the fixed private helper
revision named in the proof/PR as `-PrivateRevision`.

Actual operator writes belong to main-gate after exact PR/CI/independent rehearsal
acceptance under the user's existing authorization. This task does not write
operator/stable/app-state DBs, modify rules content, deploy or accept #354's
pending relationships. #345 must refresh summary revision, gap/coverage/data
proof and exporter output from the same new state. Preserve its fixed
`873418b`/private `8e3f2ff` handoff; source/structure checks grant no HTML visual
acceptance and no workaround to the HTML boundary.
