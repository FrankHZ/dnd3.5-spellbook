# Spell Compendium directory summary additions, batch 01

[Issue #436](https://github.com/FrankHZ/dnd3.5-spellbook/issues/436) proposes
the first 49 missing language fields for [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435)
and the complete class directory in [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-01.json)
lists all 45 assigned IDs and all 49 field dispositions. Main-gate owns acceptance
and integration; this proposal does not activate any summary.

## Source and field boundary

The fixed private gap proof is `84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`.
The existing 6,572 accepted summaries are fixed at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`; complete final English/mechanics and
accepted bilingual name/body context are fixed at
`0688739d92a2aa9fb3eceeb444daa7260e711058`.
Private proposal/helper commit `ee6d2a0e9c2399a8d97af83dcac2bee21b192b42` owns
`dice-qa/books/86/issue-436/`. All candidate rows have `reviewStatus: proposed`.

All 45 spells have complete original SC list descriptions. Existing list extraction
and entry locators supply 62 list occurrences; fresh original PDF replay checks
2,268 spans on 50 bounded entry/list pages. December 2005 printing and complete
official SC errata are checked through the existing authority helper. All 52
corresponding full Poppler pages were individually inspected. Columns, folded
continuations, school prefixes and focus/XP superscripts are kept distinct.
Each spell has a complete paired review packet, an individual reason, original
list/entry references and an explicit errata judgment. Historical external-book
locators remain reference context; this slice does not grant them a fresh QA pass.

The proposal adds EN/imarvin 43 and ZH/chm 6 only. These variants identify consumer
owners; provenance truthfully identifies the original PDF and direct translations.
Existing 41 scoped language fields and every other accepted summary stay unchanged.
Six missing Chinese summaries are translated directly from the complete original
list rows with their numerical scaling, damage types and conditions preserved.

Main-gate authorized five new EN candidate corrections supported by primary SC
rules: melee/full-attack restrictions (3793), partial devil appearance/abilities
(3907), nonmagical fire (4055), one selected natural weapon and threat-range doubling
(4071), and per-functioning-targeted-effect damage (4078). Review packets preserve
the original table text and complete primary evidence. They label these as project
summary corrections, without claiming official table errata. The remaining EN
candidates retain original complete short descriptions, with whitespace and font
ligatures normalized. Existing source ambiguities and reader notes remain intact.

## Reproduction and protection

From either public root or `data-tools`, use explicit roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-436/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision ee6d2a0e9c2399a8d97af83dcac2bee21b192b42 --run review-root
```

Replay checks committed helpers and proposal/context text, regenerates deterministic
inputs and review output, reopens bounded PDFs, then exercises the existing summary
parser and maintained import step. The actual `proposed` candidates fail the accepted
parser. An in-memory format-only adaptation checks schema shape and never establishes
acceptance. Only synthetic texts enter the import rehearsal: 43 existing rows plus
49 additions, including sibling-language and unrelated-book controls. Read-only
check preserves state; apply inserts 49; repeat makes no writes. Existing values and
timestamps and every other table remain unchanged. Eleven source/coverage controls
and seven import controls reject stale, missing, duplicate, cross-target, cross-book,
owner and acceptance-status substitutions.

No actual complete summary union is generated. Operator/stable/app-state DB access,
canonical text/mechanics/relationships/notes writes, private push and deployment
remain outside this slice. #435/#346 owns accepted-input composition and subsequent
authorized integration. Source PDF inspection does not satisfy the separate HTML
browser or export visual gate. Exact public head, root/package proof refs and complete
remote `ci:portable` results are recorded in the PR.
