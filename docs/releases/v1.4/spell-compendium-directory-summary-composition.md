# Spell Compendium directory summary composition

[Issue #451](https://github.com/FrankHZ/dnd3.5-spellbook/issues/451) delivers a
complete 6,837-row candidate: the fixed 6,572-row baseline plus all 265 missing
directory summary fields (EN/imarvin 213, ZH/chm 52) across 248 targets.
The [source-free report](../../../data-tools/reports/dice-qa/books/86/directory-summary-composition.json)
records the six exact main-gate acceptance comments, private revisions and
added stable keys. Independent union acceptance and canonical promotion remain
with main-gate under [#435](https://github.com/FrankHZ/dnd3.5-spellbook/issues/435).

Private helper/candidate revision `04dd98490e4ad643eafc8f262bb5af57d3bffcd9`
owns `dice-qa/books/86/issue-451/`. Baseline is fixed at
`0b6fd8b88c1609cfdae50d8943d77eda13750ea8:short-desc-normalized/summaries.generated.jsonl`;
gap and frozen membership JSON at `84a78b8d9513db883f5cfc6d9e4afe7febd1fbb5`.
The latter is read only for identities and existing class membership, not used
as a newly accepted full migration artifact. Original name/body/mechanics
context remains `0688739d92a2aa9fb3eceeb444daa7260e711058`.

`summaries.candidate.jsonl` retains every baseline line byte-for-byte. The suffix
follows issue order 436, 438, 440, 444, 447, 449 and original candidate line order.
Each appended row changes only `reviewStatus` to `accepted` under its fixed
main-gate decision. Original sourceKind/sourceKey/sourceName, consumer owner,
source text, spans, review locator, translation and correction metadata remain
intact. `composition-index.jsonl` binds each original row/review/owner to that
decision; `additions.accepted.jsonl` is the exact appended suffix. Old proposed
packets and the canonical owner are untouched. Status alone grants no acceptance.

The exact union closes the frozen gap with no overlaps or extra keys. All 961
class targets select exactly one accepted EN/imarvin and ZH/chm field, giving
1,922 selectable fields. All 40 classless targets retain their absence of class
membership. Complete field coverage does not accept pending relationship QA.

Replay from public root or `data-tools`, using explicit absolute roots and a
distinct run label:

```powershell
$codeRoot = 'G:/spell-book/worktrees/sc-summary-16'
$runtimeRoot = 'G:/spell-book/worktrees/sc-current-effective-writer'
$dataRoot = 'G:/spell-book/data'
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-451/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision 04dd98490e4ad643eafc8f262bb5af57d3bffcd9 --run review-root
```

Replay authenticates committed helpers/candidate/index/acceptance snapshots,
recomputes complete row bytes, and checks maintained public inputs against HEAD.
The real 6,572/6,837 JSONL inventories enter an in-memory schema with only
synthetic identity/appearance fixtures and source-free portable sentinels.
No DB or full normalized artifact is copied. Maintained summary parser,
`importSummaryRows` and `summaryImportStep` prove check/dry-run zero writes,
apply 265 inserts/zero updates/zero deletes, and retry zero writes. Every old
projection column/timestamp and every other table/schema remains unchanged.
Full original provenance is checked before the maintained storage projection.
Own temporary JSONL inputs are cleaned; no persistent DB is created.

Per-packet controls reject missing/incorrect acceptance, stale revisions and
baseline, missing/duplicate/extra keys, wrong book/owner, same-count text and
provenance changes. Full candidate controls reject baseline alteration, ordering,
content, provenance and status drift. Importer controls reject stale persisted
state, wrong identity/owner, a recognized annotated predecessor, pending status,
duplicates, deletion and changed input bytes. Maintained summary step and
normalization portable tests pass. The PR records exact-head root/package
replay evidence and complete remote `ci:portable` results.

The [final source-binding gate](../../operations/sc-final-source-binding.md#final-overlay-and-migrated-state-validation)
still authenticates old private `0b6fd8b88c1609cfdae50d8943d77eda13750ea8`,
candidate `c4fe0c0a7b14aafed04bc9e733387afb51ae45eb` and 6,572 summaries.
The [summary import step](../../operations/import-workflow.md#summary-import-step)
also refuses an annotated predecessor. After main-gate accepts and precisely
promotes this union, a separate slice must bind the promoted revision and
rehearse the genuine combined migration while handling existing annotations.
Changing a caller flag or total cannot establish that authority. Local
activation and actual #345 export remain subsequent authorized work.

No operator/stable/app-state DB is opened, copied or written. Canonical inputs,
old slice evidence, names/body/mechanics/notes/relations, PHB suspension,
deployment and credentials remain untouched. Private commits use exact own
paths, preserve the unrelated 39 staged deletions and 403 untracked status rows,
and are not pushed. This delivery does not satisfy the separate HTML visual gate.
