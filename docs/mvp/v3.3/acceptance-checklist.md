# v3.3 Acceptance Checklist

This checklist records the v3.3 acceptance state that supported
`docs/mvp/v3.3/FREEZE.md`.

Use the freeze document as the frozen release snapshot. Use this file for
verification detail.

## Automated Acceptance Run

Last full data acceptance run: 2026-06-26.

Final v3.3 UI smoke, `npm run verify`, and `npm run i18n:check` confirmation:
2026-06-28.

Commands run successfully:

```bash
npm run -w data-tools inspect:rules -- counts
npm run -w data-tools rules:sql:dry-run -- legacy-sql/rules-clean-v2.0.patch.sql
npm run -w data-tools rules:index:rebuild -- --dry-run
npm run -w data-tools spells-full:inspect -- known-misses
npm run -w data-tools zh:parse
npm run -w data-tools zh:qa
npm run -w data-tools zh:backcheck
npm run -w server db:app:import:zh-chm
npm run verify
```

`npm run verify` now includes:

```bash
npm run build:contracts
npm run check:contracts
npm run typecheck:data-tools
npm run test:server
npm run test:web
npm run typecheck:web
```

Observed CHM parser state:

- `matched`: `3235`
- `unmatched`: `0`
- `unknownBookLabel`: `0`
- `missingRulebookInDb`: `0`
- `missingSpellInDb`: `0`
- `lowConfidence`: `0`
- `errors`: `0`

Observed CHM QA state:

- errors: `0`
- warnings: `0`
- info markers: `38`
- `body-note-marker`: `20`
- `long-bold-text`: `18`
- missing zh entries from backcheck: `55`

The remaining QA markers are review leads, not v3.3 blockers.

## Acceptance Coverage

Covered by automated commands:

- `data-tools` TypeScript validity through root `verify`
- read-only rules DB inspection
- legacy SQL patch dry-run path
- derived rules index rebuild dry-run path
- `spells-full` known-miss inspection
- CHM parser hard gates
- CHM mechanical source QA
- CHM backcheck coverage report
- app DB CHM import against current parser output
- server API tests
- frontend pure logic tests
- web typecheck

Covered by current feature tests and docs:

- Search URL scope helpers
- Search validation
- Search API filters
- Browse/Search current behavior in `docs/features.md`

Not repeated as automated acceptance:

- already-applied structured `insertSpell` patches. Re-running
  `rules:spells:validate` or `rules:spells:apply -- --dry-run` against the same
  patch files on the current rules DB is expected to fail because the target ids
  and `name + rulebook` rows already exist.
- `spells-full:generate --write-patch`, because the generated patch has already
  been reviewed/applied and rerunning it would rewrite local patch files.
- full app DB reset/rebuild, because that mutates local runtime data more
  broadly than the acceptance import smoke. Run it only when explicitly doing a
  local data rebuild.

## Manual Smoke Accepted

These are not covered by the current automated harness, but were manually
checked before freeze:

- Start server and web dev servers, then open the app in a browser.
- Browse: select class/domain/level filters and confirm results render.
- Browse to Search: submit a header search and confirm the Browse filter scope
  is preserved on Search.
- Search: edit class/domain/level filters in the sidebar and confirm result
  requests update.
- Search: clear Search filters and confirm `q` behavior and pagination reset
  feel correct.
- Spell detail: open one normal spell and one newly added/affected spell, such
  as `Fiery Assault` or `Spider Poison`, and confirm English and Chinese content
  render.
- Settings: switch language/rulebook scope and confirm Browse/Search still
  produce usable results.

Deferred manual/content QA:

- review remaining `body-note-marker` and `long-bold-text` info markers when
  doing broader translation QA
- short description parsing and QA, which is post-v3.3 scope
- bulk translation QA, deferred until a large rewrite or short-description
  import creates new target text

## Test Gap Decision

The only small v3.3 acceptance harness gap found in this pass was that
`data-tools` typecheck was not part of root `verify`. That is now fixed.

No new browser or end-to-end test harness is added for v3.3. The current repo
does not include a browser runner, and `docs/harness.md` keeps browser smoke as
the next layer after API and pure logic checks.
