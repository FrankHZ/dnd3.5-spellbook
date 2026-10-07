# v1.4 Content Acceptance

Acceptance snapshot: 2026-10-07. The scoped content delivery is complete and
active locally and in production. This is not a claim that the whole corpus,
every relationship, or every retained fallback field passed QA.

## Delivered Scope

SC retains its separately accepted original-source/errata authority: 1,001
effective Chinese entries and the accepted English, summary, formatting and
reader-note work. The later dice import does not replace or relabel SC.

The closed non-SC round uses matched database English as the review baseline.
The accepted handoff contains 4,152 reviewed fields (1,700 names and 2,452 bodies)
across 2,747 targets. Materialized effective rows also retain 1,081 CHM fields
and 261 English fields; those fallbacks are not newly reviewed translations.
Six accepted mixed-language bodies retain English portions, and 27 unaccepted
bodies keep fallback. This round does not correct canonical English or mechanics.

The content DB serves 5,097 canonical spells, 3,748 effective Chinese entries
(SC plus this non-SC delivery), and 15,808 search documents. Entry, field and
search-document counts are different units, not interchangeable QA totals.

SC HTML delivery includes 1,001 Chinese bodies, 15 class pages, 42 domain pages
and 26 A–Z body pages, with introduction, domain powers and accepted list notes.
Class lists group levels 0–9; domain lists preserve 441 source rows and 443 spell
bindings, including other-book versions. English spell names remain, while body
pages are Chinese. A cross-book list binding does not certify that book's body
translation. Generated HTML and source-bearing integration artifacts remain
outside the public repository.

## Acceptance Evidence

- [SC HTML delivery, PR #351](https://github.com/FrankHZ/dnd3.5-spellbook/pull/351):
  approved preview, complete export and independent body/list/link checks.
- [Authenticated closeout, PR #589](https://github.com/FrankHZ/dnd3.5-spellbook/pull/589)
  and [selective activation, PR #590](https://github.com/FrankHZ/dnd3.5-spellbook/pull/590):
  accepted inputs, truthful field provenance, protected SC and recoverable FTS.
- [Local activation receipt](https://github.com/FrankHZ/dnd3.5-spellbook/issues/587#issuecomment-6031519787):
  selective apply, exact repeat, protected data comparison and actual consumers.
- [Production receipt](https://github.com/FrankHZ/dnd3.5-spellbook/issues/587#issuecomment-6042067153):
  backend `1571739f39b1ab0f5aeaa3f5928757b0db45e741`, local/remote DB equality,
  complete new-name checks, representative detail variants and Chinese search.
  Canonical English, SC, rules DB and app-state were preserved.

Use the [import workflow](../../operations/import-workflow.md#accepted-non-sc-dice-closeout)
and [deployment guide](../../operations/deployment.md) for maintained commands.
Receipts establish the accepted artifact; they do not authorize a new write.

## Exclusions And Follow-Up Ownership

- [#201](https://github.com/FrankHZ/dnd3.5-spellbook/issues/201) owns unreviewed
  candidates, missing/ambiguous English and publication/version identity gaps.
  The 1,971 unreviewed candidates include the interrupted 53-entry batch. The
  729 occurrences from 26 book-name sources and four collections overlap that
  total; do not add them. Reviewed identity deferrals and unapplied version
  references remain distinct from unperformed semantic QA.
- [#354](https://github.com/FrankHZ/dnd3.5-spellbook/issues/354) owns 20 extra
  class/domain relationships on 17 spells. Their current values remain pending;
  draft [PR #359](https://github.com/FrankHZ/dnd3.5-spellbook/pull/359) does not
  certify them. This was explicitly separated from SC content/HTML delivery.
- PHB extraction/translation remains suspended, including
  [PR #113](https://github.com/FrankHZ/dnd3.5-spellbook/pull/113).
- [#420](https://github.com/FrankHZ/dnd3.5-spellbook/issues/420) is future canonical
  cross-DB handoff/recovery work. [#122](https://github.com/FrankHZ/dnd3.5-spellbook/issues/122)
  concerns stale CHM preprocessing outputs; [#442](https://github.com/FrankHZ/dnd3.5-spellbook/issues/442)
  concerns applying/verifying provider build-watch settings;
  [#446](https://github.com/FrankHZ/dnd3.5-spellbook/issues/446) is the next-version
  spell feedback button. None expands this content acceptance.

## Release Metadata Boundary

At this snapshot, the root package and production backend still report
`v1.3.0`; remote Git tags contain no `v1.4.0`, and no GitHub release is published.
Content activation is complete, but a numbered v1.4 release is not recorded.
[#123](https://github.com/FrankHZ/dnd3.5-spellbook/issues/123) owns reconciling root
metadata, deployed frontend/backend evidence and the intended release/tag.
Do not tag old v1.3 code or claim a v1.4 label based on content counts alone.
