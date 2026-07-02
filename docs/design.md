# Design Notes

This document is the lightweight design inventory for the current spellbook UI.

It is not a roadmap and does not introduce committed feature scope. Use it to
keep future UI work grounded in the existing product shape before making a
focused implementation plan.

## Positioning

The app is a dense tabletop reference tool, not a marketing site or a broad
rules engine. The design should make repeated lookup, comparison, and local
spell management feel calm and fast.

Design direction:

- Reference-first: prioritize scan speed, stable layout, and readable spell
  text.
- Tabletop-practical: support common in-session workflows such as browse,
  search, favorites, and prepared spell review.
- Bilingual by default: English and Chinese modes should remain equally usable,
  with enough room for longer translated labels.
- Quietly polished: use restrained spacing, typography, and feedback rather
  than decorative fantasy framing.

## Visual Direction

The app should feel like a modern rules reference book: structured,
print-informed, and fast to scan, without faux parchment, ornamental fantasy
chrome, or novelty typography.

Useful cues come from rulebook and rules-index structure rather than skinning:

- clear title hierarchy for spell names, sections, and metadata groups
- compact source labels, page references, abbreviations, and rulebook scope
  indicators
- fine separators, bordered reading surfaces, and stable metadata columns
- rule text that feels readable and citable, with controls kept visually
  secondary
- restrained accent colors that suggest binding, ink, or source labels without
  turning the app into a themed prop

External references such as 5etools, Pf2eTools, Foundry sheets, or printed SRD
style guides are useful for information structure and rules-reference
conventions. Do not copy their visual skin wholesale. Translate useful ideas
back into this app's Tailwind tokens, React Router routes, local UI wrappers,
and bilingual requirements.

## Current Screen Inventory

The current user-facing surface is defined by `docs/features.md` and mapped in
`docs/frontend-map.md`.

Primary screens:

- Browse: filtered spell discovery by class, domain, spell level, and rulebook
  scope.
- Search: name lookup with optional Browse-equivalent filters.
- Spell Detail: rule text, mechanics, components, levels, and related spell
  references.
- Spellbooks and Favorites: browser-local spell-id collections.
- Prepared Spells: class/domain-oriented prepared spell review and editing.
- Settings: language, rulebook scope, and class-related preferences.

Shared shell:

- `web/app/layout/TopBar.tsx` owns brand navigation, global search, mobile nav,
  and language switching.
- `web/app/app.css` owns page-width classes, theme tokens, and shared Tailwind
  theme variables.
- `web/app/components/ui/` contains the local shadcn-style component wrappers.

## Layout System

Keep the existing page classes as the first layout vocabulary:

- `.page-single` for focused settings, index, or simple single-column pages.
- `.page-side` for primary app work surfaces with a left control panel and
  right content area.
- `.page-wide` only when a naturally wide tool, such as prepared spell review,
  needs more horizontal room.

For Browse, Search, and Spell Detail, preserve the established desktop pattern:

```tsx
<div className="grid gap-4 md:grid-cols-[320px_1fr]">
```

Use the 320px left column for controls or metadata. Use the main column for
results, rule text, or the work surface. On mobile, the same areas should stack
without requiring hidden duplicate flows.

Do not introduce landing-page sections, hero blocks, oversized headings, or
decorative page bands for core app screens.

## Information Density

The app should feel compact but not cramped.

Preferred patterns:

- Put controls close to the data they affect.
- Use short scope summaries before result lists so users understand the active
  filter state.
- Keep paginated spell lists in one bordered surface with internal separators.
- Use cards for framed tools, repeated collection items, empty states, and
  error states.
- Use unframed text, separators, and compact badges for supporting metadata.

Avoid:

- Nested cards for ordinary page layout.
- Large explanatory blocks that repeat what controls already show.
- Visual decoration that competes with rule text.
- Layouts that depend on exact English string length.

## Visual Language

The current baseline is Tailwind v4 with shadcn-style primitives and neutral
OKLCH tokens in `web/app/app.css`.

Use that baseline unless a focused design pass intentionally changes it.

Current defaults:

- Background and cards are neutral and high-contrast.
- Radius is modest, based on `--radius: 0.625rem`.
- Borders and separators carry most structure.
- Primary actions use existing button variants rather than custom one-off
  colors.
- Icons should come from `lucide-react` when an icon is helpful.

Prefer modern reference-book polish over decorative theming:

- use typography scale, source badges, dividers, and metadata alignment before
  introducing new colors or textures
- keep backgrounds near-neutral; avoid parchment, aged paper, heavy gradients,
  ornate borders, and large fantasy illustrations in core app screens
- use accent colors sparingly for source, state, or navigation meaning rather
  than as broad page washes
- keep form controls, dialogs, sheets, and action buttons modern and predictable

Future visual exploration may use Stitch, Figma, or external `DESIGN.md`
examples for inspiration, but generated output should not be treated as the
implementation source of truth. Convert useful ideas back into the existing
React Router, Tailwind, and local UI-wrapper patterns.

## Component Rules

Reuse the local UI wrappers before adding new primitives:

- buttons: `web/app/components/ui/button.tsx`
- cards: `web/app/components/ui/card.tsx`
- dialogs and sheets: `dialog.tsx`, `sheet.tsx`
- select, combobox, toggle group, checkbox, input, textarea, tooltip, and
  related wrappers under `web/app/components/ui/`

When a feature needs a repeated pattern, prefer extracting a domain component
near the feature folder first. Promote it to `web/app/components/` only when it
is genuinely shared across feature areas.

For controls:

- Use toggles or segmented controls for view modes.
- Use checkboxes or switches for binary choices.
- Use select or combobox controls for option sets.
- Use icon buttons only when the action is familiar or has an accessible label.
- Keep destructive or replacement actions explicit.

## Bilingual Behavior

Design for English and Chinese content from the beginning.

Rules:

- UI copy changes are i18n work and should follow `docs/i18n.md`.
- Do not assume translated labels are the same width as English labels.
- Prefer flexible wrapping for labels, badges, and summaries.
- Spell names may show localized names with English fallback; leave enough room
  in list rows and detail headers.
- Search validation and empty states should remain clear in both language modes.

Chinese spell text and entity names are content overlays, not ordinary UI copy.
Keep their display behavior aligned with the existing i18n helpers rather than
hardcoding alternate display rules in page components.

## Screen Notes

### Browse

Browse is a filter-first discovery screen. The left panel should stay focused on
view options, class/domain selection, and level selection. The right column
should start with the shared filter scope summary, then validation, empty,
error, or paginated results.

Preserve the result-list card with internal separators so spell rows scan like a
reference index.

### Search

Search should feel like direct lookup with optional narrowing. The top bar
search remains navigation-level UI, while the Search page owns editable scope.

Search and Browse should keep matching scope summary behavior so users can move
between the two without relearning filter state.

### Spell Detail

Spell Detail is a reading surface. The metadata/sidebar column should support
orientation, while the main column should prioritize spell text and related
references.

Keep the desktop header near the rule text and the mobile header above the
stacked content. Related spell references should stay secondary to the current
spell description.

### Spellbooks And Favorites

Collection screens should make local persistence understandable without heavy
explanation. Import, export, merge, replace, and clear actions should stay
explicit because they affect browser-local data.

Spell rows should remain consistent with Browse and Search where practical.

### Prepared Spells

Prepared Spells is the densest workflow. It should favor efficient review over
visual spaciousness.

Preserve:

- class/domain side selection
- responsive per-level cards
- sticky action surface for common mode and copy actions
- clear loading and batch-error states

Treat spreadsheet-friendly copy/export behavior as a core design constraint.

### Settings

Settings should remain utilitarian. Rulebook and language choices affect many
other screens, so settings surfaces should emphasize current state, clear
selection, and predictable persistence.

## Do / Avoid

Do:

- Ground design changes in `docs/features.md` and current page entry points.
- Keep app screens dense, stable, and readable.
- Prefer shared scope summaries and consistent result-list treatment.
- Verify mobile stacking whenever changing a two-column page.
- Use existing UI wrappers and Tailwind tokens.
- Update this document when a durable UI principle changes.

Avoid:

- Adding design scope to `docs/roadmap.md` before it is real planned work.
- Copying a generic external design system into the repo.
- Introducing decorative fantasy chrome around core workflows.
- Replacing dense tool screens with landing-page layouts.
- Adding one-off color palettes or component variants without a repeated need.
- Putting long design guidance inside old MVP history documents.

## Open Questions

These are investigation prompts, not planned work:

- Should the app eventually have a root `DESIGN.md` for stronger agent-facing
  design guidance, or is `docs/design.md` enough?
- Should visual exploration produce a small screenshot gallery or stay
  text-only until a concrete UI refresh begins?
- Does the neutral shadcn-style palette need a subtle tabletop identity, or is
  the current reference-tool neutrality the right long-term direction?
- Should browser smoke tests eventually include visual checks for the shared
  Browse/Search/Spell Detail shell?
