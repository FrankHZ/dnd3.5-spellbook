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
| Note/list consumer contract | Real synthetic export/sanitizer/output chain preserves independent note blocks, exact ul class, mixed/nested boundaries, table roles/spans, numbering, anchors and complete text; arbitrary class/style/event/data attributes filtered |
| Explicit typography selection | Actual helper→sanitizer→merged output; all four stale fields reject before output; unselected pages retain current HTML; shared readonly transaction view and caller JSON/path rejection checked |
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
format/page/span evidence inventory and a minimal accepted formatting contract.
DB tags, `pre` newlines, regex splits and existing bold markup cannot replace
source font/span evidence. Main-gate accepted the helper and explicitly selected
seven representatives: `3531, 3855, 4726, 4546, 4784, 3866, 3857`. Their fixed
private presentations are integrated only through the maintained authenticated
entry. The other 994 displays remain current, including four proposals not
selected in this run and 990 targets outside that reviewed set. No automatic
eleven-row selection, invented summary or full-book format acceptance occurs.

The source-supported #434 correction removes only the duplicate 3958 English
table title from its canonical text/HTML. The English-title refresh consumes
that accepted pair through the source-authenticated new normalized input and
explicit accepted-title/summary handoff; it does not add 3958 to the seven PDF
previews. Its disposable full-scope Git replay checks the precise old/new
artifact transition, unchanged Chinese/provenance/notes and complete summaries,
then all 1,001 entries / 2,002 bodies and local links. Restoring the old title in
output fails the independent checker. Actual activation and refreshed output
require main-gate's corresponding completed-state proof; prior actual export
evidence applies only to its previous input state.

Private fixed-Git real-text validation compared these seven complete four-field
packet guards and the 14 Chinese name/body fields with accepted inputs, then
passed all 14 derived bilingual body/structure checks through SQLite memory,
the actual helper, sanitizer and merged output. These seven samples contain no
project-note block; note preservation is also exercised by the full synthetic
corpus. This memory shell opens no real DB and does not run or replace the
operator source-authentication workflow.

The maintained summary refresh now consumes the accepted complete 6,837-row
composition, retaining the strict owner selector. Private fixed-Git replay
reconstructs disposable memory from accepted normalized records, final fields,
reader-note amendments and authenticated summaries, then compares all 1,001
entries / 2,002 bilingual bodies, 961 class targets / 1,922 directory owner
fields, 40 body-only targets, 40 source-question occurrences and all emitted local
links. Seven selected display derivatives and 994 current displays stay distinct.
This replay copies no database and does not replace original-source authentication
or the actual operator export. The complete synthetic fixture additionally
rejects missing/wrong/empty/unaccepted owners, summary source/value drift and
class-scope drift. Old fixed helpers and proofs are unchanged.

Main-gate must then authorize and verify fresh real-corpus generation against
the accepted migrated content DB, all directory summaries, merged anchors,
complete bilingual bodies, rules/tables/lists and reader notes, then a fresh
durable HTML copy and permitted visual review. New owned private class/A–Z
checkers reuse the frozen complete canonical/provenance verifier and compare
all directory summaries, current/selected bodies, notes and structures
independently. Existing frozen checkers and proofs remain unchanged. No actual
DB/output or frozen private proof was read or overwritten for this revision.
The new private entry binds the main-gate-accepted operator summary state and its
explicit normalized/manifest inputs, independently of the rehearsal artifact.
Actual operator output semantic verification and durable delivery belong to
#345/main-gate; they are not delegated to #431.
Main-gate's minimal consumer interface permits independent note `div` blocks and
one exact marked-list class on `ul`, with fixed nested marker/numbering resets.
Synthetic structure/CSS and bounded accepted-input memory checks prepare that
interface; they do not prove browser marker rendering or full-book source QA.
The report records selected/current IDs, `formattingComplete: false` and
`contentCertification: false`; its selection counts confer no authority by
themselves. Real-DB execution and new-layout visual review remain outstanding.

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
