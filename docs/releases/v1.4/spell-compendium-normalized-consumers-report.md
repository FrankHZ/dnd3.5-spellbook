# SC normalized consumer verification

Scope: [issue #327](https://github.com/FrankHZ/dnd3.5-spellbook/issues/327).
All checks use disposable SQLite copies and the maintained 315-operation rules
patch. SC first-printing/official-errata bindings and accepted parent evidence
were checked against original PDFs on the scoped pages. Private findings contain
the actual persisted fields, HTTP responses and source references; this report
contains no source passages.

## Dispositions

| Spell ID | Field | Classification and verified result |
| --- | --- | --- |
| 3883 | Saving throw | Stale artifact; maintained spelling correction restores the Reflex flag. Additional class relations are preserved without adjudication. |
| 3868 | Saving throw | Parser defect fixed; a qualified no-save value keeps its qualifiers, no-save category and false `allowsSave`. |
| 3899 | Duration | Parser defect fixed; spaces around the per-level separator retain the flag and complete projection. |
| 4655 | Target | Stale artifact; maintained target reaches persisted content and API detail. |
| 3834 | Inherited header/components | Stale artifact; accepted parent casting time, duration, save, resistance and components reach the consumer. |
| 3861 | Area | Stale artifact; official errata occupies Area and clears Target through the existing patch. |
| 3928 | Inherited header/components | Stale artifact; maintained header reaches detail and filters, retaining Focus and inherited verbal/somatic components. Raw Range remains a review facet. |
| 3967 | Class levels | Stale artifact; maintained cleric and explicit sorcerer/wizard levels reach detail and class-level browse. |
| 3991 | Duration | Stale artifact; maintained duration reaches persisted content and detail. |
| 3997 | Class levels | Stale artifact; explicit sorcerer/wizard relations reach browse; cleric/druid and variant 848 remain. |
| 4437 | Class levels | Stale artifact; explicit sorcerer/wizard relations reach browse; variant 848 remains. |
| 4464 | Target spelling | Stale artifact; maintained spelling reaches detail without a spelling-repair parser. |
| 4497 | Target/inheritance | Stale artifact; maintained explicit target reaches detail; accepted parent evidence is retained. |
| 4501 | Focus/Divine Focus | Stale artifact; maintained Focus distinction reaches detail and positive/negative component filters. |

The two parser corrections consume complete syntax only. Appended conditions
retain raw fallback and cannot gain complete display coverage through these
rules. No inheritance resolver or consumer selection mechanism was added.
Generator identity is `rules-content-normalizer-v9`.

## English rebuild controls

All eight controls match maintained canonical text **and HTML byte for byte**
after import and through actual English detail responses. These are rebuild
controls, with no new English authorship.

| Spell ID | Maintained difference checked |
| --- | --- |
| 4418 | Capitalization |
| 4472 | Operative movement sentence and spelling/case |
| 4493 | Word order and emphasis |
| 4496 | Grammar/plural |
| 4498 | Spelling |
| 4501 | Grammar, punctuation and Focus distinction |
| 4504 | Emphasis delimiter |
| 4659 | Whitespace and link/emphasis formatting |

## Preservation and validation

- All 315 patch operations pass the existing all-table verifier; unlisted spell
  columns, invalid raw bytes, relationships and 56 other tables are preserved.
- All 29 partial/review observations retain their existing review/display states.
  The 4277 formatting observation is not promoted into a semantic correction.
- All 29 accepted summary corrections retain canonical provenance and pass
  actual EN/ZH detail checks. Other summary rows and protected content columns
  are byte-preserved. The existing field-provenance migration was applied only
  to the disposable content copy so current Chinese consumers could read it.
- The 1,026 accepted name/body inputs and fixed effective-879 package are
  unchanged. No effective writer or source acceptance ran.
- Source questions for 4153/4743 casting time and 4504 Range remain unresolved;
  existing maintained values are preserved without certification. Variant 848
  and additional 3883 class authority remain with #263.
- Generation arrays for spells/raw English/mechanics, publications, appearances,
  taxonomy, class relations and components are identical across the parser
  correction. Its only facet deltas are 43 complete qualified no-save values and
  86 complete spaced per-level durations matching the two generic grammars.
  This syntactic effect does not constitute other-book semantic QA.
- Baseline regression checks fail for both concrete parser cases and pass with
  the fix. Portable harness: 20 checks; artifact guards: 5 checks; portable
  migration/import acceptance: 12 migrations and 30 synthetic spells. Data-tools
  typecheck, server build, 31 targeted server tests, and summary normalization
  safety from root/package directories pass.
- Disposable full generation, import dry-run/apply, search rebuild and parity
  pass. Actual HTTP checks cover 21 distinct detail rows, 19 positive/negative
  mechanic/component/class-level filters, and 29 summary controls.

Operator rules/content were opened readonly or safely copied; operator DBs and
app-state were never written or activated. No private push, deployment, archive,
full other-book QA or suspended extraction queue ran. Remote portable CI on the
PR head remains the merge gate; main-gate owns acceptance and closeout.

## Evidence revisions

| Binding | Revision |
| --- | --- |
| Public base | `a5895b4ac9bc9b9fb6b68008cadb2dba29f24c50` |
| Public implementation/helper used for final rebuild | `2582407318dbffcb17563ffe404e1f81fed49ce9` |
| Private canonical baseline | `8d72c1a50eb1623f089957c8a4c052831d428ea6` |
| Private local-only evidence | `fa1acdb7c78731d2a12c20320bc87ade660e5baf` |

Private evidence is `dice-qa/books/86/issue-327/`: `dispositions.json`,
`english-controls.json`, `api-verification.json`, `facet-preservation.json`,
`preservation-verification.json`, `source-verification.json`,
`regression-verification.json`, `targeted-checks.json` and `revisions.json`.
The latter records generation-time provenance: clean implementation revision,
canonical private baseline and a dirty flag caused solely by the new issue-327
evidence. The private evidence commit changes no canonical input. Runtime
metadata verifies `gpt-6.1-sol / high` in `model-verification.json`.
