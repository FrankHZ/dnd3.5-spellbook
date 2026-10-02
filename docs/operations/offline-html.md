# Offline Bilingual HTML

`offline:html` reads the normalized content DB and one explicit Chinese variant
to generate static CHM source pages. It creates `spell-<legacy ID>.html`, a
Chinese index sorted by pinyin, an English alphabetical index, and simple CSS.
It retains the existing CHM `#content` container convention. No JavaScript,
network connection, CHM compiler, or deployment is needed to read the export.

## Run

From the repository root:

```powershell
npm run -w data-tools offline:html -- --content-db data-tools/out/input/content.sqlite --book 86 --variant effective --out data-tools/out/sc-html-preview
npm run -w data-tools offline:html:test
```

From `data-tools/`, run `npm run offline:html --` with the same arguments.
All relative input/output paths resolve from the **current checkout's repository
root**, using the shared path helper. The DB path, book ID and variant are
mandatory. The DB is opened read-only with SQLite `query_only=ON` and read in
one transaction. Use the accepted stable final rehearsal DB directly for the
final-input preview. Do not copy or rebuild it, and retain its shared runtime
while other consumers depend on it. Dependency installs or filesystem links are
unnecessary when an existing compatible runtime is provided:

```powershell
$env:NODE_PATH = '<runtime-root>/node_modules'
& node '<runtime-root>/node_modules/tsx/dist/cli.mjs' '<code-root>/data-tools/src/offline-html/cli.ts' --content-db '<stable-final-content-db>' --book 86 --variant effective --out '<code-root>/data-tools/out/new-html-preview'
```

The same CLI runs from repository or package CWD, with root-relative arguments
retaining the same meaning. Runtime locations are supplied by the task rather
than assumed to be the primary checkout.

Output must be a **new directory below this checkout's `data-tools/out/`**;
existing directories, symlink/junction ancestors, source locations and operator
paths are rejected. Repeated exports use different directories. The command
validates all pages and links before creating the directory. It never removes
old pages or recursively overwrites output. A failed filesystem write can leave
an incomplete directory; choose a new directory after resolving the I/O failure.
The final accepted export can be copied to a durable local destination by its
authorized owner after the final DB/content acceptance.

## Content And Limits

The scoped identities are `SpellContent.legacySpellId` where
`sourceRulebookId` matches the book. Chinese names and bodies come only from
`I18nSpellText` for `zh` and the exact selected variant; variants and neighboring
books are not blended. Missing/duplicate identities, missing English or selected
variant names/bodies and conflicting book bindings fail with diagnostics.
For `effective`, existing field provenance supplies only the displayed language;
missing or conflicting language metadata fails. English fallback fields are
explicitly labeled and counted, never treated as translated Chinese. Other
Chinese variants have no field-level language metadata and are not QA-certified.
Source-reviewed CHM retention in the accepted final writer remains Chinese
ownership; it is not an untranslated fallback. The formatter does not redo
the final writer or consumer provenance/source acceptance.

The English section retains complete normalized HTML when available, otherwise
the exact plain text. The Chinese section uses the same rule. Meaningful plain
text whitespace, lists, emphasis, tables, spanning cells and original-source
ambiguity notes in the body are retained. Current normalized raw rule fields,
descriptors, separate class/domain levels, component flags, additional component
text and display notes are also shown. Chinese body rule headers
are preserved as content, without translating or deduplicating them against the
normalized current rule table. This exporter performs no source adjudication,
translation, correction, summary import or normalization.

The CHM sanitizer dependency is reused with an offline allowlist, including
`pre`, semantic table attributes and internal anchors. Sanitization that would
remove visible text fails. Per-language anchor prefixes prevent collisions.
Links to scoped spell IDs become relative local links. Out-of-scope, network or
unresolved references retain their visible text but lose the destination; their
count is reported. Every remaining link and anchor is checked.

The display-field queries exclude raw JSON, source keys, private locators,
previous accepted rows, QA evidence and audit histories. Language metadata is
read internally and never serialized into HTML. Only the publication name/page
and spell ID are displayed as source labels. Generated spell text stays local
and must never be committed to the public repository.

`report.json` contains source-free page/link/fallback counts and the number of
input HTML/plain-text representation differences (ignoring whitespace). HTML
is preserved when the two differ; no second body is invented or appended.
Semantic validation proves output parity with the chosen input HTML or text;
it does not certify that input against the source PDF. English PDF plus official
errata remain the ultimate SC content authority. Final content certification
and rebuilding the finished export belong to the independently accepted full
dataset and [DB workflow](./db-content-workflow.md).
Accepted name/body rehearsal content and original-source reader notes do not
certify pending relationship QA, operator migration or browser visual acceptance.
Source-question IDs/notes already present in the accepted body are reader
content and remain separate from the original ambiguous rules; private review
envelopes are never appended to the body.
