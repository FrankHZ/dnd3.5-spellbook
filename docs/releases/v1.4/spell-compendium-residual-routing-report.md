# Spell Compendium residual routing

This source-free handoff for [issue 264](https://github.com/FrankHZ/dnd3.5-spellbook/issues/264)
classifies the existing residual evidence for [parent issue 263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263)
and delivers a Chinese checklist that the user can pass to the DND document
project. The checklist has not been sent externally. Main-gate owns review and
acceptance; this report does not accept content or adjudicate source rules.

## Exact evidence and coverage

- Public base: `7a0344c69a6260c7b911d0e04994fa5a6a80d44b`.
- Private base: `7777cb7016ecb115acc7426c25759528593215f9`.
- Private local delivery: `3ccda19e2e5e483696cf305374fc9343703525af`.
- Private directory: `data/dice-qa/books/86/issue-264/` in the sole nested data
  repository. It is committed locally and must not be pushed or copied into this
  public repository.

The frozen [issue-259 review](spell-compendium-qa-report.md) has 1,001 original
entries, 1,002 DB targets, 724 candidate occurrences, 1,448 candidate fields and
2,004 fallback fields. Each remains a separate denominator.

| Frozen unresolved consumer | Target count |
| --- | ---: |
| English text/HTML | 16 |
| Mechanics/relationships | 36 |
| Chinese name | 13 |
| Chinese body | 116 |

These 181 consumer/target pairs cover 152 distinct targets. All have routing.
Canonical records also attach specific unresolved questions to five other
targets whose consumer status is corrected or source-correct. Those questions
remain associated without changing the frozen statuses. The combined canonical
problem universe therefore contains 157 targets and 176 problem observations.
Extra DB target 4837 and 13 null candidate occurrences retain their separate
identity/source boundaries; they do not enlarge the original-entry denominator.

| Routing category | Problem rows |
| --- | ---: |
| Confirmed source conflicts | 15 |
| Interpretation questions | 14 |
| Specific missing explanations in the source | 5 |
| Missing applicable source evidence | 116 |
| Identity or mapping decisions | 23 |
| Translation-name or terminology evidence | 7 |
| Total | 180 |

The rows cover 158 existing target IDs and 13 null occurrences. A target may
have several concrete problems; several consumers or review outlets may refer
to the same problem. Neither row counts nor consumer sums are spell counts.
The 34 source-review questions cover 32 targets, including all twelve issue
entry points. A missing book/page or historical rule is not classified as an
original textual contradiction. Apparent tensions that admit an interpretation
remain questions rather than proven conflicts.

## Private deliverables and reproduction

`dnd-review-checklist.zh-CN.md` is the user-transferable document. Each question
gives the English identity, applicable printing, page/field locations, opposing
statements or readings, Chinese and rules impact, applicable errata status, a
specific question, retained disposition and reply/evidence slots. Two positions
on the same page remain distinct; missing second-page evidence is not invented.
Replies must distinguish official errata, a particular printing, expert
interpretation and a project decision.

`residuals.jsonl` and `residual-routing.md` associate concrete fields and
consumers with the categories above. `observation-routing.jsonl` preserves 286
old evidence associations: all canonical questions, the four independent
pending-evidence outlets, three historical-disposition files, null identities,
the prior conflict review and 4837. Full original excerpts, exact spans and
Chinese questions stay private in `source-evidence.jsonl` and the checklist.
`coverage.json` and `verification.json` contain the bounded check results.

Use the private README's dependency setup, then run from the main checkout,
passing this feature worktree as the public root:

```powershell
python -X utf8 data/dice-qa/books/86/issue-264/read_sources.py
python -X utf8 data/dice-qa/books/86/issue-264/build.py
python -X utf8 data/dice-qa/books/86/issue-264/verify.py --public-root 'C:/Users/Hongzhou Fang/.codex/worktrees/sc-source-residuals/dnd3.5-spellbook'
```

Verification passed for exact frozen consumer sets, every existing canonical
problem, independent pending claims, historical deferrals and identity records.
It checked 3,151 fresh source spans and coordinates and directly reproduced all
six generated outputs byte for byte. Seven old locator-gap rows, containing ten
previously unmatched fragments, matched the newly read existing locators after
whitespace joining. Fourteen original SC pages for the twelve entry points were
rendered with Poppler and visually checked. Link targets and `git diff --check`
passed. Remote `ci:portable` remains the merge gate; an editorial report does
not require a full local suite or a new maintained data command.

## Follow-up boundaries

[Issue 265](https://github.com/FrankHZ/dnd3.5-spellbook/issues/265) remains the
separate first Chinese-and-note slice for 3544, 4336, 4443 and 4735 after #264
acceptance. The private routing file suggests subsequent batches by components,
distance/target rules, inherited references/examples, and duration or omitted
explanations. Historical levels and expanded old rules should be grouped by
their actual source dependency; unknown source identities need location work
first. Identity and mapping cases coordinate with
[issue 197](https://github.com/FrankHZ/dnd3.5-spellbook/issues/197).

For missing-source records, first establish the actual consumed numeric or
operative rule. Bare named references do not require certifying whole external
books. Existing unresolved statuses remain intact during this inventory; source
absence does not authorize deleting relationships, historical sections or notes.

All issue-259 artifacts, accepted/fallback exports, IDs, canonical English,
mechanics and existing proposals remain unchanged. This work does not implement
#265, rerun whole-book QA, access operator DBs, update shared manifests, resume
PHB queues, deploy, or activate content. Later authorized content work follows
[DB content workflow](../../operations/db-content-workflow.md), and independent
acceptance follows [feature workflow](../../feature-workflow.md).
