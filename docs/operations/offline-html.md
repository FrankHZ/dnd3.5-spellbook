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
[#431](https://github.com/FrankHZ/dnd3.5-spellbook/issues/431) supplies accepted
bounded presentation inputs through main-gate; it does not certify full-book
formatting or rendered HTML.

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

The maintained private main-gate entry first runs existing final source
authentication, the final planner and frozen complete canonical/provenance
comparison in one read-only content transaction. Its directory-summary refresh
uses the maintained complete composition authentication for all 6,837 accepted
summary rows, including the six source-bound addition packets. It verifies the
fixed accepted operator normalized artifact and manifest, current full normalized
values and build metadata; the rehearsal artifact is a separate input and cannot
stand in for that operator binding. The exact accepted summary annotation and
every summary parser column must match before rendering. All 961 class targets
must have their 1,922 accepted English/Chinese owner fields; the other 40 scoped
targets remain body-only. Missing, duplicate, empty or incorrect owner/source
inputs still fail closed before output. It then uses the existing
`readExact` Git input helper on each exact selected revision, fixed
presentations, complete mappings and main-gate acceptance, validates the explicit
selected target set and all four current text/HTML
fields with `selectPdfTypography`, and passes that loaded selection and the same
read-only DB view to export. Dirty/changed Git inputs, missing/duplicate targets,
wrong books and stale fields reject before output creation. The independent
private checker compares directories, exact summary owners and every current or
selected derived body/structure. Actual operator execution requires main-gate's
explicit readonly handoff; this task does not open those DBs.

Ordinary CLI flags provide no presentation JSON/file channel. The low-level
renderer map is not source authority; authentication belongs to that maintained
entry. Current integration replaces the complete 95-item display selection with
[#463 / PR #464](https://github.com/FrankHZ/dnd3.5-spellbook/pull/464)'s fixed
corrected-current candidates and complete bilingual emphasis ranges. The accepted
95 target IDs and their four canonical input fields stay unchanged; 90 display
outputs repair emphasis positions or complete source-italic labels, and five
remain unchanged. The other 906 targets retain current display. Prospective
3930/3934 are excluded; their source migration is a separate workflow.

The private entry binds exact candidates, complete mappings/ranges and independent
source validation/acceptance. It calls `assertPdfTypographyEmphasis` on both
languages after candidate generation and again on every selected final sanitized
body. The helper compares each decoded Unicode character's `em`/`strong` set
against complete reviewed intervals, including regular characters outside them.
Four-field guards alone cannot detect shifted emphasis with unchanged text.
Legacy wrong-emphasis candidates reject at both stages despite identical visible
text. Selection never changes persisted fields or provenance. Private refs and
commands stay in owned issue-345 usage.

3970 retains accepted parent3969 flavour without an own-entry SC font claim.
3943's two supplemental heading spans remain bound to the accepted source refs.
The original 3972 presentation still links to PHB2612; the existing single-book
exporter removes its href and preserves the complete anchor text. Independent
full-scope checking requires the exact detached-reference count and no invented
SC destination. This integration does not change that consumer policy.

The English-title refresh requires both `--accepted-english-title` and
`--accepted-summaries` at the maintained private handoff. Source authentication
includes the accepted #434 pair, and the fixed new normalized artifact must
match the main-gate-completed operator state before output. The 3958 English
text/HTML consume the source-supported title correction directly; export never
hides the old title or restores it. The independent checker compares that exact
current pair along with all bodies and metadata. This preserves the complete
accepted summary binding. The emphasis refresh requires an explicit
`--accepted-inline-emphasis` private handoff and the fixed complete corrected
selection revision; 3958 remains outside the 95 selected typography targets.
This handoff binds the existing pre-migration normalized/manifest and completed
operator state and does not enable the pending source-pairs migration.
Prior previews/proofs retain their original input bindings and do not certify
the refreshed output.

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
counts, owner variants and classless IDs. `typography.reviewedSelectedIds` lists
this explicit run's selection; `currentDisplayIds` lists all untouched targets.
These counts confer no source authority. `formattingComplete` and
`contentCertification` remain false. HTML/plain representation differences
are counted ignoring whitespace; complete selected HTML remains authoritative
for rendering, without inventing another body. Output parity does not certify
input against the English PDF and applicable official errata.

The content-preview notice remains. `pdfFormatting` is
`partial-main-gate-selected` with an authenticated selection, otherwise
`pending-431-source-mapping`; neither means whole-book or visual acceptance.
The previous single-spell
layout failed the user's visual acceptance; its real export/durable-copy results
do not verify this layout. New-layout real corpus generation, remaining PDF mapping,
permitted visual review and final acceptance remain with main-gate. Unresolved
#354 relationship source QA is separate and nonblocking for the normal directory,
but prevents whole-book completion. See the current
[SC verification](../reports/sc-offline-html-qa.md) and
[DB workflow](./db-content-workflow.md) for the owning boundaries.
