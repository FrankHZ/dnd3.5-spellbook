# Frontend MVP Checklist (React SPA)

## 0) Frontend MVP Definition

**MVP success =** we can:

- browse spells by **Class + Level**
- search spells by **Name**
- open **Spell Detail**
- maintain **Favorites + Notes + Spellbook + Prepared** **locally only** (backend storage is out-of-scope for search MVP)

---

## 1) App Shell & Navigation

### 1.1 Global layout

- [ ] Top bar with:
  - [ ] App title
  - [ ] Global search box (name search)
  - [ ] Quick links: Browse / Favorites / Spellbooks / Prepared / Settings

- [ ] Main content area supports:
  - [ ] Two-pane layout on desktop (list left, detail right) _or_ list page → detail page
  - [ ] Single-column layout on mobile

### 1.2 Routing

- [ ] `/browse` (class+level browsing)
- [ ] `/search?q=...` (name search results)
- [ ] `/spells/:id` (spell detail)
- [ ] `/favorites`
- [ ] `/spellbooks`
- [ ] `/spellbooks/:id`
- [ ] `/prepared`
- [ ] `/prepared/:id`
- [ ] `/settings`

---

## 2) Bootstrapping Data (First-load UX)

### 2.1 On app start

- [ ] Fetch editions (optional for MVP UI)
  - `GET /api/rulebooks/editions`

- [ ] Fetch rulebooks (for selectors)
  - `GET /api/rulebooks`

- [ ] Fetch classes (default exclude prestige)
  - `GET /api/classes?includePrestige=false`

### 2.2 State storage

- [ ] Cache bootstrap payloads in memory for the session
- [ ] Persist user selections in localStorage:
  - [ ] selected rulebookIds (optional; default edition scope is server-side)
  - [ ] includePrestige flag
  - [ ] last selected classIds + level
  - [ ] UI preferences (theme, language placeholder)

---

## 3) Browse Mode (Class + Level)

This is the **primary** spell browsing experience and must follow backend semantics .

### 3.1 Browse controls

- [ ] Class multi-select (IDs)
  - [ ] Default: non-prestige only
  - [ ] Toggle “Include prestige classes” (refetch class list or filter locally)

- [ ] Level selector (0–9)
- [ ] Optional: rulebook selector (multi-select)
  - [ ] If omitted, rely on backend default edition rulebooks (`core-35`)

### 3.2 Browse results list

- [ ] Calls:
  - `GET /api/spells/by-class-level?classIds=...&level=...&rulebookIds=...&page=...&pageSize=...`

- [ ] Displays each item:
  - [ ] Spell name
  - [ ] School/subschool (if present)
  - [ ] Descriptor chips
  - [ ] Rulebook abbr + page
  - [ ] MatchedClassLevels summary (e.g., “Wizard 3, Sorcerer 3”)

- [ ] Sorting is treated as server-defined (name,id stable)

### 3.3 Pagination UX

- [ ] Next / Prev buttons (MVP-simple)
- [ ] Show: “Showing X–Y of total”
- [ ] Keep selection state when paging
- [ ] Scroll restore when returning from spell detail

### 3.4 Empty/error states

- [ ] If no classIds or level missing → block query and show inline validation (frontend-side)
- [ ] If backend 400 → show `{message, error}` in a friendly UI (no raw JSON)
- [ ] If empty results → “No spells found for selected classes at level N”

---

## 4) Global Name Search (Search Bar UX)

Must follow backend semantics: **name substring only**, no class/level filters .

### 4.1 Search input behavior

- [ ] Debounce typing (e.g., 250–400ms)
- [ ] Minimum length 2:
  - [ ] if `< 2` show “Type at least 2 characters”
  - [ ] do not call API

- [ ] Enter key triggers immediate search (skip debounce)

### 4.2 Search results page

- [ ] Calls:
  - `GET /api/spells/search?q=...&rulebookIds=...&page=...&pageSize=...`

- [ ] Shows similar fields as browse list (except class levels)
- [ ] Highlights query substring in spell names (nice-to-have)
- [ ] Supports pagination

### 4.3 “Search vs Browse” separation (important)

- [ ] UI does **not** show class/level filters on search results (avoid implying combined search)
- [ ] Provide a CTA: “Switch to Browse (Class + Level)” for structured lists

---

## 5) Spell Detail Page

Must be able to render from a **single detail call** .

### 5.1 Data fetch

- [ ] `GET /api/spells/:id`
- [ ] Loading skeleton
- [ ] 404 shows “Spell not found”
- [ ] 400 shows “Invalid spell id”

### 5.2 Detail rendering sections

- [ ] Header:
  - [ ] Name + (optional) short descriptors
  - [ ] Rulebook abbr + page

- [ ] Classification:
  - [ ] School / Subschool
  - [ ] Descriptor chips

- [ ] Levels:
  - [ ] Class levels (group by class)
  - [ ] Domain levels (group by domain)

- [ ] Components:
  - [ ] Flags shown as chips (V/S/M/DF/XP/etc.)
  - [ ] extraComponentsText displayed

- [ ] Mechanics:
  - [ ] casting time, range, target/effect/area, duration, saving throw, SR

- [ ] Description:
  - [ ] Render `descriptionHtml` safely (or use `descriptionText` fallback)
  - [ ] Copy button (copy text) (nice-to-have)

### 5.3 Actions

- [ ] “Favorite” toggle
- [ ] “Add to Spellbook”
- [ ] “Add to Prepared”
- [ ] Notes editor (local storage)

---

## 6) Local-Only Collections (Frontend MVP)

Backend storage is out-of-scope for MVP, so frontend owns persistence .

### 6.1 Storage strategy (MVP)

- [ ] Use localStorage (simple)
- [ ] Data structures versioned:
  - [ ] `storageVersion: 1`
  - [ ] allow future migrations

### 6.2 Favorites

- [ ] Favorite toggle from list and detail
- [ ] Favorites page:
  - [ ] list favorite spells (requires fetching spell list by ids or storing minimal cached metadata)
  - [ ] local filter/search within favorites (client-side)

### 6.3 Notes

- [ ] Notes are per spell id
- [ ] Notes editable in spell detail
- [ ] Notes visible in favorites/spellbook lists (optional)

### 6.4 Spellbooks

- [ ] Create / rename / delete spellbook
- [ ] Add/remove spells
- [ ] Spellbook detail page lists spells
- [ ] Optional: reorder spells (nice-to-have)

### 6.5 Prepared sets

- [ ] Create prepared set (named)
- [ ] Add spells with count
- [ ] Mark used count (simple buttons)
- [ ] Optional: group by level (nice-to-have)

---

## 7) Performance & UX (MVP Standards)

### 7.1 Rendering performance

- [ ] Virtualized list for browse/search results (recommended if list is large)
- [ ] Avoid re-render storms on typing (debounce + memo)

### 7.2 Request management

- [ ] Cancel in-flight searches on new input (AbortController)
- [ ] Cache spell detail responses (simple in-memory map)

### 7.3 Stability

- [ ] Stable pagination: do not reorder client-side (server already guarantees stable sorting)
- [ ] Show clear error messages (no stack traces)

---

## 8) “Do Not Do in MVP” Guardrails

These are explicitly deferred by backend MVP docs :

- [ ] No combined advanced search UI (school/descriptor/components) for MVP
- [ ] No full-text search UI
- [ ] No cursor pagination
- [ ] No rule engine / legality checking

---

## 9) Acceptance Tests (Frontend)

A quick manual checklist (what we verify before calling it “done”):

- [ ] Browse: Wizard + level 3 returns list, paging works, stable sorting
- [ ] Browse: multi-class selection shows `matchedClassLevels`
- [ ] Search: typing `<2` chars does not call API, shows hint
- [ ] Search: “fire” returns spells with “fire” in name, paging works
- [ ] Detail: spell page loads fully from one call
- [ ] Favorite: toggle persists after refresh
- [ ] Spellbook: create + add spells persists after refresh
- [ ] Prepared: create set + mark used persists after refresh
