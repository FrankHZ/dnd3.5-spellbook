# Spell Compendium summary source QA, slice 15

[Issue #394](https://github.com/FrankHZ/dnd3.5-spellbook/issues/394) owns
`suggestedSummarySlices[14]` under [SC delivery #342](https://github.com/FrankHZ/dnd3.5-spellbook/issues/342).
The [source-free report](../../../data-tools/reports/dice-qa/books/86/summary-source-qa-15.json)
lists every existing key and disposition. Main-gate/#346 owns acceptance and integration.

## Scope and evidence

Frozen audit `e793ff09a38060c5c6b336d28690353bd0d96909` assigns exactly
50 targets / 67 existing rows (17 EN / 50 ZH). Canonical summary input remains
private `a9cbe07747b1bc908ff4ebcd24244e38e58cb411`. Public base
`d285533327c5990ab72d4d6814cba1c166cd43df` is synchronized with main
`0bb50eef9695afc7f6ee176a0f6a058209cbbd4d`. Verified actual turn metadata records `gpt-6.1-sol`, high effort.

Private handoff/helper commit `bc886da66298abda440d39aa7392a20d92a2e1fc` owns
`dice-qa/books/86/issue-394/`. It reuses [#353 provenance](./spell-compendium-summary-source-qa-01.md),
[#361 narrow importer](./spell-compendium-summary-source-qa-02.md), strengthened
[#379](./spell-compendium-summary-source-qa-09.md)/[#380](./spell-compendium-summary-source-qa-10.md)
contracts, and #386/#389 complete final-context bindings at the report's revisions.
Helper reuse does not confer semantic acceptance on another packet. All 67 full
current values and independent actual-value reasons remain private, along with
50 paired comparisons and complete original entry/parent spans.
Final context `0688739d92a2aa9fb3eceeb444daa7260e711058` binds all 100 assigned
name/body records from `dice-qa/books/86/issue-365/field-dispositions.jsonl`, including
actual text/HTML, origin and review. Historical #329/#335 inputs remain separately
frozen; the final candidate is context, while PDF/errata govern.

The proposal corrects 26 rows (9 EN / 17 ZH) across 19 targets and retains 41.
Demonstrated errors concern area recipients, conditional stunning, English number
grammar, ability versus skill checks, detection eligibility, sensory scope,
caster-level caps, rolled servant count, entanglement, checked barrier passage,
concealment versus cover, native guardian designation, gaze protection probability,
dazed terminology, limited damage eligibility, shadow rather than force-field
wording, exact inherited AC bonus, surprise-round applicability, nonintelligent
undead perception and forced-entry sealing. Accurate concise summaries stay
unchanged; missing rows remain outside scope.

All original SC entries and continuations were freshly read alongside full
accepted English/mechanical and final Chinese context. Thirty-four bounded pages
were reopened and visually inspected as original Poppler layouts. Direct PHB
parents cover Status, Sanctuary, Plane Shift, Unseen Servant with continuation,
Daylight with continuation, Interposing Hand, Floating Disk, Entangle, low-light
vision and grapple Grab/Hold/Pin. A limited Arcane Lock comparison includes its
page-break continuation. SC printing is December 2005 first printing.
Complete SC and PHB official errata were read: Sarcophagus header replacement,
Scramble Portal final-sentence deletion and Shadow Spray instantaneous duration
are bound. The latter retains explicit one-round daze. No inherited PHB parent
amendment changes these summary judgments. Unavailable DMG/MM and historical
external references remain unadjudicated; broad queues remain paused.

Existing `4120:entry-intent` remains separate source-only context: entrants must
save, while nonattackers are also said to be unaffected. The concise summary
does not resolve that interaction. `4153:omitted-time-source` preserves the absent
SC casting time and actual final-body note; historical mechanics do not establish
a default. Both current notes are verified unchanged. No new summary-relevant
unresolved question is introduced.

## Validation and handoff

`corrections.jsonl` is the only narrow authored handoff; the full
`summaries.proposed.jsonl` is derived review evidence. All other 6,546 canonical
lines and accepted #323 rows stay byte-preserved; accepted #353/#361 packets
stay unchanged. Other proposed slices are not composed here.

Verification binds full frozen rows, audit scope, locators, complete contexts,
source notes, errata and exact fresh PDF text/geometry, replaying
5,364 span references. Negative controls reject stale, missing, duplicate
or extra decisions, handoffs, source pages, locators and contexts; final text,
HTML, origin, review and cross-target substitutions are checked independently.
Full handoff rows equal decisions and mirror. Unicode, whitespace, placeholder
and repeated-prose checks pass without invented byte budgets or token syntax.

The maintained parser and real `importRows` consume only 26 corrections on a
tiny disposable summary-only SQLite DB seeded with 6,572 baseline rows. Dry-run
changes nothing; apply updates26/inserts0; repeat updates0/unchanged26. Every
persisted field and importer execution timestamp are compared, along with all
untouched rows and an unrelated sentinel. The temporary DB is removed; importer
CLI `main` is disabled to prevent environment-selected operator DB access.

Replay the fixed committed helper from public root and `data-tools`, with
absolute roots and distinct labels:

```powershell
& "$runtimeRoot/data-tools/pdf-extract/.venv/Scripts/python.exe" -X utf8 "$dataRoot/dice-qa/books/86/issue-394/reproduce.py" --code-root $codeRoot --runtime-root $runtimeRoot --private-revision bc886da66298abda440d39aa7392a20d92a2e1fc --run final-root
```

Replay requires helper text to match that revision, regenerates deterministic
inputs/context/decisions/handoff/mirror/paired comparisons, reopens PDFs and
executes the narrow importer. Caller cwd and exact public head are recorded.
Shared dependencies are reused without installs, links or large data copies.
Exact final public head, private proof revision and full remote `ci:portable`
results are supplied in PR delivery; green checks do not replace semantic review.

Canonical content, names/bodies/mechanics, operator DBs, app-state, private push
and production activation remain outside the write boundary. Main-gate reviews
and integrates accepted narrow rows.
