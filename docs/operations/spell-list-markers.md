# Printed spell-list markers

Printed list markers describe the original list occurrence. In SC, `M` denotes
a costly material, `F` a focus not normally included in a component pouch, and
`X` caster-paid XP. Complete spell components (`V/S/M/AF/DF/XP`, etc.) do not
establish these printed markers. Neither the scanner nor selector reads those
component flags.

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
4. Release export uses `requireAcceptedMembershipMarkers` to stop on unknown
   or candidate values. The result is `""` for a confirmed unmarked row, or
   the original marker letters for a superscript. Preview tooling may show
   candidates with their pending status; it cannot call them accepted.

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
Private small-slice source QA remains separate from portable validation and
full coverage acceptance. The [source-free candidate slice report](../../data-tools/reports/dice-qa/books/86/sc-list-marker-candidate-slice.json)
points to its fixed private review evidence. Follow [DB content workflow](db-content-workflow.md)
for database and activation boundaries.
