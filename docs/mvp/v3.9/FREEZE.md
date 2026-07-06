# v3.9 Freeze

## Status

**v3.9 FROZEN**

This document records the final canonical documentation state for the v3.9
handoff.

## Canonical Source Order

When v3.9 documents conflict, treat this freeze document as authoritative over
earlier v3.9 planning documents.

Use this precedence order for v3.9:

1. `docs/mvp/v3.9/FREEZE.md`
2. current focused topic docs changed by v3.9
3. current operational docs changed by v3.9
4. focused v3.9 plan documents

## Frozen Deliverables

1. Backend normalized mechanics contract for public spell filters.
2. Frontend Browse/Search consumer for normalized mechanics filters.
3. Content-backed Spell Detail mechanics metadata display for supported flags.

## Final As-Built Summary

### 1. Normalized Mechanics Contract

Shipped behavior:

- Shared spell query DTOs include `castingTimeKeys`, `rangeKeys`,
  `durationKeys`, `savingThrowKeys`, and `spellResistanceKeys`.
- `GET /api/meta/filters` exposes server-owned normalized mechanics vocabulary
  for casting time, range, duration, saving throw, and spell resistance.
- Search and Browse/by-level endpoints parse, sanitize, echo, and apply the
  promoted mechanics filters consistently.
- Within one mechanics family, selected keys use `any` semantics; across
  different filter families, selected filters use `all` semantics.
- Content-backed reads match accepted `SpellMechanicFacet` rows only.
- Legacy rules rollback reads use conservative raw-string matching aligned with
  the accepted bucket definitions.
- Missing, `empty`, `special`, and review-status mechanics rows are not public
  vocabulary and do not match promoted filters.
- `components.other_or_extra` remains detail/raw text only and is not public
  filter vocabulary.
- `target`, `effect`, and `area` remain deferred because their current source
  text is high-volume and mixed.

Accepted evidence:

- Backend mechanics contract branches landed before the frontend consumer
  handoff.
- Local final `npm run -w data-tools rules:content:review` passed on
  2026-07-05 with taxonomy review rows `0`, component review rows `6`, and
  mechanic review rows `3511`.
- Local final `npm run ci:portable` passed on commit `f75d62b`.

Frozen clarification:

- Review-only mechanics rows remain audit inventory, not release blockers.
- Public mechanics filters are limited to the accepted bucket families listed
  above. Detail metadata flags are not public filters.

### 2. Frontend Filter Consumer

Shipped behavior:

- Browse/Search consume server-provided mechanics vocabulary instead of parsing
  legacy mechanics strings in the browser.
- Browse remains filter-first and Search remains name-first.
- Secondary taxonomy, component, and mechanics controls live in the shared
  Advanced filters panel. The panel drafts edits locally and writes URL state
  on Apply.
- URL and API helpers round-trip the promoted mechanics params and drop unknown
  values consistently.
- Browse/Search compact scope summaries count mechanics as one compact category.

Accepted evidence:

- PR `#39`, `[v3.9] Frontend normalized mechanics consumer`, merged at
  `2026-07-06T02:18:56Z` with merge commit
  `f457349f9acc0ba3084f4b87fa3dbf89fa2a2a2b`.
- Local final `npm run ci:portable` passed on commit `f75d62b`: server `18`
  files / `80` tests, data-tools portable `9` checks, web `29` files / `113`
  tests, web typecheck/build passed.
- Local final `npm run i18n:check` passed with no extracted key updates and a
  passing i18n audit.

Frozen clarification:

- The accepted Advanced filters panel is a practical consumer for the promoted
  v3.9 vocabulary. It is not the final broader filter-design system.
- Concrete mechanics bucket labels currently come from server-provided
  vocabulary labels.

### 3. Spell Detail Mechanics Metadata

Shipped behavior:

- Content-backed Spell Detail can include accepted `casting.mechanics` flags.
- Duration detail metadata supports `dismissible` and `discharge`.
- Saving throw detail metadata supports `partial`, `negates`, `harmless`, and
  `object`.
- Spell resistance detail metadata supports `harmless` and `object`.
- Spell Detail renders supported flags as secondary text notes on the relevant
  casting rows.
- Legacy detail responses do not infer these flags from raw source strings.

Accepted evidence:

- Frontend consumer completion in PR `#39` covered Spell Detail rendering for
  the supported metadata flags.
- Local final `npm run ci:portable` and `npm run i18n:check` passed after the
  v3.9 merge.

Frozen clarification:

- Casting time and range still display their normal source text in Spell Detail.
- `target`, `effect`, and `area` stay on the deferred contract path.

## Validation Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `npm run ci:portable` | Passed | Local final pass on `f75d62b`; server `18` files / `80` tests, data-tools portable `9` checks, web `29` files / `113` tests, web typecheck/build passed. |
| `npm run i18n:check` | Passed | No i18next extraction changes; i18n audit passed for `13` namespaces. |
| `npm run -w data-tools rules:content:review` | Passed | Reported taxonomy review rows `0`, component review rows `6`, mechanic review rows `3511`; generated report `2026-07-06T02-34-07-761Z-normalized-rules-review.json`. |
| GitHub PR `#39` | Merged | Frontend consumer PR merged at `2026-07-06T02:18:56Z`, merge commit `f457349f9acc0ba3084f4b87fa3dbf89fa2a2a2b`. |

## Known Deferred Work

- Localize mechanics bucket labels instead of relying only on server-provided
  English vocabulary labels.
- Polish the Advanced filters panel as part of a later filter UI/design-system
  pass.
- Consolidate duplicated query-param normalization between
  `web/app/api/spells.ts` and
  `web/app/features/spells/taxonomy-filter-state.ts` when touching those
  helpers again.
- Revisit `target`, `effect`, and `area` only after a later backend contract
  accepts public buckets and fallback behavior for those high-volume fields.
- Keep the reviewed Prisma dev-chain / Hono audit advisories as maintenance
  follow-up, not hidden v3.9 blockers.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Do not treat older v3.9 plan documents as newer than this snapshot.
- v3.9 closed the normalized mechanics/query fullstack pass without expanding
  into content artifact automation, static/offline generation, large
  translation QA, broad security/deploy hardening, dependency cleanup, or full
  server ESM migration.
