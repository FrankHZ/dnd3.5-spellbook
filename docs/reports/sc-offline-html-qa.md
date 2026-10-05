# SC Offline HTML Verification

The current [#345 scope](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345)
is a Chinese CHM replacement: bilingual spell names, Chinese bodies and accepted
Chinese class/domain summaries, compact mechanism fields, and a generated website icon beside heading metadata.
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
qualifiers, exclusion of extra feat grants, invalid levels and duplicate domain tuples.
Class checks cover Chinese `default` names and explicit fallback. SC
Sorcerer/Wizard checks cover level-specific Chinese school groups, unchanged
stable pages, combined-school rows, duplicate qualifiers, distinct same-name
spells and preservation of source-bound printed markers and Chinese summaries.
Other classes and domains keep their original list layout. Excluded feat
relationships remain in the read-only input, with the spell body and normal
class memberships intact; reports distinguish source and displayed domain rows.
Directory rows use Chinese name (English name), printed M/F/X superscripts,
and the accepted Chinese summary on one flowing line. Detail titles are smaller,
with secondary page/ID/icon metadata in the same heading band; repeated
publication rows are omitted. Long names and narrow views allow natural wrapping,
with inline-block fallback for CHM readers lacking flex support. Missing page
numbers introduce no leading separator. Redundant body section headings and
bottom letter-page navigation are omitted, while the
Chinese body anchor remains on the body container.
The website-link checker accepts only the exact generated route for its own entry;
arbitrary source/external URLs remain detached or rejected.
Marker consumer checks cover accepted and explicit machine results, ordinary
candidate rejection, unknown/empty omission, distinct annotations for different
memberships of one spell, canonical MFX order, stale name/binding rejection,
read-only views and private-source exclusion. Complete component flags supply no
labels. Machine and independently accepted results retain separate report counts.

Introduction checks use a source-free synthetic fragment to prove complete
decoded text and structure retention, local page/navigation links, preserved
spell bodies and summaries, and rejection of unsupported markup before output.
The source reader selects the fixed accepted #503 Git file through the existing
data-root helper. Source-input smoke checks compare its bytes from repository
and package CWD; no database field or floating data checkout is used.

Domain-ability checks cover ordinary and planar pages, complete escaped powers
and requirements, both shared paragraphs, separately labeled reader notes,
stable owner/book/relationship bindings, stale and missing input rejection and
unchanged spell summaries. Extra source owners cannot create additional pages;
no source text enters public fixtures or database fields. The small accepted-input
preview includes one planar domain with a requirement, shared rules and reader note.

A small accepted-input preview is the current user-review stage. It contains
representative mapped/plain, ordinary/long, inheritance, mechanism, table/list,
materials/XP and note cases, plus class/domain-directory fragments. Its complete Chinese
text (including whitespace), accepted Chinese summaries, structures and links are
checked in a readonly memory view. No persistent/operator/stable/app-state DB is
opened, copied or written. It is a display preview, not full source authentication
or whole-book acceptance. Preview paths and evidence belong to the owning issue/task,
not a parallel repository status ledger.

Full 1,001-entry display replay remains paused until the user confirms the small
slice. Exact-head remote portable CI is the code gate, independently of visual
acceptance. Full construction additionally requires accepted
#480–#485 Chinese-format batches, #486 domain delivery and #487 special-component
markers. Unknown automatic marker residues are omitted and do not individually
block construction; complete component labels are never a substitute.
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
