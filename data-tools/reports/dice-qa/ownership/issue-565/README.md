# Issue565 missing-entity input handoff

[Issue565](https://github.com/FrankHZ/dnd3.5-spellbook/issues/565), child of
[#545](https://github.com/FrankHZ/dnd3.5-spellbook/issues/545)/
[#197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197), prepares exactly
ten previously reviewed missing/mismatched dice occurrences. It reuses accepted
private evidence `58d7e6424f16b31492d495a972506455f7d1a823`; it does not repeat
the33 occurrence/104 target review or extend QA to995 unrelated DB targets.
This report publishes only counts, dispositions and reproducible checks.

Private handoff: `18f2a2ba97c03d242d9c66d8e68f84d12e4c1c8e` (local only), under
`dice-baselines/issue-520/ownership/issue-565/` in configured `DATA_REPO_PATH`.
Public base: `e666fd707880325daa0a24cf828d560e71466ba0`.

| Disposition                                             | Records | Evidence and next boundary                                                                                        |
| ------------------------------------------------------- | ------: | ----------------------------------------------------------------------------------------------------------------- |
| Proposed baseline for a future canonical-input decision |       1 | Full available English, original Chinese and schema-aligned fields; acceptance still required                     |
| Publication/version or source reliability dependency    |       4 | Full local English retained; source identity and specific gaps remain                                             |
| Reliable complete-English dependency                    |       5 | Web publication/mechanic leads available; OCR/summary references do not supply dependable complete admission text |

Local English exists for5 records. User-authorized ChatGPT Work web lookup then
found publication locators for all10;9 point to a different publication family
than their current mapping. The implementing task independently checked linked
catalogs, bounded OCR/index ranges and the complete expected-book HTML mirror.
Raw names, source keys, complete local English/Chinese, URLs, field provenance,
mechanism differences, spelling/page/edition decisions and each next action stay
private. Web references have an access date and authority label. No generated
Chat answer or search snippet is used as an English body.

All10 original source keys and4,082 raw header/body characters are unchanged.
Meaningful tables/lists and the raw spelling evidence survive. Complete local
TXT blocks include tail paragraphs missing from parsed JSON. Periodical issue
numbers are not admitted as page numbers. The expected books63/64 actually use
edition5, whose stored meaning is Supplementals(3.5)/DnD3.5. Magazine edition
proposals remain separate. Existing target3585 is a rejected mechanism homonym.

Every record has `activation:false`. Zero English baselines, Chinese fields or
new entities are accepted; zero IDs are allocated. The one proposed admission
field set reuses the maintained strict insert schema, with the mandatory-ID
error intentionally retained. No executable patch/import file is produced,
and no guessed/zero ID is supplied. Admission, mapping/alias changes, canonical
corrections and operator activation need their own accepted scope and authority.
Source gaps do not impose an automatic PDF/original-book verification project.

The bounded checker verifies exact prior/owned evidence revisions, shared #520
input equality, maintained parsing of the two selected files, current English
identity loading, book/edition rows, local text/parsed snapshots, web-reference
coverage, strict schema shape, and private index/status preservation. The rules
DB and upstream SQLite are opened read-only/query-only. Current operator DB
size/mtime remain unchanged; content is only statted, app-state never opened.
The39 unrelated staged deletions remain staged. No private push occurred.

From this configured code checkout root, using its existing runtime:

```powershell
& ./node_modules/.bin/tsx.cmd ./data-tools/reports/dice-qa/ownership/issue-565/verify.ts 18f2a2ba97c03d242d9c66d8e68f84d12e4c1c8e
git diff --check
```

Both precommit and exact committed replay passed. Committed replay took1.625s;
maximum observed peak RSS was399,408KiB, below the512MiB budget. Inventory covered
the existing local SQLite, parsed JSON and selected compilation inputs before
bounded lookup. Local processing used one process and existing dependencies;
private output is below2MiB and owned temporary output below0.1MiB. No source/DB
copy, runtime install, PDF extraction/download or purchased external API was
used. One user-authorized cloud research task ran; cloud account token usage is
not exposed. Input bytes/version evidence and preparation timing remain private.
The v6.01 file has no Git revision; exact selected blocks are retained as a local
filename-labeled reference, without claiming authenticated upstream release.

Implementing model/effort gpt-6.1-sol/high was verified from local rollout
`turn_context`. Cloud creation requested ChatGPT Work; read-only task metadata
identified its durable Codex harness. Its interface does not expose verified
model/effort settings, so none are claimed. Cloud result and actual task identity
are recorded privately.

Full remote `ci:portable` at the exact final PR head remains the merge gate;
the PR records its run. Any failure/cancellation/timeout stops without retry.
Main-gate owns independent acceptance, merge and issue closeout.
