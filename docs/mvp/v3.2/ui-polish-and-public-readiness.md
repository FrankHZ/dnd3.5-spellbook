# v3.2 Implementation Notes: UI Polish and Public Readiness (3.5)

## Scope

This document records the final frontend polish work for v3.2 plan section `3.5`.

It reflects the implementation and validation work completed after the main `3.3 / 3.4` stabilization pass, with emphasis on:

- the prepared collection page, which received the largest late-session UX changes
- final public-readiness cleanup items
- small i18n workflow improvements added during the same finishing pass

This is a handoff document for the current working tree at the end of the session.

## Goals

- Remove remaining public-readiness rough edges before treating v3.2 as release-ready
- Improve the prepared collection UX on both desktop and mobile
- Reduce layout instability and awkward spacing in the longest-scrolling collection surface
- Finish the final no-debug / no-raw-control cleanup items

## 1. Final Public-Readiness Cleanup

Implemented behaviors:

- Remaining hidden JSON file pickers in collection actions now use the shared local `Input` wrapper rather than raw `<input>` elements.
- The leftover API request `console.log(...)` calls were removed.
- `i18next` debug mode is no longer always enabled; it now follows `import.meta.env.DEV`.
- The earlier global `scrollbar-gutter: stable` reservation was removed after dialog open/close testing showed it caused more layout instability than it solved with the current modal stack.

Files:

- `web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx`
- `web/app/features/collections/prepared/PreparedBookJsonActions.tsx`
- `web/app/api/http.ts`
- `web/app/i18n/i18n.ts`
- `web/app/app.css`

## 2. Prepared Page Layout Refactor

Implemented behaviors:

- `PreparedTable` no longer renders as a transposed table grid.
- The prepared surface now renders one card per spell level.
- Each level card shows:
  - a localized level header
  - a localized slot count
  - a compact vertical list of prepared entries
- Empty levels render as compact in-card empty rows rather than blank table cells.
- The level-card grid is responsive:
  - single-column on narrow screens
  - two columns from `md`
  - three columns from `xl`
  - four columns from `2xl`
- This removes the old horizontal-scroll-heavy table interaction model and makes the prepared page easier to scan on mobile.

Files:

- `web/app/features/collections/prepared/PreparedTable.tsx`
- `web/public/locales/en/collections.json`
- `web/public/locales/zh/collections.json`

## 3. Prepared Row and Action Polish

Implemented behaviors:

- Prepared row height is now centrally defined through a shared default constant:
  - `DEFAULT_PREPARED_ROW_MIN_HEIGHT`
- `PreparedTable` accepts an optional `rowMinHeight` prop so future user settings can inject a different value without changing row internals.
- Prepared entry rows were rebalanced visually:
  - reduced base row spacing
  - trailing actions grouped into a dedicated action rail
  - passive note / metamagic indicators moved next to the spell name instead of sharing the trailing action area
  - icon sizing was normalized across link, edit, lock, remove, note, and metamagic indicators
- The spell name cluster is bounded so long names truncate earlier and do not dominate the full row width.

Files:

- `web/app/features/collections/prepared/prepared-layout.ts`
- `web/app/features/collections/prepared/PreparedTable.tsx`
- `web/app/features/collections/prepared/PreparedTableCell.tsx`
- `web/app/features/collections/prepared/PreparedEntryEditDialog.tsx`
- `web/app/features/collections/prepared/PreparedBookDetail.tsx`

## 4. Prepared Global Action Bar

Implemented behaviors:

- The prepared-page mode / reset / copy / paste controls now live in a sticky floating action bar.
- The sticky bar is scoped to the main spell-card column rather than the whole page.
- The bar is:
  - right-aligned
  - content-sized (`w-fit`)
  - constrained with `max-w-full` so it can still wrap on narrow screens
- The sticky top offset no longer uses a one-off local magic number; it now reads from a shared app-level CSS variable:
  - `--app-sticky-top-offset`
- This makes the longest prepared page workflows less tedious without pinning unrelated content.

Files:

- `web/app/features/collections/prepared/PreparedBookDetail.tsx`
- `web/app/app.css`

## 5. Loading and State Presentation Safety

Implemented behaviors:

- The prepared level-card grid is no longer shown while the batch spell lookup is still loading.
- The grid is also suppressed on batch error.
- This avoids a misleading intermediate state where all ten levels appear empty before spell data resolves.

Files:

- `web/app/features/collections/prepared/PreparedBookDetail.tsx`

## 6. i18n Workflow Helper

Implemented behaviors:

- A new local script now streamlines namespace extraction while preserving ignored namespaces from the checked-in config.
- The script:
  - reads `IGNORED` from `i18next.config.ts`
  - stages non-ignored locale files from `public/locales` into `extracted`
  - runs `i18next:extract`
  - copies updated generated files back into `public/locales`
- A dry-run companion was also added for CI-style checks without leaving `extracted` changes behind.

Commands:

- `npm run i18next:sync`
- `npm run i18next:sync:check`

Files:

- `web/scripts/i18next-sync.ts`
- `web/package.json`
- `web/i18next.config.ts`

## Non-Goals (Current)

- No redesign of prepared collection data structures.
- No persistence yet for prepared-page UI preferences such as:
  - sidebar collapsed state
  - row height
- No attempt to make sticky offsets dynamic from live measured header height.
- No broader design-system overhaul beyond the targeted final polish.

## Manual Validation Snapshot

Manual checks performed during this implementation pass:

- `npm run typecheck` passes in `web/`
- prepared page renders correctly in both normal and edit modes
- prepared level cards remain readable on desktop and mobile layouts
- sticky prepared action bar follows the main spell-card column during scroll
- sidebar expanded and collapsed states both render cleanly with the new grid
- dialogs open without the earlier layout instability caused by the prior scrollbar-gutter approach
- `npm run i18next:sync` runs successfully
- `npm run i18next:sync:check` runs successfully and leaves no `extracted` changes behind

## Remaining Follow-up

Known follow-up items beyond this pass:

- Consider persisting prepared-page UI state (sidebar collapse, row height) into user prefs.
- If the global top bar changes height later, re-tune `--app-sticky-top-offset`.
- Revisit the prepared row name-width cap if real-device testing shows it should vary by breakpoint or mode.

## References

- `docs/mvp/v3.2/plan.md`
- `docs/mvp/v3.2/ui-stabilization-and-toast.md`
- `docs/mvp/v3.2/favorites-json-import-export.md`
- `docs/mvp/v3.2/related-spell-references.md`
