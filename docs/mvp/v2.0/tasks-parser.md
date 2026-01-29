## Chinese Parser Mini-Project Goals

### Primary output (v2.0)

Produce a dataset (JSON or direct DB inserts) with:

- `spellId` (or a resolvable key)
- `zhName`
- `zhDescription` (HTML or text)
- metadata: `source`, `confidence`, `matchMethod`

**We are not parsing structured fields** (components/casting time/etc.) in v2.0.

---

## Phase 0 — Inputs & Constraints (1-time setup)

**Tasks**

- [ ] Decide input format for parser:
  - preferred: **CHM extracted to HTML files** (folder)
  - fallback: user-provided “single HTML dump” (less ideal)

- [ ] Decide output format:
  - [ ] `zh-spells.json` (recommended for iteration)
  - [ ] later: import into `app.db` table

**Definition of done**

- You can point the tool at a directory and get “0 errors + empty output” baseline run.

---

## Phase 1 — Discovery & Pattern Catalog (most important)

CHM is messy, so we first build a _pattern library_ before “real parsing”.

**Tasks**

- [ ] Pick a representative sample set (50–100 spells):
  - include short/long descriptions
  - include weird formatting cases
  - include duplicates / variants

- [ ] For each sample, identify:
  - how the spell page is titled (header pattern)
  - where description begins/ends
  - common sections markers (even if inconsistent)
  - encoding quirks (entities, GBK/UTF-8 issues, broken tags)

**Deliverable**

- `/docs/zh-parser-patterns.md` containing:
  - observed title patterns
  - observed delimiter/section markers
  - known “bad HTML” examples
  - proposed extraction rules (v0)

**Definition of done**

- You can describe 2–3 dominant page formats + the major outliers.

---

## Phase 2 — Extractor Core (Name + Description only)

**Tasks**

- [ ] Implement HTML cleaning strategy decision:
  - store as sanitized HTML (safe subset) **or**
  - convert to text/markdown

- [ ] Implement extraction:
  - `zhName` from page title/header
  - `zhDescription` from main content region

- [ ] Normalize output:
  - trim whitespace
  - normalize punctuation and full-width/half-width spaces (if needed)
  - stable `sourceKey` (file path or anchor id)

**Deliverables**

- CLI tool that outputs JSON:
  - `records[] = { sourceKey, zhName, zhDescription, … }`

- extraction stats:
  - # files scanned
  - # extracted
  - # failed + reasons bucketed

**Definition of done**

- On sample set, >= 80% of pages produce non-empty name + description.

---

## Phase 3 — Matcher (Map extracted records to your spell IDs)

This is usually the hardest part because spell names aren’t 1:1.

### 3.1 Matching strategy (recommended layered approach)

**Layer 1: Direct mapping**

- If CHM includes English name or an ID-like tag, use that.

**Layer 2: Exact name match**

- Compare normalized English spell name against a known mapping list (if CHM has English in parentheses, etc.)

**Layer 3: Heuristic match**

- Use a bilingual dictionary or name table if you have it (you mentioned you have spell name translations)

**Layer 4: Manual overrides**

- A small “override.csv/json” where you map `sourceKey -> spellId` for edge cases.

**Tasks**

- [ ] Define `normalizeName()` rules for:
  - removing spaces/punctuation variants
  - roman numerals vs digits (if present)
  - parentheses content stripping (if needed)

- [ ] Implement confidence scoring:
  - exact match = 1.0
  - heuristic match = 0.6–0.9 depending on rule
  - manual override = 1.0 but mark method=manual

- [ ] Produce 3 outputs:
  - `matched.json`
  - `unmatched.json`
  - `ambiguous.json` (multiple candidates)

**Definition of done**

- You can achieve:
  - high precision on matched set (avoid wrong mappings)
  - manageable unmatched list for manual fixing

**Important rule**

> Prefer **precision** over recall in v2. Wrong Chinese on a spell is worse than missing Chinese.

---

## Phase 4 — Sanitization & Safety Gate (must-have)

If you store HTML, you need a safe policy.

**Tasks**

- [ ] Decide allowed tags/attributes
- [ ] Strip scripts, inline event handlers, unsafe URLs
- [ ] Ensure output cannot XSS in your SPA

**Deliverable**

- “sanitizer policy” documented in `/docs/zh-sanitization.md`

**Definition of done**

- You can render zhDescription in the frontend with no unsafe HTML.

---

## Phase 5 — Importer (DB writer) + Incremental Updates

Once JSON is stable, write to DB.

**Tasks**

- [ ] Import run tracking:
  - source version
  - timestamp
  - counts

- [ ] Upsert rules:
  - same spellId overwrites previous translation only if confidence >= existing confidence (optional)

- [ ] Support re-running import safely

**Definition of done**

- One command can reimport everything without manual DB cleanup.

---

## Phase 6 — Quality / Regression Harness (keeps you sane)

**Tasks**

- [ ] Golden set of 20 spells:
  - known good ZH output snapshot

- [ ] Run parser and diff results on each change
- [ ] Track failure reasons counts (so improvements are visible)

**Definition of done**

- Parser improvements are measurable and don’t regress silently.

---

## What to do first (next 3 concrete tasks)

1. **Create the sample set** (50–100 pages) + write `/docs/zh-parser-patterns.md`
2. Decide **HTML vs text** output + sanitization approach
3. Implement “Extract name + description + stats” only (no matching yet)
