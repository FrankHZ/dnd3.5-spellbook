# Readonly Action QA

`npm run -w data-tools action:qa -- --content-db <content.sqlite> --out <new-directory> --sample 100`
reads canonical `SpellContent` English/mechanics and selected Chinese text from
`I18nSpellText`. Relative arguments resolve from the current checkout root, even
when invoked in `data-tools/`. The caller supplies the DB path; no DB is copied.
Output must be a fresh child of configured `DATA_REPO_PATH/term-qa/`.
Existing evidence is never overwritten. `--ids 1,2` selects explicit stable IDs;
`--variant chm` selects the legacy row explicitly. Sample/ID limits are 1–1,000.

Default selection mirrors API row-presence semantics: prefer `effective`, then
`chm` only if no effective row exists. An empty effective body stays empty.
Evidence retains the actual selected variant, book, source key, raw name/body
provenance and complete English/Chinese text, with optional separate CHM contrast.
Identity-bound raw metadata is not authenticated acceptance. English fallback,
missing Chinese, unavailable Chinese casting headers and book mismatch remain
unknown. An explicit CHM selection does not grant source authority.

Use `--inventory` instead of a sample/ID selection for full current retrieval.
It refuses `--sample`, `--ids` and `--variant` overrides, checks unique canonical
identities, and retrieves context in chunks of 100. Private `inventory.jsonl`
contains one compact record per identity, selected variant, language/identity
status and seeded field/family/role/count findings. Complete bodies and raw
provenance are omitted from this inventory; retrieve only the separately frozen
review IDs with `--ids`. `--frequency` can accompany either mode. Both modes
retain the 50 MiB output and readonly metadata checks.

Before reviewing a rollout batch, reconcile actual historical entry decisions
against unchanged input pairs. Prior sample membership alone is not review.
Keep accepted-but-unactivated targets in an `accepted-pending` partition and
exclude duplicate proposals. Record counts by book, action family and current
variant, then freeze the deterministic selection before reading semantics.
Keep newly reviewed and revisited IDs separate. An empty effective row never
uses its CHM body to fill the gap. English fallbacks remain missing language,
and SC observations retain their existing source-bound authority.

Local proposals retain the complete canonical mechanics and selected/effective
predecessor, raw prior ownership, separate exact text/HTML edits and a composed
after-body for multiple clauses sharing one original. HTML header markup can
make its exact edit differ from the text edit. Declare guarded insert/update
and dependencies on unactivated corrections. Proposal review/acceptance and a
separately scoped fixed writer are coordinator-owned follow-ups; retrieval does
not authorize application or expand an existing writer's target set.

The fixed seeds cover standard, move/move-equivalent, swift, immediate, free,
full-round/fullround and no-action phrases, plural forms and coordinated lists.
Accepted lexical aliases include immediate 直觉/即时/瞬间 and swift 迅捷/快捷/快速;
these are distinct families. Chinese mechanism/header lines use the existing
parser classification, with maneuver 发动时间/發動時間 headers also excluded
from body matching. English casting time
is inspected separately from body occurrences. Every occurrence retains its
line, offset, complete line context, count and heuristic activation/end/sustain
role. Roles are retrieval hints, not validated semantic alignment. No-action
phrases can denote cost, incapacity or an exception; context must settle this.

A missing action kind or lower occurrence count in the same field produces a
**candidate**, never a confirmed error. A lexical match produces **unknown**,
never a pass: unrelated paragraphs, conditions, negation and counts can still
differ. Evidence preserves full bodies for that review. Paragraphs are not paired
by ordinal position; translated paragraphs often merge or split. This tool does
not estimate recall, accept content, normalize terminology or apply corrections.

Add `--frequency` for a readonly inventory stream of English action-family and
Chinese literal action-label document frequencies, split into body/casting scopes.
Frequency selection always uses effective-row presence then CHM, independently
of an explicit `--variant chm` context scan; `frequency.json` records this choice.
Each phrase counts a spell once per scope; raw occurrence counts are separate.
Concordance retains at most two earliest-ID examples per phrase, truncated to
600 characters, in private output. Chinese literal labels are capped at Top 40.
Suffix discovery examines only 2–4 Chinese characters immediately before 动作,
requires document frequency at least two and caps output at Top 20. Known labels
and common boilerplate are filtered; remaining fragments still require review.
This bounded retrieval is not a terminology dictionary, semantic validation or
full-corpus context review. Labels sharing a final action noun may be undercounted.
The combined context/frequency output budget is 50 MiB; estimate input/resources
before a large scan. Report elapsed scan time separately from semantic-review cost.

Run `npm run -w data-tools action:qa:test` for synthetic omission, wrong-action,
header/body scope, repeated/unrelated paragraph, coordinated-list, synonym,
fallback, provenance and readonly SQLite regressions. It is included in the
portable data-tools gate. Bounded evaluations are recorded in the
[pilot report](../reports/action-qa-pilot.md) and
[held-out context/frequency report](../reports/action-qa-context-review.md).
The [first rollout report](../reports/action-qa-rollout.md) separates complete
retrieval from its finite contextual reviews and remaining queue.
The [finite remainder report](../reports/action-qa-remainder.md) records the
next nine candidates, bounded controls, unresolved fields and seed gaps.
Review decisions and
source excerpts belong in the private output directory; the public repo contains
only tool code, synthetic fixtures and aggregate reports.
