# SC final name/body candidate replay

For review of the current unresolved original statements and exact reader notes,
use the [source-question handoff](./sc-source-questions.md). Its private checklist
binds the selected final fields and accepted note addendum; it does not resolve
the rules questions or authorize external delivery.

The bounded [#365](https://github.com/FrankHZ/dnd3.5-spellbook/issues/365)
[helper](../../data-tools/audits/sc_final_binding.py) derives a read-only
1,001-entry name/body candidate from exact accepted source packages. It preserves
the [historical effective preflight](./import-workflow.md#effective-chinese-preflight)
and its rejection cases. The candidate does not enter the disposable writer's
accepted-baseline list. Generated field dispositions are inspection evidence;
they cannot independently authorize a writer or replace complete source QA.

The fixed private candidate is
`0688739d92a2aa9fb3eceeb444daa7260e711058`, under
`dice-qa/books/86/issue-365/`. Main-gate must review and select the candidate
before final integration. Main-gate selected this exact name/body candidate in
[PR #372 acceptance](https://github.com/FrankHZ/dnd3.5-spellbook/pull/372#issuecomment-5951318420).
That selection covers name/body source binding, not summaries or whole-book QA.
The [source-free report](../../data-tools/reports/dice-qa/books/86/final-source-binding.json)
records the exact source revisions, derived field differences and limitations.
The private package contains full current inputs, refreshed missing-translation
bindings, the one changed intake occurrence and 2,002 field dispositions with
separate content origin and original/errata review evidence.

## Replay

Use the existing Python 3.13/PyMuPDF environment and Node 24 dependencies through
explicit roots. No install, runtime links or persisted DB copy is needed. Inputs
are existing disposable original/patched rules and content rehearsal snapshots;
both rules DBs and the content DB are opened read-only. The maintained 315
operations, identity SQL and index derivation run only in memory.

```powershell
& '<runtime-root>/data-tools/pdf-extract/.venv/Scripts/python.exe' -B -X utf8 `
  '<code-root>/data-tools/audits/sc_final_binding.py' `
  --code-root '<code-root>' --helper-revision '<exact-public-helper-commit>' `
  --data-root '<configured-private-data-root>' --runtime-root '<runtime-root>' `
  --original-rules '<rehearsal-root>/rules.original.sqlite' `
  --rules-db '<rehearsal-root>/rules.patched.sqlite' `
  --content-db '<rehearsal-root>/content.snapshot.sqlite' `
  --candidate-baseline 0688739d92a2aa9fb3eceeb444daa7260e711058 `
  --output '<configured-private-data-root>/dice-qa/books/86/issue-365/new-replay.json'
```

The command works from repository root or `data-tools/`; paths are resolved
from the explicit roots. Output must be a new file in the owned private issue
directory. Helper/dependency edits, dirty/stale/missing accepted inputs, an
unsupported candidate revision or any mismatch with fresh derivation reject
the replay. The existing corpus/publication-map and full native QA run first;
fresh PDF verification checks every superseded and active source layer, the
original retention coverage, printing/complete errata and 4837 publication proof.
The replay does not read or edit canonical summaries or resume PHB extraction.

Synthetic rejection checks are part of the existing PDF unittest discovery:

```powershell
$env:NODE_PATH = '<runtime-root>/node_modules'
& '<runtime-root>/data-tools/pdf-extract/.venv/Scripts/python.exe' -B -X utf8 `
  -m unittest discover -s '<code-root>/data-tools/pdf-extract/tests' `
  -p test_sc_final_binding.py -v
```

## Binding and validation limits

The 315 baseline already includes 4617's Sonic relation. The 343 proposal has
the same edit and expected guard; replay rejects duplicate application and
refreshes its two translation inputs to the existing accepted Sonic context.
4521's two translation inputs additionally refresh 315's demonstrated English
capitalization/HTML and inherited casting-time/duration/save/SR values. Body
audit/pair English follows only that accepted capitalization. Neither refresh
changes the accepted Chinese translation, HTML, source quotes or source issues.
The sole new rules delta after 315 is 4837's book 9 ownership and four derived
class index rows. All 5,097 IDs, full 4837 content and relations, and all other
fields remain exact, including legacy invalid UTF-8 bytes.

Actual comparison derives 53 changed names and 996 changed bodies, 1,049 fields.
The 948 retained names and five retained bodies carry actual source-correct
original-entry reviews alongside their CHM origin. Complete retained HTML is
bound to current inputs and checked for text parity; its old review did not
bind HTML visually, and this replay claims no new visual review. The 37 source
questions remain faithfully preserved in 35 bodies. The 20 extra relationship
tuples under 354 remain unresolved pending other original books. This delivery
does not certify summaries, all mechanics/relationships, or whole-book QA.

The snapshots are rehearsal inputs, not permanent runtime dependencies. Exact
output text/HTML and source/origin envelopes provide a field-matching boundary
for final DB validation. Final 346 still owns accepted-input selection, the
writer/build integration, final rules/content generation provenance, and a
post-write check that works independently of removable rehearsal snapshots.
This command itself replays the historical pre-migration baseline and therefore
must not be presented as an ongoing migrated-DB or deployment validator.

## Final overlay and migrated-state validation

`npm run -w data-tools dice:final:write -- ...` is the maintained write entry for
the selected exact candidate. Run it only within the task's authorized DB write
boundary. Every invocation authenticates clean accepted Git inputs, regenerates
the complete formal QA/candidate, verifies original PDFs and applicable errata,
and compares all 2,002 envelopes with the selected candidate. It then authenticates
the fixed accepted [#407](https://github.com/FrankHZ/dnd3.5-spellbook/issues/407)
reader-note handoff at `c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4`, including
the exact private verification helpers, full original page text/geometry, source
questions and complete prior fields. Only bodies 4088, 4111 and 4229 receive a
separate project commentary note; all 1,999 other envelopes and the 37 existing
notes stay exact. Text and HTML prefixes remain separately authoritative,
including their original whitespace differences. Caller field JSON
and aggregate counts never supply authority. Historical commands retain their
original accepted-baseline guards.

The final rules input must contain the accepted 315 operations (including 4617
Sonic once), 4837's book 9 ownership and maintained derived indexes. The command
replays guarded identity SQL in memory, checks all accepted patch values and
complete current English/mechanics against accepted original reviews. Historical
QA uses exact Git-bound SC snapshots plus preserved CHM rows. It requires no
original/patched rehearsal DBs. Keep the real private sources and final rules
input outside removable worktrees.

First use the maintained rules manifest write/verify and full normalized
generate/import commands. When rehearsing, set process environment
`RULES_MANIFEST_PATH` to the owned manifest file so the shared canonical manifest
is untouched. This optional override resolves relative paths from the invoking
repository root; omitted values retain the canonical private-data path.
`RULES_DATABASE_URL` and `CONTENT_DATABASE_URL` select the authorized DBs.
Do not duplicate the Sonic patch or run CHM after the final overlay.

```powershell
npm run -w data-tools dice:final:write -- `
  --code-root '<absolute-code-root>' --runtime-root '<existing-runtime-root>' `
  --data-root '<configured-private-data-root>' `
  --rules-db '<final-rules-input>' --content-db '<authorized-content-target>' `
  --normalized '<full-generated-artifact>' --rules-manifest '<matching-manifest>' `
  --helper-revision '<current-clean-public-HEAD>' `
  --accepted-baseline 0688739d92a2aa9fb3eceeb444daa7260e711058
```

All path arguments are absolute and independent of caller CWD; `code-root` must
match the invoking checkout. Runtime dependencies are read through the supplied
existing runtime (Node modules and Python/PyMuPDF environment), with no install
or filesystem links. The default opens the destination read-only. Add `--apply`
for transactional SQL materialization, or `--validate` for read-only full field,
HTML, origin/review and build metadata matching. Stable effective IDs/variants
are reused. SQL changes, nullable provenance migration, metadata update and the
post-write comparison share one immediate transaction; any failure rolls back.
Repeating the same accepted inputs/helper revision changes no rows/timestamps.

Before either writing or validating, the command compares every normalized
table value with the genuine full generated artifact and validates its DB,
manifest, canonical-input and migration fingerprints through the existing
artifact mechanism. Preserve that generated artifact and manifest as durable
build evidence, or rebuild/reimport through maintained commands when inputs
change. It preserves the original generation/importer metadata and adds
`buildMetaJson.overlays.scFinalNameBody`, including exact accepted/source/helper
revisions. Field metadata retains original origin/owner separately from review
status, original entry evidence, complete active/prior amendments (including
4736), and source questions. Retained CHM fields have original-source review
proof; text equality alone does not confer acceptance.

Changed bodies additionally store `readerNoteAddendum` with the fixed #407
revision, exact amendment row and its complete prior origin/review/history.
Their original #365 envelope remains intact. Unchanged fields keep byte-exact
existing provenance and acquire no reader-note revision. Build metadata records
the accepted addendum and its verification separately. The API's existing review
DTO exposes the new review revision and unresolved question IDs for these three
bodies while preserving their original ownership/amendments; private envelopes
and source locators stay internal.

For a coordinated full migration, use the commands in
[normalized content and search](./import-workflow.md#normalized-content-and-search)
with explicitly authorized DB paths and owned output/manifest paths. Apply the
accepted rules patches and derived indexes, then `rules:manifest:write` and
`rules:manifest:verify`; run `rules:content:generate`,
`rules:content:import -- --dry-run`, then `rules:content:import`. Complete CHM and
entity text imports before this final overlay. Run the above `dice:final:write`
command first in dry-run, then with `--apply`, then `--validate`. Import the
separately accepted full canonical summaries through `summaries:import`. Then
repeat the final overlay with `--accepted-summaries --apply`, followed by
`--accepted-summaries --validate`. This explicit gate authenticates the promoted
canonical at private `1e86cf7865f42f15abb7d6629d2d9de54607a13c` and the accepted
#451 complete candidate at `04dd98490e4ad643eafc8f262bb5af57d3bffcd9` through fixed Git
inputs and exact candidate bytes. It reconstructs the unchanged 6,572-row baseline
and 265 additions from all six fixed original packets, full provenance, original
review locators, composition index and owner acceptance records. It compares all
6,837 keys and every persisted
parser column, including protected books, before recording `summaryQa` provenance
and accepted summary status in the existing overlay metadata. Missing, partial,
extra or wrong-value rows reject the gate; timestamps remain importer-owned.
Validation repeats this comparison, including inside the write transaction.
The recorded semantic scope covers present canonical SC summaries, without
inventing summaries for missing targets or accepting other books' source QA.

### Upgrade an already accepted annotated summary state

For the precise accepted 6,572-row predecessor, append `--accepted-summaries
--upgrade-summaries` to the explicit-root command above. The default is a read-only
check reporting `before` or `after`; `--apply` performs the upgrade and `--validate`
requires exact `after`. Do not use bare `summaries:import`, remove annotations or
run a normalized replacement on this accepted predecessor. The generic
`summaries:step` continues to reject changed annotated predecessors.

This bounded path authenticates old canonical
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8` and old candidate
`c4fe0c0a7b14aafed04bc9e733387afb51ae45eb` solely as the prior state. Before writes,
it requires the complete old inventory, exact final name/body and reader-note
envelopes, complete accepted overlay metadata and genuine full normalized build.
Unknown, missing, partial or mismatched annotations and marker/inventory mixtures
reject. It never repairs an unrelated field while upgrading summaries.

One immediate transaction rechecks those boundaries, inserts exactly the 265
accepted additions through maintained summary SQL, updates only the existing
summary acceptance revision/candidate/counts and validates the complete new state.
Full generation/importer metadata, the original overlay helper revision, all
existing summary timestamps, every text/note/provenance row and every protected
table/schema stay exact. Source/helper/normalized input drift or a final validator
failure rolls back additions and metadata together. Repeat inserts/updates/deletes
zero rows. A later ordinary `--accepted-summaries --apply` may explicitly refresh
the overlay helper marker after the upgrade has validated.

After apply, check and rebuild FTS using `content:search:step`, repeat its check,
and rerun source validation plus real API/default/explicit owner consumers using
allowlisted read-only rules/content connections. Main-gate executes operator
activation only after accepting the exact PR, CI and independent rehearsal.
See the [upgrade rehearsal and handoff](../releases/v1.4/spell-compendium-directory-summary-upgrade.md).
The #345 exporter must refresh its summary input revision, gap/coverage evidence,
data/consumer proof and output from this same completed artifact; its fixed older
handoff remains historical evidence. Source/structure checks do not certify HTML
visual output or bypass the HTML no-workaround boundary.

### Upgrade accepted domain summaries

The domain transition uses the same maintained final writer and transaction.
Append `--accepted-summaries --accepted-domain-summaries
--upgrade-domain-summaries` to the explicit-root command, retaining every
accepted source flag needed to reproduce the actual current bodies. Complete
source transitions before upgrading summaries; combining a source upgrade with
this summary transition rejects. The existing directory-summary upgrade and
its precise predecessor remain available independently.

The default checks the exact accepted 6,837-row predecessor or complete
6,866-row after-state. `--apply` inserts only the 29 accepted Chinese CHM
summaries, corrects only the source-bound 4123 row, and updates summary acceptance
metadata in one immediate transaction. `--validate` requires after-state.
The internal SQL primitive receives an independently authenticated before/after
correction pair; neither that pair nor arbitrary summaries are CLI projections.

The authority is the actual source acceptance receipt
`c7d21ef8a573217e54229809219c8fa323f66bab`, binding candidate
`cd67b6039331313cf858c646593f1fe9ddde0adb` at
`dice-qa/books/86/issue-500/summaries-final/summaries.proposed.jsonl`.
Metadata records that receipt, candidate and candidate path explicitly; it does
not substitute a receipt SHA for a canonical promotion commit. Authentication
compares the entire candidate to frozen old canonical rows and the accepted
decisions, including retained correction provenance. The old summary authority
remains unchanged for predecessor source operations.

Main-gate separately promotes the complete accepted candidate to
`short-desc-normalized/summaries.generated.jsonl` after source transitions.
Apply and validation require this real, clean, committed canonical file to equal
the complete fixed candidate. Before checks can run while canonical is still
the precise old inventory; partial, unrecognized or dirty canonical files reject.
No command promotes canonical implicitly. Accepted inputs and canonical bytes
are rechecked inside writes; helper drift, final-field changes, partial
inventories and unknown annotations reject rather than being repaired.

All other 6,836 summary rows and timestamps, every text/name/note/source overlay,
normalized values, schema and build provenance remain exact. The 4123 creation
timestamp is preserved; only its existing importer-owned update timestamp can
change. Faults roll back summary rows and metadata together; valid repeat writes
zero rows. Afterward, ordinary final validation/helper refreshes use
`--accepted-summaries --accepted-domain-summaries` with all current source flags.
This ordinary path first verifies the complete annotated after-state; it cannot
manufacture acceptance, repair other fields or bypass the dedicated upgrade.
Main-gate rebuilds FTS and verifies real API/HTML consumers against this same
stored state before operator/production closeout.

### Upgrade the accepted Prismatic Ray English pair

The exact [#434 source decision](https://github.com/FrankHZ/dnd3.5-spellbook/issues/434#issuecomment-5972281973)
accepts only private `790f9ebbd024916d16577d69c01d868155a9ccfd`,
`dice-qa/books/86/issue-434/candidate.json` and `rules-patch.jsonl`. It removes the
unsupported table title from 3958's English `description` and `descriptionHtml`.
The original #365/#407 packages, Chinese fields, reader notes, source ambiguity,
relationships and accepted 6,837-row summary inventory retain their authority.
The candidate's original proposal status remains unchanged; the fixed owner
comment snapshot at private `7f8ea2df1104fe4345141f0712dbb43739e98b7e` supplies the
independent source acceptance. Caller status/JSON does not replace this check.

Apply the exact paired rules patch through maintained rules patch/step commands
only after explicit operator authorization. Preserve complete before guards for
the atomic step. Generate a new owned rules manifest and full normalized artifact
through the existing commands; do not hand-edit normalized values or fingerprints.

For the already annotated final content predecessor, append
`--accepted-english-title --accepted-summaries --upgrade-english-title
--previous-normalized '<absolute-private-data-root>/dice-qa/books/86/issue-414/operator-main-gate-8ca3c48.normalized.generated.json'`
to `dice:final:write` above, with the new `--normalized` and `--rules-manifest`.
The previous full artifact is fixed at private
`307e8b1299e14c456957165b12c46d2c4afe3472`; a helper's static older default is not
the actual operator predecessor. Default check reports `before`/`after`; `--apply`
performs one immediate transaction, and `--validate` requires exact `after`.

This bounded transition authenticates the new source decision, reopens complete
SC162/official errata and replays all historical source QA with only the exact
pair reversed in memory. Both full normalized artifacts must differ only in the
two English fields and their normalizer-owned `descriptionHash`/`rawJson`, plus
new generation timestamp/provenance. It verifies the predecessor's complete final
fields, notes and accepted summary annotations before reuse. It imports the new
genuine artifact through the maintained importer and refreshes only the build's
English source binding/helper marker. All translation/provenance/summary rows,
timestamps, protected tables and schema remain exact. Unknown/partial mixtures,
stale fields/source evidence and transaction faults reject or roll back. Exact
repeat changes no rows or timestamps. The generic normalized step still rejects
changed annotated predecessors.

The complete external source authenticator runs initially and again inside the
immediate transaction before any content write. After writes, validation uses
the same content connection: all protected CHM/text/note/provenance/summary
tables, schema, final fields and the complete new build are checked without an
external process reopening the destination. This supports rollback-journal
databases whose write volume causes cache spill and an exclusive lock. Exact
Git contents/status of source/helper inputs, original PDF/corpus bytes and corpus
membership, the authenticated comparison-only extraction read set, accepted
summary inputs, both normalized files and current rules
generation provenance are rechecked throughout the transaction. A mismatch
rolls back the content transition; journal mode and lock timeouts are unchanged.

Use `--accepted-english-title --accepted-summaries` consistently for subsequent
ordinary final validation/helper refreshes of this upgraded artifact. The old
English source path rejects the patched rules input. Rebuild FTS after the
transition, then rerun final source validation and actual default/explicit-owner
API consumers. A refreshed private 3958 presentation must guard all four current
text/HTML fields; the old English fields must be rejected as stale. This does
not modify the frozen seven-entry or other three-entry presentation proposals,
select the new display proposal, pass HTML visual review or authorize full export.
Main-gate owns actual DB writes and later export after implementation acceptance.

### Upgrade the accepted Bands of Steel / Beast Claws pairs

The fixed [#461 source acceptance](https://github.com/FrankHZ/dnd3.5-spellbook/issues/461#issuecomment-5974178676)
binds private `ebc3a6615002de6dac1f1c4a636e19757d7b0c8f`,
`dice-qa/books/86/issue-461/candidate.json`: remove only 3930's unmatched Chinese
body sentence from text/HTML and only 3934's unmatched English article and
following space. All four complete before-fields and prior body envelopes are
fixed. The real owner-comment snapshot is authenticated at
`5f05fad7df5256a9c3c998d3be77aac238445107`; caller status cannot replace it.
The original final baseline, reader-note and complete summary authorities remain
unchanged. Source acceptance does not authorize operator writes or accept code,
new normalized generation, display selection or HTML visual output.

Use the maintained atomic rules step for 3934, with a full actual predecessor
guard. The frozen proposal's descriptive `source` keys predate that patch schema;
`sc-source-pairs.cjs`'s `maintainedPatch` converts only those keys to supported
`source.provenance`, leaving every expected/after value exact. Do not alter the
frozen proposal or relax the patch validator. Main-gate's private
`issue-461/prepare-step.cjs` prepares the guard read-only after implementation
acceptance. Its output belongs to issue-461; the rules CLI needs the unchanged
operation under its existing `rules-patches/pending/spells/` path convention.
Retain that actual guard for repeat checks; a memory fixture guard is not a
production handoff. Then generate a new owned rules manifest and complete
normalized artifact through the maintained commands.

For the accepted annotated #434 predecessor, append these options to the
explicit-root `dice:final:write` invocation:

```powershell
--accepted-english-title --accepted-summaries --accepted-source-pairs `
--upgrade-source-pairs `
--previous-normalized '<absolute-private-data-root>/dice-qa/books/86/issue-434/operator.normalized.generated.json'
```

Pass the new genuine artifact/manifest through `--normalized` and
`--rules-manifest`. The predecessor is fixed at private
`9ee687c380d22308d6f4aac3a3ad3eaa6196c614`, with completed-state evidence
`8afc1a3db3b3b506a6c833d0e10336fd09bc5422`. Default check reports `before`/`after`;
`--apply` owns one immediate transaction and `--validate` requires exact `after`.
The English-title and source-pair transitions cannot be combined.

Full historical QA runs with only the two accepted English amendments reversed
in memory. Fresh complete SC24/25 and all official errata are compared with the
fixed source packet. The authenticated final field derivation changes only
3930's Chinese body pair and adds `sourceCorrection` with exact candidate and
acceptance revisions plus its complete prior field. The normalizer owns only
3934's English pair, derived hash/raw JSON and generation provenance. Existing
names, notes, other body envelopes, all summary columns/timestamps and protected
tables/schema remain exact. The changed body's timestamp remains overlay-owned.
Missing/partial authority, stale full fields/normalized inputs and failed
post-write checks reject or roll back. Exact repeat writes zero rows.

The API validates that bounded persisted supplement and reports the new body
review revision for 3930 while preserving its original owner and final baseline
revision. Runtime does not read private Git/PDF inputs or expose private text
or locators. Use `--accepted-source-pairs --accepted-english-title
--accepted-summaries` for subsequent ordinary final validation/helper refreshes.
Rebuild/check FTS and perform actual default/explicit-owner consumer checks after
main-gate's authorized migration. #345 must then refresh both corrected complete
four-field typography guards and its actual source/build proof from that artifact;
the independent format proposals remain unselected until separately accepted.
Neither this command nor a source-bound memory rehearsal bypasses HTML visual
review or its no-workaround boundary.

After all text and summary imports, run `content:search:rebuild -- --dry-run`,
then `content:search:rebuild`, and repeat final validation with
`--accepted-summaries` plus consumer/search checks. Use this flag consistently
when refreshing the completed overlay's helper metadata. Omitting it retains
the conservative pending-summary path. Never rerun CHM after the overlay.
Neither this gate nor the reader-note addendum changes canonical inputs or
resolves #354's pending relationships.

The normalized artifact's full scope describes its coverage. Overlay semantic
metadata leaves summaries pending unless the explicit accepted-summary gate
passes, and always leaves the 20 extra relationships pending;
it grants no whole-book QA or activation. Other books/languages/variants,
summaries, normalized English/mechanics and unrelated content tables are
preserved. FTS remains unchanged until all final text and summaries are
integrated; the coordinating migration owns the final search/consumer gates.

Run `npm run -w data-tools dice:final:write:test` for synthetic full-artifact,
schema migration, protected-data, transaction fault, repeat and provenance
rejection checks. Source replay/PDF rejection tests remain in the Python suite.

The bounded [combined rehearsal report](../releases/v1.4/spell-compendium-final-combined-rehearsal.md)
records full summary/FTS/API verification and the separate operator handoff.
Use fresh native connections for final integrity/search checks after a rebuild;
FTS handles opened before another connection's index replacement can be stale.

## Six-entry source fidelity transition

The fixed [#467 source acceptance](https://github.com/FrankHZ/dnd3.5-spellbook/issues/467#issuecomment-5976286296)
binds six complete before/after pairs at private revision
`996a41671f7cb61e9f7fa6cce48a912695694c7c`, with independent receipt
`775005e96a5caa9a83bbf523f716946b2fe890a0`. It accepts source values only.
The maintained final overlay supports `--accepted-source-fidelity` after
`--accepted-source-pairs --accepted-english-title --accepted-summaries`.
For an authorized migration, add `--upgrade-source-fidelity` and supply
`--previous-normalized` pointing to the exact #461 operator artifact at
`2336ddf280ff27477a7ec760d745ac42a11d5cf9`; its current logical path is
`data/dice-qa/books/86/issue-461/operator.normalized.generated.json`.
Use check/apply/validate through the same command and transactional protections
as the preceding source-pair transition. Choose one upgrade per invocation.

Only English pairs 4247, 4345, 4354 and 4355 enter the fixed rules patch;
4345 preserves the already-correct text while correcting HTML. The overlay
changes only Chinese bodies 4033 and 4349 and records their original envelopes.
Prior source corrections, names, independent notes, summaries, mechanics and
unrelated table bytes remain guarded. Full original-page/errata authentication,
accepted source receipt and genuine full normalized provenance are required.
No caller projection or new proposal can substitute for these fixed inputs.
Actual rules/content writes, FTS, consumer checks, complete format selection
and export remain separate main-gate responsibilities. Unselected typography
must retain the full current fallback until those gates pass.

## Three-entry English source successor

The fixed [#473 source acceptance](https://github.com/FrankHZ/dnd3.5-spellbook/issues/473#issuecomment-5977076936)
binds private candidate `c78e1f09632570dcc059fc487df61d4259b96316` and
receipt `a42c772eb0e40c1000e2452e0cbb35e699a7e137`. Its three English
pairs are the only permitted changes: sentence em-dash positions in 4421/4425
and the omitted article in 4426. Existing representation whitespace and
4425's independently accepted official errata stay exact. Chinese text/HTML,
the prior 3930/4033/4349 correction envelopes, notes and summaries are preserved.

Use `--accepted-source-punctuation` after all predecessor acceptance flags,
including `--accepted-source-fidelity`. For an independently authorized migration,
add `--upgrade-source-punctuation` and provide `--previous-normalized` pointing
to the actual #467 full operator artifact at
`3109813da4b49d0e9c47ceeba44857a5a230b1e7`, logical path
`data/dice-qa/books/86/issue-467/handoff-preparation/operator/operator.normalized.generated.json`.
The same final-overlay entry authenticates the original pages, complete errata,
fixed acceptance receipt, exact four-field predecessor and genuine normalized
generation, then runs the existing guarded check/apply/validate transaction.
Choose one upgrade per invocation. Unaccepted or stale source values cannot
substitute for this fixed successor.

The source receipt permits implementation and bounded memory verification;
it does not authorize operator writes or accept a generated artifact. Actual
migration, FTS/consumer validation and complete bilingual format selection
remain separate main-gate gates. Until those pass, all three entries retain
their complete current fallback. The portable final-writer tests cover this
successor, predecessor corrections, partial/stale states and rollback.
