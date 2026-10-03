# SC Offline HTML Export Verification

Current scope: [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345),
[draft PR #351](https://github.com/FrankHZ/dnd3.5-spellbook/pull/351).
The user's visual review rejected the previous single-spell-page organization.
The proposed layout is class directories with levels 0–9 and accepted bilingual
summaries, followed by 26 A–Z pages with complete bilingual entries. The old real
DB export and durable copy do not verify this changed layout. Historical fixed
proof references remain in Git and the owning issue/PR; this report describes
current evidence, not a milestone ledger.

## Current Portable Evidence

| Check | Result |
| --- | --- |
| Navigation | Classes first; 26 letters; empty letters and levels explicit |
| Class identity/levels | 0–9 sections, owner consistency and invalid-level rejection |
| Memberships | Duplicate class/spell/level rows grouped with distinct notes; raw rules retained; domains separate |
| Summary owners | English imarvin, effective Chinese chm, exact other Chinese variant; unrelated variants excluded |
| Summary failures | All missing/multiple/wrong-book/unaccepted/empty gaps rejected before output; typed source-free inventory |
| Full-size synthetic scope | 1,001 IDs exactly once; 2,002 complete bodies compared; book 9 ID 4837 excluded |
| Sorting/anchors | English name then ID; class links, same/cross-letter references, sections and prefixed body anchors checked |
| Structures/notes | Tables, cell spans, lists, emphasis, long bodies and separate source-question notes retained |
| Paragraph behavior | Semantic paragraphs spaced; folds inside paragraphs and exact pre/plain whitespace retained |
| Safety/privacy | Active/private content absent; detached references retain text; new-output/repeat/path failures covered |
| Root/package CWD | Shared runtime; root-relative paths and isolated repeated output checked |
| Scoped strict TypeScript | Exporter, CLI, portable tests and shared summary helper; strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| Data harness | 20 targeted cases passed, including search-summary owners and script classification |

These are synthetic checks, not actual-corpus, PDF format or browser evidence.
They use the provided compatible runtime without installs, links, operator DB
access or real DB copies. Public code contains only synthetic text. Full exact
head remote `ci:portable` remains the merge gate on PR #351.

## Outstanding Acceptance

[#431](https://github.com/FrankHZ/dnd3.5-spellbook/issues/431) owns PDF-backed
paragraph/emphasis mapping, representative 8–12 spell comparisons, full 1,001-ID
summary-gap inventory and a minimal accepted ingestion contract. DB tags, `pre`
newlines, regex splits and existing bold markup cannot replace source font/span
evidence. The exporter preserves current complete bodies and reports
`pdfFormatting: pending-431-source-mapping`; it does not apply unaccepted mappings
or invent summaries. Accepted #431 inputs must come through main-gate.

Main-gate must then authorize and verify fresh real-corpus generation against
the accepted migrated content DB, all directory summaries, merged anchors,
complete bilingual bodies, rules/tables/lists and reader notes, then a fresh
durable HTML copy and permitted visual review. Previous semantic checkers for
individual spell pages need adaptation before use on this layout. No actual
DB/output or frozen private proof was read or overwritten for this revision.

New-layout visual acceptance is pending. The earlier file-URL browser request
was rejected by tool security policy with an explicit prohibition on bypass.
No file retry, localhost server or alternative browser/render surface is used.
The prior visual rejection is a failed delivery criterion, not merely an
unperformed smoke test. Main-gate owns eventual permitted human review.

[#354](https://github.com/FrankHZ/dnd3.5-spellbook/issues/354) retains 20 external
relationship tuples for 17 targets without required original-book confirmation.
The directory preserves current class rows and a reader notice; internal
`reviewStatus` is not source QA evidence. This source check does not block the
normal directory, but whole-book completion stays false. No pending tuple is
newly injected by this change.

PR #351 stays draft. No source certification, issue acceptance, visual pass,
operator write or deployment is claimed. Usage and boundaries:
[offline HTML](../operations/offline-html.md),
[DB content workflow](../operations/db-content-workflow.md).
