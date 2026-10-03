# SC PDF typography display derivatives

SC source-bound name/body acceptance preserves distinct text and HTML values.
It does not certify PDF paragraph boundaries or visual emphasis. Existing
`descriptionHtml`, escaped `<pre>` text, and PDF block/line order cannot by
themselves supply that review. PDF font names/flags, geometry, complete entry
context and Chinese semantic correspondence must be considered together.

The [source-free inventory](../../data-tools/reports/dice-qa/books/86/pdf-typography.json)
records existing evidence coverage, representative mapping proposals and their
remaining gaps. Actual source pages, span references, complete field guards,
Chinese ranges and reviewed HTML stay in the configured private data repo under
`dice-qa/books/86/issue-431/`. They are presentation proposals awaiting main-gate
selection, not accepted content or proof of full-book format QA.

## Consumer contract

The small [selection helper](../../data-tools/src/zh-parser/pdf-typography.ts)
consumes existing HTML strings; it does not introduce a rich-text document
model, import workflow or authority registry. Each private presentation has:

- `targetId`, `rulebookId: 86`;
- `input.englishText`, `englishHtml`, `chineseText`, `chineseHtml`, containing
  the complete exact fields, including all original whitespace and reader notes;
- `output.englishHtml`, `chineseHtml`, the derived display representations.

The exporter must authenticate the exact private evidence revision selected by
main-gate, match the target and accepted origin/review envelopes through the
existing final source-binding workflow, then call `selectPdfTypography` with
the actual current fields. Merely supplying a JSON row, matching text, or a
review status does not grant acceptance. The helper checks representation
integrity; it neither authenticates Git inputs nor verifies human/PDF semantics.
Keep this selection step outside the helper; there is no new accepted-baseline
list. The current representative proposal has not been selected for export.

An absent row returns existing HTML. A present row with any changed identity or
text/HTML field rejects the export; do not silently fall back from a stale row.
Never compare only normalized text or replace a text guard with HTML parity.
Legacy English text can contain Textile/link syntax, so English output preserves
the existing HTML's decoded text stream, separately from its complete text guard.
Chinese output preserves the accepted Chinese text stream exactly, including
notes. Existing Chinese text/HTML whitespace differences remain guarded as
separate values. English links, table cells and lists, and existing Chinese
structures are protected against flattening or changed destinations.

Apply the consumer's existing sanitization and local-link processing after
selection. The reviewed HTML uses ordinary paragraphs, `strong` for field
labels, `em` for source-supported flavour/reference/component labels, tables,
lists and `aside` for project notes. Entry titles remain headings rather than
body emphasis. Lists whose accepted text includes literal bullet glyphs use
`pdf-typography-marked-list`; consumer CSS should set `list-style: none` for that
class to avoid adding a second bullet. No exporter integration is implemented
here; [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345) owns it.

## Review and authority boundaries

The private mapping records use existing `sourceId`, zero-based `pageIndex`,
observed `printedPage`, and `[block, line, span]` references. Saved selected
spans are compared exactly with an in-memory fresh read of the explicit SC
PDF pages. No additional page extraction is required when those records exist.
The inventory is availability evidence, not full-book PDF freshness or format
acceptance. Wide context/parent references can cover several columns or pages;
the inventory's layout flags are conservative triage cues, not actual counts of
cross-page spell bodies. Three column-origin bands are used for triage and
sidebar/table geometry still requires review.

Map complete semantic units in each language independently. A visual line,
extraction block, indent or font bit alone does not imply a paragraph. A unit
may continue across columns/pages, and the accepted languages can put sidebar
paragraphs and tables in different orders. Private Chinese ranges are Unicode
code-point offsets, not JavaScript UTF-16 offsets or copied English offsets.
They are review navigation, not the consumer's mutation mechanism. Table cells
are matched by row/column meaning; absent legacy tokens are not invented.

Preserve existing italics, lists, tables, unresolved source statements and project
notes. Document any source-supported style change individually. Discontinuous
font runs, compressed Chinese references and inherited captions without PDF
counterparts stay explicit gaps. Presentation derivatives do not change
accepted fields, canonical inputs, provenance or DBs. A change to persisted
HTML/text requires the separate [accepted-input workflow](./db-content-workflow.md).

The existing HTML browser restriction remains in force. Direct PDF page review
and structural/text checks do not certify rendered HTML. Do not substitute a
localhost or alternate rendering surface after a denied HTML preview.

## Validation and remaining delivery

Run `npm run -w data-tools zh:pdf-typography:test` for synthetic exact-field,
text/note preservation, stale identity, link and table/list protection checks.
It also runs in the portable data-tools suite. The private `prepare.py`,
`inspect_pdf.py`, `author.py` and `validate.cjs` reproduce the bounded inventory
and proposal from committed inputs, an explicit code root and the data root
resolved from their owned private script directory. They open no
DBs. Their paths/commands and exact evidence revisions are recorded privately;
public tests require no corpus. The shared Python environment remains unchanged.

Remaining complete-entry reviews should be independently accepted in batches of
30–60 ordinary spells, reducing complex table/sidebar/cross-page batches to
roughly 15–30. Narrow source context before treating column/page flags as entry
complexity. Each batch must bind current full fields, inspect complete source
entries, map both languages, preserve structures and notes, enumerate unresolved
gaps, and obtain main-gate selection. Address the representative gaps and verify
the consumer's actual rendered HTML before promoting their display proposals.
[#431](https://github.com/FrankHZ/dnd3.5-spellbook/issues/431) owns this prerequisite;
#345/#346 retain responsibility for final coverage and integration.
