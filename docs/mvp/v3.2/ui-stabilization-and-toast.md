# v3.2 Implementation Notes: UI Stabilization and Toast System (3.3 / 3.4)

## Scope

This document records the implemented frontend behavior for v3.2 plan sections `3.3` and `3.4`.

It covers:

- shadcn adoption for the major interactive surfaces touched in this pass
- the global toast system and where it replaced inline feedback
- responsive top bar updates
- browse / search / settings panel normalization
- spell detail page layout and action refactors

This is an implementation handoff document and reflects the code as currently shipped in the working tree at the end of this session.

## Goals

- Standardize major UI interactions around local shadcn primitives
- Replace prominent inline success/error banners with toast feedback
- Reduce ad-hoc Tailwind-only control fragments
- Improve layout consistency across the main pages
- Make the spell detail page more space-efficient and responsive

## 1. Added shadcn UI Primitives

Implemented behaviors:

- The project now includes local shadcn wrappers for:
  - `sonner`
  - `card`
  - `pagination`
  - `navigation-menu`
  - `popover`
  - `sheet`
  - `skeleton`
- These wrappers are used as local components under `web/app/components/ui/` rather than calling registry packages directly from feature code.
- The base `Card` component remains generic; compact spacing is still applied primarily at usage sites rather than by globally redefining the primitive.

Files:

- `web/app/components/ui/sonner.tsx`
- `web/app/components/ui/card.tsx`
- `web/app/components/ui/pagination.tsx`
- `web/app/components/ui/navigation-menu.tsx`
- `web/app/components/ui/popover.tsx`
- `web/app/components/ui/sheet.tsx`
- `web/app/components/ui/skeleton.tsx`
- `web/package.json`
- `package-lock.json`

## 2. Global Toast System

Implemented behaviors:

- The app root mounts a single global `Toaster`.
- Toast placement is currently `top-center`.
- Toasts no longer render a manual close button.
- Default toast duration is shortened to `2500ms`.
- The local `sonner` wrapper was simplified to avoid depending on a separate theme provider.

Files:

- `web/app/root.tsx`
- `web/app/components/ui/sonner.tsx`

## 3. Collection Action Feedback Migration

Implemented behaviors:

- Spell-id JSON actions now use toast feedback for:
  - export success
  - import success summary
  - import failure
  - clear action confirmation
- Prepared JSON actions now use toast feedback for:
  - export success
  - import success summary
  - import failure
  - clear action confirmation
- Previous inline import status / error cards were removed from these action groups.

Files:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/prepared/PreparedBookJsonActions.tsx`

## 4. Shared Spell Actions

Implemented behaviors:

- Favorite and prepare actions were extracted into a reusable `SpellActionButtons` component.
- The shared component now owns:
  - favorite toggle button
  - prepare button
  - layout direction (`horizontal` / `vertical`)
  - toast feedback for both actions
- This keeps action behavior aligned between list cards and the detail page.

Files:

- `web/app/components/SpellActionButtons.tsx`
- `web/app/components/SpellCard.tsx`
- `web/app/features/spells/SpellDetailPage.tsx`

## 5. Top Bar Refactor

Implemented behaviors:

- The search input URL-sync bug was fixed by replacing an invalid `useMemo(...)` state update with `useEffect(...)`.
- Top bar navigation now uses desktop `NavigationMenu`.
- A mobile hamburger menu now opens a right-side `Sheet` with the same navigation destinations.
- The language selector now uses `ToggleGroup`.
- Search validation no longer reserves inline height in the header; it now uses a small `Popover` anchored to the search form.

Files:

- `web/app/layout/TopBar.tsx`

## 6. Browse / Search / Settings Page Stabilization

Implemented behaviors:

- Browse and search now use a compact page treatment:
  - lightweight top description text
  - compact cards for invalid / error / empty states
  - unified results cards rather than scattered bordered blocks
- Browse left rail was flattened into a single sidebar surface with section separators.
- Settings remains section-based for readability:
  - one compact card per major section
  - `RulebookSelector` uses compact nested cards per edition group
- Several previously hard-coded UI strings in these surfaces were wrapped with `t(...)`.

Files:

- `web/app/features/browse/BrowseSpellsPage.tsx`
- `web/app/features/browse/BrowseOptionsToggle.tsx`
- `web/app/features/browse/ClassAndDomainSelector.tsx`
- `web/app/features/browse/LevelSelector.tsx`
- `web/app/features/search/SearchSpellsPage.tsx`
- `web/app/features/settings/SettingsPage.tsx`
- `web/app/features/settings/ClassSettings.tsx`
- `web/app/features/settings/RulebookSelector.tsx`
- `web/app/components/MultiSelectPicker.tsx`
- `web/app/components/Pager.tsx`

## 7. Spell Detail Page Layout

Implemented behaviors:

- `SpellDetailPage` now uses a responsive two-column layout on desktop:
  - narrow left reference column
  - wider right reading column
- A reusable local `SpellHeader` block is rendered twice with breakpoint visibility:
  - once above the grid for mobile (`md:hidden`)
  - once at the top of the right column for desktop (`hidden md:block`)
- This avoids incorrect content order when the layout collapses.
- The left column now focuses on:
  - class levels
  - domain levels
  - components
  - mechanics
- The right column now focuses on:
  - the header block
  - description
  - related spells
- Spell detail loading now uses shadcn `Skeleton` and mirrors the current layout instead of using generic pulse rows.
- Invalid / 400 / 404 / generic error states now use compact cards.

Files:

- `web/app/features/spells/SpellDetailPage.tsx`
- `web/app/features/spells/LevelsSection.tsx`
- `web/app/features/spells/ComponentsSection.tsx`
- `web/app/features/spells/MechanicSection.tsx`
- `web/app/features/spells/RelatedSpellsSection.tsx`

## 8. i18n Updates

Implemented behaviors:

- New strings were added for:
  - spell detail error states
  - new section labels such as `Components` and `Mechanics`
  - top bar controls
  - browse/search/settings copy introduced or normalized in this pass
- Some existing user-facing literals in touched components were wrapped in `t(...)`.

Files:

- `web/public/locales/en/spell-detail.json`
- `web/public/locales/zh/spell-detail.json`
- `web/public/locales/en/topbar.json`
- `web/public/locales/zh/topbar.json`
- `web/public/locales/en/spell-browse.json`
- `web/public/locales/zh/spell-browse.json`
- `web/public/locales/en/spell-search.json`
- `web/public/locales/zh/spell-search.json`
- `web/public/locales/en/collections.json`
- `web/public/locales/zh/collections.json`
- `web/public/locales/en/translation.json`
- `web/public/locales/zh/translation.json`

## 9. Remaining Follow-up

Known follow-up items for the next session:

- Continue shadcn adoption in remaining spell detail sub-sections if more consistency is needed (`DescriptionSection` is the next likely target).
- Review remaining hard-coded strings outside the already touched surfaces.
- Decide whether to introduce a small app-level compact card helper instead of repeatedly applying compact spacing overrides by hand.
- Re-evaluate toast copy for shared spell actions if more specific “already prepared” / duplicate behavior is desired.
- Consider a final mobile polish pass for the spell header if the desktop/mobile duplicated header still needs spacing refinement.

## Manual Validation Snapshot

Manual checks performed during this implementation pass:

- `npm run typecheck` passes in `web/`
- toast rendering works from collection JSON actions
- toast rendering works from shared spell favorite / prepare actions
- top bar desktop and mobile navigation both compile and render through shared link state
- spell detail page loads with the new responsive layout and skeleton state

## References

- `docs/mvp/v3.2/plan.md`
- `docs/mvp/v3.2/favorites-json-import-export.md`
- `docs/mvp/v3.2/related-spell-references.md`
