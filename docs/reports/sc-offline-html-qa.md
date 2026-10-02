# SC Offline HTML Export Verification

Source-free evidence for [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
This records main-gate's actual migrated-DB export, source authentication and
durable copy. The task owner updated this documentation from main-gate's
acceptance handoff without accessing the DBs, output or private proofs.
Visual acceptance and the remaining whole-book boundaries belong to
[#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346).

## Accepted Input Boundary

| Input or evidence | Fixed revision |
| --- | --- |
| Exporter used for the actual export | `87f2998c2023a03d3d1f04d74a2eb4cf253aa4e9` |
| Primary source-authentication code, including accepted #413/#414 integration | `8ca3c489f091f54c4b157dcd449090c4aba596ec` |
| Accepted final Chinese field candidate | `0688739d92a2aa9fb3eceeb444daa7260e711058` |
| Accepted reader-note addendum | `c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4` |
| Main-gate migrated-data handoff | `307e8b1299e14c456957165b12c46d2c4afe3472` |
| Private operator verifier with serialized Buffer memory replay | `56209a1549d9d8c681324f1f5e8c08f29b162ea8` |
| Frozen semantic checker | `d5db22919946caa470755723d5adc7f91482a28e` |
| Six fixed main-gate proofs | `5d6f8f1c2af35230bd4f232a54e8377bbb55600c` |

Main-gate used the actual migrated operator content DB, strictly read-only with
SQLite `query_only=ON`, and replayed the maintained source authentication against
the designated rules/content pair. The private verifier enforces the exact file
roles and native read-only boundary before access, including source-auth child
processes. Fresh memory and driver-serialized Buffer inputs remain available
for the maintained in-memory rules replay; they do not create persistent DB
copies. Main-gate independently passed that real-driver regression: three memory
replays, nine invalid inputs and the child-preload check. Existing compatible
runtime dependencies were reused without installation or filesystem links.

Book `86`, exact Chinese variant `effective`, covers 1,001 existing IDs and
2,002 accepted Chinese name/body fields. ID `4837` belongs to book `9` and is
excluded. Source-reviewed CHM retention is accepted ownership, not missing
translation. There are no English fallback names or bodies. The original 37
notes and three accepted addendum notes are preserved: 40 target/question
occurrences in 38 bodies, using 37 distinct raw question IDs. Identity is
`(targetId, questionId)` because different spells can share a raw ID. The notes
remain separate project commentary without resolving the original ambiguities.

## Checks

Main-gate performed the actual DB/source, complete rendering and durable-copy
checks. The synthetic, CWD and TypeScript rows retain the existing exporter
validation; this documentation update did not rerun source-bearing workflows.

| Check | Result |
| --- | --- |
| Scoped spell pages | 1,001, exact IDs and index names; 4837 excluded |
| Accepted Chinese fields | 2,002 fully compared against maintained source-authenticated fields and persisted envelopes |
| Complete bilingual bodies | 2,002 checked, zero visible-text failures |
| Reader source-question notes | 40 occurrences in 38 bodies, 37 raw IDs; original and addendum notes preserved, with text/HTML independently authoritative |
| Index/CSS/report coverage | 2 indexes, CSS and source-free report; 1,005 total files |
| Local links and anchors | 7,102 checked, zero failures |
| Current rule headers | 15,015 field/row checks, including raw school/subschool, descriptors, components and class/domain levels |
| Semantic structures | 44,044 structure checks plus complete semantic-tree/order and table/list attributes; zero losses |
| Meaningful pre whitespace | 996 exact checks, zero losses |
| Private metadata/path and active-content scan | Zero failures |
| Root/package CWD and repeat isolation | Verified using the existing runtime and root-relative output arguments |
| Synthetic tests | Full bodies, Unicode, escaping, tables, aliases, long/inherited text, separate source notes, privacy, stale output and rejection paths passed |
| Operator boundary tests | 32 path/boundary and 22 semantic rejection cases passed; serialized Buffer memory replay independently verified by main-gate |
| Scoped strict TypeScript and shared path tests | Passed |
| Durable copy | 1,005 files, 3,434,845 bytes; every file directly compared byte-for-byte with the verified export, no DB copy |
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

Main-gate copied the verified HTML artifacts to a durable local destination
outside removable worktrees and compared all files directly. The content-preview
notice is retained. This is a verified export and durable copy, with visual
acceptance still outstanding. Fixed private checks/proofs and generated source
text stay out of public Git; private evidence was not pushed. Full exact-head
remote portable CI remains the merge gate and is recorded on PR #351. Public
code contains only synthetic text and this source-free report.

## Unclosed Gates

Browser visual smoke remains required but unverified. The previous
`cua.createBrowserTab` request for the file URL was rejected by tool security
policy (only HTTP/HTTPS permitted, explicit prohibition on workaround,
indirect execution and alternate surfaces). No retry, localhost server or
alternative rendering surface was used. Final representative human-review
pages: long English/multiple notes `4443`, long Chinese `3943`, table/source
question `3958`, amended body `4736`, and source-reviewed CHM retention `3855`.

The 20 external relationship tuples for 17 targets in
[#354](https://github.com/FrankHZ/dnd3.5-spellbook/issues/354) still lack the
required original-book sources. That boundary does not invalidate the authenticated
body text, but `wholeBookComplete` remains false. Existing summaries are not part
of the HTML feature; #414/main-gate own migration, summary and consumer validation.
#346 remains open. Main-gate owns eventual permitted visual review and final
acceptance/merge; this report claims no visual pass or whole-book completion.
Usage and safety boundaries: [offline HTML](../operations/offline-html.md).
