# Complete Divine DB-English QA closeout

[Issue #561](https://github.com/FrankHZ/dnd3.5-spellbook/issues/561) owns this
128-target book56/edition5 coverage handoff. Private evidence is local commit
`5bdeab2366f048ef15bda45dd0bc086a9b844c08`, under
`dice-baselines/issue-520/qa/books/56/closeout/issue-561/` in the configured data repo.
[summary.json](summary.json) and [target-dispositions.csv](target-dispositions.csv)
contain source-free results, exact evidence owners/revisions and record indices.
Complete inputs, actual proposed Chinese after and clause-level review stay private.

The exact partition is 43 accepted #555 + 40 accepted #557 + 37 accepted #558 +
8 historical targets (642,657,690,691,692,693,719,730), without gaps or overlap.
The 120 sibling proposals are reused at their exact accepted private revisions,
with current English/HTML/mechanics, all Chinese variants and necessary reference
identity bindings revalidated. They were neither copied into closeout evidence
nor translated again. All 21 sibling residuals retain their exact owner, revision
and record index. Their source-free explanations remain in their owning reports.

| Evidence owner | Exact private revision | Targets | Residual targets |
| --- | --- | ---: | ---: |
| [#555](../../slices/issue-555/README.md) | `541d3121c60661cca569c5af2bb3b4e3a0264dfe` | 43 | 6 |
| [#557](../../slices/issue-557/README.md) | `cf341faed424092642f5e767b53e3237cc8029f3` | 40 | 6 |
| [#558](../../slices/issue-558/README.md) | `6bc8ad1f84df3bcc30a7ceaeb45792cd4b5adc11` | 37 | 9 |
| #561 historical recheck | `5bdeab2366f048ef15bda45dd0bc086a9b844c08` | 8 | 5 |

The historical eight have complete current-input and actual-after bindings.
Their original three accepted/five deferred decisions, corrections, genuine
native accepted fields and fallback remain intact in provenance. Current names,
bodies and mechanics match historical English; current HTML and all Chinese
variants were read separately. Current candidate file/line/ordinal/name/body
match the old candidates, while the source revision prefix differs. Neither old
source keys nor decisions were relabelled.

For 642/691/730, actual historical corrected after and full-body audits supplied
the reusable rule clauses. These are normalized into paragraphs and a meaningful
stat list, with individually documented terminology/timing corrections and
current actual-after bindings. The five former deferrals receive real current
DB-English body proposals, without importing mixed CHM headers/rules or requiring
PDF proof. Existing Chinese fallback remains live. Structured canonical fields,
including every null/empty value, stay unchanged; unpopulated fields are listed
separately from the demonstrated material gaps.

| Historical target | Current material gap | Available body |
| --- | --- | --- |
| 657 | Enemy effect/scope remains incomplete or contradictory. | Ambiguous |
| 690 | Structured save header differs from explicit body outcome. | Complete |
| 692 | Empty descriptor list versus disputed mixed-version tag. | Complete |
| 693 | Empty class relationships versus disputed publication level. | Complete |
| 719 | Temporary wording versus permanent header, no automatic expiry. | Ambiguous |

All 128 targets have reviewed, unactivated name/body proposals and dispositions;
102 have no material residual, 26 have specific residuals. Available bodies are
complete for 111 targets; 17 retain material body/reference ambiguity or gaps.
Coverage is distinct from a no-defect pass and activation readiness. Main-gate
must accept this delivery before parent book-level acceptance. Global dice QA
is not complete: #197 still owns 2,237 unreviewed occurrences and 995 outside-book
targets. No parent/child issue acceptance or closure is claimed here.

Historical review binds 11,295 English characters, 126 exact source segments,
127 sentence groups and five explicit numeric conversions to 3,594 actual-after
Chinese characters. Numbers, dice, negation, timing, scope, optionality, costs,
materials, saves/SR and name identity were read against actual after. HTML
nesting/text/link coverage and placeholder/raw/template checks pass. No existing
links were dropped, no tables were invented, and there is no long template reuse.
Five spell-reference name bindings use current Chinese names and explicit DB
identities; the complete 3,043-character current Blink reference was read with
all own-publication overrides retained. This is bounded DB-reference reading,
not PHB extraction or original-book verification.

[replay.ts](replay.ts) is a bounded, read-only audit adapter. It authenticates all
11 closeout files and the exact accepted sibling folders, replays maintained
105-file/5,606-candidate/5,097-target parse/source-coverage/reconcile helpers,
reuses the maintained partition check, and verifies current inputs, actual after,
numeric bindings and residual references. The maintained native slice validator
requires candidates for every target; it cannot certify these mixed proposals.
This adapter grants no native matched-only receipt or new native accepted fields.
Unified native/writer/FTS/API/consumer integration remains separately scoped after
QA; these inspection artifacts must not be used as importer input.

From the assigned repository root, using its existing runtime:

```powershell
& 'C:/Program Files/nodejs/node.exe' node_modules/tsx/dist/cli.mjs data-tools/reports/dice-qa/books/56/closeout/issue-561/replay.ts 5bdeab2366f048ef15bda45dd0bc086a9b844c08
```

From `data-tools`, use `../node_modules/tsx/dist/cli.mjs` and
`reports/dice-qa/books/56/closeout/issue-561/replay.ts` with the same exact revision.
The adapter resolves DATA_REPO_PATH via the existing root configuration and
operator DB paths via the committed manifest. Both DBs are readonly/query_only;
size/mtime remain unchanged. Negative in-memory probes reject stale English,
duplicate coverage and incorrect residual ownership without modifying inputs.

Exact replay takes approximately 3.5 seconds, with peak RSS below 512 MiB and
private/temp outputs each below 5 MiB; measured results are in summary.json.
One data process reads the existing 21.3 MiB ledger in place. No install, new
checkout, DB copy or paid external API was used. Raw NUL nonowned byte audits
after explicit owned-path commit preserve 9,417 index records, 1,480 status
records, 1,441 untracked paths and 39 staged deletions exactly. Snapshots remain
in assigned ignored output. Private data was not pushed. Local turn_context
metadata verifies GPT-6.1 Sol/high; the worktree remains assigned for review.

No operator/canonical/summary/app-state writes, import/writer/FTS/API/consumer
rehearsal, deployment, PDF/PHB/#201/#529 work ran. Shared source/map/alias/intake,
parser, old/sibling QA and accepted SC remain frozen. The sole workflow doc edit
records the coordinator-owned High agreement and QA-before-integration sequence.
