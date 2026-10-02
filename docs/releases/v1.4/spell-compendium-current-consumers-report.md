# Current SC effective consumer evidence

Implementation evidence for [#341](https://github.com/FrankHZ/dnd3.5-spellbook/issues/341),
under [#121](https://github.com/FrankHZ/dnd3.5-spellbook/issues/121). Main-gate owns
independent acceptance, merge and closeout. This fixed-input consumer slice does
not certify complete SC translation, full source QA or a deployable artifact.

## Changes

The existing API mapper validates current body amendments alongside original
native/independent ownership. It binds target/book/field/language, active and
prior revisions, input/evidence relationships and accepted status. The public
DTO adds only amendment kind, current/prior revisions and status; private paths,
prior rows, passages and raw provenance remain internal. Original envelopes and
name-only consumers remain compatible. Runtime checks storage relationships;
the verified writer remains responsible for source acceptance.

Actual searches demonstrated effective text leaking into old full-text results
and effective names entering shared aliases. Effective full-text requests now
select effective plus canonical English documents; other requests exclude the
effective documents. Old aliases remain exact. Localized name search now uses
the requested variant, matching resolve. Default overlay selection stays CHM.

Browser smoke also demonstrated an overflowing preformatted body. The existing
description container now wraps preformatted lines without changing stored HTML
or text. Effective field metadata is not rendered as a row-level source claim.

## Current input and retention

The projection covers 1002 targets and 2004 fields: 41 accepted names and 985
accepted bodies. All ten amended existing bodies and 147 newly accepted bodies
are distinct checks. Amendment original owners remain six native and four
independent.

| Complement | Evidence and retained disposition |
| --- | --- |
| 961 names | 951 CHM and 10 English field values retained; export coverage is not a full name-QA claim or an error count |
| 5 previously verified body retentions | 3855, 4546, 4583, 4726, 4761; retained CHM, outside accepted body exports |
| 2 unresolved expanded-rule bodies | 3997, 4097; existing CHM and source-gap dispositions retained |
| 9 absent-Chinese bodies | 3846, 4521, 4611, 4612, 4613, 4614, 4616, 4617, 4677; English fallback retained |
| 1 identity anomaly | 4837; existing English fallback and identity boundary retained |

All 17 complement body values were checked byte for byte, independently of
their quality/disposition classification. Existing source/identity residuals
remain with #263/#197. Subsequent complete QA/translation under #342/#343 must
advance accepted inputs and revalidate consumers; these counts do not certify
final source authority or complete Chinese coverage.

## Reproduction and checks

The committed private helper reads the accepted #339 disposable snapshots,
copies through SQLite backup, applies the tracked provenance migration, and
uses existing normalized generation/import, canonical summary import, parity,
verified projection/writer and search rebuild commands. It never reads operator
app-state. The accepted #331 summary corrections and #332 normalizer v9 are
fresh inputs, not SQL edits to consumer output. The writer retains its limited,
non-importable/non-activation marker and clears full-artifact claims.

- Clean committed replay: 13 maintained command invocations passed; repeated
  derived search rebuild produces identical documents.
- Actual built HTTP APIs: 10385 requests passed, including all 1002 detail,
  name-search, batch/list and resolve targets, exact text/HTML/metadata, all ten
  amendments, canonical English/mechanics/relationships and default/chm/en
  preservation. All 29 corrected EN/ZH summaries and 920 SC Chinese summary
  overlays match current canonical imports.
- Derived search: 12847 documents, with every effective name/body/summary
  checked. All old-variant documents remain exact; 112 focused queries cover
  amendments, new acceptance, all retained body classes, summary text,
  class/level filters, cross-book exclusion and related-name ambiguity.
- Browse: 962 distinct SC IDs through existing class owners; all 1002 targets
  remain available through batch/list, search, resolve and detail. Eighteen
  non-derived content tables and original text variants match the pre-overlay
  disposable baseline exactly.
- Synthetic server tests: 141 passed, including 28 amendment rejection cases
  per read source and invalid name-amendment detail/list/resolve rejection.
  Windows Vite package-import resolution required an ignored local alias config;
  the repository's unchanged configuration remains the full remote CI gate.
- Web: 35 focused tests, typecheck and build passed; synthetic collection/prepared
  reference controls avoid operator collections. Browser smoke against the final
  disposable API recorded 49 actual requests (HTTP 200/304): preference propagation,
  effective/CHM/English rendering, mixed English body/Chinese summary, corrected
  summary, effective match versus CHM non-match and no console errors. At width
  1265, document scroll width is also 1265 after wrapping.
- Portable harness: 20 checks passed; data-tools typecheck, server build/runtime
  import, contracts build and changed-doc/diff checks passed. Exact-head full
  remote portable CI is recorded in the PR handoff.

The first request-log attempt hit ENOSPC while the shared G drive was full;
source/DB results were not reclassified as QA failures. Space recovery was
followed by the clean committed rebuild, complete API audit and fresh browser
request evidence. No partial log is used as final evidence.

## Exact bindings

| Binding | Revision |
| --- | --- |
| Public base | `f7fd8e682e3335e7117f03def9bda4e97ae9b1ed` |
| Clean implementation and public helper used for final replay | `1ff1ca1dcd941ad81db37b979d626e594855213e` |
| Private starting input head | `a9cbe07747b1bc908ff4ebcd24244e38e58cb411` |
| Private committed helpers | `f21ab0f8379c68c16e96a7771d045d9dcebbef58` |
| Private local-only completed evidence | `184362538f7bbfabb0001b7bdd596673f754db7a` |
| Original accepted union | `296903c61e20ce359812148fc0faa234ca2508e7` |
| Current accepted union plus amendments | `6a73f4d64682325c67e2c40595008344fb5c3be5` |

Private evidence is confined to `dice-qa/books/86/issue-341/`, notably
`reproduce.py`, `reproduction-committed-final.json`, `api-final.json`,
`browser-api.cjs`, `browser-preferences.html`, `browser-final-requests.jsonl` and
`browser-verification.json`. The source-free public audit command is documented
in [import workflow](../../operations/import-workflow.md). Model/version and
effort were independently read from persisted turn metadata:
`gpt-6.1-sol / high` (`model-verification.json`).

No operator DB write/access, operator app-state/collection access, private push,
corpus/DB upload, backup/archive, deployment, activation, accepted-ledger rewrite,
new source ruling, other-book whole QA or suspended extraction/translation queue
occurred. Independent new issue evidence may coexist in the shared private repo;
all starting tracked inputs and old evidence remain unchanged.
