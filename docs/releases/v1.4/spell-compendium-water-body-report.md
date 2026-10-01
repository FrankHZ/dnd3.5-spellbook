# Spell Compendium Target 4469 Body Proposal

Issue [#292](https://github.com/FrankHZ/dnd3.5-spellbook/issues/292), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
One complete descriptionText/escapedHTML proposal includes a separately bound,
nonofficial Close comparison note. Name, identity, canonical English, mechanics,
summaries and existing relationships remain readonly. This report contains no
source text, translation or PDF spans.

Public dispatch base is `d32d350b742d50e00f4d24f249394ab823e77751`;
private accepted base is `2d3f925fc42e0b72e6c7bb8a47a82c63d907df6f`.
Private delivery is `9961ecc838be14d540c20d5b4971273d48c61f18`, under
`data/dice-qa/books/86/issue-292/`, committed locally without a private push.
CLI acceptance means a validated proposal, pending independent main-gate review.

## Consumer Evidence Obligation

The actual complete target fields and relationships were read alongside the
rules/content selects, normalized-content adapter, mapSpellDetail, SpellContent
and Spell schemas, getSpellDescription, DescriptionSection and its page caller.
These consumers pass descriptions into text/HTML display; they do not expand the
named creature into monster statistics. The target's actual class, descriptor,
component and mechanic rows contain the spell's own claims. Current complete
CHM and English bodies, normalized content, summary and declared relationships
were inspected, rather than using keyword absence as proof.

SC supports the displayed creature name and all explicit generation, size,
control and disappearance conditions. This body adds no creature statistics,
attacks, immunities, special abilities or expanded control procedures. The prior
unread-MM limitation is preserved in full and remains applicable to any future
expansion of those capabilities. It does not block this unexpanded body.
No source text, prior record or relationship was deleted to manufacture closure.
The accepted #288 static classification is retained without rewriting it.

Complete SC86 title, header, flavor and rules ending were reread, along with the
December 2005 first-printing credits and complete local SC errata. PH174-175
range context and the complete usual Close definition were read with the July
2003 first-printing credits and all three February 17, 2006 PHB errata pages.
The SC category and explicit formula remain in the proposal. PH is solely a
real comparison note. Whether the discrepancy is an exception or printing error
remains source-unresolved; canonical range is unchanged. There is no applicable
dedicated amendment, and no claim that other printings or MM capabilities were
verified. Size and subtype terminology and omitted flavor were checked against
the actual source rather than inherited from the old Chinese wording.

## Delivery And Field Union

Private `source-bound-reviews.jsonl` holds the single increment;
`body-accepted.jsonl` filters it from the actual complete-union formal QA export.
`current-inputs.json`, `consumer-inputs.json` and `consumer-obligation.json`
bind the complete inputs and actual consumer decision. `prior-bindings.json`
and `prior-gap-binding.json` retain exact #259/#264/#270/#288 revisions and
records. Full text/HTML, both diffs, fullBodyAudit, complete body claim bindings,
PDF evidence, printing/errata review and visual render records are private.
The scanned PH credits page is visually read without inventing extracted spans.

The #290 native output remains byte identical. Its 144 independent records
remain a byte-identical prefix, followed only by the new body. The maintained
validator and formal QA CLI revalidate the entire candidate union using actual
readonly inputs. No new contract, overlap exception, ID mapping or writer is
introduced.

| Measured candidate set | Fields |
| --- | ---: |
| Native accepted | 658 |
| Prior independent accepted | 144 |
| New independent body | 1 |
| Complete independent union | 145: 112 body, 33 name |
| Complete native + independent union | 803 |
| Formal native fallback | 1346 |
| Projected remaining fallback | 1201 |
| Formal field universe | 2004 |

The projection is a review complement, not writer input. Target 4469's name
remains fallback. Frozen directories 259/264/265/268/270/272/274/276/278/280/
282/284/286/288/290 remain unchanged. All 33 unanswered source questions and
one official resolution remain unchanged despite the Chinese proposal passing.
The four other historical body gaps, target 4204 and other name, identity and
terminology residuals remain with parent #263.

## Validation

Private `reproduce.py` appends exact argv, cwd, stdout/stderr, execution heads
and exits. Run 02 uses public `d32d350b742d50e00f4d24f249394ab823e77751`
and committed private helper revision `d4e4364e73cd858e9e732bfccc5ca38b1acb6e7a`;
all 13 commands exit 0. `run-source-bindings.json` directly compares helper
contents to that revision. Public tool sources are unchanged by this report.

- The existing all-table checker verifies the designated temporary
  315-operation patch copy and 56 unchanged tables before reuse. Content
  generation provenance and existing rules/manifest fingerprints match.
- Full formal QA validates all 145 independent fields; original native
  accepted/fallback bytes match. Six aggregate validator mutations and four
  missing/duplicate union cases are rejected.
- Twenty-one formal CLI mutations reject missing source/body evidence,
  incorrect comparison placement/declaration and stale complete inputs or
  text/HTML. Failed cases produce no accepted export.
- The maintained PDF verifier rereads eight pages and 1201 spans for one body;
  fifteen stale, missing, duplicate and physical-source-alias mutations fail.
  Whole-body claim quotes match actual spans. All nine Poppler renders,
  including the scanned printing page, were visually read.
- `npm run -w data-tools dice:qa:test` passes, including 104 rejection checks.
  Scoped Git diff and report-link checks pass. Remote `ci:portable` remains
  the merge gate.

Operator DBs, app-state, shared manifests, production consumers/writers,
source authority, import order and fallback are unchanged. No production write,
deployment, activation or source upload occurred. Suspended PHB/MinerU/SRD and
other books remain outside scope. The implementing task does not accept or
merge this delivery.
