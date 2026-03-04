# v3.2 Freeze

## Status

**v3.2 FROZEN**

This document declares the final canonical documentation state for the v3.2 release handoff.

All deliverables planned for v3.2 are considered complete for documentation purposes. This folder now serves as the frozen reference set for:

- shipped scope
- final implemented behavior
- known intentional deviations from the original plan

## Canonical Source Order

When v3.2 documents conflict, treat the later handoff documents as authoritative over earlier planning or earlier implementation notes.

Use this precedence order:

1. `docs/mvp/v3.2/ui-polish-and-public-readiness.md`
2. `docs/mvp/v3.2/ui-stabilization-and-toast.md`
3. `docs/mvp/v3.2/favorites-json-import-export.md`
4. `docs/mvp/v3.2/related-spell-references.md`
5. `docs/mvp/v3.2/plan.md`

Reason:

- `plan.md` defines intended scope, not final shipped behavior.
- The implementation notes capture shipped behavior at different times in the session.
- The later docs include follow-up changes that supersede earlier notes.

## Frozen Deliverables

v3.2 is frozen with these deliverables complete:

1. Related spell references
2. Favorites JSON import/export
3. UI stabilization with local shadcn wrappers
4. Global toast-based feedback system
5. Final public-readiness polish

## Final As-Built Summary

### 1. Related Spell References

Shipped behavior:

- `SpellDetailPage` renders a `Related Spells` section when related results exist.
- Results are split into `Same Name` and `Variant Forms`.
- Same-name matching uses normalized exact matching and excludes the current spell.
- In non-English UI mode, same-name resolution may also use the localized spell name when distinct.
- Variant matching supports:
  - comma-suffix families such as `Base, X`
  - Roman numeral families such as `Base I` through `Base IX`
- Ordering is deterministic by:
  - `rulebook.abbr` alphabetical
  - page ascending
  - spell id ascending

Frozen clarification:

- The original plan referenced "rulebook priority".
- The shipped implementation uses alphabetical `rulebook.abbr` ordering, and that is the frozen behavior.

### 2. Favorites JSON Import/Export

Shipped behavior:

- Spell-id books support JSON-only export with a flat payload:
  - `schemaVersion`
  - `exportedAt`
  - `favoriteSpellIds`
- Imported ids are normalized to positive unique integers.
- Import validates JSON shape and `schemaVersion`.
- Candidate ids are validated against the API before save.
- Missing spell ids are excluded from persistence.
- Two explicit import actions are shipped:
  - `Import Merge`
  - `Import Replace`
- Spell-id books also expose a `Clear` action in the same action group.

Frozen clarification:

- The plan described merge as the default and replace as optional.
- The shipped UI exposes merge and replace as separate explicit actions, and that is the frozen behavior.

### 3. UI Stabilization

Shipped behavior:

- Major interactive surfaces were normalized around local shadcn primitives.
- The app includes local wrappers for:
  - `sonner`
  - `card`
  - `pagination`
  - `navigation-menu`
  - `popover`
  - `sheet`
  - `skeleton`
- Browse, search, settings, collection index, collection detail, and spell detail pages were refactored toward compact-card and shared-control patterns.
- Shared `SpellActionButtons` now centralizes favorite and prepare actions.
- The top bar now uses:
  - desktop `NavigationMenu`
  - mobile `Sheet`
  - `ToggleGroup` for language selection

### 4. Toast System

Shipped behavior:

- A single global `Toaster` is mounted at the app root.
- Collection JSON actions use toast feedback for success, failure, and clear confirmations.
- Shared spell favorite and prepare actions also use toast feedback.
- Default toast duration is `2500ms`.
- Toasts do not render a manual close button.

Frozen clarification:

- The original plan specified top-right placement.
- The shipped implementation uses `top-center`, and that is the frozen behavior.

### 5. Public-Readiness Polish

Shipped behavior:

- Remaining raw hidden JSON file inputs were replaced with the shared `Input` wrapper.
- Leftover API `console.log(...)` calls were removed.
- `i18next` debug mode now follows `import.meta.env.DEV`.
- The earlier `scrollbar-gutter: stable` reservation was removed.
- The prepared collection surface received a final UX pass:
  - `PreparedTable` no longer renders as a transposed table grid
  - the prepared view now renders responsive per-level cards
  - the main prepared action controls live in a sticky floating action bar
  - loading and batch-error states no longer show misleading empty level grids

Frozen clarification:

- Earlier v3.2 notes described a transposed prepared table as the current state.
- The later final polish doc supersedes that: the frozen state is the responsive level-card layout.

## Known Non-Goals Retained at Freeze

The following remain intentionally out of scope beyond v3.2:

- backend accounts or sync
- rules legality modeling
- slot validation
- multi-collection redesign
- large search refactors
- Chinese parser changes
- backend relationship graph for spell variants
- broad design-system overhaul

## Documentation Rule For Future Project Docs

When updating project-wide documentation after v3.2:

- describe v3.2 using shipped behavior, not original plan language
- prefer later implementation notes when summarizing final state
- preserve noted deviations explicitly where they matter to users or maintainers

## References

- `docs/mvp/v3.2/plan.md`
- `docs/mvp/v3.2/related-spell-references.md`
- `docs/mvp/v3.2/favorites-json-import-export.md`
- `docs/mvp/v3.2/ui-stabilization-and-toast.md`
- `docs/mvp/v3.2/ui-polish-and-public-readiness.md`
