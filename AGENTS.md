# Agent Guide

## Issue And Task Ownership

GitHub issues own feature intent, scope, acceptance, dependencies, and unresolved
choices. Git owns checkout state and history; PRs/checks own proposed changes,
validation evidence, and merge state. Repository docs describe durable behavior,
usage, and safety boundaries, not parallel plans or live status ledgers.

- The coordinating task opens an issue for a concrete feature, then one
  independent task linked to it. Do not create a new task for every small fix.
- Before dispatch, check that the scope can be delivered and reviewed independently.
  Split oversized work into child issues using feature-workflow; internal subagent
  assignments do not replace separately reviewable deliveries.
- Task prompts identify the issue, workspace/base, write boundaries, and the
  coordinating task's report destination. Read the issue, relevant code/tests,
  and only the technical references needed for the change.
- The task completes authorized implementation, targeted validation, commit,
  push, and a linked PR. Only an explicitly analysis-only assignment may finish
  with a preparation report instead. Report genuine blockers rather than
  silently stopping or overwriting another task's work.
- Send the coordinating task the issue/PR URLs, change summary, checks and
  results, and unresolved risks. Do not merge your own PR or declare your issue
  accepted. Address review findings and return for re-review.
- Main-gate describes that coordinating responsibility, not an agent profile.
  It reviews the actual diff, issue criteria, CI, and relevant behavior and
  authority boundaries; reports acceptance to the user; and coordinates remote
  merge/issue closeout when authorized. Routine internal steps do not need
  separate user approval; genuine scope and production decisions remain explicit.
- Optional bounded delegation specifies the outcome, edit/write boundary, and
  evidence needed. The task owner integrates the result. There are no required
  agent roles, model tiers, or role handoffs.

For scope changes and review, use [feature-workflow](docs/feature-workflow.md).
Do not require temporary Markdown plans or a plan-only commit before execution.

## Model And Reasoning Selection

Before dispatch, assess ambiguity, cross-module coupling, consequence of errors,
and the available checks. Choose the lightest capable model; do not default all
tasks to Astra/high or copy the coordinator's settings without assessment.
An explicit user choice takes precedence. Starting points, not fixed role pins:

- Luna with low/medium effort: mechanical edits, bounded lookup, or extraction
  with clear criteria and inexpensive verification.
- Sol with medium effort: ordinary implementation, focused fixes, and review
  with established contracts and meaningful tests.
- Astra with medium/high effort: ambiguous architecture, difficult cross-module
  diagnosis, or source/authority conflicts requiring substantial judgment.

Select reasoning effort separately from model capability. Use high/xhigh or
above for a concrete reasoning need, not merely a task label or large file count.
Raise effort or model capability when investigation or failed acceptance shows
a reasoning limitation; a tool outage, environment failure, or missing input
alone is not such evidence.

Carry forward the user's applicable model/version choice and authorization;
do not request the same choice again. Put the selected model, effort, and a brief
reason in the prompt, and pass the exact model ID and reasoning effort through
the dispatch or continuation tool when authorized and supported. Model versions
are distinct choices. Prompt text alone does not configure the running model.
If tool rules or host availability prevent applying the selection, disclose the
limitation before launching a substitute; do not silently inherit defaults.

After creation or continuation, verify the actual model/version and effort from
task/run metadata or read-only configuration before reporting the selected setup
as active. Prompt text and the task's self-report are not verification. If the
actual setup differs, correct it in the same task with explicit parameters and
preserve existing work. Record the verified settings with the issue's dispatch
evidence; if verification is unavailable, report that uncertainty. Do not add
role adapters, global defaults, or a model registry to enforce this guidance.

These are task-specific starting points; consult the current
[OpenAI model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection)
when reassessing them.

## Working Rules

- Prefer the smallest maintainable change and existing helpers over parallel
  mechanisms. Preserve unrelated and concurrent changes.
- Treat `main` as remote-managed: use a feature branch, push, open a PR, and let
  remote CI protect merges. Do not locally merge and push `main` unless asked.
- Before creating a branch or committing, read the corresponding repo-local
  [branch-naming](.agents/skills/branch-naming/SKILL.md) or
  [commit-message](.agents/skills/commit-message/SKILL.md) skill in this worktree.
- When editing a sibling worktree, use absolute paths and verify the target.
- Update the affected current topic doc when behavior or commands change.
  Check incoming links when moving/removing a document or command. Historical
  release records are evidence, not default startup reading or current scope.

## Data And Production Boundaries

- Source text, maintained patches/indexes, normalized import JSONL, and review
  decisions belong in the private data repo selected by root `.env`
  `DATA_REPO_PATH`. Logical `data/...` paths in manifests and provenance remain
  unchanged. Public code may contain schemas, validators, synthetic/redacted
  fixtures, and source-free reports. Never commit
  local DBs, raw sources, credentials, logs, or personal wrapper scripts here.
- `server/db/local/` contains operator-owned, ignored SQLite files. Do not
  replace, move, or write them without explicit authorization for a write-capable
  workflow. Content import must not mutate app-state. Keep root `.env` local;
  use `.env.example` for non-secret helper keys.
- Aim for faithful meaning, intuitive presentation and natural readability,
  not exact reproduction of an error-prone printed book. Choose sources and
  verification depth by field, reliability, consequence and cost; reuse already
  verified database content before reopening source QA. Original PDFs and errata
  guide rules and translation, but printing errors need not survive in output.
  Unreviewed CHM/dice/derived text remains reference material. Investigate concrete
  semantic discrepancies; do not invent mechanical corrections from intuition.
  Preserve source evidence separately from corrected or normalized presentation.
  Resumed dice QA uses the explicitly bounded DB-English workflow below.
- Use the least expensive sufficient method, not the theoretically exhaustive
  one. M/F/X may reuse printed list marks without rereading every spell body;
  the SC dagger uses verified database book membership instead of printed marks.
  Do not expand such tasks into full-text QA merely to chase perfect fidelity.
  See [source and quality tradeoffs](docs/feature-workflow.md#source-and-quality-tradeoffs).
- Preserve stable IDs, provenance, fingerprints, safe import order, and fallback
  for untouched or unaccepted content. Source-supported corrections still require
  accepted inputs and explicit write authorization; passing counts/tests or PR
  documentation edits do not authorize writes. For data/DB work, consult
  [db-content-workflow](docs/operations/db-content-workflow.md).
- Dice TXT is candidate input, not accepted content. Resumed dice Chinese QA
  uses the matched database English name/body and mechanics as its comparison
  baseline. Do not require PDF/errata collection, extraction or verification for
  this workflow. Correct or translate Chinese against complete aligned DB English;
  retain fallback and record specific gaps when English is missing or ambiguous.
  Preserve canonical English, mechanics and summaries unless separately accepted
  and authorized. Report DB-English QA accurately, without claiming original-book
  verification. Existing SC source-bound acceptance remains unchanged.
  Selective replacement must
  prove safe ordering: the existing CHM importer deletes all Chinese spell text.
- PHB PDF/MinerU/SRD extraction and translation remain suspended pending an
  explicit resumption decision. Preserve implementation, tests, and data; do not
  rerun queues or treat old residuals/PR #113 as accepted evidence. Suspension
  neither bypasses fingerprints nor makes PHB acceptance a dice prerequisite.
- Publication metadata comes from `data/rulebook-publications/publications.jsonl`,
  not rules-clean date fields or UI heuristics. Only accepted rows publish
  year/date/URL/image details. Preserve source URLs/ISBN evidence; rebuilding the
  maintained file with `--force` must be intentional.
- Production writes, deployment, and credential rotation require explicit
  authorization. Canonical deployment helpers live in `docs/deployment-scripts/`;
  root `.bat` files are personal wrappers. Use
  [deployment](docs/operations/deployment.md) for operational safeguards.
- Keep the private data repo and operator DBs outside removable public-code
  worktrees. Create worktrees manually without junctions or symlinks to those
  files; configure each worktree's ignored root `.env` to the private data path.

## Worktree Reuse And Cleanup

- Independent issues/tasks need separate topic branches and PRs, not a new
  checkout per issue. Main-gate must inspect `git worktree list` and assign an
  idle checkout before creating another. Create one only when existing checkouts
  are occupied or incompatible with the required work; record that reason in
  the issue. Size the pool for active concurrency, not completed batch count.
- Before reuse, confirm the previous owner has finished, its accepted changes
  are merged, and no task or process still uses the checkout or its outputs.
  Inspect tracked, untracked and ignored files. Preserve unmerged work and
  required evidence; do not use blind `reset --hard` or `clean` to make it idle.
  Fetch remote `main`, create the next issue's branch from that base in the
  existing checkout, and verify its root, local configuration and dependencies.
- Return completed checkouts to the reusable pool. Retain dependency installs
  when compatible; do not install another full environment or copy full test
  databases for each batch by default. Keep shared runtime and accepted rehearsal
  outputs while consumers depend on them, with ownership recorded in the issue.
- Remove surplus inactive worktrees after checking merge state, ignored outputs,
  nested repositories and link targets. Verify absolute cleanup paths and use
  `git worktree remove`; never traverse links into independent data or operator
  databases. Durable sources/evidence belong in the configured data repo, and
  progress/ownership stay in GitHub rather than a second worktree registry.

## Validation And Conditional References

Run the smallest checks that prove the changed behavior; record results in the
PR. Full remote `ci:portable` remains the merge gate. Use it locally only for
merge-readiness spot checks or CI debugging, not every editorial change.

- Docs: changed links, command existence, authority preservation, and diff checks.
- Shared DTOs: build `contracts` before validating `server` or `web` consumers.
- UI copy: `npm run i18n:sync` and `npm run i18n:check`; see [i18n](docs/i18n.md).
- Frontend behavior/layout: affected tests/build plus browser smoke.
- Data/parser/import changes: affected portable harness; use local-data acceptance
  only when the task needs local sources and respects the write boundary.

Use the affected workspace README for setup and commands: `server/`, `web/`,
`contracts/`, `data-tools/`, or `review-console/`. Package scripts are executable
command truth. [features](docs/features.md) maps user-facing entry points;
[harness](docs/harness.md) explains test boundaries. Neither is mandatory
cover-to-cover reading.

Preserve these package boundaries when working in their areas:

- Server imports use `#server/*` and generated `#prisma-*/*` aliases. Use server
  npm scripts/source conditions for local TS and built imports for production;
  see `server/README.md`. Regenerate Prisma clients for schema changes.
- Data tooling belongs in `data-tools/`, not API runtime code. Classify maintained
  commands in `data-tools/scripts.manifest.json`; keep portable tests independent
  of private corpus/local DBs.
- Review-console Node code imports only `data-tools/phb-review`; browser code
  may import its types, not runtime/deep `data-tools/src/` paths.
