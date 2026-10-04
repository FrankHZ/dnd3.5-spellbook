# Offline Chinese HTML

`offline:html` reads a normalized content DB and an explicit Chinese variant into
static HTML/CHM source pages. It supplies Chinese bodies and accepted Chinese
short descriptions, retaining both Chinese and English spell names. The English
source, accepted bilingual data and internal QA remain intact.

`index.html` presents classes first, then A–Z. Each `class-<owner ID>.html` lists
levels 0–9 as “Chinese name (English name), small component tags: Chinese summary”
on one flowing line, linked to full entries. Component tags use the existing
normalized flags (V, S, M, AF, DF, XP and the additional component labels). The 26
`A.html`–`Z.html` pages order complete Chinese entries by English canonical name,
then stable ID. Empty letters/levels are explicit. Classless spells remain in
letter pages. There are no individual spell-ID pages or separate pinyin/English
indexes, English body sections, or duplicate Current rules tables. Chinese
mechanism fields remain in the accepted body; export does not reconstruct them
from normalized rule columns.

Entries use `spell-<ID>` and `spell-<ID>-zh` anchors. Existing scoped source links
to removed `en`/`rules` sections point to the spell entry instead. Chinese section
links retain `-zh`; body anchors receive a per-spell `zh-<ID>` prefix. The CHM
`#content` container remains. Reading requires no JavaScript or network access.
Detail titles are one size smaller, the redundant Chinese-body heading is omitted,
and letter pages keep only the top directory navigation. Each entry has a small
`↗` website icon on its ID line, with “在网站查看” as tooltip/accessible name, linking to
`https://www.d20spellcodex.com/spells/<legacySpellId>`.

## Run

From the repository root:

```powershell
npm run -w data-tools offline:html -- --content-db data-tools/out/input/content.sqlite --book 86 --variant effective --out data-tools/out/sc-html-preview
npm run -w data-tools offline:html:test
```

From `data-tools/`, run `npm run offline:html --` with the same arguments. Relative
input/output paths resolve from the current checkout's repository root via the
shared path helper. DB path, book ID and variant are mandatory. The DB opens
read-only with SQLite `query_only=ON`, in one transaction. Use only the explicitly
authorized accepted content DB. Main-gate owns actual migrated-DB generation and
verification; rehearsals or slices do not grant operator access. Do not copy or
rebuild DBs for export.

Reuse a compatible provided runtime without dependency installs or filesystem links:

```powershell
$env:NODE_PATH = '<runtime-root>/node_modules'
& node '<runtime-root>/node_modules/tsx/dist/cli.mjs' '<code-root>/data-tools/src/offline-html/cli.ts' --content-db '<authorized-accepted-content-db>' --book 86 --variant effective --out '<code-root>/data-tools/out/new-html-preview'
```

The CLI supports repository/package CWD. Output must be a new directory below
this checkout's `data-tools/out/`. Existing directories, symlink/junction
ancestors, source locations and operator paths reject. Summary gaps and link
validation fail before directory creation. The exporter never removes or
reuses old output. An I/O failure can leave partial output; resolve it and choose
a fresh directory. Only the authorized owner delivers and verifies durable
HTML outside removable worktrees. This grants neither DB copying nor visual acceptance.

During the user-requested small-slice preview stage, focused synthetic checks can
skip the full-size display replay:

```powershell
npm run -w data-tools offline:html:test -- --focused
```

Full 1,001-entry display replay, source authentication, actual export and refreshed
remote CI remain paused. Full construction requires small-preview confirmation,
acceptance of the six Chinese-format batches #480–#485, domain delivery #486 and
special-component marker blocker #487. Small previews
use fixed accepted fields/summaries in memory, never persistent DB copies, and
must be labeled as a display preview rather than full source/content acceptance.

## Chinese Natural Layout

The current preview's complete component tags are provisional and unaccepted:
they do not match the PDF directory's special M/F/X markers. Existing material,
focus and XP flags do not distinguish costly materials or focuses outside the
component pouch. [#487](https://github.com/FrankHZ/dnd3.5-spellbook/issues/487)
blocks directory-marker acceptance. The user and that issue's task determine the
approach; this renderer task does not investigate or choose its schema/data method.

The current [#345 scope](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345)
replaces the Chinese CHM. It roughly follows existing PDF extraction and accepted
mappings. Fine punctuation/glyph/span certification and mapping all 1,001 entries
are not delivery gates. Reliable existing emphasis is retained; unavailable
mapping stays plain. The Chinese body, words, numbers, conditions, qualifiers,
references, tables/lists, notes and links remain complete.

The existing Chinese field vocabulary identifies the leading mechanism block:
school, level, components, casting time, range, target/effect/area, duration,
saving throw and spell resistance, including the observed range/duration labels
`作用距离：`, `作用范围：`, `作用对象：`, `作用目标：`, `时效：`, `抗力：`,
`射程：`, `持续：`, `施法动作：`, `对象：`, `影响范围：`, `施展时间：` and the single combined fields
`目标和效果：`, `效果及区域：` and `范围或目标：`,
and school headings `附魔系`, `魅控系`, `共通` and `变形系`. School descriptors
also accept the observed full-width `［］` delimiters. The observed line `法术抗力；可`
is recognized without changing its punctuation; other semicolon prose is not a field.
Recognized sibling paragraphs or plain lines
have no inter-field paragraph margins. Only blank rows between recognized fields
collapse visually. The block is separated from flavour/effect text, whose natural
paragraph spacing remains. Classification stops after the initial field group;
table/list cells, independently headed reader notes, materials and XP are excluded.

Pure-text `pre` blocks (including plain fallback without HTML) receive line spans.
Complete Chinese sentence lines receive conservative spacing. Exact decoded
characters, whitespace and order remain unchanged; field blank rows have zero
visual height. Semantic paragraphs and accepted table/list structure remain.
Canonical fields and databases are never modified by display processing. Checks
compare complete decoded text and structures without stripping all whitespace.

The sanitizer reuses CHM intake's dependency. Arbitrary source classes, styles,
events, scripts and data attributes are removed; loss of visible text rejects.
Only `ul` retains the exact accepted `pdf-typography-marked-list` token. Fixed CSS
suppresses that list's browser marker, restores ordinary nested markers, and
preserves literal markers, `ol start`, `li value`, spanning cells and note containers.

Scoped spell links become local letter/entry links. Out-of-scope, arbitrary network
and unresolved links are detached while their text remains. The only external
exception is the generated website link: exact HTTPS domain/route, numeric ID
matching its entry, fixed class/icon/tooltip/accessible name, one link per entry,
outside the body.
This does not permit source HTML to introduce website/network links. All emitted
local anchors and these generated links are validated before output creation.

## Accepted Inputs And Selection

Scope is `SpellContent.legacySpellId` with the selected `sourceRulebookId`.
Chinese names/bodies come from `I18nSpellText` for `zh` and the exact variant.
Neighboring books/variants are never blended. Missing/duplicate identities,
missing bodies, conflicting books and canonical names without A–Z initials reject.
For `effective`, existing provenance determines language; missing/conflicting
metadata rejects. English body ownership rejects the Chinese-only export rather
than displaying an English fallback. Name fallback remains labeled and counted.

Class rows come from `SpellListEntry`, with consistent owner identity and levels
0–9. Repeated class/spell/level rows produce one entry retaining distinct qualifiers
and notes. The report distinguishes raw rows from grouped memberships and lists
classless IDs. Membership `reviewStatus` is diagnostic, not source acceptance.
The reader notice preserves the separate, nonblocking #354 external-relationship QA.

Every class-member spell still requires exactly one accepted nonempty summary
per language, with matching book binding. English owner is `imarvin`; Chinese
`effective` selects `chm`, while other variants match exactly. Only the Chinese
summary renders. Missing, multiple, wrong-book, unaccepted or empty values appear
in `SummarySelectionError.gaps`; export fails without substitutes or concatenation.
Classless spells do not require directory summaries.

`selectPdfTypography` retains complete four-field Chinese/English input guards,
English/Chinese decoded text and existing semantic structures. English sanitizer
integrity checks remain internal; English bodies are never embedded or hidden in
output. The ordinary CLI exposes no presentation-file selection channel. A
renderer map is not source authority; main-gate authenticates exact Git inputs,
complete mappings and independent acceptance before selecting it.

The accepted selection has 296 formats and 705 current representations. These are
diagnostic coverage counts. Unaccepted later formats and #473/#476 content proposals
remain excluded. The current source authority stays at actual #467 with its accepted
normalized/manifest and provenance; display changes do not authorize migration.
The dedicated authentication/migration checkout remains at its accepted runtime.

Main-gate's actual workflow preserves full original-source authentication, normalized
values, canonical bilingual fields/summaries/notes, source-correction envelopes,
exact persisted metadata and post-input rechecks in one read-only transaction.
Before that window, coordinate every private writer to pause writes/staging/commits
and background work. Keep the hold through post-export snapshot/input rechecks,
then explicitly release it. Public read-only CI inspection is permitted. This
coordination does not replace any source or DB gate.

## Evidence And Acceptance

Old bilingual-output proofs retain their original meaning and do not accept this
Chinese display. After the user confirms the small slice, the independent display
checker and final main-gate handoff must cover all 1,001 Chinese bodies, Chinese
summaries, structures, local/trusted-site links and absence of English/rules sections.
Internal complete English/source/provenance checks remain; emitting 2,002 bodies
is no longer a display requirement. Reuse valid source evidence without reopening
whole-book semantic QA or a precision formatting queue.

`report.json` exposes source-free page/link/language/class/summary diagnostics.
`selectedSummaries` counts internally required bilingual owner fields;
`displayedSummaries` counts Chinese directory summaries. `displayedBodies`,
`displayLanguage` and `websiteLinks` describe rendered scope. `formattingComplete`
and `contentCertification` remain false. The content-preview notice remains until
human acceptance. Private locators, source keys, raw JSON, audit histories and
review envelopes are excluded from output; generated source text stays out of public Git.

Main-gate owns the refreshed actual readonly export, durable delivery and representative
human visual acceptance. The earlier durable preview is not acceptance of the
Chinese revision. The browser/file-URL rejection and no-workaround boundary remain:
no file retry, localhost or alternate renderer. See
[SC verification](../reports/sc-offline-html-qa.md) and
[DB content workflow](./db-content-workflow.md) for acceptance/write boundaries.
