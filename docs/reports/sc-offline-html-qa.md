# SC Offline HTML Export Verification

Source-free evidence for [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
This verifies the exporter and accepted final name/body rehearsal preview;
whole-book integration and durable delivery belong to
[#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346).

## Accepted Input Boundary

- Final writer #375/PR388: `c60826e9a72660559652b90349fa39d22c61c20f`.
- Selected private name/body candidate: `0688739d92a2aa9fb3eceeb444daa7260e711058`.
- Final consumers #382/PR398: `77eafb1b3f47d1c3f136b12d75f7d23d80b53ecc`, merged as `38d54617704056134fedf57424b75e8423eba447`.

The input is the stable accepted final content rehearsal selected by #375,
opened directly read-only with SQLite `query_only=ON`. No database copy,
backup, canonical write, operator/app-state access or source replay is used.
Existing compatible dependencies come from the task's shared runtime, with
no install or filesystem links. Current remote main, including the accepted
writer/consumer changes, is integrated into this branch.

Book `86`, exact Chinese variant `effective`, covers 1,001 existing IDs and
2,002 accepted Chinese name/body fields. ID `4837` belongs to book `9` and is
excluded. The 948 retained Chinese names and five retained Chinese bodies
have accepted original-source review alongside CHM ownership; they are not
missing translations. The other names are six native and 47 independent;
the other bodies are 652 native and 344 independent. There are no English
fallback names or bodies. All 37 source-question occurrences in 35 bodies
remain separate reader notes without resolving the original ambiguities.

## Checks

| Check | Result |
| --- | --- |
| Scoped spell pages | 1,001, exact IDs and index names; 4837 excluded |
| Accepted Chinese fields | 2,002 checked against the selected final writer envelopes |
| Complete bilingual bodies | 2,002 checked, zero visible-text failures |
| Reader source-question notes | 37 occurrences in 35 bodies; complete note blocks match exactly |
| Index/CSS/report coverage | 2 indexes, CSS and source-free report; 1,005 total files |
| Local links and anchors | 7,102 checked, zero failures |
| Current rule headers | 15,015 field/row checks, including raw school/subschool, descriptors, components and class/domain levels |
| Semantic structures | 44,044 element-count checks plus table/list attributes; zero losses |
| Meaningful pre whitespace | 996 exact checks, zero losses |
| Private metadata/path and active-content scan | Zero failures |
| Unavailable/network destinations | 227 removed; reference text retained |
| Root/package CWD and repeat isolation | Verified using the existing runtime and root-relative output arguments |
| Synthetic tests | Full bodies, Unicode, escaping, tables, aliases, long/inherited text, separate source notes, privacy, stale output and rejection paths passed |
| Scoped strict TypeScript and shared path tests | Passed |
| Browser visual smoke | Unverified; previous file URL policy rejection prohibits bypass |

Chinese HTML/plain-text has no visible-text differences. The 981 English raw
representation differences were investigated rather than accepted by count:
980 match after diagnostic decoding of existing emphasis/link syntax, semantic
lists/tables/headings and typographic glyphs. The remaining ID `4345` difference
is an extra full stop in plain text at a boundary where HTML retains separate
labeled component/focus paragraphs. Both complete clauses and their separation
are present. Twenty English rows match without diagnostic decoding. There is
no demonstrated missing operative prose. These private read-only comparisons
never feed the formatter or change accepted fields, and do not re-adjudicate
original PDF authority or accept hyperlink targets from another representation.
Output retains the complete selected HTML and its semantic structure.

The fixed private final checker and proof live only in this issue's authorized
private directory; generated source-bearing pages remain ignored in the manual
checkout's `data-tools/out/`. Full exact-head remote portable CI remains the
merge gate and is recorded on PR #351. Public code contains only synthetic
text and this source-free report.

## Unclosed Gates

Browser visual smoke remains required but unverified. The previous
`cua.createBrowserTab` request for the file URL was rejected by tool security
policy (only HTTP/HTTPS permitted, explicit prohibition on workaround,
indirect execution and alternate surfaces). No retry, localhost server or
alternative rendering surface was used. Final representative human-review
pages: long English/multiple notes `4443`, long Chinese `3943`, table/source
question `3958`, amended body `4736`, and source-reviewed CHM retention `3855`.

This preview does not certify pending relationship QA, operator migration or
whole-book acceptance. Existing summaries are not part of the HTML feature.
Main-gate owns rebuilding the durable reader deliverable from the final
migrated DB, its eventual permitted visual review, and acceptance/merge.
Usage and safety boundaries: [offline HTML](../operations/offline-html.md).
