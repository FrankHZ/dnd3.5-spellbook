# Offline Chinese HTML

Output uses Chinese category folders following the CHM repository's chapter
organization: `职业法表/`, `领域法表/` and `法术描述/`. The root retains `index.html`,
optional `introduction.html`, `style.css` and `report.json`. No category index pages
are added. Generated stylesheet, navigation, body-reference and footnote links
are relative to their actual page. Validation resolves `../` within the output
and rejects escaped-root, absolute, missing-file and missing-anchor references.
Accepted source handoffs retain their original logical filenames and links;
folder organization changes only the emitted representation. Packaging and
delivery consumers must walk the output recursively and retain these paths.
The report exposes `outputFolders`; `sharedClassPages.filename` is an emitted path.

`offline:html` reads a normalized content DB and an explicit Chinese variant into
static HTML/CHM source pages. It supplies Chinese bodies and accepted Chinese
short descriptions, retaining both Chinese and English spell names. The English
source, accepted bilingual data and internal QA remain intact.

`index.html` presents classes, domains, then A–Z. Each `职业法表/class-<owner ID>.html` lists
levels 0–9 as “Chinese name (English name), printed M/F/X superscript: Chinese summary”
on one flowing line, linked to full entries. Special markers come from the selected
printed list occurrence; complete spell-component flags never supply them. The 26
`法术描述/A.html`–`法术描述/Z.html` pages order complete Chinese entries by English canonical name,
then stable ID. Empty letters/levels are explicit. Classless spells remain in
letter pages. There are no individual spell-ID pages or separate pinyin/English
indexes, English body sections, or duplicate Current rules tables. Chinese
mechanism fields remain in the accepted body; export does not reconstruct them
from normalized rule columns.

Class directory links and page titles reuse `I18nCharacterClassText` Chinese
`default` names alongside existing English names; absent Chinese names have an
explicit English fallback notice. SC Sorcerer/Wizard share `职业法表/class-1-4.html`
and one directory link, matching the original combined list. Within each level,
rows are grouped by existing `schoolRaw`, in English school-name order as in the
printed appendix. School headings use the existing accepted taxonomy IDs and
`I18nSpellSchoolText` Chinese `default` names; missing overlays retain the raw
school name and are reported. Combined schools retain one group and one row per
spell, rather than duplicating the spell into multiple school groups. Other
classes and domains retain their original list layout. Shared rows are deduplicated
by spell ID and level, while original owner IDs and all relationship snapshots
remain intact. Each owner's printed marker bindings are checked separately;
conflicting known values reject, and an unknown binding omits the display marker.
Qualifiers are retained once. A row with only one current owner gets a small
profession note rather than inventing another database relationship. Other books
retain their existing separate class pages.

Each `领域法表/domain-<owner ID>.html` lists levels 1–9 with the same name/summary row and
local spell anchors. Pages include only relationships for spells whose bodies
belong to the selected book; empty levels explicitly refer to this book's subset,
not the original domain's complete spell list. Class and domain pages use distinct
filename prefixes even when owner IDs coincide. Domain names reuse existing
`I18nDomainText` Chinese `default` overlays; missing names explicitly fall back to
the stored English owner name. Qualifiers and variant notes remain visible.
SC owner 28 / spell 3921 / level 1 is the known pending #354 additional feat grant.
It is outside the original book directory and emits no menu, page or list row.
The existing relationship is unchanged; spell 3921's Chinese body and normal
class memberships remain available. The report separates source domain-row
counts from displayed rows and records the exclusion with its unresolved issue.

Without a complete domain-list handoff, Chinese summaries are required for the
union of class and domain targets.
Class targets retain the existing internal accepted English-summary checks;
domain-only targets do not require an unused English summary. No body-first-line
or English-summary fallback supplies Chinese summaries. The report counts class
and domain pages, relationships, distinct targets, domain-only targets and selected
Chinese/English summaries separately. Invalid levels, owner conflicts and duplicate
domain tuples reject before output creation.

The library's optional eighth argument accepts caller-authenticated Chinese class
summary replacements. Each row supplies `spellId`, `rulebookId`, `lang`, `variant`,
`reviewStatus`, `previousSummaryText` and `summaryText`. The exporter first validates
the existing DB's complete summary selection, including accepted English class
summaries. Replacements must bind a selected SC/effective class target, accepted
Chinese `chm` text and the exact previous Chinese summary. Duplicate IDs, stale
text, other books/variants and domain-only targets reject before output creation.
Only class display changes; ordinary/complete domain summaries, English checks,
DB fields and provenance remain intact. New text is escaped as plain text and
`classSummaryReplacementIds` records the consumed IDs. Main-gate supplies only
the fixed accepted #500 correction for spell 4123; its 29 added domain-only
summaries are not class replacements. This does not change the source-authentication
workflow's actual 6,837-summary DB baseline or authorize a DB write.

Entries use `spell-<ID>` and `spell-<ID>-zh` anchors. Existing scoped source links
to removed `en`/`rules` sections point to the spell entry instead. Chinese section
links retain `-zh`; body anchors receive a per-spell `zh-<ID>` prefix. The CHM
`#content` container remains left-aligned inside the page margin, with a 62em
maximum reading width. Reading requires no JavaScript or network access.
Detail titles are one size smaller, the redundant Chinese-body heading is omitted,
and letter pages keep only the top directory navigation. Each entry's heading
places the bilingual name on the left and smaller, normal-weight page/ID metadata
on the right, without a repeated publication row. Metadata can wrap below a long
title in narrow views; inline-block text provides a readable fallback for CHM
readers without flex layout. Missing page numbers leave only the ID and icon.
The small `↗` website icon stays beside the ID, with “在网站查看” as tooltip/accessible name, linking to
`https://www.d20spellcodex.com/spells/<legacySpellId>`.

## Complete Domain Lists

For SC, `--domain-lists` replaces the selected domain pages' SC subsets with
complete mixed-book lists from accepted #507 content. The fixed private file is
`dice-qa/books/86/issue-507/html-domain-lists.zh.json` at revision
`b18fbf663f605fe9d2f860f6265daf2d998c7533`; main-gate acceptance is recorded at
`770b03df94cb5579a8d719d46cd9eb4351c77480`. The file retains its original proposal
status; acceptance belongs to the fixed receipt, not a mutated status field.
The existing data-root helper and `git show` reader provide the same root/package
CWD behavior as introduction and domain powers. No database fields, import,
floating revision or arbitrary content path are introduced.

The API's seventh argument supplies this caller-authenticated handoff. Existing
domain owners select pages; additional handoff owners cannot expand output.
Validate stable owner names, source occurrence uniqueness, complete levels,
SC spell identities/local anchors and existing SC relationship coverage before
creating output. Non-SC identities and source-only relationships retain the
accepted handoff's bindings without creating database relationships. Domain
summaries come directly from this handoff; the existing DB summary checks remain
for class rows. The report's `completeDomainLists` counts displayed occurrences,
bindings, online/SC targets and marked/empty/unknown rows separately from
existing normalized relationship counts and stored class-marker consumption.

SC names link to local bodies and display † from verified book membership.
Non-SC names link to the exact website spell URL and are labeled “在线查看”.
There are no additional non-SC bodies. Planar pages retain two rows per level
and explain that one is selected. Slash alternatives retain one source row with
separate names, summaries and dagger/link decisions. Ordinary slash names stay
one binding. M/F/X reuse handoff values; unknowns are omitted. Stars link to
complete domain footnotes, and plain-text names, summaries and notes are escaped.
Source evidence, English summary evidence and binding metadata never render.

## Introduction

For SC, `--introduction` adds `introduction.html` and an introduction link to the
index and page navigation. It reads the accepted #503 Chinese HTML fragment
directly from the private repository resolved by the existing `localDataDir`
helper (`DATA_REPO_PATH` in the environment or this checkout's root `.env`).
Relative data roots resolve from the repository root, independently of caller CWD.
No database field, working-copy content or floating private `HEAD` supplies it.

The fixed reader is `dice-qa/books/86/issue-503/introduction.zh-CN.html` at private
revision `3148d36fb51fd353b097ad911d2e04b33c9c706c`; main-gate acceptance is
`628c55d63cd71c9ecb711726bdec11717f8a517d`. `readScIntroduction` uses `git show`
with that exact revision and path. The CLI offers no alternate source/revision
override. It retains complete Chinese content from printed pages 3–4, including
the Sources box, paragraphs, lists and emphasis. Reader content supports only
`h2`, `h3`, `p`, `ul`, `li`, `strong` and `i`, without attributes or resources;
unsupported markup fails before output creation instead of being silently removed.
Source text stays in private data and generated output, never public source files.

The exporter library's optional fifth argument accepts the caller-authenticated
fragment, allowing the main-gate's readonly memory slice to use the same fixed
reader alongside its selected typography and printed marker inputs. Without this
argument or CLI flag, no introduction file/link is emitted. The report counts
introduction sections, paragraphs and list items separately from spell bodies.

## Domain Abilities

For SC, `--domain-powers` reads the accepted #504 plain-text handoff directly from
the same private data root. The fixed file is
`dice-qa/books/86/issue-504/candidate/html-domain-powers.zh.json` at revision
`e2e4b698eee3c9339303fa1b233c646fd993c702`, accepted at
`769d4292f4710b9d77716d5f66888c70d11e4834`. The path's candidate name does not
select a floating candidate; `readScDomainPowers` uses the exact accepted commit.
There is no CLI path/revision override or new database field.

The library's optional sixth argument supplies this caller-authenticated content.
For every displayed domain, the renderer verifies book 86, stable owner ID,
English owner-name snapshot and all current relationship IDs against the handoff.
Missing or stale bindings, duplicate owners, empty powers or unavailable shared
rules fail before output creation. Extra source owners do not create pages or
expand the selected spell-body scope. The additional feat owner remains excluded.

Each domain page places a separate ability section before its spell levels,
retaining the complete power and any requirement. Applicable planar pages also
display both shared-rule paragraphs. Reader notes have their own labeled block,
separate from the rule text. All content fields are plain text and are HTML-escaped;
they cannot supply markup, links or assets. The report counts displayed ability
pages, requirements, shared-rule pages and reader notes independently.

## Run

From the repository root:

```powershell
npm run -w data-tools offline:html -- --content-db data-tools/out/input/content.sqlite --book 86 --variant effective --out data-tools/out/sc-html-preview
npm run -w data-tools offline:html:test
```

Add `--introduction --domain-powers --domain-lists` to the authorized SC export to include
accepted data handoffs. These flags neither grant DB access nor activate a
whole-book export.

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

Exact-head remote portable CI validates code independently of user visual
acceptance. Full construction requires small-preview confirmation,
acceptance of the six Chinese-format batches #480–#485, domain delivery #486 and
the accepted special-marker inputs from #487/#499. Small previews
use fixed accepted fields/summaries in memory, never persistent DB copies, and
must be labeled as a display preview rather than full source/content acceptance.

## Printed List Markers

The renderer uses the accepted [marker consumer contract](spell-list-markers.md).
It reads independent stored annotations from the same read-only content view and
optionally consumes caller-authenticated `MachineMarker[]` as the fourth argument
to `exportOfflineHtml(options, presentations, sourceDb, machine)`. Like typography
selection, immutable machine input and its acceptance belong to the main-gate
caller; this argument does not grant source acceptance or DB import authority.
The CLI reads existing annotations only and does not load an arbitrary machine file.

Every grouped directory row passes all of its complete `ListIdentity` snapshots
to `selectProcessedMembershipMarkers`, with the printed book ID separate from
each relationship's book ID. Current spell/owner names and publication identity
must also match machine snapshots. Stale bindings, conflicting values and forged
eligible wrappers reject before output creation. Ordinary candidate records remain
unknown. Accepted and eligible machine results supply canonical M/F/X superscripts;
the tooltip identifies automatic matches. Unknown and explicit empty sets both
omit the superscript, while the report counts these states separately, including
accepted/machine rows. Neither state reads complete component flags as fallback.
No marker source spans, private paths or binding JSON appear in HTML or reports.

Legacy views without a marker table are read without migration and return unknown
markers. Stored-record reading, machine validation and exporting perform no DB
writes. The pending feat notice remains reader-facing; its internal issue trace
is retained only in `pendingMembershipIssues` in the report.

## Chinese Natural Layout

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

For the Chinese delivery, compose the accepted #480–#485 batches: new candidates
plus each batch's explicitly retained presentations. Use #484's
`presentations-final.json` and #485's `presentations-reviewed.json` with its two
accepted reuse entries. These six batches cover the 1,001 SC targets without
overlap; selection counts describe this input, not a precision-formatting gate.
#473/#476 content proposals remain excluded. The current source authority stays at actual #467 with its accepted
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

Main-gate owns actual readonly export, durable delivery and recording the user's
representative visual acceptance. The local Chinese delivery lives at
`G:/spell-book/exports/sc-html`; `G:/spell-book/exports/sc-html-class-az-preview`
mirrors the same files. Verify delivered bytes and remove only identified obsolete
export pages when replacing an earlier layout. Delivery evidence and current
acceptance belong in #345/#346 and private data, rather than a repository status log.
The browser/file-URL rejection and no-workaround boundary remain:
no file retry, localhost or alternate renderer. See
[SC verification](../reports/sc-offline-html-qa.md) and
[DB content workflow](./db-content-workflow.md) for acceptance/write boundaries.
