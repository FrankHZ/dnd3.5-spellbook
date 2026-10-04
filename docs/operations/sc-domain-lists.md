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

Granted Power and Requirement content uses the separate
`data-tools/audits/sc_domain_powers.py` audit with the same explicit input, page
range and new-output arguments. It retains raw paragraph lines and locators,
stops at each domain spell table, and separates the shared planar-domain rules.
Display English is a whitespace-normalized lookup aid; original line-end
hyphens remain in evidence. Run both synthetic suites with
`python -m unittest discover -s data-tools/audits -p 'test_sc_domain_*.py' -v`.

The [power handoff report](../../data-tools/reports/dice-qa/books/86/sc-domain-powers.json)
locates the private candidate content, source inventory, owner dispositions,
translation decisions and reproduction checks. It inventories all printed
domains while Chinese HTML content covers only the current regular owners.
Special feat grants do not acquire a domain page or ability; their relationship
review remains separate. Same-name domains from different books require an
explicit source-to-owner binding rather than name-only matching.

The renderer consumes the accepted private JSON directly, without a database
table or import. Resolve the report's directory relative to the explicitly
configured data repository root, then its handoff paths relative to that
directory. Pin the private revision accepted by main-gate; a candidate file's
presence does not grant acceptance. No path is relative to the shell's working
directory or a removable code checkout.

Content has `schemaVersion`, `rulebookId`, `language`, `domains`, and
`sharedRules`. Each domain carries `ownerLegacyId`, `ownerName`, `sourceName`,
`nameZh`, `entryIds`, `grantedPowerText`, nullable `requirementText` and
`sharedRulesKey`, plus `readerNotes`. Bind by rulebook and stable owner ID,
verify the owner snapshot, and escape these plain-text values when rendering.
Render the requirement, complete ability, and reader notes; planar owners also
need the paragraphs selected by `sharedRulesKey` from `sharedRules`.
The separate evidence files retain English source locations and editorial
decisions. Renderer/CSS changes and acceptance belong to their existing owners.
