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
canonical at private `0b6fd8b88c1609cfdae50d8943d77eda13750ea8` and the accepted
#411 candidate at `c4fe0c0a7b14aafed04bc9e733387afb51ae45eb` through fixed Git
inputs and exact candidate bytes. It compares all 6,572 keys and every persisted
parser column, including protected books, before recording `summaryQa` provenance
and accepted summary status in the existing overlay metadata. Missing, partial,
extra or wrong-value rows reject the gate; timestamps remain importer-owned.
Validation repeats this comparison, including inside the write transaction.
The recorded semantic scope covers present canonical SC summaries, without
inventing summaries for missing targets or accepting other books' source QA.

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
