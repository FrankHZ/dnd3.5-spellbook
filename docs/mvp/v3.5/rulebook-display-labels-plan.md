# Rulebook Display Labels Plan

Status: implemented. Data-tools audit/report, generated content display
abbreviations, API contract fields, and primary frontend consumers are in place.

## Problem

The rules DB comes from a DnDTools-style source. Its `dnd_rulebook.slug` and
`dnd_rulebook.abbr` values are useful source identifiers, but some are not the
most common reader-facing abbreviations. For example, `Sc_` is a legacy source
abbreviation for Spell Compendium, not a label most users expect to read in the
UI.

Chinese UI has a different problem: showing English abbreviations or slugs is
often less useful than showing the Chinese full rulebook name. A compact English
slug can be dense, but it is not necessarily understandable to domestic Chinese
users.

## Goals

- Audit English rulebook abbreviations and replace uncommon UI labels with
  curated, familiar display abbreviations.
- In Chinese mode, show Chinese full rulebook names instead of English slugs or
  legacy abbreviations.
- Keep legacy rules DB `slug` and `abbr` values stable for source identity,
  imports, parser matching, and rules patch lookup.
- Make display-label decisions reviewable as content data, not hard-coded UI
  exceptions.

## Non-Goals

- Do not rewrite `dnd_rulebook.slug` just to improve UI display.
- Do not assume every English abbreviation has a single universal answer without
  review. Some books have competing common forms.
- Do not change rulebook IDs or rulebook-scoping semantics.
- Do not make Chinese labels abbreviated by default unless a later design pass
  proves full names are unusable in a specific surface.

## Proposed Model

Separate rulebook identity from display metadata:

- `rulebook.id`: stable runtime identity
- `rulebook.slug`: legacy source slug, internal/source lookup
- `rulebook.abbr`: legacy source abbreviation, still available for debugging and
  import compatibility
- English display abbreviation: curated public UI abbreviation
- Chinese display name: localized full name

The likely app/content DB representation is an extension of
`I18nRulebookText` or a summary-style display table with fields equivalent to:

```prisma
model I18nRulebookText {
  rulebookId      Int
  lang            String
  variant         String @default("default")
  name            String?
  displayAbbr     String?
  descriptionText String?

  @@unique([rulebookId, lang, variant])
}
```

For English display abbreviations, allow `lang = "en"` rows or a dedicated
content table. For Chinese, use `name` as the Chinese full display name and
leave `displayAbbr` empty unless a future UI-specific decision requires one.

## Display Rules

- English mode:
  - show curated `displayAbbr` where available
  - fall back to rules DB `abbr`
  - use full English rulebook name in larger settings/detail surfaces
- Chinese mode:
  - show Chinese full rulebook name where available
  - do not show English slug as the primary label
  - use legacy `abbr` only as secondary/debug context if a dense technical
    surface explicitly needs it
- Parser/import/data-tools:
  - keep using stable IDs and source mappings
  - do not use display labels as lookup keys unless a command explicitly accepts
    aliases

## Audit Workflow

Add a data-tools report before changing UI:

```bash
npm run -w data-tools rulebooks:labels:audit
```

The report should compare:

- rules DB `id`, `name`, `abbr`, and `slug`
- existing Chinese `I18nRulebookText.name`
- CHM source-label mappings
- proposed English display abbreviation
- proposed Chinese display name
- status: `keep`, `replace`, `needs-review`, or `defer`

The audit must at least flag:

- abbreviations containing punctuation or source artifacts, such as underscores
- abbreviations that differ from common D&D 3.5 community usage
- duplicate proposed display abbreviations
- missing Chinese full names
- rulebooks shown in Browse/Search/Settings without a display-label decision

Current implementation:

- `rulebooks:labels:audit` reads `RULES_DATABASE_URL` and
  `CONTENT_DATABASE_URL` in read-only mode.
- When present locally, it also reads maintained publication-label JSONL at
  `data/rulebook-labels/chm-publications.jsonl` for display-abbreviation
  candidates, while keeping source artifacts out of the parent repo.
- It writes
  `data-tools/out/rulebook-labels/rulebook-label-audit.json`.
- Portable tests cover the core review transform without requiring local DBs.
- Local acceptance runs the audit, but root verify still stays portable.

## Implementation Notes

Implemented shape:

- `RulebookMin.abbr` remains the source abbreviation and source compatibility
  field.
- `RulebookMin.displayAbbr` and `RulebookMin.displayName` are optional
  frontend-facing display metadata fields.
- `RulebookContent.displayAbbr` is populated by rules-content generation when
  accepted local publication-label data exists at
  `data/rulebook-labels/chm-publications.jsonl`.
- `GET /api/rulebooks` overlays `RulebookContent` display metadata onto the
  rules DB rulebook list.
- Normalized content spell reads include display metadata on embedded
  `spell.rulebook` objects; the legacy rules read path remains a rollback
  source without display fields.
- `getRulebookDisplay(meta, rulebook, lang)` is the frontend display helper. It
  uses curated English display abbreviations, Chinese i18n full names, and
  source-name/source-abbreviation fallbacks.
- Spell cards, Spell Detail headers, related-spell rows, Settings rulebook
  selection, and prepared-spell bulk-paste conflict rows use the display helper.
- Settings sorts rulebooks by the active display label, then by source
  abbreviation and id for deterministic fallback order.
- Tests cover English display abbreviation override, Chinese full-name display,
  fallback behavior, API response shape, normalized content spell responses, and
  normalized-vs-legacy parity without treating display-only extension fields as
  a parity failure.

## Acceptance Criteria

- [x] Data-tools produces a reviewable rulebook-label audit report.
- [x] English UI no longer exposes reviewed legacy abbreviations such as `Sc_`
  as the primary user-facing label when curated display data is available.
- [x] Chinese UI shows Chinese full rulebook names in primary rulebook display
  surfaces when i18n overlay data is available.
- [x] Rules DB `slug` and legacy `abbr` remain available for source
  compatibility.
- [x] API contracts distinguish source abbreviation from display abbreviation.
- [x] Browse, Search, Settings, Spell Detail, related-spell rows, and collection
  import conflict UI all use the same display helper.
