## v2 Goal

Replace the old Chinese CHM workflow with an in-app Chinese experience that is:

- usable during play
- easy to maintain
- resilient to messy source formatting

**MVP of v2:** Chinese spell name + Chinese description (text/HTML), keyed by spellId, with fast lookup and safe rendering.

---

## v2 Scope Decisions

### In scope (v2.0)

1. **Spell Chinese overlay**

- `spellId -> zhName`
- `spellId -> zhDescription` (primary)
- optional: `altZhNames[]` (nice-to-have but low cost)

2. **Partial bilingual UI**

- Use normal i18n toggle (EN / ZH)
- Spell detail shows one language at a time (default), with a quick toggle

3. **Backend storage + serving**

- separate “app data” DB is fine (recommended)
- endpoints to fetch zh overlay (bundled into spell detail or separate endpoint)

4. **Importer pipeline**

- tool parses CHM-extracted HTML into a normalized output
- writes to zh overlay tables with confidence/metadata

### Explicitly out of scope (v2.0)

- parsing every structured field (components, casting time, etc.) from CHM
- Chinese full-text search over description (do later if needed)
- legal correctness / “perfect mapping” guarantee across all spells

---

## What to Parse First (practical priority)

Since CHM organization is messy, optimize for “high value, low structural dependency”:

### Must parse

- **Chinese spell name** (best-effort)
- **Chinese description** (primary payload)

### Optional parse (only if it’s easy from your source format)

- source book/page in Chinese (if present)
- short summary line (if reliably marked)

### Do not parse (v2.0)

- mechanics fields (casting time/range/duration/target…)
- components flags
- class/domain levels

Keep these English from your existing DB. This reduces parser brittleness massively.

---

## Parser Reality: design for imperfect results

Assume:

- missing entries
- duplicated entries
- inconsistent headers
- multiple translations for same spell
- “near-match” spell names

So v2 needs these **robustness features**:

### 1) Confidence + provenance

Store metadata per imported record:

- `sourcePack` (which CHM/version)
- `parsedAt`
- `confidenceScore` (0–1 or 0–100)
- `matchMethod` (exact name / heuristic / manual)
- optional: `rawTitle` extracted from HTML

This lets you debug and improve without fear.

### 2) Manual override table (critical)

Even if you don’t build a UI for it yet, the system should support:

- “force this zh entry to map to spellId X”
- “hide/disable this bad entry”
- “prefer this translation as primary”

This prevents being blocked by edge cases.

---

## Backend Storage Plan (recommended)

Keep rules DB read-only and keep Chinese overlay in **app DB**.

### Tables (conceptual)

- `zh_spell`
  - `spellId` (FK-like, same id as rules db)
  - `zhName`
  - `zhNameAlt` (optional JSON/text)
  - `zhDescriptionHtml` (sanitized) OR `zhDescriptionText`
  - `sourcePack`, `sourceKey` (optional)
  - `confidence`, `matchMethod`
  - `createdAt`, `updatedAt`

- `zh_import_run` (optional but helpful)
  - run id, timestamp, file/version, stats (# parsed, # matched, # low confidence)

Why this is good:

- no contamination of legacy rules db
- easy to wipe/reimport
- easy to support multiple CHM packs later

---

## Backend Serving Strategy

Two good options:

### Option A (recommended for v2): include ZH overlay in spell detail response

- `GET /api/spells/:id?lang=zh`
  - returns English fields + a `zh` object when present

- Or always return both in detail:
  - `spell.en = ...`, `spell.zh = ...`

**Pros:** one request, simplest frontend
**Cons:** bigger payload (but detail calls aren’t huge)

### Option B: separate endpoints for zh overlay

- `GET /api/spells/:id` (existing English)
- `GET /api/spells/:id/zh`

**Pros:** keeps English stable, avoids payload growth
**Cons:** two calls or extra orchestration

Given your “deployment took time” note and desire to move fast, I’d choose **Option A** for v2.

---

## Frontend UX: i18n toggle vs side-by-side

Your updated thinking is right: **start with normal i18n toggle**.

### v2.0 UX baseline

- A language toggle (EN/ZH) at top bar or spell detail header
- In ZH mode:
  - show Chinese name + Chinese description if present
  - if missing: show a clear fallback notice + English description

### Nice-to-have (v2.1+)

- side-by-side “ZH main / EN reference” split view
- quick inline EN snippet under ZH headings

Don’t do split view until you’ve validated users actually want it; it’s easy to add later.

---

## v2 Milestones (clean execution)

### v2.0

1. storage schema + endpoints (zh overlay)
2. importer tool that produces usable zhDescription for a subset
3. frontend language toggle + fallback

### v2.1

- improve mapping accuracy + manual overrides
- add zh name search (not full text)

### v2.2+

- zh full-text search (FTS) if needed

---

## Key decision to lock now

**“Chinese is an overlay keyed by spellId; English remains the source of truth for structured fields in v2.”**

This keeps you from getting sucked into parsing components/casting time too early.
