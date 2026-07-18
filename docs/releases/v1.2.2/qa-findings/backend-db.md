# Backend DB Raw QA Findings

> This is a temporary raw role audit. Proposed severities are not final.
> `main-gate` owns de-duplication and disposition. This file is removed or
> collapsed into the v1.2.2 QA plan Completion Notes before the v1.2.2 freeze.

- Primary role: `backend-db`
- Audit base: `ff4f2ff7eb7158d2007178179c15919923769311`
- Owning plan: [Code And Test QA Plan](../code-and-test-qa-plan.md)
- Audit mode: read-only

The audit completed at a clean audit-base HEAD. Four actionable findings
survived review. No files or databases were modified during the audit.

## BDB-001 — P1: Name-search pagination changes the candidate set per page

**Failure:** Unscoped name search calculates `maxCandidates` from
`page * pageSize * 20`, applies `LIMIT` without deterministic ordering, and
then paginates the expanding in-memory candidate set. Totals change between
pages and results repeat.

**Evidence:**

- [server/src/services/spells/spells.service.ts](../../../../server/src/services/spells/spells.service.ts#L83)
  derives the candidate cap from the requested page.
- [server/src/services/spells/spells.repo.rules.ts](../../../../server/src/services/spells/spells.repo.rules.ts#L289)
  applies the cap as a rules-database `LIMIT` without deterministic ordering.
- [server/src/services/spells/spells.repo.normalized-content.ts](../../../../server/src/services/spells/spells.repo.normalized-content.ts#L316)
  applies the same pattern to normalized content.
- A read-only local API probe across all 104 spell-bearing rulebooks with
  `q=in&pageSize=20` returned totals of 400, 800, and 918 on pages 1 through 3;
  pages 1 and 2 shared 12 of 20 spell IDs.

**Impact:** Users can see duplicate spell cards and changing result counts and
cannot reliably traverse the complete result set.

**Regression coverage gap:** Deterministic pagination coverage exists for
full-text mode. Name-search tests cover basic response shape and small result
sets, not stable multi-page traversal of a large candidate set.

**Recommended owner and smallest safe fix surface:** `backend-db`; constrain
the change to the name-query repositories/service and focused API regressions.
Count and paginate one deterministic merged English/localized result set rather
than using a page-dependent candidate cap.

**Confidence:** High; reproduced against the current local content database
using audit-base code.

**Unresolved question:** None for the root cause. Main-gate should decide
whether the accepted contract requires the exact total or an explicitly
documented fixed cap.

## BDB-002 — P1: Legacy `level=all` browse loses or misgroups repeated spell-level rows

**Failure:** The legacy SQL returns `(spell_id, level)` pairs, but
`fetchSpellsInOrder` hydrates them with `findMany(id IN ...)`, collapsing
repeated spell IDs while `levelsInOrder` retains every pair. The service then
groups two arrays whose positions no longer correspond.

**Evidence:**

- [server/src/services/spells/spells.repo.rules.ts](../../../../server/src/services/spells/spells.repo.rules.ts#L264)
  hydrates spell IDs through a unique `findMany` result.
- [server/src/services/spells/spells.repo.rules.ts](../../../../server/src/services/spells/spells.repo.rules.ts#L432)
  obtains all-level `(spell_id, level)` pairs that may repeat a spell ID.
- [server/src/services/spells/spells.service.by-level.ts](../../../../server/src/services/spells/spells.service.by-level.ts#L52)
  groups the independently returned spell and level arrays by position.
- A read-only SQLite probe found 857 spells represented at multiple levels.
- An API probe with `classIds=3`, `domainIds=1`, `level=all`, and
  `rulebookIds=52` returned spell 3 in groups 6 and 7 from the content source.
  The legacy source returned it only in group 6 even though its DTO carried
  class level 6 and domain level 7.

**Impact:** When the rollback source is active, Browse can omit valid entries
and attach later spells to the wrong level groups.

**Regression coverage gap:** The all-level legacy test verifies response shape,
and source-parity coverage exercises a single level. Fixtures do not cover one
spell appearing at different class/domain levels in the same request.

**Recommended owner and smallest safe fix surface:** `backend-db`; preserve
duplicates while hydrating rules rows, or return paired spell/level rows, and
add one focused legacy fixture and API regression.

**Confidence:** High; reproduced against audit-base code and the current local
rules/content databases.

**Unresolved question:** None.

## BDB-003 — P2: Resolve localization contract is split between body and query, and variant is discarded

**Failure:** The shared `ResolveSpellNamesRequest` declares `lang` in the body,
but the controller path ignores that field and uses query-derived locale
middleware. Exact localized-name matching also does not pass the requested
variant to `queryByExactI18nNames`, so the repository falls back to `chm`.

**Evidence:**

- [contracts/src/dto/spell.resolve.ts](../../../../contracts/src/dto/spell.resolve.ts#L10)
  declares body-level `lang`.
- [server/src/services/spells/spells.service.resolve.ts](../../../../server/src/services/spells/spells.service.resolve.ts#L93)
  calls exact localized matching without the requested variant.
- [server/src/services/spells/spells.repo.content.ts](../../../../server/src/services/spells/spells.repo.content.ts#L307)
  accepts a variant and defaults it to `chm`.
- A runtime request with body `{lang: "zh", names: ["火球术"]}` returned
  `not_found`; the same name resolved with query
  `?lang=zh&variant=chm`.
- Query `?lang=zh&variant=nonexistent` returned `matchedOn: "zh"` while the
  returned spell had no `i18n` payload.

**Impact:** Typed consumers following the shared body contract receive
incorrect results. Alternate localization variants can produce contradictory
match metadata and response payloads.

**Regression coverage gap:** Resolve tests do not cover body `lang` semantics
or verify consistency between the requested variant, localized matching, and
the returned `i18n` payload.

**Recommended owner and smallest safe fix surface:** `backend-db`; choose one
canonical language transport (likely query context to match the existing
frontend), align the shared request contract, and pass the selected variant
through exact-name matching. Add focused contract/API regressions only.

**Confidence:** High; both contract drift and runtime behavior were directly
observed on the audit base.

**Unresolved question:** Whether body `lang` should be removed or honored, and
which location wins if both body and query values are present.

## BDB-004 — P2: Stable API error codes are absent from the shared error contract

**Failure:** Server error responses can include an optional stable `code`, and
the frontend relies on it, but shared `ApiErrorResponse` declares only
`message` and `error`. The web workspace maintains a parallel error type.

**Evidence:**

- [contracts/src/http.ts](../../../../contracts/src/http.ts#L1) omits `code`
  from the shared error DTO.
- [server/src/middlewares/error.middleware.ts](../../../../server/src/middlewares/error.middleware.ts#L21)
  emits `code` at runtime.
- [web/app/api/http.ts](../../../../web/app/api/http.ts#L3) declares a parallel
  response type, and [web/app/api/http.ts](../../../../web/app/api/http.ts#L20)
  branches on the runtime code.

**Impact:** Shared-contract consumers cannot safely type stable failures such
as `FULL_TEXT_SEARCH_UNAVAILABLE`, and server/web error semantics can drift
independently.

**Regression coverage gap:** Server tests verify runtime error codes, but no
coverage connects those responses to the shared contract consumed by the web
client.

**Recommended owner and smallest safe fix surface:** `backend-db`; add optional
`code` to the shared error DTO, consume that DTO in the web HTTP wrapper, type
the middleware response, and add the smallest contract/type regression.

**Confidence:** High; the shared/runtime/web type split is directly present at
the audit base.

**Unresolved question:** None.

## Commands and checks run

- Confirmed a clean worktree, exact audit-base HEAD, valid commit object, and no
  server/contracts diff before the audit.
- Read the canonical role, context, module, and topic documentation.
- Inventoried and inspected contracts, controllers, services, middleware,
  Prisma clients and schemas, migrations, fixtures, and nearby tests using
  `rg` and `Get-Content`.
- Ran read-only `better-sqlite3` probes with `readonly: true` and
  `fileMustExist: true`.
- Ran read-only Supertest probes for the three reproduced API failures.
- Did not rerun `npm run ci:portable`; the supplied baseline passed on the exact
  audit commit.

## Residual risks

- Missing or malformed database startup and rules-only operation were not
  dynamically probed. Static inspection found weaker rules-database environment
  validation, and probing a missing rules URL could make the adapter create an
  unintended `undefined` SQLite file.
- App-state has no current API consumer, so its runtime client boundary received
  schema/migration static inspection only.
- Local SQLite artifacts are ignored operational data and are not part of the
  audit commit; they demonstrate audit-base behavior against the available real
  corpus but are not portable fixtures.
- A suspected publication-detail leak did not survive review: the current local
  content database contained zero non-accepted rows carrying publication
  detail.
