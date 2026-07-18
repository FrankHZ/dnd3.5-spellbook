# Frontend-design Slice 2 Raw Audit

> This is a temporary raw role audit. Proposed severities are not final.
> Main-gate owns de-duplication and disposition. This file must be removed or
> collapsed into Completion Notes before the v1.2.2 freeze.

- Primary role: `frontend-design`
- Audit base: `ff4f2ff7eb7158d2007178179c15919923769311`
- Owning plan: [v1.2.2 code and test QA plan](../code-and-test-qa-plan.md)
- Handoff owner: `main-gate`
- Scope: Slice 2 read-only audit; no fixes were made

## Findings

### FE-S2-001 — P1 proposed — Pagination links discard the current URL scope

- **Failure:** Opening or copying a pagination link loses the active Browse or
  Search query. Ordinary left clicks retain scope only because JavaScript
  prevents the anchor's default navigation.
- **Evidence:** [Pager.tsx:103](../../../../web/app/components/Pager.tsx#L103),
  [Pager.tsx:126](../../../../web/app/components/Pager.tsx#L126), and
  [Pager.tsx:142](../../../../web/app/components/Pager.tsx#L142) generate
  `?page=N` without the existing search parameters. A focused browser smoke at
  `/browse?classIds=1&level=1&page=1` exposed Page 2 as `href="?page=2"`.
- **Impact:** Middle-click, open-in-new-tab, copied links, and non-JavaScript
  navigation drop class, domain, level, and advanced Browse filters. Search
  pagination similarly drops `q` and `mode`.
- **Coverage gap:** There is no Pager interaction test, and the URL-helper tests
  do not exercise the rendered anchors.
- **Recommended owner / smallest safe fix:** `frontend-design`; give `Pager` a
  page-href callback or current-parameter input, supplied by the existing
  Browse and Search canonical URL helpers.
- **Confidence / unresolved question:** High confidence. No unresolved question.

### FE-S2-002 — P1 proposed — Scope changes temporarily show previous-query results

- **Failure:** Browse and same-mode Search can display cached results from the
  previous request under the new URL and scope summary while the new request is
  pending.
- **Evidence:** Browse uses `placeholderData: keepPreviousData` at
  [BrowseSpellsPage.tsx:79](../../../../web/app/features/browse/BrowseSpellsPage.tsx#L79),
  and Search does the same at
  [SearchSpellsPage.tsx:112](../../../../web/app/features/search/SearchSpellsPage.tsx#L112).
  Search rejects retained data only when `mode` differs at
  [SearchSpellsPage.tsx:128](../../../../web/app/features/search/SearchSpellsPage.tsx#L128),
  not when `q`, filters, or page differ. Browse renders retained groups at
  [BrowseSpellsPage.tsx:162](../../../../web/app/features/browse/BrowseSpellsPage.tsx#L162).
- **Impact:** On a slow connection, users can read or open a spell that does not
  match the query or filters currently shown in the URL and page summary.
- **Coverage gap:** There are no page-level tests for query transitions while a
  replacement request is pending.
- **Recommended owner / smallest safe fix:** `frontend-design`; remove retained
  result data for scope changes or gate it against the complete request scope,
  and show an explicit pending state.
- **Confidence / unresolved question:** High confidence from deterministic code
  paths. Browser timing reproduction was not completed within the audit
  timebox.

### FE-S2-003 — P2 proposed — Browse treats absent initial data as populated results

- **Failure:** During initial loading, `groups === undefined` makes
  `hasSpellData` true, so Browse presents the result frame and empty pagination
  area instead of a loading state.
- **Evidence:**
  [BrowseSpellsPage.tsx:97](../../../../web/app/features/browse/BrowseSpellsPage.tsx#L97)
  evaluates `groups?.flatMap(...).length !== 0`; when `groups` is undefined,
  `undefined !== 0` is true. The result card at
  [BrowseSpellsPage.tsx:162](../../../../web/app/features/browse/BrowseSpellsPage.tsx#L162)
  is not gated by the initial loading state.
- **Impact:** Slow initial requests can appear complete or empty, with no visible
  progress indication.
- **Coverage gap:** There is no Browse loading/error rendering test.
- **Recommended owner / smallest safe fix:** `frontend-design`; require defined
  data and a positive result count, and render an explicit initial-loading
  state.
- **Confidence / unresolved question:** High confidence. No unresolved question.

### FE-S2-004 — P1 proposed — Same-version malformed preferences can brick startup

- **Failure:** Persisted state with `storageVersion: 1` is merged without runtime
  validation of individual fields.
- **Evidence:** [userPrefs.ts:68](../../../../web/app/storage/userPrefs.ts#L68)
  spreads the parsed object into state, while
  [userPrefs.ts:98](../../../../web/app/storage/userPrefs.ts#L98) validates only
  the version. The payload
  `{"storageVersion":1,"selectedRulebookIds":"bad"}` reaches `.join(",")` at
  [useBootstrap.ts:18](../../../../web/app/bootstrap/useBootstrap.ts#L18) and
  throws.
- **Impact:** Corrupt, hand-edited, or stale same-version browser state can make
  every route inaccessible until the user manually clears local storage.
- **Coverage gap:** Storage tests cover malformed JSON, unsupported versions,
  and valid partial state, but not wrong field types under the supported
  version.
- **Recommended owner / smallest safe fix:** `frontend-design`; sanitize every
  persisted field against defaults during `loadState` and add malformed-shape
  regression cases.
- **Confidence / unresolved question:** High confidence in the failure path. It
  is unresolved whether any shipped version emitted an incompatible same-version
  shape.

### FE-S2-005 — P1 proposed — Prepared copy can report success with blank or incomplete TSV

- **Failure:** Prepared-list copy controls remain enabled while
  `/api/spells/batch` is loading or has failed, even though copied rows depend
  on that response's `byId` data.
- **Evidence:** Batch-derived spell data begins empty at
  [PreparedBookDetail.tsx:100](../../../../web/app/features/collections/prepared/PreparedBookDetail.tsx#L100),
  while table loading/error handling is separate at
  [PreparedBookDetail.tsx:303](../../../../web/app/features/collections/prepared/PreparedBookDetail.tsx#L303).
  Simple copy is disabled only when there are zero entries at
  [PreparedBookDetail.tsx:276](../../../../web/app/features/collections/prepared/PreparedBookDetail.tsx#L276),
  and advanced copy has no loading/error disable condition at
  [PreparedCopyDialog.tsx:107](../../../../web/app/features/collections/prepared/PreparedCopyDialog.tsx#L107).
  Missing spell objects become blank fields at
  [prepared-copy.ts:54](../../../../web/app/features/collections/prepared/prepared-copy.ts#L54),
  after which the action still reports success.
- **Impact:** The spreadsheet workflow can copy only a header, blank rows, or an
  incomplete subset while telling the user the copy succeeded.
- **Coverage gap:** Copy-helper tests use complete spell maps; there is no
  component interaction coverage for loading or batch failure.
- **Recommended owner / smallest safe fix:** `frontend-design`; disable both copy
  paths until the batch is complete without error, and add a focused interaction
  test.
- **Confidence / unresolved question:** High confidence. Browser clipboard
  reproduction was not completed within the audit timebox.

### FE-S2-006 — P1 proposed — Publications fails when an unrelated bootstrap endpoint fails

- **Failure:** Publications hides loaded rulebooks if classes, domains,
  editions, i18n, or filter-vocabulary bootstrap data fails.
- **Evidence:** [useBootstrap.ts:99](../../../../web/app/bootstrap/useBootstrap.ts#L99)
  aggregates all bootstrap errors.
  [PublicationScopePage.tsx:363](../../../../web/app/features/publications/PublicationScopePage.tsx#L363)
  converts that aggregate into page `isError`, and
  [PublicationScopePage.tsx:450](../../../../web/app/features/publications/PublicationScopePage.tsx#L450)
  replaces the rulebook groups with the error state.
- **Impact:** A partial metadata outage prevents users from viewing or managing
  rulebook publication scope even when `/api/rulebooks` is healthy.
- **Coverage gap:** Publication grouping tests cover complete data only; there is
  no mixed-success bootstrap-query case.
- **Recommended owner / smallest safe fix:** `frontend-design`; derive this
  page's loading and error state from `boot.rulebooks` only and add a mixed-query
  outcome regression test.
- **Confidence / unresolved question:** High confidence. No unresolved question.

## Checks Run

- Verified the audit worktree was clean and `HEAD` was exactly
  `ff4f2ff7eb7158d2007178179c15919923769311`.
- Used targeted `rg` inventory and line tracing across routes, storage, state,
  API consumers, features, nearby tests, and owning documentation.
- Ran `npm run test:web`: 32 test files and 136 tests passed.
- Ran a focused local browser smoke of Browse against the live read-only
  backend. The page hydrated in Chinese and reproduced FE-S2-001 through the
  rendered pagination anchor.
- Stopped the local services after the smoke and confirmed the audit worktree
  remained clean.
- Did not rerun `npm run ci:portable`; the supplied baseline states that it
  passed on this exact commit.

## Residual Risks

- The timebox prevented browser reproduction of query-transition timing,
  malformed persisted preferences, Prepared copy during loading/error, and
  mixed-success Publications bootstrap responses.
- Mobile navigation, JSON file-picker merge/replace interactions, local-storage
  quota/write failures, and non-JSON API error bodies were not inspected
  interactively.
