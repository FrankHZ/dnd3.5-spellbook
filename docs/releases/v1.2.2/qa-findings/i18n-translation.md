# i18n-translation Raw QA Audit

> This is a temporary raw role audit. Proposed severities are not final;
> `main-gate` owns de-duplication and disposition. This file must be removed or
> collapsed into the v1.2.2 QA plan Completion Notes before the v1.2.2 freeze.

- Primary role: `i18n-translation`
- Audit base: `ff4f2ff7eb7158d2007178179c15919923769311`
- Handoff owner: `main-gate`
- Audit result: five actionable findings, all proposed P2; no P0 or P1 findings
- Audit mode: read-only; no audit-time files, local SQLite data, branches,
  commits, or remote configuration were changed
- Baseline: `npm run ci:portable` was reported passing on the exact audit base;
  it was not rerun after the audit timebox

## Findings

### I18N-QA-001 — Proposed P2

- Failure: Core Browse, Search, and Spell Detail error states render
  `ApiError.message` directly, exposing English API messages in Chinese mode
  instead of using the existing localized request-failure copy.
- Evidence:
  [BrowseSpellsPage.tsx:90](../../../../web/app/features/browse/BrowseSpellsPage.tsx#L90),
  [SearchSpellsPage.tsx:115](../../../../web/app/features/search/SearchSpellsPage.tsx#L115),
  and
  [SpellDetailPage.tsx:185](../../../../web/app/features/spells/SpellDetailPage.tsx#L185)
  return `err.message` for `ApiError`. The error object preserves the server
  payload message in
  [http.ts:13](../../../../web/app/api/http.ts#L13), while
  [error.middleware.ts:17](../../../../server/src/middlewares/error.middleware.ts#L17)
  returns English `err.message` values and the English `Internal server error`
  fallback. Localized `errors.request-failed` keys exist but these HTTP-error
  branches bypass them.
- Impact: Chinese users receive English validation, runtime, or outage messages
  on three critical spell-browsing surfaces.
- Coverage gap: HTTP tests cover error-payload preservation, but no page-level
  regression renders an `ApiError` under the Chinese locale.
- Recommended owner / smallest safe fix: `frontend-design`; centralize the
  user-facing API-error mapping, retain specific handling for stable error
  codes, use localized generic copy for unmapped errors, and add focused English
  and Chinese page tests.
- Confidence / unresolved question: High. The remaining product decision is
  which additional stable server error codes warrant specific localized copy.

### I18N-QA-002 — Proposed P2

- Failure: Importing valid JSON with an invalid spell-book shape displays
  hard-coded English parser errors in Chinese mode.
- Evidence:
  [spell-id-json.ts:28](../../../../web/app/features/collections/spell-id/spell-id-json.ts#L28)
  and
  [prepared-json-export.ts:44](../../../../web/app/features/collections/prepared/prepared-json-export.ts#L44)
  throw English schema/shape errors. Those messages are rendered directly by
  [SpellIdBookJsonActions.tsx:81](../../../../web/app/features/collections/spell-id/SpellIdBookJsonActions.tsx#L81)
  and
  [PreparedBookJsonActions.tsx:67](../../../../web/app/features/collections/prepared/PreparedBookJsonActions.tsx#L67),
  despite the actions already having localized `import.failed-description`
  copy.
- Impact: Chinese users receive English-only recovery information for common
  wrong-schema and wrong-shape import failures.
- Coverage gap: Parser tests assert the English exception strings; no English
  and Chinese UI regression covers invalid-shape imports.
- Recommended owner / smallest safe fix: `frontend-design`; return structured
  import error codes/details from the two parsers, translate them in the two
  action components, and update only the corresponding locale entries and
  focused tests.
- Confidence / unresolved question: High. Decide whether schema-version detail
  should remain visible through an interpolated localized message.

### I18N-QA-003 — Proposed P2

- Failure: The locale key audit can accept a Chinese catalog that lacks the
  plural form i18next actually resolves, allowing silent English fallback.
- Evidence:
  [audit-rules.ts:25](../../../../web/app/i18n/audit-rules.ts#L25) removes plural
  suffixes before comparison, and
  [i18n-audit.ts:435](../../../../web/scripts/i18n-audit.ts#L435) compares only
  the resulting base-key sets.
  [audit-rules.test.ts:26](../../../../web/app/i18n/audit-rules.test.ts#L26)
  explicitly verifies that `_one` and `_other` collapse to one base. A
  read-only in-memory Node/i18next reproduction with English `rows_one` and
  `rows_other`, but Chinese `rows_one` only, produced:

  ```text
  auditBasesEqual=true
  zhCount2=2 rows
  resolvedSuffix=_other
  ```

- Impact: A malformed Chinese plural entry can pass `npm run i18n:check` while
  a count-bearing UI silently renders English.
- Coverage gap: No audit regression validates the required runtime plural forms
  for each supported locale.
- Recommended owner / smallest safe fix: `i18n-translation`; validate
  locale-specific runtime suffixes (`en`: `_one` and `_other`; `zh`: `_other`),
  or derive them from the configured plural resolver, and add one focused audit
  regression.
- Confidence / unresolved question: High. No unresolved question for the two
  currently supported locales.

### I18N-QA-004 — Proposed P2

- Failure: With localized rulebook labels enabled, a missing Chinese overlay
  uses the full English rulebook title as the compact abbreviation.
- Evidence:
  [rulebook.ts:33](../../../../web/app/i18n/display/rulebook.ts#L33) falls back
  `name` to `displayName`/`name`, then uses that value as the Chinese
  abbreviation at line 37. The portable baseline has four rulebooks in
  [rulebooks.jsonl:1](../../../../server/db/rules-clean/fixtures/portable/rulebooks.jsonl#L1)
  but only one Chinese overlay in
  [i18n-rulebooks.jsonl:1](../../../../server/db/content/fixtures/portable/i18n-rulebooks.jsonl#L1).
  The localized-label preference is persisted by
  [userPrefs.type.ts:26](../../../../web/app/storage/userPrefs.type.ts#L26) and
  consumed by
  [useRulebookDisplay.ts:13](../../../../web/app/i18n/hooks/useRulebookDisplay.ts#L13).
- Impact: Legacy users who retain localized labels can see a full title such as
  `Player's Handbook` inside compact rulebook badges, defeating abbreviation
  fallback and risking overflow.
- Coverage gap:
  [rulebook.test.ts:75](../../../../web/app/i18n/display/rulebook.test.ts#L75)
  covers a missing display overlay only in English, not Chinese mode without an
  overlay.
- Recommended owner / smallest safe fix: `i18n-translation`; when `zhName` is
  absent, retain the English name fallback but use `displayAbbr ?? abbr` for the
  abbreviation, then add one display-adapter regression.
- Confidence / unresolved question: High for the demonstrated behavior.
  Production Chinese rulebook-overlay completeness was not inspected.

### I18N-QA-005 — Proposed P2

- Failure: Several reusable navigation and overlay controls expose hard-coded
  English accessible names in Chinese mode.
- Evidence: Dialog and sheet close controls contain hard-coded `Close` text in
  [dialog.tsx:68](../../../../web/app/components/ui/dialog.tsx#L68) and
  [sheet.tsx:75](../../../../web/app/components/ui/sheet.tsx#L75). Pagination
  uses the raw label `pagination` in
  [pagination.tsx:11](../../../../web/app/components/ui/pagination.tsx#L11), and
  page links use `Page ${token}` in
  [Pager.tsx:126](../../../../web/app/components/Pager.tsx#L126).
- Impact: Chinese screen-reader users receive mixed-language controls across
  navigation, mobile menus, filters, sheets, and dialogs.
- Coverage gap: There is no localized accessible-name regression for Pager,
  dialog, or sheet controls, and the locale extractor/audit does not detect raw
  JSX accessibility text.
- Recommended owner / smallest safe fix: `frontend-design`; add localized label
  props or narrowly localize the owning wrappers, then add Chinese accessible-
  name assertions for these controls.
- Confidence / unresolved question: High. The implementation choice is whether
  shared wrappers or their callers should own localization.

## Checks Run

- Read `AGENTS.md`, `.agents/roles/README.md`, the canonical
  `i18n-translation` role, the owning QA plan, `docs/i18n.md`, and nearby web,
  data-tools, and test documentation.
- Verified the audit worktree was clean and exactly at the requested base with
  `git status --short --branch`, `git rev-parse HEAD`, `git show`, and
  `git diff --stat`.
- Mapped locale catalogs, i18n runtime code, display adapters, audit scripts,
  relevant contracts, consumers, fixtures, and nearby tests using `rg` and
  read-only `Get-Content` inspection.
- Compared English and Chinese locale keys, plural variants, empty values, and
  interpolation placeholders with read-only PowerShell JSON parsing.
- Ran the read-only in-memory Node/i18next plural reproduction recorded in
  I18N-QA-003.
- Did not rerun npm validation after the audit timebox; the supplied exact-base
  `npm run ci:portable` pass remains the baseline.

## Residual Risks

- No browser smoke or screen-reader inspection was performed.
- Local SQLite databases and the nested source corpus were not queried;
  production rulebook-overlay completeness remains unverified.
- Mechanics generator, contract, display adapter, and nearby tests were
  inspected, but no exhaustive corpus/runtime mechanics check was run. No
  mechanics finding is claimed from that bounded inspection.
- The raw-copy scan was bounded; additional route-specific accessibility text
  may remain outside the inspected shared controls.
