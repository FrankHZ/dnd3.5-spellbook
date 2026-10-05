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

## Complete mixed-book display lists

`data-tools/audits/sc_domain_handoff.py` composes the current domain owners'
complete appendix lists from fixed source inventory, explicit stable-identity
decisions, a read-only database snapshot, accepted Chinese summaries and printed
marker evidence. It opens no database and changes no relationships or renderer.
The [source-free mixed-list report](../../data-tools/reports/dice-qa/books/86/sc-full-domain-handoff.json)
pins the private proposal and its replay entry. Main-gate acceptance is required
before a consumer selects that revision; presence or successful validation is
not acceptance or permission to write a database.

The private replay entry takes absolute `--data-root`, `--code-root` and
`--output-dir` paths plus `--evidence-revision`. Its output must be a new directory
inside this handoff's private issue directory. It reads the original inventories
and summaries from their fixed Git revisions, and the snapshot/decisions from
the selected evidence revision. It does not reopen normalized content or the
operator database. It emits `composition-input.json` for the public composer:

```powershell
& $pdfPython -B -X utf8 ./data-tools/audits/sc_domain_handoff.py `
  --input '<absolute-replay-directory>/composition-input.json' `
  --decisions '<absolute-frozen-decisions.json>' `
  --output '<absolute-new-private-handoff.json>'
```

From `data-tools`, use `./audits/sc_domain_handoff.py`; all input/output paths
remain absolute. There is no overwrite option. Run the existing domain audit
suite with `python -B -m unittest discover -s data-tools/audits -p 'test_sc_domain_*.py' -v`.
The supplied owner set defines coverage: every ordinary owner needs one source
row per level, and every planar owner needs two. Processing uses indexed
identities/summaries and groups rows by owner; it does not perform fuzzy matching,
OCR, model calls or a new review of every verified summary.

The content JSON has `schemaVersion`, `rulebookId`, `language`, `reviewStatus`,
`domains` and source-free `coverage`. Domains retain stable owner ID/name and
Chinese name, `planar`, `levelChoiceCount`, translated `footnotes` and ordered
`occurrences`. Powers and shared planar paragraphs remain in their separate
accepted power handoff. Escape all plain-text display fields when rendering.

Each occurrence has one `sourceKey`, `level`, ordered `bindings`, Chinese
`summaryText`, `printedMarkers`, `markerStatus`, `footnoteSymbols` and
`readerNotes`. `sourceEvidence` retains the original row, including
`daggerPrinted`, source text, superscripts and locators; do not render it as the
Chinese display value. Binding identity includes both stable spell ID and
legacy ID, verified `sourceRulebookId`, Chinese name, summary provenance and
existing relationship IDs. `source-bound-handoff-only` permits a source-backed
display row without creating a database relationship. Decision evidence remains
separate from acceptance.

Compute each binding's displayed † from its verified SC book membership,
independently of the printed dagger. Preserve the existing SC M/F/X machine
bindings; complete non-SC labels reuse printed M/F/X. Unknown values remain
`null` and are omitted. Never derive either from full component flags. Stars in
names or summaries reference domain-level footnotes, including creature and
alignment limits; source footnotes extracted after the last row can apply to
earlier starred rows.

Planar rows share `choiceGroup` by stable owner and level, with one prepared
choice per level. A true slash alternative has multiple bindings and an
`alternativePolicy` of `alignment`, while a slash inside a single canonical
spell name retains one binding. Render those bindings separately within one
source row, preserving their individual summaries and † values. Local SC
`link.href` values use the existing letter-page `spell-<legacyId>` anchors.
Non-SC links use the existing website `/spells/<legacyId>` URL and `kind: online`;
label these as online viewing. This handoff does not add non-SC spell bodies or
authorize a full HTML build or visual acceptance.
