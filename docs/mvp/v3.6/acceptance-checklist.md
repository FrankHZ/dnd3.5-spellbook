# v3.6 Acceptance Checklist

Status: accepted; v3.6 is ready for freeze.

This checklist records the evidence used to freeze v3.6. It is not an
implementation ledger; use `FREEZE.md` for the final as-built snapshot.

## Scope Under Acceptance

- Version: v3.6.
- Owning plan: `docs/mvp/v3.6/integrated-plan.md`.
- Included PRs:
  - [#10](https://github.com/FrankHZ/dnd3.5-spellbook/pull/10):
    v3.6 plan workstreams.
  - [#11](https://github.com/FrankHZ/dnd3.5-spellbook/pull/11):
    DB status API.
  - [#12](https://github.com/FrankHZ/dnd3.5-spellbook/pull/12):
    UI display settings and spell card polish.
  - [#14](https://github.com/FrankHZ/dnd3.5-spellbook/pull/14):
    docs structure cleanup.
  - [#15](https://github.com/FrankHZ/dnd3.5-spellbook/pull/15):
    normalized rules review.
  - [#16](https://github.com/FrankHZ/dnd3.5-spellbook/pull/16):
    v3.7 handoff planning, merged before this freeze so deferred work has an
    active next-version home.
- Explicitly excluded follow-up work:
  - broader normalized filter contracts beyond current taxonomy filters.
  - Tome of Battle source-kind/category UI grouping.
  - normalized Spell Detail mechanics display.
  - TypeScript server/CommonJS versus contracts/ESM migration.
  - v3.7 security hardening and dependency upgrades.
  - automatic DB release artifacts or CD-managed DB upload.
  - bulk Chinese/English translation QA, `data/spells-full` completion,
    static/offline HTML artifacts, and offline search artifacts.

## Portable Checks

Run from `codex/docs-v3-6-freeze` after PR #16 was merged into `main`.

| Check | Result | Notes |
| ----- | ------ | ----- |
| `npm run ci:portable` | Passed | Contracts build/import passed; Prisma clients generated; server build passed; server tests passed: 16 files, 58 tests; portable data-tools tests passed: 9 checks; web tests passed: 24 files, 90 tests; web typecheck and build passed. React Router v8 future warnings and existing sourcemap warnings were non-blocking. |
| `npm run i18n:check` | Passed | i18next dry-run updated no files; i18n audit passed for 12 namespaces. |
| `git diff --check` | Passed | No whitespace errors in the freeze branch. |

## Local Data Or Deployment Acceptance

v3.6 does not mutate local source data, commit SQLite files, or add DB upload to
CD. Local data acceptance is limited to the read-only normalized rules review
command that backs the v3.6 review decision.

| Check | Result | Notes |
| ----- | ------ | ----- |
| `npm run -w data-tools rules:content:review` | Passed | Content DB: `server/db/local/content.sqlite`; taxonomy review rows: 0; component review rows: 6; mechanic review rows: 3511; report: `data-tools/out/rules-content/2026-07-04T01-58-21-613Z-normalized-rules-review.json`. |
| `npm run -w data-tools acceptance:local` | Not required | No v3.6 source import, parser cleanup, rules manifest, or DB mutation workflow shipped in this closeout branch. |

## Manual Smoke

No new browser smoke was required for the freeze-doc branch. The shipped UI/UX
slice was reviewed before merge, and the final freeze validation re-ran the web
test, typecheck, i18n, and production build gates.

## Known Non-Blockers

- React Router v8 future warnings during `npm run -w web build`.
  - Reason it does not block freeze: v3.7 dependency and module-boundary
    planning owns risky ecosystem upgrades.
  - Follow-up doc: `docs/mvp/v3.7/dependency-upgrade-plan.md`.
- Existing Vite sourcemap warnings for local UI wrapper files during web build.
  - Reason it does not block freeze: build completed successfully and the
    warning does not change runtime behavior.
  - Follow-up doc: `docs/mvp/v3.7/dependency-upgrade-plan.md` if dependency or
    bundler work touches this area.
- Component and mechanic review rows remain in normalized content.
  - Reason it does not block freeze: v3.6 reviewed and classified them instead
    of exposing them as public query vocabulary.
  - Follow-up doc: `docs/mvp/v3.6/normalized-rules-review-plan.md`.

## Freeze Evidence To Record

`FREEZE.md` records:

- final validation command results.
- accepted deliverables.
- known deferred work.
- canonical source order for the frozen version.
