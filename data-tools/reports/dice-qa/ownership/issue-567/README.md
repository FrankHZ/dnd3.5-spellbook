# Issue567 dice binding handoff

[Issue567](https://github.com/FrankHZ/dnd3.5-spellbook/issues/567), child of
[#545](https://github.com/FrankHZ/dnd3.5-spellbook/issues/545)/
[#197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197), resolves exactly
12 previously reviewed dice-present binding proposals against current complete
DB-English and mechanics. All12 support the proposed existing targets. Their
12 Chinese names and12 complete available bodies reuse actual input-matching
accepted afters, with field-level revision/path provenance and original raw
evidence retained privately. No other target is translated again.

Private handoff: `fa2161cedba089b7f817390b4963015f06a09f72` (local only), under
`dice-baselines/issue-520/ownership/issue-567/` in configured `DATA_REPO_PATH`.
Public base: `f753fec26028723e99a54f0c46cf64f32cfd297e`.
Accepted evidence references are #545 `58d7e6424f16b31492d495a972506455f7d1a823`,
#547 `d0b831615b7839ef4b070f5ab3fd573b13224cac`,
#549 `7ef5bfb12471c465d9187784e13546b57a59563c`, and
#551 `42e04906674fa115a69ad960613e71775e8b7e99`.

| Binding decision                    | Occurrences | Existing targets              | Remaining input gaps                         |
| ----------------------------------- | ----------: | ----------------------------- | -------------------------------------------- |
| Current owner43 to book79/edition5  |           6 | 2175,2203,2177,2163,2164,2209 | Four specific residuals across three targets |
| Current owner79 to book43/edition7  |           5 | 1859,1847,1848,1849,1851      | No selected body-source gap                  |
| Single spelling to book112/edition3 |           1 | 4957                          | No selected input gap                        |

Complete distinctive mechanics/text and current stored publication identities
support these bindings. The five book43 candidates modernize casting wording
to standard action while DB edition7 is Supplementals(3.0) with `1 action`.
That difference is explicitly retained; it does not establish a3.5 reprint or
strict action synonymy. Reused name/body proposals contain no added modernized
casting clause; canonical action remains unchanged. The1847 weight boundary
follows the explicit inclusive DB value. Candidate area/material/flavor terms
and translation errors receive individual decisions, not broad normalization.

The selected accepted residuals remain:2175's misplaced description sentence
and unspecified save reference,2163's external table/effect rules,2164's external
complete-effect/duration rules. All supplied text is translated; missing rules
are not invented. Two bodies have external source gaps. Fallback, canonical
English, mechanics and summaries remain unchanged. This is DB-English QA,
without original-book authentication.

Shared source/map/alias/intake remain frozen at prepared revision
`6d28f9391273979a35a6bcc86971f0aac5b9f2c8` and source/map revision
`47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`. Maintained parser/source-coverage/
reconcile helpers reproduce all5606 original candidate rows and5097 target
dispositions. In memory,the two publication corrections attach11;the alias
only supplies one hint and does not attach4957. A separate simulation adjusts
exactly one parsed English-name value and demonstrates all12 bindings, without
changing any raw header/body/sourceKey/boundary. Only the specified12 candidate
and12 target dispositions change. All other5594 candidates,5085 targets and
every current fallback remain equal.

Frozen inputs remain natively unmatched. The maintained slice selector rejects
them; the readonly full-book validator reproduces the exact accepted43/79/112
receipts:zero accepted candidate fields,56/150/2 English fallback fields,zero
pending fields/audits. The separate bounded handoff carries the actual Chinese
fields and guarded binding decisions. No native accepted receipt is fabricated.
Later coordinated shared map/spelling adoption and a freshly accepted global
baseline are required before integration. No shared validators are invalidated
by this batch.

These12 occurrences were already disposed in #545. This follow-up reviews zero
new unseen occurrences and leaves #197's2179 unseen count unchanged. Every row
has `activation:false`;zero DB writes/import/FTS/API/consumer operations,new
entities or production actions occur. Accepted SC/PHB and paused #529 remain
untouched. This batch grants no writer authorization.

From this configured checkout root:

```powershell
& node --expose-gc --max-old-space-size=256 --import tsx ./data-tools/reports/dice-qa/ownership/issue-567/verify.ts fa2161cedba089b7f817390b4963015f06a09f72
git diff --check
```

From `data-tools`,use the same Node flags and
`./reports/dice-qa/ownership/issue-567/verify.ts`. The verifier writes nothing
and uses the retained runtime. It authenticates accepted/owned files, actual
current selected inputs and after/clause bindings, full source replay, proposed
effects, residuals, native boundaries, operator metadata and nonowned private
index/status. Rules/content are readonly/query_only; app-state is never opened.
The39 unrelated staged deletions remain staged. Private evidence was not pushed.

Both exact committed root/package replays pass in about5s. Highest observed
peak RSS was383376KiB,below512MiB; final exact replays stayed below361MiB.
The existing22.3MB ledger and5.55MB TXT corpus are replayed without copies.
Selected content is4104 raw and8923 DB-English body characters. New private
evidence is1516689 bytes,largest file1380614 bytes;owned temporary output is
below0.1MiB. One process,existing dependencies,no new install,PDF acquisition,
DB copies or purchased external APIs. Actual `gpt-6.1-sol/high` was verified
from local rollout `turn_context` and recorded in the private manifest.

Full remote `ci:portable` at the exact final PR head remains the merge gate;
its run is recorded in the PR. A failure,cancellation or timeout stops without
retry. Main-gate owns independent acceptance, merge and issue closeout.
