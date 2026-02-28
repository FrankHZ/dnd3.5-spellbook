# v3.2 Implementation Notes: Related Spell References (3.1)

## Scope

This document records the implemented behavior for v3.2 same-name and pattern-based spell references from plan section `3.1`.

It is implementation-first and reflects the shipped frontend behavior, including pragmatic scope limits kept for this release.

## Goals

- Make spell detail pages reference-complete for same-name entries across books.
- Surface common English variant families without adding a full relationship engine.
- Keep related spell output deterministic, compact, and easy to navigate.
- Respect existing frontend/backend i18n support for localized spell names.

## 1. Detail Page Integration

Implemented behaviors:

- `SpellDetailPage` renders a dedicated `Related Spells` section below the description block.
- The section is hidden when no same-name or variant results are found.
- Query loading shows a lightweight localized loading state.
- Query failure fails closed by rendering nothing rather than surfacing a noisy inline error.

Files:

- `web/app/features/spells/SpellDetailPage.tsx`
- `web/app/features/spells/RelatedSpellsSection.tsx`

## 2. Same-Name Matching

Implemented behaviors:

- Exact match logic normalizes spell names using:
  - trim
  - repeated-space collapse
  - case-insensitive comparison
- The current spell id is always excluded.
- Same-name matching starts from a backend `searchSpellsByName(...)` request using the English spell name.
- In non-English UI mode, if the current spell has a distinct localized i18n name, the section performs a second same-name resolve using that localized name and merges the results.
- Merged same-name results are deduplicated by spell id.

Files:

- `web/app/features/spells/RelatedSpellsSection.tsx`
- `web/app/api/spells.ts`

## 3. Variant Matching

Implemented behaviors:

- Variant matching is reference-only and remains limited to supported English naming families.
- Supported families:
  - comma modifier forms: `Base, X`
  - Roman numeral forms: `Base I` through `Base IX`
- Variant lookup now performs a single backend `searchSpellsByName(...)` request using the parsed base name, then filters the returned items client-side.
- For a comma form such as `Base, Something`, the parser treats any comma suffix as the modifier token for base extraction.
- For comma-family matching, the filtered result set includes:
  - sibling comma forms with the same base
  - the unsuffixed base spell when viewing a comma form
- For Roman numeral forms, the filtered result set includes sibling `I` through `IX` entries sharing the same base, excluding the current numeral.
- For non-pattern base names, the filtered result set includes comma-suffixed variants that share the same base.
- This base-search approach avoids missing uncommon comma modifiers that are not in a hardcoded modifier list.
- Variant results are deduplicated by spell id and exclude the current spell.
- Exact same-name results are excluded from the variant bucket.

File:

- `web/app/features/spells/RelatedSpellsSection.tsx`

## 4. Ordering and Presentation

Implemented behaviors:

- Related spells are split into two subsections:
  - `Same Name`
  - `Variant Forms`
- Each subsection renders a compact list of links without spell descriptions.
- Clicking an entry navigates to that spell's detail page.
- Display names use app i18n formatting (`nameWithEn(...)`), so Chinese UI can show localized name plus English fallback.
- Ordering is deterministic:
  - `rulebook.abbr` alphabetical order
  - page ascending
  - spell id ascending

Note:

- The original plan wording mentioned "rulebook priority". For v3.2, alphabetical-by-abbreviation was accepted and is the implemented sort order.

File:

- `web/app/features/spells/RelatedSpellsSection.tsx`

## 5. Localization

Implemented behaviors:

- All new section UI text is localized in the `spell-detail` namespace.
- Added localized strings cover:
  - section title
  - section description
  - loading state
  - subsection labels
- The Chinese `spell-detail.json` locale file was normalized back to valid JSON during this work.

Files:

- `web/public/locales/en/spell-detail.json`
- `web/public/locales/zh/spell-detail.json`

## Non-Goals (Current)

- No fuzzy NLP matching.
- No backend relationship graph or canonical variant model.
- No localized pattern-family parsing beyond direct name resolve support.
- No automated test suite added in this pass.

## Manual Validation Snapshot

Manual checks performed during implementation:

- detail page renders the section only when data exists
- same-name results exclude the current spell
- comma and Roman numeral variants resolve into the variant bucket
- localized UI mode can resolve same-name matches using localized spell names when available
- related spell labels render through app i18n helpers
- `npm run typecheck` passes in `web/`

## Follow-up

- Add focused tests for:
  - normalization and same-name merge behavior
  - localized-name same-name resolution
  - variant filtering for comma and Roman numeral families after base-name search
