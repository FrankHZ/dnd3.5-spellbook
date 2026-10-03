# Spell Compendium directory summary additions, batch 04

[Issue #444](https://github.com/FrankHZ/dnd3.5-spellbook/issues/444) proposes
47 missing fields across 45 complete SC spell reviews: EN/imarvin 32 and
ZH/chm 15. The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-additions-04.json)
lists exact field identities. All candidate rows remain `proposed`; main-gate
owns independent acceptance. [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435)
and [#346](https://github.com/FrankHZ/dnd3.5-spellbook/issues/346) own subsequent
accepted composition, source binding, rehearsal and authorized activation.

## Fixed sources and proposal boundary

Private candidate/helper revision `20da4a8ef3d8d54bc7711a642bcb4c548c3cf70c`
owns `dice-qa/books/86/issue-444/`. The gap proof is fixed at
`84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`, existing 6,572 summaries at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8`, and final Chinese name/body plus
original English/mechanics at `0688739d92a2aa9fb3eceeb444daa7260e711058`.

Each paired packet contains current English/mechanics, accepted Chinese
name/body/notes, existing summaries, original list/body/errata spans and an
independent decision. Fresh original PDF replay verifies 62 complete class-list
occurrences and 2,266 entry/list spans across 54 pages. All 57 full Poppler pages
were inspected, including the preceding class heading, first-printing evidence
and complete official errata. Required SC parents are complete; one additional
parent packet is attached explicitly. Historical external-book references retain
their status and are not new external-book QA. Existing typography/geometry
helpers suffice; no new parser or public runtime machinery is needed.

The [bounded source decision](https://github.com/FrankHZ/dnd3.5-spellbook/issues/444#issuecomment-5966770295)
permits minimum primary-text corrections or precision clarifications for
15 targets/17 missing fields. The private packets preserve raw table wording,
complete body evidence and the exact decision. Numeric/substantive contradictions
and clarified omissions remain distinct; no named official table errata is
claimed. All 15 Chinese additions are direct source translations, with corrected
or clarified translations marked explicitly. Existing ambiguities, opposite-language
summaries and reader notes remain unchanged.

## Reproduction and validation

From either public root or `data-tools`, supply explicit roots and distinct run
labels. The existing runtime environment is reused:

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-16'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$dataRoot = 'G:/spell-book/data'
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-444/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 20da4a8ef3d8d54bc7711a642bcb4c548c3cf70c --run review-root
```

Replay checks committed helpers, context, decision and proposals, regenerates
deterministically, reopens bounded PDFs and uses the maintained summary schema
and import step. Real proposed rows reject the accepted parser. Transient
format-only adaptation confers no acceptance. Only synthetic texts enter the
in-memory rehearsal: 45 existing rows plus 47 additions. Readonly checking and
retry perform zero SQL writes; apply adds 47 rows. Old values/timestamps and
every other table are preserved. Thirteen source controls and seven importer
controls reject coverage, duplicate, identity, owner, stale, provenance and
acceptance-status drift. The summary import-step and normalization portable
checks also pass. Exact public head, root/package proof refs and full remote
`ci:portable` results are recorded in the PR.

Existing canonical summaries and 43 scoped fields remain unchanged, as do the
previous proposals and canonical bodies/mechanics/relationships/notes. Private
commits use only this issue's paths, preserving unrelated staged/untracked work;
there is no private push. This slice opens or copies no operator/stable/app-state
database and generates no real complete summary union. PDF review does not
satisfy the separate HTML/browser/export visual gate. The ordinary public push
is available for #442's independent path-filter observation; this slice performs
no deployment, Cloudflare or credential operation.
