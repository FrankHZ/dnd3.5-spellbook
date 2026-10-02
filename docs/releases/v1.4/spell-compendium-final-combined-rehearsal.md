# Spell Compendium combined rehearsal

[#414](https://github.com/FrankHZ/dnd3.5-spellbook/issues/414) combines the
accepted final name/body candidate, the three reader-note additions and the
promoted full canonical summaries with the real search/API consumers. The
[source-free report](../../../data-tools/reports/dice-qa/books/86/final-combined-rehearsal.json)
binds exact inputs, implementation and private verification references.
Independent main-gate PR/CI review and operator migration remain separate gates.

The first actual integration updated three bodies and 471 existing summary rows,
inserted no summaries and preserved the other 6,101 rows, including their
timestamps. The 471 include the latest 442 corrections and the earlier 29 accepted
corrections absent from the stable rehearsal. Verification compared every runtime
parser column and all 6,572 keys against the promoted canonical. Later repeats
changed no summary/text rows or timestamps; those no-ops are distinct from the
first real importer reports. Original name/body ownership, review and prior
amendment history remain intact; 1,999 unchanged field envelopes retain exact
bytes. The final source-question scope contains 40 target/question occurrences
in 38 bodies, with 37 distinct raw question IDs.

Full normalized generation/import used the maintained manifest/artifact mechanism.
The final replay preserves the actual generation/importer commits, fingerprints
and dirty flags, including the recorded private dirty state. It changes only the
current helper marker when the public revision changes. Existing accepted facet
derivation and all protected original339/accepted375 values remain exact. Rules
require no writes in this rehearsal: 4837 stays in book9 and 4617 has Sonic once.

The [accepted-summary gate](../../operations/sc-final-source-binding.md#final-overlay-and-migrated-state-validation)
adds fixed canonical/candidate provenance to existing overlay metadata only after
complete persisted matching. Partial, missing, extra or wrong-column imports fail;
an uncommitted parser substitution fails before source replay or database opens.
Its semantic scope is present canonical SC summaries, without inventing missing
entries or granting other-book source QA.

The full FTS v2 rebuild produced 12,846 documents, all compared field by field.
Real endpoints verified all 1,001 SC details, default/explicit Chinese and English
variants, names and resolve results, all 6,572 presented summaries and all 4,096
non-SC fallbacks. Browse reached exactly the 961 targets with accepted class
relations. Note-body and summary phrase checks proved variant selection and
isolation. Every native consumer open was restricted to the designated rules and
content pair and forced read-only; no real or dummy app-state database opened.
API DTO redaction passed. Root/package source, repeat, API and search checks
passed, and fresh connections reported SQLite integrity `ok`.

Private `dice-qa/books/86/issue-414/operator-sequence.ps1` supplies the executable
main-gate command handoff with explicit operator paths. Its preview opens no
operator database. Execution authenticates fixed write inputs before the first
rules write, checks the existing original snapshots, applies315 once plus guarded
4837 ownership and derived indexes, performs normalized generation/import, final
overlay, full canonical summary import/repeat and full FTS, then runs real
allowlisted consumers and all-table protection/provenance/fresh-integrity checks.
Retain the designated existing rehearsal inputs through that bounded postcheck;
the maintained source validator itself does not need a rehearsal snapshot.
This task has not executed that sequence against operator databases.

The 20 external relationships under
[#354](https://github.com/FrankHZ/dnd3.5-spellbook/issues/354) remain unsupported,
so `wholeBookComplete` remains false. Operator migration, production activation
and final HTML visual verification are unperformed. Durable HTML regeneration
belongs to [#345](https://github.com/FrankHZ/dnd3.5-spellbook/issues/345).
