# Spell Compendium inherited errata correction

[Issue 270](https://github.com/FrankHZ/dnd3.5-spellbook/issues/270), under
[issue 263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263), corrects an
errata-reading error in the frozen [issue-264 checklist](spell-compendium-residual-routing-report.md).
Its generator recorded positive searches but described both inherited topics
as lacking dedicated matching headings. Fresh reading distinguishes the two
topics and replaces the complete private Chinese checklist.

## Current transfer entry

Use `data/dice-qa/books/86/issue-270/dnd-review-checklist.zh-CN.md` in the sole
private data repository. It supersedes the issue-264 checklist; users do not
need to combine documents or patch the old checklist themselves. It has not
been sent externally. The old frozen files remain unchanged for audit.

All 34 historical question IDs appear exactly once in
`question-dispositions.jsonl`: 33 remain awaiting answers and one has an
official errata disposition. The complete replacement contains those 33
questions plus the resolved item's history and evidence. The 32 other question
sections are unchanged; 4215 changes only its errata-search explanation.

4709's single inherited example issue is removed from the unanswered list.
The applicable PHB errata has a dedicated Spell Turning correction for PH282.
The source and correction apply to the inherited example, so the checklist
does not continue asking an external reviewer to resolve that corrected example.
This does not accept Holy Star's complete Chinese text or establish that every
SC rule is correct.

4215 remains unresolved. The Polymorph substring search finds material for
Baleful Polymorph and Polymorph Any Object, with different scope. Reading the
complete three-page errata does not supply a dedicated correction resolving
the Spider Shapes reference/comparison question. Positive substring hits,
dedicated headings and applicable corrections are separate evidence.

## Exact evidence and review entry points

- Public base: `7bf1ee11c109f8ef70e4bee47108da325813434f`.
- Private base: `a05a226f5f4e21982195cf67f365ff5f55644f47`.
- Frozen issue-264 input: `3ccda19e2e5e483696cf305374fc9343703525af`.
- Private local delivery: `c6cc9a8d6b887ffaffbdcd1ecec08b3444e3ced2`.
- Private write scope: only `dice-qa/books/86/issue-270/` inside
  `G:/Codes-personal/dnd3.5-spellbook/data`; no private push.

The private README gives complete reproduction commands. Start with the new
checklist's resolved appendix, then `decisions.json`,
`official-source-evidence.jsonl` and `search-results.json`. Original text,
Chinese questions, exact spans/coordinates and human applicability decisions
stay private. This public report contains no source excerpts.

Applicable originals were reread: PHB v3.5 July 2003 first printing (scanned
copyright page), PH282–283, PH263, SC December 2005 first printing (copyright
page), SC115 and SC201; the complete PHB errata dated February 17, 2006, and
complete local single-page SC errata. The scanned PHB copyright page has no
extractable text; its printing was read visually. These are local original-PDF
checks, not assumptions about later printings or a new corpus extraction queue.

`residuals.jsonl` retains all 180 frozen inventory rows and their existing
consumer associations. Only the two specified rows change; 4709 keeps its old
question as historical evidence. The 179 remaining rows describe that frozen
inventory after this one correction, not a refreshed acceptance total across
later Chinese slices. Frozen whole-field statuses are not rewritten.

## Validation and limits

The targeted private verifier passed:

- Exact 34-to-34 question mapping, 33 pending / one official disposition;
  32 question sections unchanged and 4215's explanation-only difference.
- All 180 frozen inventory rows preserved; 178 rows identical, changes confined
  to the two specified rows and permitted evidence/disposition fields.
- All 1,991 fresh source spans/coordinates and 11 complete page texts matched
  the original PDFs. Seven generated outputs reproduced byte for byte.
- The known positive Spell Turning search cannot be rendered as a negative;
  deliberately false search data is rejected against actual original spans.
- Both Polymorph hit contexts and their scope were checked separately from
  the Spell Turning correction. Eleven relevant pages were rendered with
  Poppler and visually read, including the scanned printing page.
- Frozen issue-259/264/265/268 directories and all paths outside issue-270
  were unchanged from the accepted private base. Public links, command paths,
  source-free boundaries and `git diff --check` passed.

Remote `ci:portable` remains the merge gate. Main-gate independently reviews
the exact public/private heads and original evidence; this implementing task
does not merge or self-accept. The private README records the local renderer's
font/color-profile warnings; relevant pages remained readable and direct span
comparison passed.

No DB access, shared-manifest change, accepted/fallback change, English,
mechanics or ID mutation, full Holy Star Chinese acceptance, whole-book QA,
PHB queue resumption, production writer, deployment or activation is included.
Later authorized content changes retain the
[DB content workflow](../../operations/db-content-workflow.md) and
[feature workflow](../../feature-workflow.md) boundaries.
