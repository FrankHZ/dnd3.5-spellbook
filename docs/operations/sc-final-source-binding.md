# SC final name/body candidate replay

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
before final integration. The [source-free report](../../data-tools/reports/dice-qa/books/86/final-source-binding.json)
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
