# SC domain-list source inventory

The bounded Python audit inventories domain-list occurrences from existing
`PdfPage` JSONL. It does not open PDFs or databases, accept content, or modify
normalized relationships. Source evidence stays in the configured private data
repository. Use the explicit-page [PDF extractor](../../data-tools/pdf-extract/README.md)
only for authorized missing pages.

```powershell
& $pdfPython ./data-tools/audits/sc_domain_lists.py `
  --input '<absolute-existing-cache.jsonl>' `
  --input '<absolute-additional-pages.jsonl>' `
  --start-page-index 270 --end-page-index 284 `
  --output '<absolute-new-private-inventory.json>'
& $pdfPython -m unittest discover -s data-tools/audits -p test_sc_domain_lists.py -v
```

Input/output paths are explicit; output must be new. The inclusive zero-based
range must have exactly one record per page. From another working directory,
use the absolute code path. No environment or data root is inferred.

The SC appendix occupies printed p271–285. Ordinary domains have one spell per
level; planar domains have two alternatives per level. Column/page continuations,
uppercase list headings, wrapped labels, missing delimiters, footnotes and the
full-width Sources boundary preserve their separate dispositions. Cleaned names
and summaries are lookup aids. Every occurrence retains original page/block/line
and span indices; raw text, font, geometry and superscripts remain in the input.

Original printed occurrences are separate from generated `SpellListEntry`
identities. Bind only against the selected edition and exact owner, level and
qualified spell identity. A dagger does not establish a body identity; outside
SC-body rows remain source inventory. Special feat grants retain their separate
pending classification. Absence from a spell's header is not grounds to delete
an appendix relationship.

Reuse summaries by exact spell/edition/language/variant in the frozen accepted
inventory. New Chinese proposals use the maintained summary schema with source
page/span provenance. Preserve distinct domain/class wording in occurrence
evidence and report demonstrated contradictions separately; do not silently
replace a previously accepted summary. Candidate files require main-gate
acceptance before canonical promotion or write-capable consumption.

The [source-free handoff report](../../data-tools/reports/dice-qa/books/86/sc-domain-source-summaries.json)
locates the private extraction, tuple dispositions, summary proposals and replay
checks. [Printed marker processing](spell-list-markers.md) and the offline HTML
renderer consume these handoffs under their own owners. This audit does not
accept markers or implement HTML output. Operator and production writes remain
governed by [DB content workflow](db-content-workflow.md).
