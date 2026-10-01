# Spell Compendium Aiming and Engine Name Review Handoff

Issue [#294](https://github.com/FrankHZ/dnd3.5-spellbook/issues/294), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
Two independent name candidates for targets 3822 and 4204 are preserved for
future review. Final acceptance is blocked by unavailable historical evidence.
This report contains no source text, translations or PDF spans.

## Evidence boundary

The original public base was `6b9c987de52fcd3bf330ff9a6b1918c52461edae`;
the original private binding remains `9961ecc838be14d540c20d5b4971273d48c61f18`.
The independent worktree now incorporates public path-configuration commit
`d63a0a9a48aa70320f63fbe991d2a42c54bbbaa3` and uses the external data root.
The new private baseline `47a23f9b36b4b827ebf14d7d05f3e564465c6fd5`
preserves surviving files. It does not restore or authenticate the old history.

The recovered old HEAD commit exists, but its root tree
`d050647ade06330728864210ac5787f0ab708db5` is unavailable. Actual lookups
for eight required paths at that revision fail: the #292 native/independent
union, the two #259 prior reviews, #270 residuals/questions, #280 body records,
and #259 formal fallback. Therefore the final rerun cannot prove those exact
historical inputs or unchanged frozen directories. No Git objects were fabricated,
old bindings substituted, or evidence requirements lowered.

The local-only handoff resides in `G:/spell-book/data/dice-qa/books/86/issue-294/`.
Its README identifies evidence files, remaining requirements and obsolete helper
paths. `handoff-verification.json` records the actual missing-object/path checks
and direct surviving-file comparisons. `retained-body-context.json` preserves
surviving body/question relationships while explicitly distinguishing them
from evidence authenticated at the missing old revision.

## Preserved findings

SC pages 8 and 198, their complete cross-column entries, the December 2005
first-printing v3.5 credits page and entire local official errata were inspected
before the incident. Four rendered pages and maintained extraction/verifier
records survive. No target-specific errata amendment was found in that checked
printing. Other printings are not certified. The candidates retain aiming and
engine imagery without adding attack/accuracy, absorption or expended-slot
recovery rules. They are project translation proposals, not official terminology.

3822's complete historical body remains deferred. 4204's surviving accepted
body and unresolved-source annotation match the complete surviving #280 record.
Name/body lexical differences are recorded without silently changing either body.
The current #292 surviving files contain 658 native and 145 independent fields:
112 independent bodies and 33 names, totaling 803. Direct comparison verifies
that the candidate union preserves the old byte prefix and appends only the
two names. The 805-field union remains a candidate, not an accepted increment.
33 unanswered source questions plus one official resolution remain unchanged.

## Verification and resumption

The preserved `reproduction-run-01.json` records nine commands exiting 0 before
the incident, with public execution `6b9c987de52fcd3bf330ff9a6b1918c52461edae`
and private execution `9961ecc838be14d540c20d5b4971273d48c61f18`. It includes
the existing 315-patch all-table check with 56 unchanged tables, content generation
provenance, readonly inputs, maintained full-union formal QA, six input rejection
cases, PDF checks of four pages/558 spans with six rejections, four aggregate
rejections and `dice:qa:test`. The recorded native fallback is 1346, candidate
projection 1199 and universe 2004. These are original run results, not a new
formal rerun or completed acceptance after migration.

The original helpers were uncommitted at that run and later body-context edits
were not executed. Their fixed old paths/layout assumptions must be corrected
before resumption. Final committed-helper reproduction and exact source bindings
remain incomplete. Current handoff checks verify the surviving 803-field count,
candidate byte prefix, complete 4204 body/issues and byte equality of six evidence
files with the incident backup; these checks do not replace the missing historical
verification. Remote `ci:portable` and an implementation PR are not claimed.

Resumption requires either the genuine missing historical evidence or an explicit
main-gate/user decision on a new evidence contract. This slice does not expand
into history reconstruction. Private data was not pushed; operator DBs, app-state,
shared manifests, source authority, fallback and production remain untouched.
No deployment, activation or suspended-source queue was run. The implementing
task stops writing after this handoff so main-gate can preserve it and safely
retire the C-drive worktree. Issue #294 remains unresolved.
