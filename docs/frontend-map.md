# Frontend Map

This is a compact navigation map for the main frontend surfaces.

It is intended as a quick orientation guide for agents and maintainers, not a full architecture document.

## Main App Areas

### Browse

- page entry: `web/app/features/browse/BrowseSpellsPage.tsx`
- supporting selectors and controls live under `web/app/features/browse/`

Purpose:

- browse spells by filters such as class, domain, and level

### Search

- page entry: `web/app/features/search/SearchSpellsPage.tsx`

Purpose:

- direct search-driven spell lookup

### Spell Detail

- page entry: `web/app/features/spells/SpellDetailPage.tsx`
- related spell references: `web/app/features/spells/RelatedSpellsSection.tsx`

Purpose:

- render the detailed spell view and related reference context

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

- user-facing app settings such as language and content preferences

## Shared Frontend Layers

### Layout

- top bar: `web/app/layout/TopBar.tsx`

### Shared Components

- reusable app components: `web/app/components/`
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
