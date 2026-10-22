# SC relationship source evidence (#354)

[Issue #354](https://github.com/FrankHZ/dnd3.5-spellbook/issues/354) remains blocked
by missing original external sources. Its 17 target IDs expand to **20 actual
class/domain tuples**. Every tuple is retained unchanged pending source review;
there are **zero source-correct claims and zero proposed patch operations**.
This report records reviewed evidence and concrete gaps, not full-QA acceptance.

The [source-free tuple inventory](../../../data-tools/reports/dice-qa/books/86/relationship-source-review.json)
records exact before/proposed values, SC locators and required external evidence.
Full current context, original page/span text, individual reasoning and source
search results remain local-only in `data/dice-qa/books/86/issue-354/`. Logical
data paths use the private repository selected by `DATA_REPO_PATH`.

## Evidence and remaining sources

SC printed pages 3–4 distinguish inheritance of an existing class list from
recommendations for expanding another class's list. SC's printed coverage is
limited to PHB/DMG classes. Therefore an omitted header class is insufficient
evidence to delete an existing membership. Complete entries and the complete
applicable official SC errata were examined; that errata supplies no correction
for these tuples.

| Targets | Tuple obligation | Missing direct original evidence |
| --- | --- | --- |
| 3542 | class 62, level 3 | Miniatures Handbook Healer list and original entry; a changed cleric level does not automatically change Healer's level |
| 3837 | class 2, level 5 | Original grant/owner evidence for the extra membership; SC entry/list absence alone cannot establish deletion |
| 3883 | classes 17 and 16, level 2 | Complete Arcane exact class lists/original entry, with earlier source only if needed |
| 3921 | classes 72 and 161, level 2; domain 28, level 1 | PHB II class list, Complete Adventurer class list, Champions of Valor initiate feat/spell; the imported domain entity represents a feat list and its level needs particular review |
| 3924 | class 161, level 2 | Complete Adventurer exact class list |
| 3952 | class 673, level 3 | Sandstorm complete prestige class spellcasting rules; advancing a previous class does not itself prove an unconditional independent list |
| 3983, 3987, 3993, 3994, 3996, 3997, 3998, 4433, 4434, 4435, 4437 | class 848, existing levels | Unearthed Arcana's exact class feature variant, or an authenticated official original SRD file containing it |

The reference entity for class 848 identifies the animal-companion replacement
of the familiar. All eleven tuple levels match the direct SC sorcerer/wizard
headers. SC's list-inheritance rule may close these together once the original
variant mechanism is authenticated. Imported class features and third-party
SRD replicas cannot supply that authentication.

Required external PDFs were absent from bounded local searches. Available
publisher web excerpts/enhancement landing pages did not contain the required
rules. The official UA checklist ZIP link returned HTML instead of the file;
the store request returned HTTP 403. No access restriction was bypassed, and no
third-party full-book mirror or compiled list was accepted as authority. Main-gate
was informed promptly and confirmed no additional known legitimate local path.

## Validation and replay

The local review aid reuses the maintained read-only coverage helper from merged
[PR #352](https://github.com/FrankHZ/dnd3.5-spellbook/pull/352) and maintained PDF
extraction. It creates no new importer, patch pipeline or permissive gate.

- Current baseline plus accepted pending 315 operations matches all 1002 current
  accepted inputs. These corrections are not yet active in the operator DB.
- All 20 scoped tuple values match their exact original operator rows. Current
  snapshot context is preserved; no relationship, text or summary is changed.
- 25 finite SC/errata pages were freshly extracted; existing complete-entry
  spans match the original PDFs. The maintained `verify_sc_authority` confirms
  the accepted printing and complete official errata spans. Entry and
  introduction pages were visually read.
- Root/package working-directory replays produce byte-identical evidence.
- Existing output filenames are rejected. Patch stale/repeat application checks
  are inapplicable because no sourced correction is proposed.

Replay from root, package or another working directory, with a new run name:

```powershell
& <existing-pdf-runtime>/Scripts/python.exe -B -X utf8 `
  <data-root>/dice-qa/books/86/issue-354/review_sources.py `
  --code-root <absolute-code-root> --data-root <absolute-data-root> `
  --private-revision a9cbe07747b1bc908ff4ebcd24244e38e58cb411 `
  --rules-db <absolute-readonly-rules-clean.sqlite> `
  --content-db <absolute-readonly-content.sqlite> --run <fresh-name>
```

Execution base: `50ec8369a046762903cab8a5689e6b8784b58ca5`; accepted snapshot:
`296903c61e20ce359812148fc0faa234ca2508e7`; accepted amendment:
`6a73f4d64682325c67e2c40595008344fb5c3be5`. The frozen dispatch inventory from
PR #352 at `e793ff09a38060c5c6b336d28690353bd0d96909` has the same 17 targets.
Exact public/private delivery commits belong in the PR handoff.

No canonical patch, source text, ledger, operator database, app-state, production
or deployed artifact changes. The private packet is committed locally only.
Main-gate must obtain the original sources and review each tuple before #354
or final SC QA can be accepted. This PR does not close the issue.
