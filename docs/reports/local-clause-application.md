# Local accepted clause application

[#651](https://github.com/FrankHZ/dnd3.5-spellbook/issues/651) owns this High-rigor
operation. The user's explicit local authorization covers the accepted
#629 → #637 → #645 chain, one consistent backup, derived FTS and local consumer
verification. Production deployment, rules/app-state writes and unrelated source
imports remain outside scope.

The merged maintained owners applied all fifty targets and sixty-two clauses:

| Owner | Targets | Clauses | Result |
| --- | ---: | ---: | --- |
| #629 action corrections | 4 | 7 | Bodies/note and FTS committed; readonly complete |
| #637 action rollout | 37 | 40 | Bodies/note and FTS committed; readonly complete |
| #645 saving corrections | 9 | 15 | Bodies/note and FTS committed; readonly complete |

Each preflight authenticated exact committed accepted inputs and actual before
state. After every stage, completion was checked before advancing. Final saving
owner apply is an exact-after no-op for both bodies and search. Earlier owners
must not be retried against later annotations; use the saving owner for any
subsequent exact-after search recovery.

One SQLite backup was created before application outside removable worktrees,
under private `dice-handoffs/issue-651/content-before.sqlite`. Its integrity is
verified. Full final target rows match authenticated expected text/HTML/provenance,
retained names and protected predecessor fields. Streaming backup/live comparison
checks every non-search table outside the fifty owned effective rows, with only
the three accepted build notes removed for comparison. SC, CHM, non-target rows,
canonical English/mechanics, summaries, relationships and other build fields
remain exact. Rules-clean and app-state retain exact bytes and metadata.
SQLite integrity passes; foreign-key results equal the backup; FTS is current.

Compatible merged-code API on loopback `http://127.0.0.1:4187` uses the actual
operator content DB. All fifty default and explicit-effective details agree and
return exact corrected bodies/names with clause-scoped DB-English metadata;
whole-body review is false. Fifty explicit English and fifty CHM details retain
their original body/name content. Six full-text searches cover all three stages;
health, public app status and detailed DB status pass. Metadata omits private
input paths and predecessor envelopes. The #629 retained public CHM bookmark is
preserved; newer inserted references use their existing `chm-reference:<id>`
contract. Existing port4178 visual preview is untouched. The local API has no
production exposure and needs its checkout/runtime retained while running.

Private backup, baseline, stage reports, full target after-states, protected-table
verification and HTTP evidence belong under `dice-handoffs/issue-651/`; owner
reports use fresh `local-651-*` children under each fixed owner's directory.
The backup is intentionally untracked. Recovery instructions are in the private
README: stop consumers first, inspect unexplained drift, and do not automatically
restore or overwrite it. Body failures rollback atomically; after a body commit,
FTS recovery uses that same owner before advancing.

The pre-run estimate used269,307,904 bytes content and previous394 MiB readonly
peak. Actual backup took2.78 seconds and269,307,904 bytes; final content is
277,241,856 bytes. Ordered application and complete verification took126 seconds.
Peak writer RSS was1,340 MiB and parent verification443 MiB; these peaks were not
simultaneous. The conservative sum is below1.75 GiB, so the final operational
budget is2 GiB after measured reassessment. No concurrency or protection was
relaxed. HTTP verification took0.48 seconds at127 MiB. One backup, no additional
DB copies and no paid bulk-model calls were used. Actual session metadata verifies
gpt-6.1-sol/high. All39 unrelated staged private deletions and prior evidence
remain preserved. Independent main-gate acceptance owns final operation closeout.
