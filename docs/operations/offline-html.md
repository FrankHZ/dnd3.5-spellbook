# Offline Bilingual HTML

`offline:html` reads the normalized content DB and an explicit Chinese variant
into static HTML/CHM source pages. `index.html` presents classes first, then A–Z.
Each `class-<owner ID>.html` has levels 0–9, bilingual names and accepted short
descriptions linking to full entries. The 26 `A.html`–`Z.html` pages contain
complete bilingual spells ordered by English canonical name, then stable ID.
Empty letters and levels are explicit. Every scoped spell appears once in the
letter pages, including spells without class membership. Domains remain in the
rules headers, separate from the class directory.

There are no individual spell-ID pages or separate pinyin/English indexes.
Entries use stable `spell-<ID>` anchors and `-rules`, `-zh`, `-en` section anchors.
Body anchors receive per-language/per-spell prefixes to prevent collisions on
merged pages. The existing CHM `#content` container is retained. No JavaScript,
network connection or CHM compiler is needed to read the export.

## Run

From the repository root:

```powershell
npm run -w data-tools offline:html -- --content-db data-tools/out/input/content.sqlite --book 86 --variant effective --out data-tools/out/sc-html-preview
npm run -w data-tools offline:html:test
```

From `data-tools/`, run `npm run offline:html --` with the same arguments.
Relative input/output paths resolve from the **current checkout's repository
root**, using the shared path helper. The DB path, book ID and variant are
mandatory. The DB opens read-only with SQLite `query_only=ON`, in one transaction.
Use only the explicitly authorized accepted content DB. Main-gate owns actual
migrated-DB generation and verification; previous rehearsals do not grant
operator access. Do not copy or rebuild DBs for export.

Reuse a provided compatible runtime without dependency installs or filesystem
links, retaining it while other consumers depend on it:

```powershell
$env:NODE_PATH = '<runtime-root>/node_modules'
& node '<runtime-root>/node_modules/tsx/dist/cli.mjs' '<code-root>/data-tools/src/offline-html/cli.ts' --content-db '<authorized-accepted-content-db>' --book 86 --variant effective --out '<code-root>/data-tools/out/new-html-preview'
```

The same CLI runs from repository or package CWD. Output must be a **new directory
below this checkout's `data-tools/out/`**. Existing directories, symlink/junction
ancestors, source locations and operator paths are rejected. Summary gaps and
page/link validation fail before directory creation. The command never removes
old pages or overwrites output. An I/O failure can leave partial output; resolve
it and choose a new directory. After actual DB/content verification, the
authorized owner can copy HTML to a fresh durable destination outside removable
worktrees and compare every file. This neither copies DBs nor grants visual or
whole-book acceptance.

## Selection And Content

Scope is `SpellContent.legacySpellId` with the selected `sourceRulebookId`.
Chinese names/bodies come only from `I18nSpellText` for `zh` and the exact variant.
Neighboring books and variants are not blended. Missing/duplicate identities,
missing selected names/bodies, conflicting book bindings and canonical names
without an A–Z initial fail. For `effective`, existing field provenance supplies
only display language; missing/conflicting metadata fails. English fallbacks
are labeled and counted. Source-reviewed CHM retention remains Chinese ownership.
Other variants have no field-level language metadata and are not QA-certified.

Class membership comes from current `SpellListEntry` class rows, with consistent
owner identity and levels 0–9. Repeated class/spell/level rows produce one
entry retaining distinct qualifiers and notes; raw rows remain in rule headers.
The report distinguishes raw rows from grouped memberships and lists classless
IDs. Internal membership `reviewStatus` is diagnostic, never a source-acceptance
badge. One reader notice explains that some extended memberships need original
source QA; it does not label every membership pending or inject new tuples.

Each distinct class-member spell requires exactly one accepted, nonempty summary
per language in `I18nSpellSummaryText`, with the same book binding. The maintained
owner is English `imarvin`; Chinese `effective` selects `chm`, while other Chinese
variants match exactly. `SummarySelectionError.gaps` collects missing, multiple,
wrong-book, unaccepted or empty candidates using only ID/language/variant/reason.
Any gap fails the export. It does not deduplicate or concatenate candidates,
derive a first sentence or translate a substitute. Classless spells remain in
full-body pages without requiring directory summaries. Actual directory summary
coverage, gap acceptance and full output semantic verification belong to
#345/main-gate. #431 supplies PDF formatting evidence and its accepted mapping
contract, not summary acceptance or output semantic verification.

Complete normalized HTML is retained when available, otherwise exact plain text.
Meaningful whitespace, lists, emphasis, tables, spanning cells and reader source
notes are preserved. Existing semantic paragraphs/blocks have approximately one
blank line of spacing; folds within a paragraph remain inside it. `pre` and plain
text retain exact whitespace. Labels, lists and tables are not converted into
body paragraphs. DB tags, newlines, regexes and existing bold markup are not PDF
paragraph/font evidence. Accepted source mapping from
[#431](https://github.com/FrankHZ/dnd3.5-spellbook/issues/431) is required before
PDF-derived paragraph/emphasis changes can be integrated.

The consumer structure contract uses an existing safe, independent `div` for
project notes, preserving supplied titles, child paragraphs, position and text.
It does not add `aside` to the allowlist. Only `ul` may retain the exact class
`pdf-typography-marked-list`; arbitrary classes, styles, events and data attributes
remain filtered. Accepted presentation must provide that token only when every
direct `li` already contains its literal marker. Mixed sibling items and nested
lists are independently classified by source mapping, never inferred by export.
Fixed CSS suppresses that list's browser marker, restores ordinary markers and
numbering on unmarked nested `ul`/`ol`, and suppresses independently marked child
lists. Literal text, `ol start` and `li value` remain intact. This interface
decision does not accept #431 source evidence or grant visual acceptance.

Current normalized raw rule fields, descriptors, separate class/domain levels,
component flags/additional text and notes remain visible. Body rule headers
remain intact without translation or deduplication against the rules table.
The sanitizer reuses CHM intake's dependency with an offline semantic/anchor
allowlist. Removal of visible content fails. Scoped spell links become local
letter-page/entry links. Out-of-scope, network and unresolved destinations are
detached while visible text remains. Every emitted local link/anchor is checked.
The exporter does not adjudicate sources or modify canonical content.

## Evidence And Acceptance

Display queries exclude raw JSON, private locators, source keys, audit histories
and private review envelopes. Language metadata stays internal. Publication
name/page and spell ID are display labels. Generated source text stays local
and must never enter public Git.

`report.json` contains source-free layout/page/link/fallback, class and summary
counts, owner variants and classless IDs. HTML/plain representation differences
are counted ignoring whitespace; complete selected HTML remains authoritative
for rendering, without inventing another body. Output parity does not certify
input against the English PDF and applicable official errata.

The content-preview notice and `pdfFormatting: pending-431-source-mapping`
remain until accepted source mapping and reader review. The previous single-spell
layout failed the user's visual acceptance; its real export/durable-copy results
do not verify this layout. New-layout real corpus generation, PDF mapping,
permitted visual review and final acceptance remain with main-gate. Unresolved
#354 relationship source QA is separate and nonblocking for the normal directory,
but prevents whole-book completion. See the current
[SC verification](../reports/sc-offline-html-qa.md) and
[DB workflow](./db-content-workflow.md) for the owning boundaries.
