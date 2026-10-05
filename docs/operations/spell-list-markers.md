# Printed spell-list markers

Printed list markers describe the original list occurrence. In SC, `M` denotes
a costly material, `F` a focus not normally included in a component pouch, and
`X` caster-paid XP. Complete spell components (`V/S/M/AF/DF/XP`, etc.) do not
establish these printed markers. Neither the scanner nor selector reads those
component flags.

## Source choice

Apply the repository's [source and quality tradeoffs](../feature-workflow.md#source-and-quality-tradeoffs).
There is no verified database field for costly-material, special-focus or
caster-paid-XP list marks. Reusing the printed M/F/X marks is sufficient for this
display; do not require a new full-text spell audit to reconstruct them. Existing
unknown omission and identity checks still apply.

The SC dagger answers a different question: whether the bound spell belongs to
SC. Use verified database book membership for that display, correcting printed
omissions or false marks. Retain `daggerPrinted` as source evidence, not display
authority. This policy does not change the existing M/F/X processor's eligibility
checks or automatically accept ambiguous spell identities; the domain consumer
implements dagger display separately.

## Candidate collection

The maintained command reads existing PyMuPDF JSONL spans; it does not extract
a PDF or open a database. From the repository root:

```powershell
npm run -w data-tools sc:list-markers:candidates -- --output dice-qa/books/86/issue-487/candidates-new.json
```

From `data-tools`, omit `-w data-tools`. `--input` and `--output` are relative to
the configured private `DATA_REPO_PATH`; `--data-root` can supply an explicit
absolute private root. The default input is the existing SC list-page extraction
at `dice-qa/books/86/issue-259/relation-authority/sc-lists-245-277.jsonl`.
The output's parent must already exist, remain inside the real private root, and
the output must be a new file. No force/overwrite option is provided.

The scan discovers superscript spans immediately following a bold name label.
It produces **marked-occurrence candidates only**, including unknown anomalous
superscripts. It does not prove that every printed row was found or assign spell
identities, owners, levels, or acceptance. `inspectOccurrence` reads explicitly
selected name-span indices for reviewed unmarked rows. An incomplete name line
without a visible colon delimiter stays unknown. A truncated name-span range
cannot establish absence: both the start and end must cover the full contiguous
bold label, including any printed prefix. Source text, span geometry, extractor
metadata and page/block/line/name-span locators stay in the private output.

The input is small enough for an in-memory scan. Processing is proportional to
the input spans and emitted evidence, with memory bounded by the input and candidate output.
No API or model calls are made.

## Automatic SC processing

After the reviewed pilot, `sc:list-markers:auto` processes all **existing cached**
SC class/domain list inputs in one pass. It reads immutable extraction and normalized
Git blobs, never a database or complete component flags:

```powershell
npm run -w data-tools sc:list-markers:auto -- --data-root G:/spell-book/data --output dice-qa/books/86/issue-499/processed-new.json
```

From `data-tools`, omit `-w data-tools`. The data root must be absolute;
output is data-root-relative with an existing parent, and must be new. There is
no overwrite option. `--input-revision` accepts a full private Git commit; the
default fixed input revision and both logical paths are recorded in the output.
Code paths resolve from the owning checkout through the existing root helper.

An accepted supplemental domain extraction can be appended with
`--domain-input <data-relative JSONL> --domain-revision <full private Git commit>`.
Both options are required together. The additional input is bounded to p278–285
and must not duplicate page indices in the original cache. The combined pass
preserves each occurrence's actual extraction path and both immutable revisions.
The original cache-only command remains reproducible. Supplied p271–285 page
coverage clears the cache-gap field; original-book completeness still depends
on the owning domain source handoff, not this page-index check.

The processor orders the cached two-column geometry, reads printed class/level
or domain headings, and enumerates bold labels, including unmarked labels.
School prefixes and separately extracted domain level digits are retained in
source spans. Matching uses owner, level, normalized label, stable identity and
explicit SC edition. Typography normalization handles ligatures, curly punctuation
and layout whitespace; it does not rewrite names, combine slash alternatives or
infer annotations from components. A domain label without the SC dagger stays
unknown when it matches an existing SC relationship; it cannot silently exclude
that relationship or establish a machine annotation. This describes the current
M/F/X parser's eligibility check, not the dagger display rule above. Other complete labels
without the dagger remain outside-scope source inventory. Shared Sorcerer/Wizard occurrences can bind
both existing memberships.

The eight planar domains have two rows per level. Their second row can continue
the previous printed level across a page; machine bindings retain and validate
that numbered row as `context.levelSource`. Unnumbered rows in ordinary domains
are not treated as additional memberships. A full-width sources footer is
excluded after both columns, so it does not truncate right-column domain rows.

The output separates `occurrences` (recognized printed source rows),
`relationships` (all existing SC edition targets), and eligible `machine` bindings.
Every target gets a result or reason. Complete labels with explicit M/F/X or
explicit absence can produce machine results; incomplete labels, unmatched or
ambiguous identities, unaccepted relationships and conflicting occurrences stay
unknown. Missing source coverage includes owners absent from these printed lists
as well as appendix pages outside the cache; it is not a count of missing spells.
The default cache covers p245–277, with Oracle only levels 1–5 on p277.
Processing all cached input does **not** establish original-book appendix
completeness; the supplemental domain handoff supplies the remaining pages.

Machine bindings wrap ordinary candidate records with an explicit method,
heading context and spell-name snapshot. Their `reviewStatus` remains `candidate`;
the wrapper does not grant human acceptance or persistent import authority.
The [source-free automatic report](../../data-tools/reports/dice-qa/books/86/sc-automatic-marker-results.json)
locates the frozen private result, exceptions and replay entry. Its accepted
domain-source denominator and SC/outside-scope partition are separate from the
automatic marker statuses: outside-scope source rows can still have unknown
marker evidence. Complete domain source coverage does not make every marker known.

The pass uses O(S log S + R + B) time for per-page ordering and indexed matching,
and O(S + R + B) memory, where S is spans, R relationships and B emitted bindings.
The normalized JSON is read once; no full corpus OCR, model/API calls or new
environment is required. Use a serial 1 GiB Node heap for the fixed private input.

## Storage and review boundary

`SpellListEntry` represents generated class/domain relationships, not PDF rows.
`SpellListMarker` adds separate print annotations without changing relationships
or complete components. Its schema migration is additive; generating a Prisma
client or passing portable tests does not apply it to operator databases.

- `sourceKey` identifies the rulebook and original page/block/line/name-span
  occurrence. `id` also identifies its explicit `listEntryId` binding when bound.
- One printed Sorcerer/Wizard occurrence can bind both existing memberships.
  Multiple printed occurrences of one spell keep distinct source identities.
- `markers` is canonical `MFX` order, including combinations. `null` means
  unknown; `""` means the reviewed complete label has no printed marker.
- `reviewStatus` defaults to `candidate`, independently of the relationship's
  status. An accepted record requires a non-null marker and explicit binding.
- `sourceJson` preserves the exact extraction evidence. `bindingJson` preserves
  the explicit printed label, reviewer, review note and relationship snapshot,
  including qualifiers and the existing relationship review status.

`reviewedRecord` re-reads the supplied extraction and compares the complete
evidence before constructing a record. It does not decide whether the source or
identity mapping is accepted. A task's reviewed proposals remain candidates
until the owning issue's main-gate accepts their exact evidence. This workflow
provides no persistent marker import command or acceptance/clearing shortcut.
Actual DB schema/data application requires its separate accepted inputs and
explicit write authorization.

## Consumer contract

The independent API lives in
`data-tools/src/spell-list-markers/markers.ts` and `storage.ts`:

1. The caller supplies its existing read-only content connection to
   `readPrintedMarkerRecords(db, printedRulebookId)`. A legacy DB without the
   new table returns no records; it is not migrated by this read.
2. Read `id`, `spellId`, `listType`, `ownerLegacyId`, `level`, `rulebookId`,
   `sourceRowId`, `sourceTable`, `rawExtra`, `variantLabel`, `note`, `reviewStatus`
   from the existing `SpellListEntry` rows. `listIdentity(row)` selects the
   exact binding snapshot. The **printed** book ID is separate from the
   relationship's `rulebookId`; a SC domain list can print a PHB spell.
3. For a grouped display row, pass all memberships to
   `selectMembershipMarkers(memberships, printedRulebookId, records)`.
   It returns accepted markers with source IDs, or an explicit unknown status.
   Only accepted annotations whose embedded spans and current binding agree
   are selected. Conflicting accepted appearances, changed qualifiers/identities,
   or unaccepted relationships throw. Unknown memberships remain unknown.
4. For the authorized automatic SC display policy, load the fixed JSON's
   `machine` array and call `selectProcessedMembershipMarkers` from
   `automatic.ts` with the same memberships, printed book and independently
   accepted records. It returns `accepted`, `machine` or `unknown`. Both eligible
   kinds pass the shared embedded-source and current-binding checks; machine
   results also validate their method, complete label, heading and SC name/edition.
   Ordinary candidates have no eligible wrapper and remain unknown. Conflicting
   accepted/machine values and stale or forged bindings throw.
5. `displayMembershipMarkers(memberships, printedRulebookId, acceptedRecords,
   result.machine)` returns marker letters, `""` for known absence, or `null` for
   unknown. HTML omits the superscript when null; unknown does not block export.
   `requireAcceptedMembershipMarkers` remains available for strictly human-accepted
   audits, but must not serve as the whole-HTML gate under this policy. Other
   publication, source and identity preconditions remain with the renderer owner.

The module does not modify the offline HTML renderer. Renderer owners integrate
this contract in their own change. It must replace complete-component labels at
the printed-list boundary; it must not propagate one relationship's annotation
to every appearance of the spell or use ordinary components as fallback.

## Normalized regeneration

Full normalized replacement does not own print annotations. `importGenerated`
checks for **any** existing `SpellListMarker` row, including candidates, before
replacement and again inside its write transaction. It refuses replacement
until a separately coordinated source-bound marker rebuild can preserve the
bindings. It never clears the marker table. Empty tables and supported old
schemas without the table retain existing import behavior. Summary/search
readers and schema inspection do not acquire this replacement restriction.

## Targeted validation

```powershell
npm run -w data-tools sc:list-markers:test
npm run -w data-tools rules:content:step:test
npm run -w data-tools rules:content:acceptance:portable
npm run -w data-tools typecheck
```

The portable tests use synthetic PDF spans and memory databases. They cover
single/combined markers, absent/unknown/malformed marks, explicit identities,
shared and repeated occurrences, independent review, stale/conflicting bindings,
release blocking, schema constraints, and non-mutating importer refusal.
Synthetic automatic tests also cover machine/human distinction, unknown omission,
school prefixes, shifted columns, missing pages, and conflicting appearances.
Private source QA remains separate from machine processing; machine completeness
is bounded by the cache. The [source-free candidate slice report](../../data-tools/reports/dice-qa/books/86/sc-list-marker-candidate-slice.json)
points to its fixed private review evidence. Follow [DB content workflow](db-content-workflow.md)
for database and activation boundaries.

## Source review handoffs

A source review handoff freezes the exact occurrence keys, complete printed
labels and markers, owner/level heading context, explicit stable relationship
snapshots and exclusions for ambiguous same-name identities. Preserve extractor
ligatures and spacing in evidence; cleaned names assist lookup but do not accept
an identity. Identify which inputs are fixed Git blobs and which original PDFs
are local untracked files requiring a fresh bounded source comparison. Review
applicable official errata and preserve printed annotations independently of
complete component references.

The [source-free Bard proposal report](../../data-tools/reports/dice-qa/books/86/sc-bard-marker-source-proposals.json)
locates a frozen private handoff and its targeted replay checks. Main-gate must
accept that exact evidence revision and the explicit source/binding decisions
before candidates acquire source acceptance. Passing an in-memory accepted
selection simulation does not persist acceptance or authorize renderer publication,
schema application or database writes.

The [source-free Balance proposal report](../../data-tools/reports/dice-qa/books/86/sc-balance-marker-source-proposals.json)
illustrates a complete printed-row denominator with explicit empty markers and
separate SC body scope. Its private evidence preserves out-of-scope publication
identities as source inventory; only the SC subset has binding proposals.
A complete printed list does not expand the body scope or accept other editions.
Automatic processing uses the same APIs and keeps machine results distinct from
these human source decisions. Renderer integration remains owned separately.
