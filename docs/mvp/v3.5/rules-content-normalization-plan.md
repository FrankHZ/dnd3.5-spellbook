# Rules Content Normalization Plan

Status: first backend/content foundation slice implemented on
`codex/rules-content-normalization`; runtime query migration and frontend
consumers remain planned follow-up work.

## Problem

The current runtime reads the cleaned legacy DnDTools-style rules SQLite through
`server/prisma-rules-clean/schema.prisma`. That schema is useful as an imported
source, but it is not a clean long-term app content model.

Several fields are already structured enough for display, such as rulebooks,
class/domain levels, descriptor joins, and the single school/subschool ids.
Other fields still carry mixed semantics in string columns:

- multi-school, subschool, descriptor, or source notes can be embedded in text
  rather than modeled as relations
- class/domain level `extra` values are meaningful, but remain opaque strings
- casting time, range, duration, saving throw, spell resistance, target, effect,
  area, and extra component text are not queryable facets
- rulebook abbreviations, slugs, and old source conventions leak into runtime
  behavior

Patching the legacy rules DB can fix missing rows, but it does not fix the
underlying shape. v3.5 should make our own normalized rules content model the
canonical runtime target while locking the current `rules-clean.sqlite` as the
legacy baseline used during migration.

## Goals

- Build and maintain a normalized rules content model owned by this project.
- Keep the current legacy `rules-clean` DB as the frozen migration baseline and
  audit trail, not the schema we keep extending forever.
- Move runtime spell and metadata reads toward `CONTENT_DATABASE_URL` after the
  content DB split.
- Preserve raw source values next to normalized facets so display text and
  provenance are not lost.
- Model dirty multi-value fields as relations or typed facets rather than
  string parsing in request handlers.
- Enable finer Browse/Search filters from the frontend without hand-parsing
  legacy columns at query time.
- Keep data-tools responsible for generation, normalization QA, and acceptance
  reports.

## Non-Goals

- Do not rewrite all DnDTools tables. Start with spell-facing tables and the
  metadata required by Browse, Search, detail, and prepared-spell workflows.
- Do not make full bulk Chinese/English translation/proofreading QA part of
  this v3.5 slice.
- Do not add every possible frontend filter at once. Expose the normalized
  query foundation first, then add UI controls in small steps.
- Do not drop raw legacy values after parsing. Raw values are needed for review,
  display fallback, and source debugging.
- Do not keep authoring future data fixes as ad hoc SQL patches once the
  normalized generation path exists.

## Ownership Decision

Use three roles:

- `LEGACY_RULES_DATABASE_URL` or transitional `RULES_DATABASE_URL`: current
  cleaned legacy rules DB, locked as the migration baseline until runtime reads
  move fully to the content DB.
- `CONTENT_DATABASE_URL`: canonical runtime content DB owned by this project,
  including normalized rules-derived tables and app-owned content overlays.
- `APP_STATE_DATABASE_URL`: future user/app-state DB.

This means the old rules DB is no longer the long-term runtime truth. It should
not be replaced with a fresh upstream import during this migration, because the
current frontend and legacy backend queries still depend on its exact prepared
shape. Data-tools should generate normalized content from this locked baseline
plus declared local review inputs, then future runtime work should move reads to
the content DB rather than continuing to evolve the legacy rules DB.

## Proposed Model Areas

### Spell Identity And Appearances

Separate stable spell identity from source appearances:

- spell identity: canonical id, canonical name, stable slug, edition/system
- source appearance: rulebook, page, source slug, printed name, source-specific
  notes
- aliases: old slugs, alternate spellings, localized or source-specific names

This helps with repeated spells across books and cases where the same rules text
appears under different source labels.

### Taxonomy

Normalize taxonomy into relations that can represent multiple values:

- rulebooks and rulebook display labels
- schools with ordered spell-school memberships
- subschools with ordered memberships
- descriptors with joins
- school/subschool raw text and source notes for cases the parser cannot fully
  classify

The model should support multi-school spells and "school plus note" source text
without forcing note text into a single `school_id` column.

### Spell Lists

Replace opaque class/domain level rows with a normalized list-entry model:

- list type: class or domain
- owner id: class id or domain id
- level
- source rulebook
- raw `extra`
- normalized variant label
- optional note or condition

Existing Browse behavior can keep class/domain/level filters, while later UI can
surface variants or notes when they matter.

### Components

Keep existing boolean components, but parse detail text into structured rows:

- component type: verbal, somatic, material, arcane focus, divine focus, XP,
  metabreath, truename, corrupt, other
- raw text
- normalized flags
- optional cost, quantity, consumed/reusable marker, or review note when
  extractable

The first pass can keep material/focus details mostly raw while still moving the
data out of one broad `extra_components` string.

### Casting And Mechanics Facets

Keep raw display strings, but add normalized query facets:

- casting time: action category, amount, unit, raw text
- range: category, distance, unit, raw text
- target/effect/area: raw text plus coarse category when extractable
- duration: category, amount, unit, concentration/discharge markers, raw text
- saving throw: allows save, save type, partial/negates/harmless/object flags,
  raw text
- spell resistance: yes/no/special/harmless/object flags, raw text

These facets should be designed for filtering, not for replacing the published
mechanics prose.

### Provenance And QA

Record enough provenance to explain every normalized value:

- source DB row id
- source table and source field
- source text hash
- normalization rule version
- review status
- warning or issue code for unparsed or ambiguous values

The generator should emit review queues instead of hiding parser uncertainty.

## Data-Tools Plan

1. Add a read-only inventory command for legacy rules columns and distinct dirty
   value patterns.
2. Define normalized content schema and fixture data in the parent repo.
3. Keep source-bearing normalization decisions in the nested local `data/` repo.
4. Build a generator from the locked `rules-clean.sqlite` baseline plus local
   review inputs to normalized content tables or JSONL.
5. Add QA reports:
   - row-count parity with legacy spell, rulebook, class/domain level, and
     descriptor tables
   - unparsed school/subschool/mechanics values
   - multi-value fields that need review
   - class/domain Browse parity
   - Search/detail response parity against current API fixtures
6. Generate the content DB only after reports pass the selected acceptance gate.

## First Implementation Slice

The `codex/rules-content-normalization` branch implements the backend/content
foundation only:

- content DB schema tables named for durable rules content concepts, such as
  `SpellContent`, `SpellTaxonomyFacet`, and `RulesContentIssue`
- `rules:content:audit` for read-only dirty-field inventory over the legacy rules
  DB
- `rules:content:generate` for a rebuildable generated JSON artifact under
  `data-tools/out/rules-content/`
- `rules:content:import` for replacing only generated normalized content tables
  in `CONTENT_DATABASE_URL`
- portable fixture tests for the transform so core normalization remains
  clone-friendly

This slice intentionally does not change runtime spell queries or frontend
consumer behavior. Import is write-capable only when run explicitly; local
acceptance uses read-only generation and existing dry-run import gates.

The follow-up backend parity slice adds a content-backed spell read repository
for representative Search, Browse/by-level, detail, batch, and resolve flows.
Runtime API behavior stays on the legacy rules-backed service by default, but
`SPELL_READ_SOURCE=content` can opt into the normalized content-backed spell
read path for local acceptance and future deployment readiness checks.

### Implemented Shape

The first slice locks the current `rules-clean.sqlite` as the source baseline
and generates normalized rules content into the content DB boundary. The local
runtime SQLite files live under ignored `server/db/local/`; data-bearing source
inputs and rules patch decisions live in the nested local `data/` repo.

Tracked parent-repo artifacts are limited to schema, migrations, generators,
fixtures, validators, tests, and docs:

- `server/db/content/migrations/` owns content DB migrations.
- `server/prisma-content/schema.prisma` owns generated/imported content models.
- `data-tools/src/rules-content/` owns audit, generate, and import commands.
- portable tests cover the core transform without requiring the local rules DB.
- `RulesContentBuild` records source hashes and parent/data commit metadata for
  local provenance checks without committing source data or generated DB files.
- `spells.repo.normalized-content.ts` can hydrate normalized content rows into
  the current spell DTO shape for parity testing without changing the active
  runtime service path.
- `spells.repo.read.ts` centralizes the runtime read-source choice. The default
  remains `rules`; `SPELL_READ_SOURCE=content` routes Search, Browse/by-level,
  detail, batch, and resolve reads through the normalized content repository.

The normalized tables added in this slice are:

- `RulesContentBuild`
- `RulebookContent`
- `SpellContent`
- `SpellAppearance`
- `SpellTaxonomyFacet`
- `SpellListEntry`
- `SpellComponent`
- `SpellMechanicFacet`
- `RulesContentIssue`

## API And Frontend Boundary

Start with API shape and backend queries before adding many controls. The
frontend consumer rollout is owned by
`normalized-rules-frontend-consumer-plan.md`; this section only identifies the
backend-facing query foundation that consumer plan can build on.

Candidate query filters after normalized content exists:

- `schoolIds`
- `subschoolIds`
- `descriptorIds`
- component flags
- casting-time category
- range category
- duration category
- saving throw kind
- spell resistance kind
- list variants or source notes when useful

Search should remain a name/text query plus optional structured filters. Browse
should remain filter-first, but it can gain the same structured facets once the
backend supports them. Frontend controls, URL state, scope summaries, and
consumer validation are planned separately in the frontend consumer plan.

## Migration Strategy

1. Keep current runtime behavior unchanged while generating reports.
2. Build normalized content tables in the content DB beside current overlays.
3. Add repository methods that can read spells from the normalized content DB.
4. Add parity tests comparing current rules-backed responses with normalized
   content-backed responses for representative Browse, Search, detail, batch,
   and resolve flows.
5. Switch runtime reads to the normalized content DB when parity is acceptable.
6. Add fine-grained query contract tests, then follow
   `normalized-rules-frontend-consumer-plan.md` for frontend controls in small
   slices.
7. Keep the legacy rules DB available as the migration baseline until parity is
   complete, but stop treating it as the place for new long-term schema or data
   fixes.

## Acceptance Criteria

Implemented in the first slice:

- A normalized rules content schema exists under the content DB boundary.
- Legacy rules DB access is read-only in normal runtime and data generation
  flows.
- Dirty legacy string values are either normalized, explicitly preserved as raw
  fallback, or emitted into review queues.
- Current Search, Browse/by-level, spell detail, batch, and resolve behavior has
  representative parity tests against the normalized content-backed repository.
- The runtime spell service has an opt-in normalized content read path covered
  by API tests, without changing default query semantics.
- Data-tools can regenerate the normalized content DB from declared inputs.
- Documentation explains when to edit source patches/review decisions instead
  of patching the legacy rules SQLite directly.

Remaining follow-up acceptance:

- Runtime spell reads switch to the normalized content-backed repository by
  default after deployment DB artifact policy is ready.
- Frontend-facing contracts expose at least one new fine-grained structured
  filter backed by normalized data.
- The first frontend consumer slice follows
  `normalized-rules-frontend-consumer-plan.md`.
