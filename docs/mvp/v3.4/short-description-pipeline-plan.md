# Short Description Pipeline Plan

Status: planned v3.4 data-workflow track.

This plan covers short descriptions for spells, maneuvers, and class-facing
metadata. It is deliberately data-tools first: extract and review source-backed
short text before changing runtime schema, APIs, or UI behavior.

## User Outcome

Browse, Search, and related reference views can eventually show concise,
source-backed descriptions instead of forcing users to open every detail page.

The first durable win is a repeatable pipeline that can tell us which short
descriptions exist, where they came from, and what still needs a source
decision.

## Current Findings

- v3.3 explicitly deferred this work.
- CHM source ownership is already clear:
  - maintained source of truth: `data/chm-clean/`
  - raw comparison input: `data/chm-raw/`
  - full raw CHM decompile: `data/chm-raw-full/`
  - generated parser output: `data-tools/out/zh-parser/`
- The current Chinese parser extracts full spell descriptions only.
  `ZhMatchedRecord` has no short-description field.
- The app DB currently acts as app-owned content DB rather than a real user-data
  DB. Its content overlays are asymmetric today:
  - `I18nCharacterClassText.shortDescriptionText` already exists.
  - `I18nSpellText` has translated name and full description fields, but no
    short-description field.
- Future user-facing state should get a separate DB boundary review instead of
  continuing to mix content overlays with user/app-state tables by default.
- The strongest confirmed Chinese spell short-description sources are the class
  spell overview set under `data/chm-raw-full/职业法术列表/` and the domain spell
  overview set under `data/chm-raw-full/领域法术/`. These pages use dense
  one-line records such as `zhName (English Name): summary`.
- A first-pass inventory of that directory found:
  - `14` class-list pages
  - `4,642` candidate occurrences
  - `2,529` unique English names
  - about `2,399` unique names matched after exact matching, existing aliases,
    and stripping trailing component markers such as `M` and `F`
  - about `130` unique misses left for alias/source cleanup
- The first implemented Chinese summary extractor command is:

```bash
npm run -w data-tools zh:summaries:extract
```

  Its current baseline scans `101` files, including the class-list pages, the
  domain-list pages, and the clean ToB maneuver list, finds `5,445` candidate
  occurrences, expands to `6,527` matched records, leaves `0` unmatched records,
  and reports `1,833` duplicate targets, including `695` conflicting duplicate
  targets and `656` normalized conflicting duplicate targets, for review under
  `data-tools/out/zh-parser/summary/`. It also reports `304` alias-assisted
  matches, `26` matches that require alias review, and `153` alias audit
  entries.
  The zero-unmatched baseline relies on the shared CHM English-name alias layer,
  including typo fixes and compact slash-name expansion for alignment,
  protection, mantle, and wall spell families. Alias-assisted matches are
  reviewable through `alias-audit.json`; semantic-risk and source-specific
  aliases should not be promoted to import without human or cross-source review.
- A secondary confirmed short-summary source exists under
  `data/chm-raw-full/各种其他类法术及超能/`, but the first probe over `机关术.htm`
  mixes infusion and non-spell content and should stay out of the default spell
  short-description extractor until it has a dedicated parser.
- The ToB maneuver list under `data/chm-clean/九剑/招数列表.htm` is also a
  valid one-line summary source, but it should supplement the class-list spell
  source rather than define the whole pipeline.
- Current `zh:parse` does not consume that ToB list. ToB detail pages already
  provide the full matched records; the list is a separate summary source.
- English short descriptions have a narrower source decision:
  - IMarvinTPA is the planned local source for English short descriptions,
    including extension-book coverage.
  - SRD/Core English brief descriptions remain useful as a source-marked subset
    and cross-check.
  - broader extension mirrors such as Complete SRD / DnDTools-style pages have
    useful `Source / Spell Name / Brief Description` data, but should remain
    research and comparison inputs unless explicitly adopted as local-only
    source data.

## Goals

- Add a repeatable short-summary extraction workflow under `data-tools`.
- Start with source-backed Chinese summaries from the full CHM class spell
  overview pages.
- Promote adopted full-CHM overview pages into a maintained clean or summary
  source path before importing, instead of treating the whole decompile as the
  app-owned source of truth.
- Treat ToB `九剑/招数列表.htm` as the first maneuver summary source.
- Reuse existing CHM matching and alias infrastructure where possible.
- Produce reviewable generated artifacts before import:
  - matched summaries
  - unmatched summaries
  - duplicate or conflicting source keys
  - length and text-quality markers
- Keep frontend UI copy i18n separate from spell/content short descriptions.
- Decide schema, API, and UI exposure only after the source coverage and partial
  coverage behavior are understood.
- Keep source-data files and fetched text out of the parent public repo.
- Keep translation review reportable, but do not make full manual translation
  QA a v3.4 hard gate.

## Non-Goals

- Do not parse local CHM sources at server runtime.
- Do not create AI-generated summaries as a substitute for source-backed text.
- Do not machine-translate Chinese short descriptions into default English
  summaries.
- Do not commit fetched IMarvinTPA or other mirror/source text to the parent
  repo.
- Do not require full translation and proofreading completion before the
  extractor/import/API/UI pipeline is accepted.
- Do not maintain a parallel Markdown copy of CHM content unless there is a
  clear editing benefit later.
- Do not add broad spell/class schema fields until the importer and consumer
  behavior are clear.
- Do not block unrelated v3.4 frontend design or i18n work on this pipeline.

## Source-Of-Truth Rules

- Maintained Chinese source text comes from `data/chm-clean/`.
- `data/chm-raw/` is only for comparison or re-preprocessing.
- `data/chm-raw/` and `data/chm-raw-full/` are local ignored static CHM inputs.
  They may live under the nested `data/` directory, but they are not maintained
  source-of-truth files.
- Do not point a runtime or importer directly at all of `chm-raw-full/`.
  Adopted pages should have a smaller maintained path or generated review
  artifact first.
- Generated reports belong under `data-tools/out/zh-parser/summary/`.
- Imported app-owned content overlays belong in the current app DB workflow, not
  the rules DB. Keep short summaries in a summary-specific table rather than
  extending full-description/name overlay rows by default.
- If short descriptions become content-bearing patch inputs, those inputs belong
  in the nested local `data/` repo, not the parent repo.
- English SRD short-description imports must keep source provenance separate
  from Chinese CHM provenance.
- IMarvinTPA fetched data, if used, is local-only source data. Keep raw fetched
  outputs ignored or versioned only in the nested `data/` repo according to the
  data repo policy for local source data.
- Other non-adopted English mirrors may be used for coverage analysis or manual
  comparison only.

## English Source Decision

The English source investigation found useful but uneven sources.

IMarvinTPA is the planned English short-description source for v3.4 local data
work. It appears to provide the broadest searchable short-description coverage,
including Spell Compendium and common extension books. Treat it as a local data
source, not a parent-repo dependency: the parent repo should contain fetchers,
parsers, validators, and redacted fixtures only.

Initial live probing uses:

```bash
npm run -w data-tools en:summaries:probe
```

The probe posts to IMarvinTPA's `SearchList.php` with `Small=5` for compact
result rows and `Small=2` for source-label hints. It is intentionally
candidate-based and rate-limited rather than a full-site crawler. Default
behavior is one candidate at a time with at least 750 ms between HTTP requests;
the command rejects concurrency above 3. Generated probe reports live under
`data-tools/out/en-summaries/` and must not be committed as parent-repo source
data.

`d20srd.org` and SRD class spell lists provide English one-line descriptions for
the OGL/SRD spell set. They remain useful for SRD/Core cross-checks and as a
clearly source-marked subset.

`srd.dndtools.org` Complete SRD class lists expose a technically convenient
`Source / Spell Name / Brief Description` table. A first-pass check over common
class-list pages found roughly:

- `3,976` occurrence rows
- `2,029` unique English spell names
- `1,955` exact local rules DB name hits before applying project aliases
- source labels covering Core, PHBII, CM, CAr, CD, BoED, MH, Frost, Sand,
  Planar, and other extension books
- no Spell Compendium / SpC source rows in the sampled class-list pages

Because this source overlaps with extension content, keep it out of direct
parent-repo data. It is useful for estimating coverage, comparing summaries, and
identifying aliases.

DnDTools-style spell detail mirrors and `dnd.arkalseif.info` cover many
extension books, including Spell Compendium, but the pages inspected are spell
detail/listing sources rather than a stable reusable short-summary corpus.
Treat them as manual verification references only.

Crystal Keep / DnD3.5Index PDFs have English summaries for some older extension
books, but coverage is incomplete for this project and PDF extraction would be
fragile. Keep them out of the first pipeline.

## Work Phases

### 1. Source Inventory

Inspect local CHM sources for actual short-summary candidates.

Initial targets:

- `data/chm-raw-full/职业法术列表/*.htm`
- `data/chm-clean/九剑/招数列表.htm`
- `data/chm-raw-full/领域法术/*.htm`
- `data/chm-raw-full/各种其他类法术及超能/*.htm` as a later dedicated
  non-spell/infusion source, not part of the default spell summary extractor

Expected findings to record:

- source file path
- source shape, such as paragraph list or table
- candidate count
- matched count using current rules DB data
- unmatched count and likely reason
- duplicate English or Chinese names
- duplicate or conflicting summaries for the same spell
- whether the source describes spells, maneuvers, classes, or other entities
- owner context such as class, domain, spell level, school heading, or source
  prefix when present

Do not treat ordinary spell stat/effect tables as short descriptions just
because they are tables.

### 2. Extractor And Normalization

Add a separate summary extractor rather than extending the full-description
parser record shape too early.

Suggested command shape:

```bash
npm run -w data-tools zh:summaries:extract
```

Suggested generated output:

```text
data-tools/out/zh-parser/summary/
|- matched.json
|- unmatched.json
|- duplicates.json
|- conflicts.json
|- alias-audit.json
|- summary.json
```

`duplicates.json` keeps every repeated target. `conflicts.json` is the narrower
manual-review entry point after punctuation, whitespace, quote, and case
normalization. `alias-audit.json` records alias-assisted matches, resolved names,
alias chains, alias categories, and whether the alias needs review before import.

Suggested record fields:

- `sourceKey`
- `file`
- `kind`, for example `spell`, `maneuver`, `domain-spell`, or `class`
- `sourceKind`, for example `class-list`, `domain-list`, or `maneuver-list`
- `listOwner`, such as the class, domain, or maneuver discipline page owner
- `spellLevel`, when the source page provides a level heading
- `schoolGroup`, when a class list groups arcane spells by school
- `sourceLabelHint`, when the source line has a leading Chinese source prefix
- `zhName`
- `enName`
- `componentMarkers`, such as `M`, `F`, `DF`, or `XP`, when stripped from the
  English name
- `summaryText`
- `summaryHtml`, only if preserving inline formatting is useful
- `summaryLang`
- `sourceProvenance`, such as `zh-chm-class-list`, `zh-chm-domain-list`, or
  `en-srd-class-list`
- `rulebookAbbr`
- `spellId` or future entity id
- `matchMethod`
- `resolvedEnName`
- `aliasChain`
- `aliasCategories`
- `aliasReview`

Keep the source summary literal. Normalize whitespace and punctuation, but do
not rewrite the prose into a new summary.

The class-list extractor should normalize spell-list-specific names before
matching:

- strip trailing component markers from the parenthetical English name
- preserve those markers separately for QA
- capture leading Chinese source prefixes such as `（万法大全）`
- report slash-combined names such as `Detect Chaos/Evil/Good/Law` for manual
  expansion or exclusion instead of pretending they are one spell
- reuse existing global alias maps for spelling and punctuation drift

The English extractor, if added, should start with SRD/Core only:

- support IMarvinTPA as local-only source data
- record source provenance, such as `en-imarvintpa` or `en-srd-class-list`
- keep fetched raw text out of the parent repo
- allow non-adopted mirror rows only in separate research reports
- do not backfill missing English extension summaries from Chinese translations
  or mirror text
- keep live fetches rate-limited and candidate-scoped until an adopted local
  source dataset exists

### 3. Matching And Alias Review

Reuse existing spell matching where the entity is a rules DB spell or maneuver.

The extractor should report:

- known exact matches
- component-marker-stripped matches
- alias-assisted matches
- alias chains, alias categories, and review-required alias matches
- missing rules DB rows
- unresolved names
- source-key duplicates
- source labels that fail normalization
- competing summaries for the same spell from multiple class/domain lists

Single dirty source names should usually be fixed in `data/chm-clean/` when the
correct source text is clear. Parser aliases are better for recurring source
patterns or legitimate alternate names.

### 4. QA And Acceptance Reports

Add summary-specific QA after the extractor exists.

Current command:

```bash
npm run -w data-tools summaries:qa
```

It reads the generated Chinese summary reports under
`data-tools/out/zh-parser/summary/` and the generated English IMarvinTPA reports
under `data-tools/out/en-summaries/`, then writes:

```text
data-tools/out/short-desc-qa/
|- issues.json
|- summary.json
|- review-queues/
   |- zh-alias-required.jsonl
   |- zh-conflicts.jsonl
   |- en-strict35-missing.jsonl
   |- cross-coverage.jsonl
   |- spot-check.jsonl
   |- import-blockers.jsonl
   |- en-add-candidates.jsonl
   |- en-resolved-candidates.jsonl
   |- en-resolved-source-mismatches.jsonl
   |- en-rules-db-gaps.jsonl
   |- en-source-mismatches.jsonl
   |- en-deferred-pdf.jsonl
```

If validated review decisions exist under
`data-tools/out/short-desc-qa/review-results/`, the command validates decision
keys against the generated queues and records review coverage in `summary.json`.
It then promotes decisions into follow-up queues:

- `import-blockers.jsonl` for reviewed rows that must not enter import
  candidates yet, such as wrong aliases, source errors, source mismatches, or
  PDF-deferred rows
- `en-add-candidates.jsonl` for English rows that can be handled by candidate or
  alias normalization and are not yet covered by the current matching rules
- `en-resolved-candidates.jsonl` for reviewed add-candidate rows already covered
  by the current IMarvinTPA name-matching rules
- `en-resolved-source-mismatches.jsonl` for reviewed source-mismatch rows that
  are already covered by conservative IMarvinTPA title-normalization rules
- `en-rules-db-gaps.jsonl` for English rows that appear to require future rules
  DB patch work before short-description import

The current local QA snapshot with review decisions has `0` errors, `2` warning
categories, and `4` info categories. It reports `4` reviewed Chinese alias audit
entries, `80` reviewed English strict-3.5 missing candidates, `3` import
blockers, `19` resolved English candidate-normalization rows, `11` resolved
English source-mismatch rows, `0` remaining English add-candidate rows, `1`
remaining English source-mismatch row, `47` English rules DB gaps, `654` Chinese
conflict rows, and `1,273` cross-language coverage rows. The large queues
remain review leads unless a future import gate explicitly consumes them.

The current import blockers are all English-side review blockers:
`Foe's Burning Blood` remains ambiguous between local `Burning Blood` and
`Beltyn's Burning Blood`, while `Crown of Despair` and `Touch of the Pharaoh`
remain PDF-deferred because IMarvinTPA cross-labels them between Eberron
Campaign Setting and Dragon Magazine #331. Earlier Chinese blockers were
cleared by mapping the CHM `Bigby's Striking Hand` typo to local
`Bigby's Striking Fist`, normalizing the `列表:` source prefix before matching,
and routing `Dance Of Blade` to the automatic-blade spell family instead of
`Bladeweave`.

The reviewed English rules DB gaps now have a source-to-patch triage path:

```bash
npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch spells/short-desc-rules-gaps.generated.jsonl
npm run -w data-tools rules:spells:validate -- spells/short-desc-rules-gaps.generated.jsonl
npm run -w data-tools rules:spells:apply -- --dry-run spells/short-desc-rules-gaps.generated.jsonl
```

The current local run generates and validates `7` structured spell patch
operations from local `spells-full` parsed data: `Dominate Living Construct`,
`Elemental Prod`, `Energy Alteration`, `Indisputable Possession`,
`Metamagic Item`, `Power Surge`, and `Suppress Requirement`. The remaining
`40` rules DB gaps are still blocked before import: `36` have no exact local
`spells-full` parsed source row, and `4` Player's Guide to Eberron rows have
parsed source rows but include class levels that are not currently resolvable
against the local rules DB class table. Do not treat the generated patch file as
applied until the rules DB write-capable workflow is explicitly run.

Good checks:

- empty summary text
- very short summary text
- unexpectedly long summary text
- obvious mojibake
- duplicate source keys
- duplicate `entity + lang + variant` targets
- conflicting summaries for the same target
- unstripped component markers in canonical English names
- unmatched records in adopted source files
- raw HTML or formatting that should not enter `summaryText`
- review-required alias matches
- English strict-3.5 source rows missing from the local candidate/DB line
- zh/en coverage differences after normalized-name matching

Info markers are fine for review leads. Hard errors should be reserved for
records that would make import unsafe.

### 5. Schema And Import Decision

Make this a gate after extraction review, not the first step.

Adopt this v3.4 shape:

- Keep the current app DB as the app-owned content DB for v3.4.
- Do not add `shortDescriptionText` to `I18nSpellText`. That table remains the
  translated name plus full-description overlay table.
- Add a separate source-backed spell summary table in the app DB.
- Keep `I18nCharacterClassText.shortDescriptionText` as-is for future class
  summaries; do not block spell summary import on class summary curation.
- Do not add HTML for short descriptions in v3.4. The adopted sources are
  one-line plain-text summaries, and list/detail UI should render text only.
- Store durable source provenance for imported summaries. Keep richer extraction
  and review provenance in import reports and local data-tool artifacts.

The app DB patch should be a normal Prisma schema change plus generated client
refresh:

```prisma
model I18nSpellSummaryText {
  id         String @id @default(cuid())
  spellId    Int
  rulebookId Int
  lang       String
  variant    String

  summaryText  String
  sourceKey    String?
  sourceName   String?
  reviewStatus String @default("accepted")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([spellId, lang, variant])
  @@index([lang, variant, rulebookId])
  @@index([lang, rulebookId])
  @@index([rulebookId, spellId])
}
```

The local app DB is not migrated at runtime. Use an explicit data-prep command
that can run after schema/client generation and before import. The command
should be idempotent and should not replace existing `I18nSpellText`
name/full-description overlays.

Planned import command:

```bash
npm run -w data-tools summaries:import -- --dry-run
npm run -w data-tools summaries:import
```

Import behavior:

- Read reviewed/generated candidates, not raw CHM or raw fetched HTML directly.
- Upsert by `spellId + lang + variant`.
- For `lang=zh`, `variant=chm`, create or update only
  `I18nSpellSummaryText` rows when a selected Chinese summary exists.
- For `lang=en`, `variant=imarvin`, create or update
  `I18nSpellSummaryText` rows with `summaryText`, `sourceKey`, source name, and
  review status.
- Do not delete `I18nSpellText` or `I18nSpellSummaryText` rows during summary
  import.
- Skip rows with unresolved conflicts, import blockers, missing spell ids,
  unresolved source mismatches, or rules DB gaps.
- Emit an import report with inserted, updated, unchanged, skipped, and
  blocker counts by language/source.

English source policy:

- Import only rows matched to existing local spell ids.
- Do not import `en-rules-db-gaps` until the relevant rules DB patch has been
  applied and the English candidate/source report has been refreshed.
- Treat the 7 generated `short-desc-rules-gaps` spell patches as a separate
  rules DB preparation step, not as part of summary import.
- Preserve `sourceKey` for every imported `en/imarvin` row so imported English
  summary provenance remains durable outside transient data-tool reports.

Chinese source policy:

- First import pass should use the conflict-reviewed/selected summary set once a
  deterministic selected-output file exists.
- Until then, the import command may support a conservative mode that imports
  only non-conflicting matched summaries and reports skipped conflicts.
- Do not machine-translate Chinese summaries into English or English summaries
  into Chinese.

### 6. API And UI Consumption

Expose summaries only after the data path is accepted.

Expose spell summaries through the existing overlay path rather than a new API
surface.

Contract shape:

```ts
export type Lang = "en" | "zh";

export type I18nNameOverlay = {
  lang: Lang;
  variant?: string | undefined;
  name?: string | undefined;
};

export type I18nSpellSummaryOverlay = {
  lang: Lang;
  variant?: string | undefined;
  shortDescription?: string | undefined;
  sourceKey?: string | undefined;
};

export type I18nSpellDetailOverlay = I18nNameOverlay & {
  description?: {
    text?: string | undefined;
    html?: string | undefined;
  } | undefined;
  summary?: I18nSpellSummaryOverlay | undefined;
};
```

Server mapping:

- Keep `I18nSpellText` queries responsible for translated names and full
  descriptions.
- Add summary-specific repository queries against `I18nSpellSummaryText` for
  list/search/batch and detail responses.
- `mapSpellItem` should accept both the optional name overlay row and optional
  summary row, then map summaries to `spell.i18n.summary.shortDescription` or an
  equivalent summary sub-object.
- `mapSpellDetail` should keep full-description overlay data separate from the
  summary overlay.
- Use the row `lang` returned from app DB/content DB queries. Do not hard-code
  summary overlays as `lang: "zh"` once English summaries are exposed.
- For `lang=en`, query English `variant=imarvin` summaries while keeping
  `queryIdsByI18nName` non-English unless English overlay search is deliberately
  adopted.

Frontend consumption:

- Add `getSpellShortDescription(spell, lang)` under
  `web/app/i18n/display/` mirroring `getSpellDescription`.
- `SpellCard` should render one optional short-description line between the
  title/rulebook row and metadata rows. If missing, render nothing and keep
  current spacing compact.
- `Search` and `Browse` inherit the display through `SpellCard`; no page-level
  rendering fork is needed.
- `SpellDetailPage` should render the same short description under the header
  title as a muted lead line. It should not duplicate the full Description
  section.
- Spellbook/favorites batch views also inherit the field through `SpellCard` if
  they use it; otherwise no special UI is required.

Fallback rules:

- In Chinese mode, prefer `zh/chm` short description; if absent, do not show an
  English fallback in v3.4 unless a later explicit UI decision asks for
  bilingual fallback.
- In English mode, show `en/imarvin` short description when imported; otherwise
  show nothing.
- Never show placeholder text for missing summaries.
- Keep the field out of UI-copy i18next files; this is content overlay data, not
  interface text.

Validation:

- Add API shape tests for `i18n.shortDescription` on search/by-level/batch and
  detail when fixture data exists.
- Add mapper-level or repository tests if fixture coverage is too sparse.
- Add a focused frontend test for `getSpellShortDescription` fallback behavior.
- Existing Browse/Search smoke behavior should remain unchanged when summaries
  are absent.

## Acceptance Criteria

- A summary extractor can run against `data/chm-clean/` and write reviewable
  artifacts under `data-tools/out/zh-parser/summary/`.
- The extractor can inventory adopted pages from `data/chm-raw-full/` without
  importing directly from the entire raw decompile.
- Adopted source files have stable matched/unmatched counts.
- Unmatched records from adopted source files are either resolved, documented as
  deferred, or excluded from import.
- Alias-assisted matches are separately auditable, and review-required aliases
  are either confirmed, documented as deferred, or excluded from import.
- Class/domain-list parsing handles level headings, optional school headings,
  leading source prefixes, and trailing component markers.
- Summary QA reports duplicate targets, empty text, unexpected length, mojibake,
  and unsafe HTML/text drift.
- Existing `zh:parse`, `zh:qa`, and Chinese import workflows do not regress.
- Schema/API changes, if made, have the closest server or contract tests.
- UI changes, if made, preserve Browse/Search behavior when summaries are
  missing.
- English short descriptions are not invented without a documented source
  decision.
- Fetched English source text is not committed to the parent repo.
- Imported English summaries keep explicit source provenance.
- Spell summaries are stored in a summary-specific app DB table, not appended to
  `I18nSpellText`.
- Mechanical QA reports missing translations, zh/en coverage differences,
  duplicate summaries, conflicts, suspicious length, and obvious mojibake.
- Full manual translation/proofreading is not required for v3.4 acceptance.
  A small spot-check set is enough to validate the workflow.

## Open Questions

- Should adopted class-list overview pages be copied into `data/chm-clean/`, a
  new `data/chm-summary/` source path, or kept as raw-full inputs plus generated
  review artifacts?
- Should domain-list summaries participate in the first import, or only serve as
  duplicate/conflict evidence for class-list spell summaries?
- Should class short descriptions be manually curated from rules DB English
  `short_description`, imported from CHM only, or deferred?
- Should IMarvinTPA fetched data be ignored raw cache plus generated structured
  patches, or should selected structured local source data be versioned in the
  nested `data/` repo?
- How large should the v3.4 translation/proofreading spot-check set be?
- Should future class summaries use the existing `I18nCharacterClassText` field
  or a parallel summary table for consistency with spell summaries?
- When real user/app-state data ships, should the current app DB be renamed or
  split into a generated content DB plus a separate user app-state DB?
