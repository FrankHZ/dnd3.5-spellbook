# Bounded class source follow-up (#632)

[#632](https://github.com/FrankHZ/dnd3.5-spellbook/issues/632) investigates the
nine inherited uncertainties in the fixed [#619 handoff](visible-class-sources-final-619.md).
It proposes **five supported relationships and retains four unknowns**. Three
proposals concern previously unsupported classes; two concern additional
Miniatures Handbook versions of already-supported classes. All proposals require
independent main-gate acceptance. This report does not change the accepted
mapping, importer or API.

## Exact disposition

| Immutable version key | Class | Proposed result | Evidence and limit |
| --- | --- | --- | --- |
| `98:37:26` | Mystic | unknown | Archived publisher designer interview establishes book/3.5 context, but supplies no Mystic formal entry or distinguishing mechanics |
| `22:462:669` | Hathran | unknown | Archived publisher excerpt identifies a revised Hathran and lists it in Chapter 3; the excerpted formal class is another class |
| `109:860:974` | Death Master | supported class entry | Publisher class TOC, named spellbook/Undead Minion errata and Volume I/3.5 context |
| `109:861:975` | Jester | unknown | Publisher class and advancement-table listings located; distinguishing class features still missing |
| `109:863:977` | Savant | supported class entry | Publisher class TOC, named Arcane/Divine Lore errata and Volume I/3.5 context |
| `109:864:978` | Sha'ir | unknown | Publisher class/table listings located; gen corrections do not name the class and cannot supply the missing attribution |
| `109:865:979` | Urban Druid | supported class entry | Publisher class TOC, named focus/companion/shape errata and Volume I/3.5 context |
| `75:18:76` | Favored Soul | supported book version (`reprint`) | MH sales sample includes title/copyright, TOC and formal entry with class table/features |
| `75:16:79` | Warmage | supported book version (`reprint`) | Same MH sample includes formal entry and limited class rules; continuation beyond sample was not read |

The three Dragon Compendium proposals use **publisher TOC + official errata +
edition confirmation**. Main-gate explicitly permitted this combination for the
narrow source-identity proposal after inspecting the saved evidence. Complete
formal entries were not acquired, and no whole-class rules QA is claimed.
Frozen DB snapshots contain the same named features without an identity conflict;
they are comparison material, not independent proof of publication ownership.

The four unknowns are specific evidence gaps, not claims that the books lack the
classes. Mystic and Hathran still need attributable formal material with their
distinguishing features. Jester needs such features beyond table names. Sha'ir
needs an explicit publisher link between the named class and its features;
neither nearby gen notes nor derived DB text supplies that link.

## Acquired evidence and locators

All URLs were accessed on **2026-10-16**. Private acquisition records retain
actual HTTP status, final URL, byte count, original files and extracted text.

- [MH sales preview](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/168690-sample.pdf):
  13 PDF pages. PDF page 1 identifies Wizards of the Coast, October 2003 first
  printing and product 96582, matching accepted publication 75. The sample does
  not print its ISBN or an explicit 3.5 label; edition is bound through the
  existing accepted publication identity. PDF page 2 is printed TOC page 3;
  Favored Soul occupies printed pages 5–8 (PDF 4–7), and Warmage begins on
  printed page 14 (PDF 13). The sales product-page fetch returned 403, so no
  successful store-to-sample hyperlink verification is claimed.
- [Paizo official TOC](https://paizo.com/download/dragon/compendium/TableOfContents.pdf):
  PDF page 1 lists Chapter 2 class starts at original pages **29 / 36 / 45 / 51 /
  57** for the five targets in table order. Death Master's frozen DB page lead
  remains **30**; source entry start 29 is recorded separately.
- [Paizo official errata](https://paizo.com/download/dragon/compendium/DragonCompendiumVolumeIErrata.pdf):
  PDF page **1** identifies the named features at original pages **31** (Death
  Master), **49** (Savant), and **60–61** (Urban Druid). Original pages 55–56
  contain the unattributed gen corrections. These are different locators from
  the TOC entry starts.
- [Paizo edition retrospective](https://paizo.com/blog/paizo-publishing-s-10th-anniversary-retrospective-mdash-year-3-2005-mdash-laying-the-foundation):
  the Volume 1 paragraph identifies its update to 3.5. It describes a 2005
  release; accepted publication metadata records 2006. This investigation binds
  volume identity, preserves that metadata, and does not certify printing-level
  equivalence or propose a publication-date correction.
- [Archived PGtF publisher excerpt](https://web.archive.org/web/20161101150312/http://archive.wizards.com/default.asp?x=dnd/ex/20040305a):
  the revision discussion and Table 3-1 establish useful context but leave the
  specific Hathran feature gap.
- [Archived DLCS publisher interview](https://web.archive.org/web/20161031220101/http://archive.wizards.com/default.asp?x=dnd/ps/20030802a):
  the 3.5 design question and later product discussion provide context without
  supplying the Mystic entry. A separate MH designer interview also supplied
  product context only, not target acceptance evidence.

Prior failed MH product/dmreference retrievals and missing CHM bindings were
traced rather than rerun. Third-party archive indexes served only to find
publisher links. DB mirrors, whole-book PDF mirrors, magazine origins and
other-book versions were not adopted as evidence. Further name-only searches
would not fill the remaining feature/attribution gaps.

## Fixed private handoff and verification

Evidence is in `class-sources/issue-632/` under configured `DATA_REPO_PATH`:

- Evidence commit: `3df7edb72b19a57fb9e4a7c897ebf4745bd03465`.
- Disposition/verification commit: `c9d87c0395db76b9596fba9648566fd79a4eacf3`.
- `proposed-dispositions.json`: all nine keys, stable identities, prior evidence,
  finite identity comparisons, proposed outcomes and specific next evidence.
- `proposed-support-delta.json`: only the five supported proposals, bound to the
  evidence commit. It is a review artifact, not accepted importer input.
- `sources.json`, `fetches.json`, original samples/articles and saved extraction:
  precise source types, URL/date, edition reasoning, page locators and limits.
- `predecessor-evidence.json`, `identity-snapshots.json`: original records
  resolved from their fixed commits; `verify.py` checks these references.

The baseline remains `efe2083c0f5049aabce561517f3f02b9901ba07b`; its CHM
acceptance revision remains `7aed6890d88a6472f5fe9a857050a3823bdbf8ca`.
The verifier checks exactly nine unique keys, unchanged IDs/names/pages, the
five-row delta, all 27 fixed evidence files, saved PDF extraction, and the
unchanged five aggregate handoff files containing the old 64 supported and 11
excluded relationships. It also checks the original nine uncertainties are
preserved. The private repository's 39 unrelated staged deletions were excluded
from both commits and its original staged diff remained byte-identical.

From either checkout root or package directory, using an explicit private root
and a Python installation with `pypdf`:

```powershell
python -X utf8 "$env:DATA_REPO_PATH/class-sources/issue-632/verify.py" "$env:DATA_REPO_PATH"
```

Set the shell variable explicitly for this command; root `.env` does not export
PowerShell variables. The verifier prints JSON and writes nothing. It opens no
databases. The optional local index-preservation check applies when the retained
pre-dispatch staged-diff snapshot is present.

## Resources and consumption boundary

The initial acquisition pilot fetched three small PDFs, **4,770,098 bytes** in
**2.032 seconds**. It established that the source method worked before adding
four small HTML articles. Source processing is sequential and linear in selected
bytes; no full-corpus or full-book acquisition was needed. The representative
verification, including all saved PDF extractions, took **1.406 seconds** with
**73.46 MiB** process peak working set. This measures the verifier process, not
remote search-service memory or rendering subprocess peaks. The initial memory
estimate was 128 MiB against a 512 MiB budget.

The private directory was **34,119,471 bytes** at verification, including an
18,559,304-byte local snapshot of unrelated staged changes that was not committed.
New evidence and handoff remain below 50 MiB. No paid API calls, CHM rescan,
database connections/copies/writes, FTS changes or deployments occurred.

The [fixed accepted importer](../operations/class-sources.md#accepted-mapping-import)
continues to consume the old 84 dispositions / 64 supported relationships.
If these proposals are accepted, a separate integration slice must authenticate
the old-to-new transition, preserve old inputs and stale-revision rejection,
and obtain any required write authorization. Projected counts are **69 supported
version relationships / 65 supported classes**, with 11 exclusions and four
uncertainties; these are proposals, not current application state.

Public validation consists of report/link/authority review and `git diff --check`.
Exact-head remote `ci:portable` remains the PR merge gate.
