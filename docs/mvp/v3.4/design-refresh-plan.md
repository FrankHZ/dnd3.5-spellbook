# v3.4 Design Refresh Plan

Status: implemented as a small v3.4 frontend polish pass. Keep broader
redesign work outside this frozen scope.

This is the first lightweight plan for v3.4.

v3.4 should not be a broad redesign. The goal is to review the existing frontend
against `docs/design.md`, clean up easy component and styling issues, and leave
the app more visually consistent without changing the core workflows.

## Goal

Make the current UI feel more deliberate while preserving the dense reference
tool shape.

The pass should focus on:

- existing components and page patterns
- small, low-risk styling improvements
- consistency across Browse, Search, Spell Detail, Spellbooks, Prepared Spells,
  and Settings
- mobile stacking and bilingual text fit
- obvious interaction polish that can be verified without subjective guesswork

## Non-Goals

Do not use v3.4 for:

- a full visual rebrand
- a new component library
- broad route or workflow redesign
- backend contract changes
- new spell data, parser, or rules DB work
- account sync, character sheets, slot legality, or rules-engine expansion
- large visual experiments that cannot be reviewed in the running app

External tools such as Stitch, Figma, or public `DESIGN.md` examples may be used
for inspiration, but production changes should be expressed through the current
React Router, Tailwind v4, and local UI-wrapper patterns.

External rules-reference apps and repos may also inform the pass. Use them to
borrow structure, not skin: source labels, compact rules metadata, readable
rule-text hierarchy, and scan-friendly indexes are in scope; parchment themes,
ornamental borders, broad palette swaps, and full page rebrands are not.

## Source Material

Start from:

- `docs/design.md`
- `docs/features.md`
- `docs/frontend-map.md`
- `docs/i18n.md`
- `web/app/app.css`
- `web/app/layout/TopBar.tsx`
- `web/app/components/`
- `web/app/components/ui/`
- feature folders under `web/app/features/`

Older v3.2 UI stabilization notes can help explain why some patterns exist, but
they should not override the current feature map or design notes.

## Work Phases

### 1. Inventory Current Components

Review current shared and feature-level UI components before changing styles.

Targets:

- app shell and top bar
- shared page classes and theme tokens
- `SpellCard`
- `SpellActionButtons`
- `Pager`
- filter/sidebar controls
- scope summaries
- empty, loading, and error states
- collection JSON action surfaces
- prepared spell table/cards and sticky actions
- settings cards and selectors

Deliverable:

- short notes in this plan or a follow-up implementation checklist describing
  which areas are already consistent, which have easy styling wins, and which
  should be deferred.

### 2. Pick Low-Risk Styling Improvements

Prefer changes that are easy to review in screenshots or a browser smoke pass.

Good candidates:

- spacing consistency between sidebars and result lists
- repeated card header/body padding differences
- empty-state and validation-state consistency
- button grouping and icon usage for repeated actions
- badge and metadata spacing in spell rows and detail headers
- source/page labels and section separators that make Spell Detail feel more
  like a modern rules reference
- top bar density and mobile menu fit
- prepared sticky action surface readability
- settings page visual hierarchy
- long Chinese label wrapping and mixed EN/ZH spell-name fit

Avoid changes where the main argument is only taste. If a styling change cannot
be connected to readability, consistency, space efficiency, or bilingual fit,
defer it.

For v3.4, "rulebook style" means modern reference-book structure, not a theme
overhaul. Defer typography experiments, global color-token changes, and
decorative motifs unless they become explicit future work.

### 3. Implement In Small Reviewable Batches

Recommended batch order:

1. Shared primitives and page shell alignment.
2. Browse/Search list and filter consistency.
3. Spell Detail reading and metadata polish.
4. Spellbooks/Favorites action and empty-state polish.
5. Prepared Spells dense-workflow polish.
6. Settings and final cross-page cleanup.

Each batch should stay close to existing patterns. Extract small helpers only
when they remove repeated styling or make future UI work safer.

### 4. Verify Human-Visible Behavior

Because frontend UX cannot be fully designed or accepted by an agent alone, keep
verification modest and concrete.

Use:

```bash
npm run -w web typecheck
npm run -w web build
```

When running the app is practical, manually smoke:

- Browse
- Search
- Spell Detail
- Favorites / Spellbooks
- Prepared Spells
- Settings
- EN and ZH language modes
- narrow mobile viewport and desktop viewport

For broader changes, run:

```bash
npm run verify
```

## Acceptance Checklist

v3.4 design refresh can be considered complete when:

- main frontend screens have been reviewed against `docs/design.md`
- accepted low-risk styling fixes are implemented
- no core workflow has been redesigned accidentally
- EN and ZH modes remain usable
- mobile and desktop layouts remain readable
- touched UI copy follows `docs/i18n.md`
- relevant frontend typecheck/build or full verify commands pass
- durable design decisions are reflected in `docs/design.md` if they change

## Deferrals

Defer these unless they become explicit future work:

- root `DESIGN.md`
- screenshot gallery
- full visual identity exploration
- browser visual-regression harness
- broader prepared-spell workflow redesign
- short description pipeline
- data harness hardening
