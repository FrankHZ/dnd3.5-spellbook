# D&D 3.5 Spellbook SPA — Frontend v2.0

This document describes the **Frontend v2.0** state of the D&D 3.5 Spellbook SPA.
v2.0 focuses on **Chinese i18n support** (UI + content) while keeping backend contracts fixed and avoiding scope creep.

---

## 1) Goals & Scope

### In scope

- CSR-only React Router SPA (Vite build → static deploy)
- Global UI language toggle **EN / ZH**
- Content i18n via backend **i18n overlays** (Class/Domain/Spell)
- Non-breaking i18n overlays for nested spell entities via **meta endpoint**
- Browse improvements (selectors + card view toggle)
- Search validation updated for Chinese 1-char queries
- Frontend collections remain local-only (Favorites/Prepared) but **rendered via batch lookup**

### Out of scope

- Advanced combined search (name + class + level)
- Side-by-side bilingual display (toggle only)
- Notes / tagging / editing user metadata
- Virtual scroll / infinite lists
- SSR / SEO optimizations

---

## 2) Routing

```
/browse        Structured browse (class/domain + level)
/search        Global name search
/spells/:id    Spell detail
/settings      Rulebooks + include prestige + other user prefs
```

---

## 3) Layout

- Sticky TopBar (language toggle lives here)
- App uses window scroll
- Prevent layout shift from scrollbar (recommended):
  - `html { scrollbar-gutter: stable; }`

---

## 4) Environment & Deployment

### API base URL

- Local dev: `.env.local`
  - `VITE_API_BASE_URL=http://localhost:3000`
- Production: `.env.production.local`
  - `VITE_API_BASE_URL=/api`

**Important:** Vite env vars are baked at build time. Build in production mode for deployment.

### Git ignore

- `.env.local`, `.env.production.local` are removed

---

## 5) State Management

### PersistedStateProvider (localStorage)

Persisted values include:

- UI prefs:
  - `lang: "en" | "zh"`
  - `zhVariant?: string` (spell overlay variant)
- Browse scope (selected class/domain IDs, level)
- Settings (includePrestige, selectedRulebookIds)
- Collections (favorites/prepared spell ID lists)

### i18n sync (UI strings)

- `react-i18next` is used for UI strings
- `I18nSync` component keeps `i18next` language in sync with persisted `lang`

UI locale JSON files live under:

- `public/locales/...` (served by Vite dev server and copied into `dist/` on build)

For MVP speed, many keys can use **English-as-key** strategy.

---

## 6) Data Fetching

### Library

- `@tanstack/react-query` (v5)

### i18n query params

All API requests append i18n query params (no headers):

- `lang=en|zh`
- `variant=<string>` (only meaningful for `/api/spells/*`)

Implementation detail:

- `api/http.ts` appends i18n query params via `withI18nParams(...)`

### Query keys

React Query keys include i18n to ensure refetch on toggle:

- `{ lang, variant }` is included in query keys for bootstrap + spell queries

---

## 7) Backend Endpoints Used (v2.0)

### Bootstrap / settings

- `GET /api/classes?includePrestige=true|false`
- `GET /api/rulebooks`
- `GET /api/rulebooks/editions`
- `GET /api/domains`
- `GET /api/meta/i18n?lang=...&variant=...`
  - returns empty payload for `lang=en`

### Browse

- `GET /api/spells/by-level`
  - supports class IDs, domain IDs, optional rulebook IDs, pagination

### Search

- `GET /api/spells/search?q=...&rulebookIds=...&page=...&pageSize=...`

### Spell detail

- `GET /api/spells/:id`

### Collections rendering

- Batch lookup endpoint (post-MVP addition adopted in v2.0)
  - used to render favorites/prepared from ID lists

---

## 8) i18n Model (Content)

### Primary i18n overlays

Backend returns base entity + optional overlay:

- `ClassView = Class & { i18n?: { name?: string } }`
- `DomainView = Domain & { i18n?: { name?: string } }`
- `SpellItemView = SpellItem & { i18n?: { name?: string } }`
- `SpellDetailView = SpellDetail & { i18n?: { name?: string; description?: { text?: string; html?: string } } }`

Frontend uses helpers:

- `getDisplayName(view, lang)` → chooses zh name if present, else EN
- `getDisplayNameWithEn(view, lang)` → `zh - en` when zh exists

### Meta i18n overlays (non-breaking)

Meta endpoint provides id→name maps for nested spell entities:

- rulebooks, classes, domains, schools, subschools, descriptors

Meta i18n is fetched before rendering spell lists to avoid transient EN flashes in ZH mode.

Frontend uses helpers:

- `getMetaDisplayName(meta, dict, entity, lang)`
- `getMetaDisplayNameWithEn(meta, dict, entity, lang)`

### Spell description fallback

In ZH mode:

- prefer `spell.i18n.description.{html|text}`
- if missing, show English description with a clear fallback notice (detail page)

---

## 9) Search UX (Chinese rule)

Search validation is language-aware:

- EN mode:
  - `q.trim().length < 2` → show error message, do not call API
- ZH mode:
  - if length < 2 and **no Chinese character** → error message, do not call API
  - if contains **any Chinese char** → allow (even 1 char)

This behavior is shared between:

- TopBar search navigation
- `/search` page query enablement

---

## 10) Browse UX Polish

### HTML Title

Added a static HTML title in app/root.ts.

### Selectors

- Class/Domain selector uses a combobox pattern for usability (filter + pick)
- Prestige classes appear as a separate group when enabled in Settings

### SpellCard view mode

Browse includes a local (non-persisted) toggle:

- **simple**: compact list scanning
- **all**: show details + actions

Implementation uses existing SpellCard props:

- `showDetails`
- `showActions`

---

## 11) Collections (Favorites / Prepared)

- Stored as spell ID lists in localStorage
- Rendering uses **batch lookup** to avoid drift and keep data consistent with backend
- Favorites/Prepared actions live in Spell Detail and can optionally appear on SpellCard in browse "all" mode

---

## 12) Status

✅ Frontend v2.0 feature-complete  
✅ i18n toggle works (UI + content)  
✅ i18n query params + query keys refetch correctly  
✅ Meta i18n overlays integrated via bootstrap  
✅ Search supports Chinese 1-char queries (when applicable)  
✅ Ready for next backend iteration (improved zh search, more overlays, etc.)

---

End of document.
