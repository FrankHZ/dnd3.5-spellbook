# Class Source Evidence

`data-tools` owns the directory-first CHM source inspection command. The owning
[source-mapping issue](https://github.com/FrankHZ/dnd3.5-spellbook/issues/598)
defines acceptance; the [pilot slice](https://github.com/FrankHZ/dnd3.5-spellbook/issues/610)
owns its private scope and review evidence. This command neither imports data nor
publishes class-source relationships.

## Run

From the checkout root:

```powershell
npm run -w data-tools class-sources:scan -- --chm-root <independent-chm-repo> --rules-db <rules-clean.sqlite> --content-db <content.sqlite> --scope <scope.json> --out <new-private-output-directory>
```

From `data-tools`, omit `-w data-tools`. All CLI paths, including relative input
and output paths, resolve from this code checkout's repository root, independently
of the shell's working directory. The existing root `.env` / `DATA_REPO_PATH`
mechanism selects the private data repository. Publication identities use its
`rulebook-publications/publications.jsonl` and the existing metadata validator;
the scanner refuses mismatches with the read-only rules DB.

The output must be a new directory inside an existing private-data subdirectory.
There is no overwrite flag. Keep independent CHM and operator DB paths outside
removable worktrees. The command requires a clean CHM Git checkout, records its
actual revision/status, and checks them again before writing output. It refuses
source symlinks, traversal, remote source URLs and app-state filenames. Rules and
content databases are opened with `readonly` and `fileMustExist`; they are never
copied, migrated or written. Do not pass app-state through this workflow.

Run `npm run -w data-tools class-sources:test` for portable synthetic coverage.
It includes both caller directories, GBK/UTF-8 and entities, malformed-but-normal
HHC LI nesting, homonyms, reprint variants, cross-book links, spell-list negatives,
review validation, dirty-source rejection and byte-for-byte DB preservation.
The same tests are included in the portable data-tools test entry.

## Scope And Scan Contract

The private scope JSON selects publications explicitly, rather than guessing from
an abbreviation or spell-class index. For example (synthetic identities):

```json
{
  "schemaVersion": 1,
  "books": [
    { "publicationId": 1, "prefix": "group/Alpha", "contentsLabel": "[A] Alpha" }
  ],
  "pages": [],
  "probes": [{ "classId": 42, "publicationId": 1 }]
}
```

`prefix` is a slash-separated CHM-root-relative directory. `contentsLabel` is
the exact decoded publication node label and must point into that prefix.
Bindings may not overlap. `pages` lists explicit CHM-root-relative HTML/HTM
files inside the selected books to inspect after directory review. Start empty;
add only pages needed to resolve directory gaps. `probes` adds explicit class/book
negative or unknown cases that have no existing DB variant for that pair.

For a bounded review of particular existing variants, add optional `variantIds`,
a nonempty array of unique positive DB variant IDs. Every ID must exist and belong
to a scoped book. Omit the field to retain the default of all variants in those
books. Directory evidence and book inventory remain book-wide, but candidates and
proposal coverage include only selected variants plus probes. Off-target entries
are unreviewed, rather than implicitly absent. Probes cannot duplicate an existing
DB class/book variant, even when that variant is outside the selected IDs.

The scanner reads `Contents.hhc` and `Index.hhk` first. It honors supported HTML
charset declarations (UTF-8, GBK/GB2312/GB18030), defaults legacy files to GBK,
decodes HTML entities, and rejects replacement-character decoding. UL ancestry
is retained without browser repair of the HHC's omitted LI closing tags.
Each scoped evidence row retains its source file and one-based sitemap ordinal,
decoded label, ancestors, target path, target existence, target publication and
directory-context publication. Cross-book references therefore retain both ends.

Only requested pages are read. Their short title/heading/bold labels and the
first 1,000 normalized body characters are retained privately. Heading ordinals
refer to the ordered, deduplicated extracted labels; `:lead` identifies the
bounded introductory excerpt. These locators are bound to the recorded source
revision. Leads are review context and never feed automatic name matching.

The rules DB's `dnd_characterclassvariant` supplies existing variant ID,
class ID, publication ID and page leads. The content DB supplies Chinese aliases.
Exact normalized names, explicit bilingual directory/heading labels and existing
aliases produce candidate matches; qualifiers in DB identities are preserved.
Every matching class ID is retained when names collide. A name hit is never
automatic acceptance. A heuristic evidence `role` is only a review aid: for
example a class may appear beneath a broad directory mentioning variants.

Outputs:

- `scope.json` and `identities.json`: declared selection and read-only identity
  snapshots, including publication metadata and Chinese aliases.
- `evidence.jsonl`: scoped directory rows and explicitly requested page labels/leads.
- `matches.jsonl`: exact candidate class IDs for each evidence locator.
- `candidates.jsonl`: every selected existing DB variant plus declared probes,
  with a stable `publicationId:classId:variantId` key (`probe` for null variant ID).
- `report.json`: source state, input paths, full file count/bytes from metadata,
  actual bytes read, candidate coverage, runtime, process peak RSS and output size.
- `proposals.jsonl`: emitted only when a complete reviewed proposal input is supplied.

The HTML inventory uses filesystem metadata; it does not read all HTML bodies.
The scan processes files sequentially. Memory scales with directory evidence and
one selected HTML DOM, rather than the whole source corpus. Initial pilot budgets
are below 512 MiB peak RSS and 50 MiB output. Measure each new slice before
expanding its book/page selection; no parallel workers or paid APIs are required.

## Review Contract And Meaning

Supply `--proposals <reviewed-json>` to rerun the same source scan and validate
one proposal for every candidate key. The envelope requires `schemaVersion: 1`,
`sourceRevision` equal to the actual CHM Git revision, and a `rows` array. A stale
revision is rejected, so old ordinal references cannot silently bind new source
content. Each row contains exactly:

```json
{
  "key": "1:42:10",
  "disposition": "ambiguous",
  "relation": "variant",
  "evidenceIds": ["Contents.hhc:12"],
  "rationale": "Specific identity distinction still requires review."
}
```

The proposed dispositions mean:

- `accepted`: the reviewer proposes a formally introduced/reprinted class or
  distinct variant identity, with explicit supporting evidence.
- `ambiguous`: an identified source/identity/granularity question remains.
- `absent`: no suitable evidence was found within the declared CHM scope. This
  does not assert that a publication lacks the class.
- `not-applicable`: the specific probe is a spell-list reference, cross-book
  mention, alternative feature rather than that whole class, or another excluded
  relation. It does not reject all possible class/feature content in the book.

Relations are `class-entry`, `variant`, `reprint`, `spell-list-reference`,
`cross-book-reference`, or `unknown`. Keep multiple publication/variant rows even
when the DB shares one class ID. In particular, a generic-class variant and an
NPC class can share a historical ID without being interchangeable sources.

Validation requires known unique keys, complete scope coverage, known evidence
locators relevant to that publication, and nonempty rationales. Accepted proposals
must include an existing book-local class/variant entry, and cannot use a
reference-only relation. These checks validate structure and basic boundaries;
they do not certify semantic identity or a reviewer's reasoning. Review the actual
evidence and any homonyms before proposing acceptance. A cross-book target or a
DB page number alone is insufficient to prove a reprint.

Every emitted proposal has `schemaVersion: 1`, `reviewStatus: "proposed"`, the
CHM `sourceRevision`, candidate identity/page/name/aliases, disposition, relation,
evidence IDs and rationale. No generated row grants content acceptance or write
authority. Main-gate review remains required; consumer storage/API work is a
separate scope. Preserve the scoped scan alongside its proposals so readers can
resolve evidence and distinguish untranslated aliases from missing source pages.

Unknown follow-up should stay specific: compare an identified DB variant's
requirements or replacement abilities, inspect a named missing section, or look
up a targeted official index. Do not broaden a pilot into full PDF collection,
translation, or an unbounded full-corpus review.

Source location and identity granularity are separate questions. A DB row that
aggregates independently selectable alternatives can have a confirmed source
while remaining ambiguous as a class mapping. Record that distinction and the
individual options in private review notes; do not treat the existing `variant`
relation as a decision to publish or count a family as one class. A supplemental
external index likewise does not fill a missing CHM entry by itself. See the
[bounded residual handoff](../reports/class-source-residuals-612.md) for the
evidence and reproduction example.
