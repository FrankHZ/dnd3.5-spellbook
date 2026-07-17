# Frontend Map

This is a compact navigation map for the main frontend surfaces.

It is intended as a quick orientation guide for agents and maintainers, not a full architecture document.

## Main App Areas

### Browse

- page entry: `web/app/features/browse/BrowseSpellsPage.tsx`
- supporting selectors and controls live under `web/app/features/browse/`

Purpose:

- browse spells by filters such as class, domain, level, taxonomy, and
  normalized base components and mechanics

### Search

- page entry: `web/app/features/search/SearchSpellsPage.tsx`
- URL helper: `web/app/features/search/search-url.ts`

Purpose:

- name-first spell lookup with an explicit content-backed full-text mode and
  shared Browse-compatible filter scope

Shared filter components:

- advanced filter panel:
  `web/app/features/spells/AdvancedSpellFiltersPanel.tsx`
- taxonomy filters: `web/app/features/spells/TaxonomyFilterSelector.tsx`
- component filters: `web/app/features/spells/ComponentFilterSelector.tsx`
- mechanics filters: `web/app/features/spells/MechanicsFilterSelector.tsx`
- collapsible filter sidebar card:
  `web/app/features/spells/FilterSidebarCard.tsx`
- spell metadata badges:
  `web/app/features/spells/SpellMetaBadge.tsx`,
  `web/app/features/spells/SpellComponentBadge.tsx`
- URL/filter helpers: `web/app/features/spells/taxonomy-filter-state.ts`

### Spell Detail

- page entry: `web/app/features/spells/SpellDetailPage.tsx`
- mechanics display: `web/app/features/spells/MechanicSection.tsx`
- related spell references: `web/app/features/spells/RelatedSpellsSection.tsx`

Purpose:

- render the detailed spell view, sidebar metadata overview, and related
  reference context

### Publications

- page entry: `web/app/features/publications/PublicationScopePage.tsx`
- grouping helper: `web/app/features/publications/publication-groups.ts`

Purpose:

- browse publication/rulebook metadata and manage the browser-local rulebook
  scope used by Browse and Search

### Collections

- index page: `web/app/features/collections/SpellbooksIndexPage.tsx`
- detail shell: `web/app/features/collections/SpellbookDetailPage.tsx`

Collection-specific surfaces:

- spell-id books: `web/app/features/collections/spell-id/`
- prepared books: `web/app/features/collections/prepared/`

Purpose:

- favorites, spellbooks, and prepared spell management

### Settings

- page entry: `web/app/features/settings/SettingsPage.tsx`

Purpose:

- user-facing app settings such as language, display, and class preferences;
  publication/rulebook scope management is owned exclusively by Publications

### About / Status

- page entry: `web/app/features/about/AboutVersionPage.tsx`
- build metadata helper: `web/app/features/about/build-metadata.ts`
- source credits: `web/app/features/about/credits.ts`,
  `docs/credits/`

Purpose:

- show frontend build, API origin, backend deploy, content DB runtime status,
  and source credits

## Shared Frontend Layers

### Layout

- top bar: `web/app/layout/TopBar.tsx`
- shared page and side-column CSS helpers: `web/app/app.css`
  (`page-*`, `app-side-card*`, `app-filter-layout`,
  `app-fixed-side-layout`, `app-prepared-layout`)

### Shared Components

- reusable app components: `web/app/components/`
- simple page titles/actions: `web/app/components/PageHeader.tsx`
- shared empty/loading/error states: `web/app/components/StatusCard.tsx`
- local shadcn wrappers: `web/app/components/ui/`

### API Client

- API client helpers: `web/app/api/`

### i18n

- app i18n logic: `web/app/i18n/`
- locale JSON: `web/public/locales/`
- workflow doc: `docs/i18n.md`

## Related Docs

- [../web/README.md](../web/README.md)
- [mvp/v3.2/FREEZE.md](./mvp/v3.2/FREEZE.md)
