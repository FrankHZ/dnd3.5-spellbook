# SC PDF typography display derivatives

SC source-bound name/body acceptance preserves distinct text and HTML values.
It does not certify PDF paragraph boundaries or visual emphasis. Existing
`descriptionHtml`, escaped `<pre>` text, and PDF block/line order cannot by
themselves supply that review. PDF font names/flags, geometry, complete entry
context and Chinese semantic correspondence must be considered together.

The [source-free inventory](../../data-tools/reports/dice-qa/books/86/pdf-typography.json)
records existing evidence coverage and initial representative mapping proposals.
The [four-entry disposition report](../../data-tools/reports/dice-qa/books/86/pdf-typography-dispositions.json)
records the bounded follow-up decisions and their remaining acceptance needs.
The [complete-entry batch report](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-01.json)
binds the separate private proposals under `dice-qa/books/86/issue-457/`, including
complete field guards, fresh source/font checks and a fixed-exporter memory
rehearsal. It does not select those proposals or certify rendered HTML.
The [second complete-entry batch report](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-02.json)
binds `dice-qa/books/86/issue-459/` and separates unselected format candidates
from blocked content decisions. Its fixed-exporter rehearsal records the existing
single-book policy for outside-book references explicitly.
The two bounded source corrections for 3930/3934 follow the
[accepted source-pair migration](./sc-final-source-binding.md#upgrade-the-accepted-bands-of-steel--beast-claws-pairs).
Their private `issue-461/` format proposals guard the proposed corrected full
fields and reopen complete original pages/errata. They remain blocked for actual
selection until migration and independent format acceptance; the frozen
`issue-459/` proposals and its other entries are unchanged. Actual #345 input and
build proofs must be refreshed at that migration handoff.
Actual source pages, span references, complete field guards,
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
list. Main-gate selected seven initial samples from the frozen private revision
for bounded #345 preview integration. That selection does not certify rendered
HTML or full-book format QA. The new three-entry disposition proposals use a
separate path/revision and await their own selection; they do not expand that
handoff or change its fixed files.

An absent row returns existing HTML. A present row with any changed identity or
text/HTML field rejects the export; do not silently fall back from a stale row.
Never compare only normalized text or replace a text guard with HTML parity.
Legacy English text can contain Textile/link syntax, so English output preserves
the existing HTML's decoded text stream, separately from its complete text guard.
Chinese output preserves the accepted Chinese text stream exactly, including
notes. Existing Chinese text/HTML whitespace differences remain guarded as
separate values. Both languages preserve existing links and table/list semantic
nesting, table sections/captions/columns, header versus data cells, cell spans
and header associations, list kinds/numbering, and ID/named-anchor locations.
Inline emphasis and paragraph wrappers may change; these semantic structures
cannot be flattened, renumbered or silently detached from their destinations.

Apply the consumer's existing sanitization and local-link processing after
selection. The reviewed HTML uses ordinary paragraphs, `strong` for field
labels, `em` for source-supported flavour/reference/component labels, tables,
lists and one independent `div` containing the existing project-note title and
separate note paragraphs at their original location. Do not add an unsupported
title or merge project commentary into the rules body. This uses the consumer's
existing `div` allowlist; `aside` is not part of the interface. Entry titles
remain headings rather than body emphasis.

Lists whose accepted text includes reviewed literal bullet glyphs may use only
`ul` with the exact class token `pdf-typography-marked-list`. Every directly
contained `li` must retain its reviewed leading literal marker; mixed marked
and unmarked items cannot share a marked parent. Nested lists are classified
independently; a nested item's marker does not count as its parent's marker.
The current bounded helper supports literal `·`, `•`, `‧`, `◆`, and `．` markers.
The latter three are observed Chinese list markers, accepted only at the start
of an explicitly reviewed marked list's direct item. They do not classify
ordinary prose or trigger automatic list conversion. It rejects a
marked `ol`, additional class tokens or a
marked list with an unmarked direct item. All original characters remain exact.
The consumer must allow only this specific `ul` class token and fixed CSS to
suppress the generated markers on its direct items, retaining normal markers
and numbering for unmarked nested `ul`/`ol`. Do not grant arbitrary class/style
permissions. A direct-item `::marker` rule can avoid inherited suppression;
the actual consumer pipeline must prove the intended nesting behavior.

The consumer contract requires this class's explicit
allowlist/CSS integration and structural checks after sanitization/link handling.
Preserve table roles/spans/sections/header references, list kind/numbering/nesting
and destination anchors through that pipeline as well. A standalone helper PASS
does not prove sanitized/exported HTML retained these semantics.
No exporter integration is implemented
here; [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345) owns it.

Chinese natural-structure packets reuse current accepted fields and selected
presentation evidence, then review Chinese paragraph, mechanism, list/table and
note boundaries independently. Keep complete four-field guards and compare the
decoded Chinese text including whitespace exactly; presentation wrappers can
restore a flattened list/table without editing canonical text. New wrappers and
candidate rows require main-gate acceptance through the existing selector.
The [A–B structure packet](../../data-tools/reports/dice-qa/books/86/sc-zh-format-ab.json)
records fixed private evidence and bounded validation. Its eight-body memory
fixture validates the fixed renderer's sanitizer and structural compatibility,
with candidate HTML installed after the maintained representation validator.
The [C–E structure packet](../../data-tools/reports/dice-qa/books/86/sc-zh-format-ce.json)
uses the same guarded handoff for 191 Chinese bodies, including restored tables,
lists, long-prose boundaries and reader notes. Mechanism coverage must match
independently reviewed per-entry field counts and ordered field text; counting
only rows recognized by the renderer cannot prove completeness. Entries with
pending content changes stay bound to current accepted fields and require targeted revalidation
after those changes activate.
Production presentation selection, human visual acceptance and final renderer
integration remain separate checks owned by #345/main-gate. The fixture does not
accept the separate spell-table component marker decision.

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

After authoring, independently parse the final HTML and compare all `em`/`strong`
characters with complete reviewed intervals. Use `assertPdfTypographyEmphasis`
from the existing selection helper for Unicode code-point ranges, including
their exact decoded text. It checks nested styles, entities, whitespace and
runs split by links or line breaks. Missing or extra styled characters reject,
even when the complete field/text/structure guards pass. Repeat this comparison
after the consumer's sanitization and link handling. Mapping ranges and PDF
font checks alone cannot prove that the emitted tags match those ranges.
When binding source punctuation, retain its surrounding words and exact source
and output positions. A punctuation-only sequence cannot distinguish two commas
with different fonts exchanging positions. Independently match each Chinese
reference by clause meaning, including repeated names used descriptively; correct
English fonts and complete DOM intervals do not establish Chinese correspondence.
Python authors using `HTMLParser` must keep their visible-text position in a
separate counter: the parser's own `offset` tracks consumed markup and is not a
decoded-text offset. Neither this output check nor a corrected derivative
authenticates source mappings, accepts content, or selects a presentation.
The [emitted-emphasis audit](../../data-tools/reports/dice-qa/books/86/pdf-typography-inline-emphasis.json)
binds corrected private candidates, individual dispositions and independent
final-output checks. Its prospective source-pair candidates remain unselected;
the report does not replace main-gate acceptance or an actual export handoff.

Preserve existing lists, tables, unresolved source statements and project notes.
Document any source-supported change to existing emphasis individually.
Discontinuous font runs require an explicit observed-run decision and independent
Chinese semantic ranges; do not infer intended whole-name emphasis. An implicit
Chinese reference without a separable named token can remain regular rather than
gain invented text. Adjacent PDF sidebar/table columns can map to each accepted
language's existing serial order when complete semantic correspondence is shown;
that does not claim a page facsimile. Record these decisions explicitly rather
than treating legacy HTML as source authority.

The [third complete-entry packet](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-03.json)
binds unselected candidates and individual dispositions to complete final-DOM
checks before and after the fixed exporter's sanitizer. Its blocked entry stays
excluded pending a separate content decision; historical retention evidence is
preserved privately and does not establish original-text authority. This packet
also binds individual semantic rereview conclusions and rejects the superseded
output's three reference/punctuation errors. It does not change the actual
preview or grant main-gate selection.

The [fourth complete-entry packet](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-04.json)
binds separate unselected candidates under `dice-qa/books/86/issue-468/` to
complete original-page and official-errata review, individual Chinese semantic
conclusions, full source/output character positions, and complete final-DOM
emphasis checks after the fixed exporter's sanitizer. Accepted expanded fields
retain their own origin without borrowing original SC font authority. It retains
45 diagnostic mappings and excludes five whole entries with source-content
discrepancies, leaving 40 eligible proposals. Exact unapplied corrections belong
to #467; migration and complete typography rebinding must pass before the five
can be selected. Source fidelity includes original words, punctuation and book/page
citations even where rule meaning is unchanged. Only its two minus-glyph forms
and eight existing list markers are scoped representation cases. Selection and
human HTML visual acceptance remain with main-gate and #345.

The [fifth complete-entry packet](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-05.json)
binds the separate `dice-qa/books/86/issue-470/` proposals to all complete original
pages, full official errata and the fixed exporter sanitizer. Every scoped entry
has a disposition; diagnostic mappings remain separate from eligible candidates.
Blocked entries retain complete current bilingual fallback and exact unapplied
four-field proposals for the independent content decision in
[#473](https://github.com/FrankHZ/dnd3.5-spellbook/issues/473). Named-reference
emphasis follows each occurrence's meaning and source font; ordinary verbs remain
regular even when their wording also names a spell. Raw punctuation review
retains source/output code points, HTML entities and surrounding words, so legacy
normalization cannot silently approve a source discrepancy. Mathematical minus
representations are reviewed individually; they grant no exemption to word
omissions or other punctuation. Official replacement sentences retain separate
errata authority, while inherited fields and project notes keep their own origin.
Selection and human HTML visual acceptance remain with main-gate and #345.

The [sixth complete-entry packet](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-06.json)
binds separate `dice-qa/books/86/issue-474/` diagnostic mappings and eligible
proposals to complete original entries, full official errata, exact current four
fields and the fixed exporter's actual sanitizer. Each original reference
occurrence is classified by meaning and observed font; descriptive repetitions,
actions and implicit Chinese references stay regular when no named token maps.
An explicit English alias inside a Chinese parenthetical reference follows the
same named-spell emphasis as its Chinese name; the surrounding parentheses and
book/page citation stay regular. A translated separator follows its own source
counterpart. A later italic comma cannot be moved to an earlier regular connector
or a structural closing parenthesis in a different sentence construction.
Source word, qualifier, citation and punctuation discrepancies block a whole
entry; exact paired corrections remain unapplied for main-gate's independent
content decision under [#476](https://github.com/FrankHZ/dnd3.5-spellbook/issues/476).
Its checks retain full bilingual current fallback for every
blocked entry and reject the prior actual authoring/review errors after sanitization.

The [seventh complete-entry packet](../../data-tools/reports/dice-qa/books/86/pdf-typography-complete-07.json)
reuses its complete original-entry and official-errata review with the current
post-migration fields. Its current acceptance follows
[#345's natural formatting standard](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345):
broadly follow extracted PDF structure and preserve readable complete content,
paragraphs, tables/lists, notes and links. Retained exact-style audits are
diagnostics; equivalent glyphs, punctuation emphasis and harmless display
spacing do not block this slice or require new source replay. The packet retains
33 unselected candidates and excludes 12 complete bilingual entries with
unapplied four-field content proposals for
[#476](https://github.com/FrankHZ/dnd3.5-spellbook/issues/476). A retained compound
modifier hyphen remains a substantive source-content issue even at a physical
line end. Historical source-correct and explicit retention decisions remain
visible as revised source-fidelity proposals, rather than missing-review claims.
Main-gate owns content acceptance, migration and subsequent readable format
rebinding; representative rendered acceptance remains with #345.

Individually bound curly/straight apostrophe and paired-quote representations may
retain existing fields when they preserve the same contraction or possessive,
or exactly the same quoted words, boundaries and nesting, with unchanged source
emphasis. The packet records raw code points, offsets and context for each case.
This permits no active normalization or exemption for prime/feet/inches meaning,
lost or shifted quotes, sentence dashes, word hyphens or other punctuation.
Numeric-minus and native list-marker representations likewise retain individual
source-position decisions. Main-gate selection and #345's human HTML visual
acceptance remain separate.

The four-entry follow-up proposes those dispositions for 4443, 4088 and 4072.
3958's legacy table title has no separate PDF heading counterpart. Removing its
visible text from the old fields violates the existing exact-text guard;
retaining, hiding or demoting it cannot certify source-faithful heading content.
[#434's fixed source decision](https://github.com/FrankHZ/dnd3.5-spellbook/issues/434#issuecomment-5972281973)
accepts only the exact paired English title removal, through the
[bounded source-binding upgrade](./sc-final-source-binding.md#upgrade-the-accepted-prismatic-ray-english-pair).
The original request and frozen presentation files stay unchanged. A separate
private proposal at `dice-qa/books/86/issue-434/presentation.json` guards all four
post-revision fields and retains the Chinese text, notes, structures and all
other English content. This source decision does not select its presentation or
accept implementation/DB migration. Main-gate must complete those separate gates
through #346 before the refreshed display proposal can be selected. The old
English fields must reject as stale; the comparison helper is unchanged.

Presentation derivatives do not change
accepted fields, canonical inputs, provenance or DBs. A change to persisted
HTML/text requires the separate [accepted-input workflow](./db-content-workflow.md).

The existing HTML browser restriction remains in force. Direct PDF page review
and structural/text checks do not certify rendered HTML. Do not substitute a
localhost or alternate rendering surface after a denied HTML preview.

## Validation and remaining delivery

Run `npm run -w data-tools zh:pdf-typography:test` for synthetic exact-field,
text/note preservation, stale identity, table roles/spans/sections/captions,
list kinds/numbering/nesting, anchor deletion/movement and marked-list checks.
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
