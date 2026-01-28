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
- Frontend-only collections (Favorites / Prepared)
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
- Browse scope (class IDs, domain IDs, level)
- Favorites / Prepared collections

```ts
export function usePersistedState() {
  const [state, setState] = useState(loadState);
  useEffect(() => saveState(state), [state]);
  return { state, setState };
}
```

No global Redux or Context is used for app state.
Only localized context is used where necessary (settings composition).

---

## 5. Data Fetching

### Library

- **@tanstack/react-query v5**

### Principles

- Backend APIs treated as fixed contracts
- Query keys reflect full scope (class/domain/level/rulebooks)
- Queries re-run when scope changes
- No `keepPreviousData` (v5 cache handles this)

---

## 6. Browse Page (Core Feature)

### Scope

- Class + Domain + Level browsing only
- No name search here (strict separation)

### Selectors

#### Classes & Domains

- Base UI **Combobox (multiple, controlled)**
- Chips show selected items
- “View all” button opens grouped list
  - Classes grouped into Base / Prestige
  - Prestige group only shown if enabled in settings

#### Level selector

- Fixed grid buttons (0–9)
- Immediate feedback, no dropdown

### Pagination

- Page-based
- Page resets when scope changes
- Shared `Pager` component

---

## 7. Search Page

### Behavior

- Name substring search only
- Minimum length: 2 characters
- No debounce (MVP decision)
- Page stored in URL (`?q=&page=`)

### UI

- Uses same `SpellCard` as browse
- No class/domain filters shown
- Clear separation from Browse UX

---

## 8. Spell Detail Page

### Data

- Single `GET /api/spells/:id` call
- 400 → Invalid ID
- 404 → Spell not found

### Sections

- Header: name, rulebook, page
- Classification: school, subschool, descriptors
- Levels: classes + domains
- Components: V/S/M/DF/XP/etc chips
- Mechanics: casting, range, target, duration, save, SR
- Description:
  - `description.html` sanitized via DOMPurify
  - fallback to text if needed

### Actions

- Add / Remove from **Favorites**
- Add to **Prepared**

---

## 9. Collections Model (Frontend-only)

### Books

- `favorites` (default)
- `prepared` (default)

Both are simple spell ID collections stored locally.
No rename / clone / custom books in v1.1.

Future backend batch lookup is planned.

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
- Page-level padding applied per route (no global wrapper class)

---

## 12. Known Limitations / Deferred Items

- No virtual scrolling
- No skeleton loaders
- No keyboard shortcut polish
- No SSR / SEO support
- No server persistence

All deferred items are intentional and tracked for post-1.1.

---

## 13. Status

✅ Feature-complete for Frontend v1.1  
✅ Backend contract aligned  
✅ UX stable and usable  
⏭ Ready for Chinese localization & backend batch APIs

---

End of document.
