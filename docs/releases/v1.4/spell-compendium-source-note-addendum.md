# Spell Compendium reader-note addendum

[Issue #407](https://github.com/FrankHZ/dnd3.5-spellbook/issues/407) owns a bounded
review of ten candidates under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/source-note-addendum.json)
records three proposed Chinese project notes and seven individually reasoned
no-change dispositions. Main-gate owns acceptance; [#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346)
owns final candidate, maintained writer and consumer integration.

| Target | Disposition | Review basis |
| --- | --- | --- |
| 3848 | No change | Directly specified entry values; missing external evidence does not establish an internal conflict |
| 3888 | No change | Explicit child component list, complete parent and component context |
| 4088 | Proposed note | Unresolved target scope difference between header and description |
| 4111 | Proposed note | Unexplained overlap between recipient categories |
| 4112 | No change | A benefit has its own explicit time statement |
| 4229 | Proposed note | Target revision and retained focus example lack an explained relationship |
| 4368 | No change | Overall maximum and explicit effect limit need not be mutually exclusive |
| 4370 | No change | Complete parent inheritance introduces no new distance conflict |
| 4459 | No change | Continuation explicitly distinguishes the cases |
| 4462 | No change | Explicit targets and general target movement; object examples are not exclusive |

The private handoff/helper revision is `c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4`,
owning only logical `dice-qa/books/86/issue-407/`. Its `amendments.jsonl` is the
narrow authored proposal, with complete findings in `dispositions.jsonl` and
exact before-fields in `packets.json`. The accepted final candidate is
`0688739d92a2aa9fb3eceeb444daa7260e711058`:
`dice-qa/books/86/issue-365/field-dispositions.jsonl`. All twenty assigned
name/body records bind full text, HTML, origin and review. Older summary notes
are investigation locators; pending summary acceptance is not source authority.

Original SC entries and continuations, the first-printing identification,
complete SC/PHB official errata and necessary bounded PHB references were freshly
read. Evidence contains 21 original pages with complete text, span geometry and
visually inspected renders. The ten full final records and their companion names
retain their complete provenance; 3,605 nested source span references are checked
against reopened pages. Missing external relationships remain under #354, and
broader PHB extraction/translation stays suspended.

The three additions use the existing source-question heading and unresolved
disposition. They identify the source wording and its practical uncertainty,
without resolving it or changing original statements, numbers or official errata.
All previous 37 reader notes across 35 bodies and all prior amendment history are
preserved. A hypothetical note-only projection changes three bodies and leaves
the other 1,999 final fields unchanged. It is review evidence, not a new canonical
candidate or import artifact.

The private amendment envelope binds `prior.acceptedRow` to the complete final365
field and its exact revision/path, with the companion `nameRow`. It reuses the
existing source-bound review and retained-source-issue contracts. This final-field
envelope needs #346's maintained integration after acceptance; it must not be
passed unchanged to the older native/independent-ledger amendment validator.
No public schema, annotation service or importer changes are introduced.

Stored text and HTML are preserved independently. Two selected text values retain
a trailing space absent from their HTML. The proposal appends the same separate
note to each original representation without normalizing either. The existing
contract's canonical HTML projection is used only in memory for syntax checking;
the real HTML prefix, original DOM text and new note are checked separately.
Three isolated old/proposed HTML pairs were rendered and inspected, with exact
original DOM prefixes, exact note text and no horizontal clipping.

Replay requires every helper/input at the selected committed private revision,
fresh PDF text/geometry and page-render comparisons, the existing source-question
contract, and isolated browser DOM/layout checks. Twenty-eight negative controls
reject stale before text/HTML/origin/review, names or mechanics, missing/duplicate/
extra/cross-target records, missing or stale PDF spans/quotes/geometry, and changes
outside permitted notes. The original PDF profile diagnostic is nonfatal; repeated
render bytes match and all viewed pages are readable.

Set explicit `$codeRoot`, `$runtimeRoot`, `$dataRoot`, and `$browserPackages`
(existing bundled Node packages containing Playwright). Run the same command
from the public root and `data-tools`, recording each JSON result separately:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-407/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --browser-packages $browserPackages --private-revision c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4
```

Replay records exact public HEAD, committed private helper revision and caller cwd.
GPT-6.1 Sol/high was verified from the local turn configuration. Full remote
`ci:portable` on the delivered public HEAD remains the merge gate; it does not
replace source review or authorize acceptance. Canonical candidates, old packets,
operator/app-state DBs, private push and production activation remain unchanged.
Later summary slices require their own #346 integration audit for new note candidates.
