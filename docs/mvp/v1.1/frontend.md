
# D&D 3.5 Spellbook SPA — Frontend v1.1

This document describes the **Frontend v1.1** state of the D&D 3.5 Spellbook SPA.
It builds on the MVP and incorporates backend 1.1 changes (explicit mappings, domains, improved browse scope),
while intentionally avoiding scope creep.

---

## 1. Scope & Goals

### In scope
- Updated **Browse** flow using new backend endpoints
- Domain + Class unified browsing
- Improved selector UX (combobox + quick level selector)
- Stable, sticky layout polish
- Frontend-only collections (see batch lookup below)
- API contract alignment with backend v1.1

### Out of scope (intentionally)
- Advanced combined search (name + class + level)
- Notes, tagging, or metadata editing
- Virtualized lists / infinite scroll
- Server-side persistence for collections
- Accessibility and animation polish (post-1.1)

---

## 2. Routing Overview

```
/browse        Class + Domain + Level browsing
/search        Global name search
/spells/:id    Spell detail page
/settings      Rulebooks + prestige toggle
```

Routing remains CSR-only.

---

## 3. Global Layout

### Root layout (`root.tsx`)
```tsx
<div className="flex flex-col min-h-screen">
  <TopBar />
  <BootstrapBanner />
  <main className="flex-1">
    <Outlet />
  </main>
</div>
```

### Layout behavior
- Window scroll (no nested scroll containers)
- Sticky top bar
- Stable scrollbar to prevent layout shift:
```css
html {
  scrollbar-gutter: stable;
}
```

---

## 4. State Management

### Persisted state (localStorage)
- Selected rulebook IDs
- Include prestige toggle
- Browse scope:
  - selected class IDs
  - selected domain IDs
  - selected spell level
- Frontend collections:
  - favorites
  - prepared

```ts
export function usePersistedState() {
  const [state, setState] = useState(loadState);
  useEffect(() => saveState(state), [state]);
  return { state, setState };
}
```

No global Redux is used.
Context is applied only for local composition (e.g. Settings).

---

## 5. Data Fetching

### Library
- **@tanstack/react-query v5**

### Principles
- Backend APIs treated as fixed contracts
- Query keys fully encode scope (classes / domains / level / rulebooks / page)
- Queries automatically re-run when scope changes
- No `keepPreviousData` (v5 cache behavior is sufficient)

---

## 6. Browse Page (Core Feature)

### Endpoint
- `GET /api/spells/by-level`

This endpoint replaces the MVP-era class-level endpoint and supports:
- multiple classes
- multiple domains
- optional rulebook scoping
- pagination

### Scope rules
- Browse is **structured only**:
  - class + domain + level
- Name search is intentionally excluded

### Selectors

#### Classes & Domains
- Base UI **Combobox** (multiple, fully controlled)
- Chips display current selection
- “View all” button opens grouped list:
  - Classes grouped into Base / Prestige
  - Prestige group shown **only if enabled in Settings**

#### Level selector
- Fixed grid buttons (0–9)
- Immediate feedback, no dropdown

### Settings interaction (important)
- **Include prestige classes**:
  - Affects bootstrap class list
  - Enables prestige group in class selector
- **Selected rulebooks**:
  - Restrict available classes and domains at bootstrap
  - Scope browse queries
  - Affect both Browse and Search pages

### Pagination
- Page-based
- Page resets automatically when browse scope changes
- Shared `Pager` component

---

## 7. Search Page

### Endpoint
- `GET /api/spells/search`

### Behavior
- Name substring search only
- Minimum length: 2 characters
- No debounce (intentional for v1.1)
- Page stored in URL (`?q=&page=`)

### UI
- Uses shared `SpellCard`
- No class/domain filters shown
- Clear UX separation from Browse

---

## 8. Spell Detail Page

### Data
- `GET /api/spells/:id`
- 400 → Invalid ID
- 404 → Spell not found

### Sections
- Header: name, rulebook, page
- Classification: school, subschool, descriptors
- Levels:
  - class levels
  - domain levels
- Components: V / S / M / DF / XP / etc. chips
- Mechanics: casting time, range, target, effect, area, duration, save, SR
- Description:
  - `descriptionHtml` sanitized via DOMPurify
  - fallback to text if needed

### Actions
- Add / Remove from **Favorites**
- Add to **Prepared**

---

## 9. Collections Model (Frontend + Batch Lookup)

### Storage
Collections are stored locally as **spell ID lists**:
- `favorites`
- `prepared`

### Rendering
- Collection pages use backend **batch lookup endpoint**
- Spell data is always rendered from backend responses
- Frontend never stores full spell objects

This avoids data drift and aligns with future server persistence.

---

## 10. Shared Components

- `SpellCard` (browse, search, collections)
- `Pager`
- `TopBar`
- `BootstrapBanner`
- Base UI Combobox selectors
- shadcn primitives (Button, Badge, Separator, etc.)

---

## 11. Styling

- Tailwind CSS
- shadcn/ui components
- No custom theme tokens beyond defaults
- Page-level padding applied per route

---

## 12. Known Limitations / Deferred Items

- No virtual scrolling
- No skeleton loaders
- No keyboard shortcut polish
- No SSR / SEO support
- No server persistence for collections

All deferred items are intentional and tracked for post-1.1.

---

## 13. Status

✅ Feature-complete for Frontend v1.1  
✅ Backend 1.1 endpoints fully adopted  
✅ Batch lookup integrated and in use  
⏭ Ready for localization and post-1.1 features

---

End of document.
