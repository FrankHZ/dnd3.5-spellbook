# Spell 4837 publication identity proposal

[#349](https://github.com/FrankHZ/dnd3.5-spellbook/issues/349) proposes moving
existing target 4837, **Expose the Dead**, from Spell Compendium/book86 to
existing **Magic of Eberron/book9, printed p96**. The original publisher's
contents identifies that exact name/page; its title/printing/ISBN information
matches the existing publication. The proposal preserves the spell ID and all
body, mechanics, translation, summary and relationship values.

This is a publication identity proposal awaiting main-gate acceptance. No
canonical inputs, operator databases or deployment have been changed. The
sample does not provide MoE p96's spell text, so this delivery does not accept
the existing English body, Chinese candidate or whole-book MoE QA. Future
content review follows the English original and applicable official errata;
existing English DB, CHM and dice text are reference inputs. Preserve original
ambiguity and record interpretation separately.

## Primary evidence and stable identity

The independently downloaded six-page
[publisher sample](https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/3729-sample.pdf)
was rendered with Poppler and visually inspected at physical indices 3 and 4.
Index 3 identifies Magic of Eberron, Wizards of the Coast, revised 3.5 material,
first printing October 2005, ISBN-10 `0786936967` and ISBN-13 `9780786936960`.
Index 4 lists Expose the Dead at printed p96. These are preview physical indices,
not a physical offset formula for the unavailable full book.

| Check | Result |
| --- | --- |
| Existing publication | book9, `MoE`, `magic-of-eberron` |
| Existing edition | 3, Eberron (3.5), system DnD 3.5 |
| Accepted publication metadata | Same book/ISBNs; no metadata rewrite needed |
| Current erroneous identity | book86, edition5, page96 |
| Global exact/normalized English name or slug targets | One: 4837 |
| Relevant global English-name aliases | None |
| Global name/target/identity-hint dice candidates | One, currently unmatched, already scoped to book9/edition3 |
| Git-authenticated original SC spell inventory | 1001 entries; zero name or target4837 matches |

The original SC inventory and `issue-259/source-anomaly-4837.json` were loaded
from accepted private revision `6a73f4d64682325c67e2c40595008344fb5c3be5`.
The current historical anomaly record remains equal to that committed record.
Its unresolved disposition remains valid evidence of the earlier boundary; this
new primary evidence is kept separately under the new owning issue.

The sample is stored only at private
`data/dice-qa/books/86/issue-349/3729-sample.pdf`, under the private repository's
existing PDF ignore rule. No PDF, extracted text, page render, database, candidate
body or patch source is published in this repository.

## Minimal guarded patch and disposable result

The existing structured `updateSpell` format does not support rulebook ownership.
The proposal therefore uses the maintained SQL patch mechanism without adding
a new API, schema or general patch abstraction. The private
`identity-4837.sql` changes exactly `dnd_spell.rulebook_id` from 86 to 9.
Its transaction checks the expected ID/name/slug/page/book, unique global target,
unique MoE publication and exact existing book/edition identities. A failed guard
rolls back the transaction, including its temporary guard objects.

The proposal must be followed by the existing `rules:index:rebuild` command.
Edition is derived from the existing destination rulebook; no spell edition
column or new identity is created. Maintained index SQL rederives metadata from
the existing spell/class/domain relations.

| Disposable before/after | Verified delta |
| --- | --- |
| `dnd_spell`, 5097 rows | One row, one scalar: target4837 `rulebook_id` 86 → 9 |
| `idx_spell_class_level`, 13795 rows | Four target4837 rows: `rulebook_id` 86 → 9, `edition_id` 5 → 3 |
| Other 58 tables | Exact raw-byte/value equality, including every relationship and ID |
| Schema | Exact equality; no persistent guard objects |
| Book86 count | 1002 → 1001 |
| Book9 count | 33 → 34 |
| Total spells, target ID and printed page | 5097, 4837 and 96 preserved |
| Integrity | `ok` |

The previously generated #339 final-head rules snapshots were opened read-only.
The established #339/#259 all-table checker first reverified all 315 accepted
baseline patch operations, unlisted fields, raw bytes, relationships and the
unchanged historical 4837 row. New in-memory and command-created disposable
copies were then used for this proposal. Operator DBs and app-state were never
opened by these checks.

Eight negative cases reject with exact rollback: repeat application, wrong old
book, wrong page, wrong name, absent target, duplicate target, ambiguous MoE book
and wrong destination edition. Exact comparisons cover all 60 tables, including
invalid legacy text bytes, rather than relying on row counts alone.

## Derived consequences and final handoff

Actual maintained SQL dry-run, index rebuild dry-run and audit-only content
generation were executed. Both generated artifacts contain all 5097 spells and
are explicitly non-importable. The complete generated outputs differ only in:

- 4837's `SpellContent.sourceRulebookId` and `rawJson.rulebookId`;
- its appearance rulebook and ID, from `spell:4837:appearance:86` to
  `spell:4837:appearance:9`;
- four normalized list-entry rulebooks and IDs derived from those same indexes.

All other generated rows/values, body HTML, description hash, taxonomy, components
and mechanics remain exact. Existing rules class/domain/descriptors/item-spell
relations preserve their identities and values. The disposable content snapshot
has no CHM Chinese row or summary row for 4837, so existing English fallback is
retained; no summary text rewrite or transfer to another spell is required.
Book-filtered listings/counts, edition filters, source display and provenance
must be regenerated from corrected rules. Follow the normal full content build,
summary import and search rebuild order in
[import-workflow](../../operations/import-workflow.md#normalized-content-and-search)
after acceptance; do not hand-edit a normalized response to force these results.

Maintained candidate parsing/reconciliation confirms the sole MoE candidate was
unmatched because 4837 was outside its publication/edition. A disposable
post-patch reconciliation maps it uniquely to 4837/book9/edition3 and classifies
it as missing-current-Chinese. That identity result does **not** accept either
Chinese field or certify it against unavailable MoE p96 text.

[#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346) must explicitly
incorporate the accepted proposal, rebuild dependent indexes and regenerate the
final SC source scope/bindings as the actual 1001 SC entries with 4837 preserved
separately as a non-SC record. It must refresh relevant candidates, mapping
revisions, provenance, fallback/coverage ledgers and final checks under a new
accepted revision. The retained 1002-target accepted snapshots and old anomaly
record must continue to reproduce their original baseline.

The unchanged old accepted SC preflight **rejects** the remapped rules with a
stale-intake-candidate error. This is verified guard behavior. Do not loosen its
fixed publication/fingerprint/partition checks or change its old denominator in
place. Do not imply this identity proposal accepts MoE content or resumes PHB.

## Bindings and validation

Public execution base: `baa82caae474c51e8a175779cafb568c99d282c4`.
Private dispatch base: `471cdda8cf80292355aa25e60c52726c861cd1a4`.
Committed private helpers/source evidence:
`b30ef4390aff768ee337a142c11233b2ece3327c`, under
`data/dice-qa/books/86/issue-349/`. The private Git index was shared with a
concurrent #347 evidence commit, which captured the already-staged #349 helper
files; that actual binding is preserved without rewriting either slice's history.

| Exact input | SHA-256 |
| --- | --- |
| Publisher preview, 4356680 bytes | `561d757f9d668c16589a1faa02275576b7f18e6f65b3bc46055e92a66d2ccddc` |
| Original disposable rules | `590ce44932c465a4df8c3070cc61bf78ca5fc936c248bbac6c8f85928a8280c4` |
| Accepted 315-patch disposable rules | `d0155b125ab74d442d0934e66d2d92e9f9f143ae201b021d94cb94dd2df36498` |
| Guarded identity SQL | `d9baa6588fd228baea302bf3f557a64641843bc8a0956a0643f22d6b39b8d468` |

Private `reproduce.py` verifies exact committed helper contents and reruns source,
raw-byte patch and maintained-CLI/consumer checks from both the worktree root and
`data-tools/`. Its `reproduction.json` records actual public HEAD, private helper
revision, explicit code/runtime/snapshot paths and all six passing runs.
`rules-patch-verification.json`, `consumer-verification.json`,
`candidate-before-after.json`, `exact-spell-before-after.json`,
`CLI-execution.json` and `pdf-verification.json` preserve detailed private evidence.

Runtime dependencies are borrowed read-only through absolute paths from the
existing `sc-current-effective-writer` worktree. New outputs stay in this
worktree's ignored `data-tools/out/`; no package reinstall, link or junction is
created. Private writes are confined to the new issue directory; no private push
or shared accepted-input change is performed. Actual session metadata verifies
`gpt-6.1-sol` with `high` effort in `model-verification.json`.

Local validation comprises primary-page render inspection, source/ISBN/inventory
checks, duplicate/candidate/alias reconciliation, accepted-baseline revalidation,
60-table exact comparison, eight rollback guards, maintained SQL/index dry-runs,
full audit-only normalized comparison, historical-preflight rejection and
root/package-cwd reproduction. Public validation is changed-link/command
inspection and `git diff --check`; exact-head remote CI remains the merge gate.
