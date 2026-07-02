# i18next Convention Hardening Plan

This plan captures the v3.4 direction for keeping `i18next` while making the
frontend UI-copy workflow less fragile.

Status: implemented. Use this document as the implementation reference for the
semantic-key i18next workflow and its audit guardrails.

## User Outcome

Developers can change English UI copy without breaking Chinese translations,
losing extractor coverage, or creating inconsistent key styles.

Users should see no intentional feature or language behavior change from this
work. The visible outcome is steadier UI copy in English and Chinese.

## Problem Statement

The frontend currently uses raw English strings as translation keys. That made
early i18n setup quick, but it now creates maintenance problems:

- changing English copy also changes the lookup key
- long toast messages, placeholders, and examples become unreadable key ids
- plural keys are generated from full English sentences
- namespace ownership is implied by component location rather than documented
- extractor success does not prove the checked-in locale files follow the
  project conventions
- ignored namespaces need manual care and can drift from regular namespaces

The current scale is already large enough to justify tightening the workflow:

- locale source files: `web/public/locales/{en,zh}/`
- namespaces: `translation`, `topbar`, `pager`, `collections`,
  `collections-default`, `metamagic`, `settings`, `spell-browse`,
  `spell-scope`, `spell-search`, `spell-detail`
- active i18next call sites: many feature components plus root/layout helpers
- current sync wrapper: `web/scripts/i18next-sync.ts`

## Existing Surface To Reuse

Runtime and config:

- `web/app/i18n/init.ts`
- `web/app/i18n/config.ts`
- `web/app/i18n/sync.tsx`
- `web/i18next.config.ts`

Locale and workflow:

- `web/public/locales/en/*.json`
- `web/public/locales/zh/*.json`
- `web/scripts/i18next-sync.ts`
- root scripts: `npm run i18n:sync`, `npm run i18n:check`,
  `npm run i18n:diff`
- workflow doc: `docs/i18n.md`

Feature call sites:

- `web/app/layout/TopBar.tsx`
- `web/app/root.tsx`
- `web/app/components/Pager.tsx`
- `web/app/features/browse/`
- `web/app/features/search/`
- `web/app/features/spells/`
- `web/app/features/settings/`
- `web/app/features/collections/`

## Goals

- Keep `i18next` and `react-i18next`.
- Replace raw-English keys with stable semantic key ids.
- Keep English copy in `web/public/locales/en/` as the editable source for
  English UI text.
- Keep Chinese UI copy in `web/public/locales/zh/`.
- Keep spell/content translations and entity overlays separate from UI copy.
- Make `npm run i18n:check` fail when new raw-English keys or locale-shape drift
  appear.
- Document the convention in `docs/i18n.md` after implementation.

## Non-Goals

- Do not replace `i18next` with Lingui, FormatJS, Paraglide, or another runtime.
- Do not redesign the language selector UI.
- Do not move Chinese spell descriptions, spell names, or metadata overlays into
  frontend locale JSON.
- Do not change API language query behavior in `web/app/api/http.ts`.
- Do not change local data import ownership under `server/data/i18n/`.
- Do not block v3.3 freeze on this cleanup.

## Key Convention

Use stable semantic ids instead of English sentences.

Recommended key shape:

```ts
t("nav.browse")
t("search.errors.tooShort")
t("prepared.copy.copiedRows", { count })
t("spellDetail.errors.notFound")
```

Recommended locale shape remains flat JSON during the migration:

```json
{
  "nav.browse": "Browse",
  "search.errors.tooShort": "Enter at least 2 characters to run a search.",
  "prepared.copy.copiedRows_one": "Copied {{count}} row as TSV.",
  "prepared.copy.copiedRows_other": "Copied {{count}} rows as TSV."
}
```

Rationale:

- `web/app/i18n/init.ts` currently uses `keySeparator: ">"`, so dots are safe as
  literal key characters while retaining flat locale files.
- flat files keep review diffs simple and preserve compatibility with the
  current extractor/sync wrapper.
- a later pass can revisit nested JSON only if it clearly improves tooling.

Key rules:

- Use lowercase dot-separated semantic segments.
- First segment should identify the local feature or component area.
- Prefer nouns for UI objects and verbs for actions:
  - `nav.browse`
  - `actions.clear`
  - `filters.class`
  - `errors.requestFailed`
- Do not use raw English sentences as new keys.
- Do not include punctuation, tabs, newlines, or interpolated example text in
  key ids.
- Keep interpolation variable names semantic and stable:
  - good: `{{count}}`, `{{query}}`, `{{level}}`
  - avoid: `{{n}}`, `{{x}}`
- For plurals, call the base key in code and store i18next plural variants in
  JSON:
  - code: `t("prepared.slots.count", { count })`
  - JSON: `prepared.slots.count_one`, `prepared.slots.count_other`

## Namespace Ownership

Keep namespaces feature-sized, but make ownership explicit.

Recommended ownership:

- `translation`: app-root fallback, temporary shared keys only
- `topbar`: global top navigation and header search shell
- `pager`: shared pagination component
- `settings`: Settings page and setting controls
- `spell-browse`: Browse page and Browse-only controls
- `spell-scope`: shared Browse/Search spell-filter scope summary
- `spell-search`: Search page, search validation, and Search-only controls
- `spell-detail`: Spell detail page and detail sections
- `collections`: spellbooks, favorites, prepared books, import/export, copy
  flows
- `collections-default`: seeded local collection names
- `metamagic`: stable metamagic labels

Rules:

- New feature-specific UI copy should go in the closest feature namespace, not
  `translation`.
- Shared component copy can use a small shared namespace only when it is reused
  by multiple features.
- Avoid importing many namespaces into one component. If a component routinely
  needs several namespaces, split the component or move the relevant copy owner.
- `collections-default` and `metamagic` may remain ignored by extraction if
  their content is data-like and maintained manually, but the reason must stay
  documented in `web/i18next.config.ts` or `docs/i18n.md`.

## Migration Strategy

Use an incremental compatibility migration. Do not convert the whole frontend in
one blind rewrite.

### Phase 0: Inventory

- Generate a report of current keys by namespace and language.
- Classify keys into:
  - short label keys
  - long sentence keys
  - interpolated keys
  - plural keys
  - example or placeholder keys
  - manually maintained data-like keys
- Compare `en` and `zh` key sets and record existing mismatches before changing
  code.
- Decide whether current mismatches are intentional, legacy drift, or missing
  translations.

Suggested output:

- `data-tools/out/` is not appropriate because this is frontend workflow state.
- Use a temporary generated report under `web/extracted/` or print to stdout.
- Do not commit generated reports unless the report becomes a durable harness
  artifact.

### Phase 1: Document And Enforce New-Key Rules

- Update `docs/i18n.md` with the semantic-key convention.
- Add or extend an i18n audit script that can run in check mode.
- Make the audit detect:
  - new keys that look like raw English sentences
  - keys containing tabs or newlines
  - keys containing interpolation as part of the id
- locale key-set mismatch between `en` and `zh`, except approved ignored
    namespaces; compare by normalized plural base key so language-specific
    plural categories do not create false mismatches
  - plural base keys missing `_one` or `_other` when used with `count`
- Wire the audit into `npm run i18n:check` after the current extractor check.

This phase initially allowed existing raw-English keys temporarily through an
explicit legacy allowlist. The implementation has migrated the tracked
namespaces and left `web/scripts/i18n-legacy-keys.json` empty so future raw-key
additions fail `npm run i18n:check`.

### Phase 2: Low-Risk Namespace Migration

Status: implemented for `topbar`, `pager`, `settings`, and `spell-scope`.

Start with small namespaces:

- `topbar`
- `pager`
- `settings`

For each namespace:

1. Create a key map from old raw-English keys to new semantic keys.
2. Update component `t(...)` calls.
3. Rename keys in both `en` and `zh` locale files.
4. Remove migrated keys from the legacy allowlist.
5. Run:

   ```bash
   npm run i18n:sync
   npm run i18n:check
   npm run test:web
   npm run typecheck:web
   ```

Acceptance for each namespace:

- no user-visible copy regression
- no missing key in English or Chinese
- no new raw-English key added
- locale diff is reviewable by namespace

### Phase 3: Feature Namespace Migration

Status: implemented for `spell-browse`, `spell-search`, `spell-detail`,
`translation`, and `collections`. `metamagic` and `collections-default` already
used data-like semantic keys and remain extractor-ignored/manual namespaces.

Migrate larger feature namespaces after the audit and small namespaces are
proven:

1. `spell-browse`
2. `spell-search`
3. `spell-detail`
4. `collections`

Recommended order rationale:

- Browse/Search are user-facing but smaller than collections.
- Spell detail has many labels and error states, but fewer workflow toasts.
- Collections has the most long messages, import/export feedback, placeholders,
  TSV examples, and prepared-spell copy, so it should move last.

Collections-specific guidance:

- Split key groups by workflow:
  - `books.*`
  - `favorites.*`
  - `prepared.*`
  - `prepared.bulkPaste.*`
  - `prepared.copy.*`
  - `prepared.importExport.*`
- Example payload text should use semantic keys:
  - old: `Magic Missile\tShield\tFireball\nHaste\tFly`
  - new: `prepared.bulkPaste.exampleText`
- Toast titles and descriptions should use separate keys:
  - `prepared.copy.successTitle`
  - `prepared.copy.successDescription`

### Phase 4: Runtime Hardening Review

After key migration, review whether the current HTTP-loaded locale runtime is
still the right tradeoff.

Questions:

- Does `i18next-http-backend` create avoidable loading states or failure modes
  for this app size?
- Would static importing locale JSON into the bundle simplify tests and remove
  runtime fetch failure modes?
- Does React Router SSR/build behavior work cleanly with static resources?
- Does Suspense during i18n initialization still provide value?

This phase may keep the current runtime if it is stable. The main v3.4 win is
semantic keys and checkable workflow, not a runtime architecture rewrite.

## Harness Plan

Add the smallest harness that proves the convention.

Audit-level tests:

- key classifier catches obvious raw-English keys
- key classifier allows semantic dot keys
- locale comparison reports missing `zh` keys
- plural checks understand `_one` and `_other`

Frontend tests:

- keep existing i18n storage and display fallback tests
- update component tests only if migrated copy affects existing assertions
- prefer testing behavior over exact English copy unless copy is the behavior

Validation commands:

```bash
npm run i18n:sync
npm run i18n:check
npm run test:web
npm run typecheck:web
npm run verify
```

## Documentation Updates After Implementation

When the implementation lands, update:

- `docs/i18n.md`
  - semantic key convention
  - namespace ownership
  - migration status
  - audit/check behavior
- `docs/features.md`
  - only if user-facing language behavior changes
- `docs/harness.md`
  - if a new durable i18n audit command becomes part of the validation spine
- `web/README.md`
  - if command names or frontend i18n workflow change
- root `README.md` and `docs/README.md`
  - if v3.4 becomes the active development track or later freeze snapshot

## Acceptance Criteria

- [x] New UI copy uses semantic keys rather than raw-English keys.
- [x] `npm run i18n:check` fails on new raw-English keys outside an explicit
  legacy allowlist.
- [x] English and Chinese locale files have matching normalized base-key sets.
- [x] Pluralized keys are represented consistently.
- [x] `collections-default` and `metamagic` manual maintenance rules are
  documented if they remain extractor-ignored.
- [x] The legacy raw-English allowlist shrinks as namespaces migrate.
- [x] `docs/i18n.md` reflects the final convention.
- [x] `npm run verify` passes after the migration.

## Open Questions

- Should `translation` be retired after migration, or retained for root-level
  loading/error copy?
- Should the audit allow short raw labels such as `Save`, or should all new keys
  be semantic from day one?
- Should locale JSON remain flat permanently, or should nested JSON be
  reconsidered after semantic keys are complete?
- Should `i18n:check` be part of root `npm run verify`, or remain an explicit
  i18n-only command until the migration is complete?
- Should `i18next-http-backend` be replaced with bundled static resources after
  the key migration?
