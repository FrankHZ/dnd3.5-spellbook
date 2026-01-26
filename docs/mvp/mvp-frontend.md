# D&D 3.5 Spellbook SPA — Frontend MVP Doc (React)

Date: 2026-01-26  
Scope: **Frontend MVP only** (backend APIs treated as fixed contracts)

## 0) MVP Summary

The MVP supports:

- **Browse spells by Class + Level** (`/browse`) using `GET /api/spells/by-class-level`
- **Search spells by Name substring** (`/search?q=...`) using `GET /api/spells/search`
- **Spell detail** (`/spells/:id`) using `GET /api/spells/:id`
- **Local-only collections** (no backend persistence):
  - **Favorites** (default collection)
  - **Prepared** (special collection)
  - Implemented as “books” in localStorage (future-proof for multiple books)

Non-goals for MVP (explicitly deferred):

- Combined advanced search (name + class/level + other filters)
- Server-side favorites/spellbooks/prepared/notes persistence
- Notes editor
- Spellbook management (create/rename/clone/delete)
- Batch spell lookup endpoint (planned post-MVP)

---

## 1) Tech Stack & Project Setup

- React (CSR)
- React Router (framework template; used as CSR)
- TanStack Query v5 for server state and caching
- Tailwind CSS for styling
- shadcn/ui for UI primitives
- lucide-react for icons (❤️ favorites)
- DOMPurify for sanitizing `descriptionHtml` on spell detail

### Repository layout (frontend)

- `app/layout/TopBar.tsx`  
  Global layout + navigation. TopBarSearch exists here as a navigation widget.
- `app/features/*`  
  Feature pages and feature-only subcomponents.
- `app/components/*`  
  Shared UI components (e.g., `SpellCard`, `Pager`).
- `app/api/*`  
  API wrappers (e.g., `api/spells.ts`, `api/http.ts`).
- `app/bootstrap/*`  
  Bootstrap queries (classes, rulebooks, editions).
- `app/state/*`  
  Persisted settings state + collections state (Context).
- `app/storage/*`  
  LocalStorage schema helpers for collections (and any future local-only stores).

---

## 2) Backend Contracts Used (Fixed)

### Bootstrapping
- `GET /api/classes?includePrestige={true|false}`
- `GET /api/rulebooks`
- `GET /api/rulebooks/editions`

### Browse (Class + Level)
- `GET /api/spells/by-class-level?classIds=...&level=...&rulebookIds=...&page=...&pageSize=...`

### Search (Name substring only)
- `GET /api/spells/search?q=...&rulebookIds=...&page=...&pageSize=...`
- Minimum length enforcement: `q.length >= 2` (frontend blocks API when invalid)

### Spell detail
- `GET /api/spells/:id`
- 400 → “Invalid spell id”
- 404 → “Spell not found”

---

## 3) Routing (MVP)

Implemented (primary):

- `/browse` — Class + Level browsing UI
- `/search?q=...&page=...` — Name search results
- `/spells/:id` — Spell detail
- `/spellbooks` — Collections index (Favorites + Prepared)
- `/spellbooks/:id` — Collection detail page
- `/settings` — Include prestige + rulebook selection

Notes vs checklist:
- The checklist mentions `/favorites` and `/prepared` routes.  
  In MVP, **Favorites** and **Prepared** are exposed as books under `/spellbooks` (e.g., `/spellbooks/default`, `/spellbooks/prepared`).  
  If desired, we can add lightweight alias routes later:
  - `/favorites` → redirect to `/spellbooks/default`
  - `/prepared` → redirect to `/spellbooks/prepared`

---

## 4) Global App Shell (Top Bar)

Top bar provides:

- App title
- Global search input (navigation to `/search?q=...`)
- Quick links (Browse / Spellbooks / Settings)

Key design choice:
- TopBarSearch is treated as **navigation UI**, not a search-page component.
- Search results page is **URL-driven** (`q` from query params), ensuring refresh/back/forward/share work.

---

## 5) Bootstrap Data & Settings Persistence

### Bootstrap fetching
`useBootstrap(includePrestige)` fetches:
- editions (optional UI)
- rulebooks
- classes (respect `includePrestige`)

### Persisted settings (localStorage)
Stored via persisted state Context:
- `includePrestige` (affects classes bootstrap fetch)
- `selectedRulebookIds` (optional filter sent to browse/search)
- browse selection:
  - `browseClassIds`
  - `browseLevel`

---

## 6) Browse Page (`/browse`)

### UX
- Left sidebar: **Class multi-select** + **Level selector**
- Right panel: results list + pagination
- Validation:
  - Requires at least 1 class and a level (0–9)
  - If invalid, show helper text and **do not call API**

### Data flow
- Query key includes: classIds, level, rulebookIds, page, pageSize
- Rulebook filter comes from Settings (`selectedRulebookIds`)
- Pagination is view-only (page stored in component state)
- Reset page to 1 when selection changes

### Rendering
- Shared `SpellCard` used for list rows
- Browse rows include class-level lines (`matchedClassLevels`)

---

## 7) Search Page (`/search`)

### Behavior
- URL-driven: reads `q` from query params
- Minimum length 2:
  - If `< 2`, show “Enter at least 2 characters…” and **do not call API**
- Pagination supports `page` in URL and uses the shared `Pager`
- Rulebook filter is inherited from Settings

### Rendering
- Uses shared `SpellCard`
- Search results omit class-level lines (not present in search DTO)

Note:
- Debounce and “CTA switch to browse” were intentionally skipped for MVP because:
  - TopBar already provides navigation
  - Search is submit-based and URL-driven

---

## 8) Spell Detail Page (`/spells/:id`)

### Fetch
- Single call: `GET /api/spells/:id`
- Simple loading skeleton
- Error states:
  - 400: “Invalid spell id”
  - 404: “Spell not found”

### Sections (per checklist)
- Header: name + rulebook abbr + page + quick chips (optional)
- Classification: school/subschool + descriptor chips
- Levels: class + domain levels (grouped per DTO)
- Components:
  - Flags rendered as chips: V/S/M/AF/DF/XP/metabreath/truename/corrupt
  - Extra components text: `components.extra`
- Mechanics: casting time/range/target/effect/area/duration/saving throw/SR
- Description:
  - Render `descriptionHtml` sanitized via DOMPurify
  - Fallback to `descriptionText`

### Actions (MVP)
- Favorites (❤️) toggle (default book)
- Prepared toggle
- Notes: **not implemented** (explicitly deferred)

---

## 9) Local Collections Model (Favorites + Prepared)

### Design
Collections are modeled as “books” so future book management is easy, while MVP only ships two books.

- Book `default` — **Favorites**
- Book `prepared` — **Prepared**

### Storage schema (localStorage)
Key: `dnd.collections.v1`

Example shape:
```json
{
  "version": 1,
  "books": [
    { "id": "default", "kind": "spellbook", "name": "Favorites", "spellIds": [1,2,3] },
    { "id": "prepared", "kind": "prepared", "name": "Prepared", "spellIds": [4,5] }
  ]
}
```

### UI & behavior
- `SpellCard` shows:
  - ❤️ heart icon toggle for Favorites
  - Prepare toggle for Prepared
- Spellbooks pages:
  - `/spellbooks` lists books and counts
  - `/spellbooks/:id` loads spells via **N detail calls** (MVP acceptable)
  - Guard: cap loads (e.g., first 100) if needed

Post-MVP backend improvement:
- Add batch endpoint (e.g., `POST /api/spells/by-ids`) to replace N calls with 1 call.

---

## 10) Shared UI Components

- `Pager`
  - Prev/Next + “Showing X–Y of total”
  - Used by Browse and Search

- `SpellCard`
  - Shared row UI across Browse/Search/Spellbooks
  - Conditionally renders class-level line only when present
  - Contains Favorites/Prepared action buttons (MVP)

---

## 11) Acceptance Tests (Executed)

- Browse:
  - invalid selection does not call API
  - valid selection returns list; pagination works
- Search:
  - `q < 2` does not call API
  - valid q returns list; pagination works
  - rulebook filter affects results
- Spell detail:
  - loads from single call
  - renders sections (components/mechanics/description)
  - 400/404 user-friendly messages
- Collections:
  - favorites/prepared toggles persist after refresh
  - collections pages render and allow navigation/removal

---

## 12) Post-MVP Backlog (Planned)

- Backend: `POST /api/spells/by-ids` (batch fetch for collections)
- Collections management UI:
  - create/rename/delete/clone spellbooks
- Notes editor (local-only or server-side)
- Optional: prepared count/slots UI
- Optional: search highlighting / skeleton polish
- Optional: alias routes `/favorites` and `/prepared` for convenience
- Future: advanced search endpoint (explicitly separate from MVP semantics)
