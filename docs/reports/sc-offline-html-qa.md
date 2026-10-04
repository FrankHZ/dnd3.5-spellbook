# SC Offline HTML Verification

The current [#345 scope](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345)
is a Chinese CHM replacement: bilingual spell names, Chinese bodies and accepted
Chinese class/domain summaries, compact mechanism fields, and a generated website icon on the ID line.
Independent English bodies and duplicate Current rules tables are omitted. English
PDF extraction, accepted bilingual inputs, provenance and internal QA are preserved.

## Display Checks

Focused synthetic exporter checks cover Chinese-only output, internal bilingual
summary requirements, English-name retention, removed section links redirected
to local entries, mechanism spacing in semantic paragraphs and plain fallback,
ordinary paragraphs, tables/lists, materials/XP, independent notes and privacy.
Domain checks cover menu order, class/domain owner-ID collisions, levels 1–9,
subset-specific empty levels, Chinese-name overlays and explicit fallback,
domain-only Chinese summaries without unused English-summary requirements,
qualifiers, pending feat grants, invalid levels and duplicate domain tuples.
Directory rows use Chinese name (English name), small normalized component tags,
and the accepted Chinese summary on one flowing line. Detail titles are smaller;
body section headings and bottom letter-page navigation are omitted, while the
Chinese body anchor remains on the body container.
The website-link checker accepts only the exact generated route for its own entry;
arbitrary source/external URLs remain detached or rejected.

A small accepted-input preview is the current user-review stage. It contains
representative mapped/plain, ordinary/long, inheritance, mechanism, table/list,
materials/XP and note cases, plus class/domain-directory fragments. Its complete Chinese
text (including whitespace), accepted Chinese summaries, structures and links are
checked in a readonly memory view. No persistent/operator/stable/app-state DB is
opened, copied or written. It is a display preview, not full source authentication
or whole-book acceptance. Preview paths and evidence belong to the owning issue/task,
not a parallel repository status ledger.

Full 1,001-entry display replay and this revision's remote CI remain paused until
the user confirms the small slice. Full construction additionally requires accepted
#480–#485 Chinese-format batches, #486 domain delivery and #487 special-component
markers. The current full-component preview tags are erroneous as PDF directory
markers and remain unaccepted; their resolution belongs to the user and #487 task.
After those gates, require one complete Chinese
body per target, exact Chinese directory summaries, preserved names/notes/structures,
all local and generated trusted-site links, and absence of English/rules sections.
Do not hide English text or emit extra bodies to satisfy obsolete output checks.

## Source And Delivery Boundaries

Reuse the existing accepted #467 source/normalized/manifest and generation provenance,
with the dedicated authentication/migration runtime unchanged. The accepted 296
format maps remain available; the other 705 entries retain accepted current input.
#473/#476 content proposals remain unapplied. Original PDF and official errata retain
content authority; the natural-layout policy does not accept unresolved corrections.
No whole-book semantic QA, original extraction or fine-emphasis queue is reopened.

Earlier complete bilingual-export, source-transition and normalized/metadata proofs
retain their original input bindings and claims. Their successful readonly export
and durable delivery do not establish acceptance of the revised Chinese display.
Update only the necessary display checker/main-gate handoff after slice confirmation,
retaining full internal canonical/source/summary/provenance and post-input checks.

Main-gate coordinates private writers paused throughout actual authentication/export
and post-rechecks, then explicitly releases the hold. Only main-gate performs the
refreshed actual readonly export and durable preview delivery. Implementation work
never changes those DBs or actual/durable preview paths. No private push, source
upload, deployment or self-merge is authorized.

Representative human review must include class pages, ordinary/long paragraphs,
compact fields, tables/lists, inheritance, materials/XP and independent source notes.
PR #351 remains draft. Mapping counts do not replace visual acceptance;
`formattingComplete` and `contentCertification` remain false. #354 is separate and
nonblocking. The existing HTML browser/file no-workaround restriction remains.
Usage and current behavior: [offline HTML](../operations/offline-html.md).
Write boundaries: [DB content workflow](../operations/db-content-workflow.md).
