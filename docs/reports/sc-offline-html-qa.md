# SC Offline HTML Export Verification

Source-free evidence for [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
This verifies the exporter and interim preview; it does not certify final SC
content acceptance for [#342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).

## Input Boundary

Public starting revision: `f7fd8e682e3335e7117f03def9bda4e97ae9b1ed`.
Accepted interim private revision: `6a73f4d64682325c67e2c40595008344fb5c3be5`.
The input is a SQLite-safe backup of #339's final-head current-package
experimental content DB, scoped to book `86` and exact Chinese variant
`effective`. The formatter reads normalized content rather than old CHM/dice
source ingestion. It makes no DB, app-state or content changes.

The preview still contains 17 residual bodies: seven retained CHM bodies and
ten English fallbacks. Its other 985 bodies are 652 native and 333 independent
accepted fields. Language counts therefore show 992 Chinese bodies, **not 992
finally certified bodies**. Final certification depends on #343/#344 and final
DB acceptance; main-gate must rebuild the finished export afterwards.
Summary/normalization inputs are not supplied to this formatter. It preserves
the current DB body/rule fields and performs no summary import or normalization.

## Checks

| Check | Result |
| --- | --- |
| Scoped spell pages | 1,002, exact existing IDs |
| Complete bodies checked independently | 2,004, zero semantic text failures |
| Index/CSS/report files | 2 indexes, CSS, source-free report; 1,006 files total |
| Local links and anchors | 7,114 checked, zero failures |
| Table/list/emphasis/pre structure | Zero structural losses |
| Meaningful `pre` whitespace | Zero losses |
| Current rule headers | All raw fields, school/subschool/descriptors, class/domain levels and component flags retained |
| Private metadata/path and active-content scan | Zero failures |
| Out-of-scope/network destinations | 228 removed, visible reference text retained |
| HTML/plain-text input differences | 976 English, 10 Chinese-section English fallbacks; HTML retained |
| Root and package working directories | Both export successfully with the same root-relative arguments |
| Synthetic tests | Passed full bodies, Unicode, escaping, current rules, tables, anchors, inherited text, source notes, privacy, repeat isolation and invalid inputs |
| Scoped strict TypeScript check | Passed |
| Browser visual smoke | Unverified: tool security policy rejects `file:` access and prohibits circumvention |

The representation differences include emphasis markers, quoted link/URL syntax
and typography in stored plain text. They are reported without rewriting the
accepted input; this is not a claim that every input HTML/text difference has
been certified semantically equivalent. An independent private
checker compares every output body with complete input HTML (or exact plain
text when HTML is absent), checks semantic element counts, names, page counts,
links and privacy. Private reproduction evidence remains only under the issue's
authorized private-data directory; generated source-bearing output remains
ignored in this manual worktree's `data-tools/out/`.

Representative visual cases selected for later permitted/user-assisted checks:
long English ID `4443`, long Chinese ID `3943`, table ID `3780`, amendment/source
note ID `3781`, and English fallback ID `3846`. No browser visual pass is claimed.
Full data-tools typecheck initially required the ungenerated rules Prisma client
in this fresh checkout; the scoped exporter check is independent of that setup.
Remote exact-head portable CI remains the merge gate.

Main-gate independently verified the dispatched task as `gpt-6.1-sol/high`.
Usage and safety boundaries: [offline HTML](../operations/offline-html.md).
