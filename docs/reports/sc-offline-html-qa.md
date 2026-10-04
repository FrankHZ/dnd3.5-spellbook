# SC Offline HTML Export Verification

Current scope: [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345),
[PR #351](https://github.com/FrankHZ/dnd3.5-spellbook/pull/351). Delivery uses
class directories with levels 0–9 and accepted bilingual summaries, followed by
26 A–Z pages with complete bilingual entries and stable anchors. The user's
previous single-spell-page visual rejection does not accept this changed layout.

## Current Acceptance

Natural, readable layout roughly follows available PDF extraction and accepted
maps. Fine punctuation emphasis, equivalent glyphs and selected=1,001 are not
delivery gates. Uncertain emphasis may remain plain. Existing precision evidence
is retained; no new fine-format queues or full-source/span replays are required
for pure display details. Complete words, numbers, conditions, qualifiers,
references, tables/lists, notes and links remain mandatory.

The current mapping selection preserves all 229 accepted presentations/ranges
and adds 34 explicitly accepted [#474 / PR #475](https://github.com/FrankHZ/dnd3.5-spellbook/pull/475)
formats plus 33 accepted
[#477 / PR #479](https://github.com/FrankHZ/dnd3.5-spellbook/pull/479) natural
formats: 296 mapped displays and 705 current representations. This count is
diagnostic, not the natural-layout acceptance threshold. The actual #467
completed source state remains authoritative. The 23 #476 content blockers plus
4421, 4425 and 4426 for #473 retain complete canonical bilingual fallback;
#477 acceptance consumes only formatting candidates; #473 migrations and
unaccepted content proposals are not consumed.

Pure-text Chinese `pre` lines now receive conservative paragraph spacing for
complete sentences. Field labels, short table rows and literal markers stay
compact; blank lines stay visible. Every decoded character and line order is
preserved. No table cells, extra emphasis or canonical corrections are inferred.
English folds, semantic HTML, and pre blocks containing markup retain their
representation. Known inherited references and independent reader notes remain.

## Validation

| Boundary | Evidence |
| --- | --- |
| Complete scope | 1,001 SC entries / 2,002 bilingual bodies; book 9 excluded |
| Navigation | Classes first; levels 0–9; 26 letters; stable merged anchors |
| Summaries | 6,837 accepted rows; 961 class targets / 1,922 owner fields; 40 body-only targets |
| Content/structure | Exact decoded text including whitespace; full canonical fields, mechanics, tables/lists and independent notes |
| Natural plain layout | Sentence spacing; compact fields/table rows; preserved line order and English folds |
| Mapping inputs | Exact accepted packet and four current fields; blocked/diagnostic promotion fails |
| Links/privacy | All emitted local links/anchors checked; detached references retain text; private records absent |
| Paths/safety | Fresh worktree-local output; readonly content snapshot; root/package commands; no persistent DB copy |
| Merge gate | Exact-head remote ci:portable; results recorded on PR #351 |

Portable tests use synthetic fixtures and a provided runtime. The 263 full-scope private check reconstructs disposable memory from fixed Git
inputs and checks complete output. Its source/structure/link evidence is reused
for the additional 33 maps, with bounded current-input and emitted-body checks; it does not replace actual source authentication or
operator export. Unchanged source-transition and metadata-negative evidence is
reused. Fine-emphasis packets remain frozen evidence. Full replay runs sequentially
with a 4 GiB Node heap and 6 GiB sampled process/observed-child stop budget.

Authentication and persisted migration helper retain the accepted PR472 runtime.
One readonly content transaction requires full original-source authentication,
every normalized value, canonical summaries/notes/source-correction envelopes,
exact persisted build metadata and post-export input rechecks. Main-gate pauses
private writers through the actual snapshot window as described in
[offline HTML](../operations/offline-html.md). Preparation opens/copies/writes no
persistent/operator/stable/app-state DB, changes no durable output and renders
no HTML. Frozen prior proofs keep their original bindings.

## Remaining Delivery

Main-gate verifies fresh actual generation and durable delivery, then provides
representative class/letter pages for human review: ordinary/long paragraphs,
tables/lists, inherited entries, materials/XP and source-question notes. PR #351
is draft pending these real-output/visual gates, not precision coverage counts.
`formattingComplete` and `contentCertification` remain false; mapping counts do
not grant content authority. #354's pending external relationships remain a
separate, nonblocking source task and are not newly injected.

The prior browser file-URL rejection and no-workaround restriction remain:
no file retry, localhost or alternative renderer is used. Main-gate owns eventual
permitted human review. Usage and write boundaries:
[offline HTML](../operations/offline-html.md),
[DB content workflow](../operations/db-content-workflow.md).
