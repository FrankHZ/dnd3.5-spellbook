# PHB Review Console

Private localhost shell for PHB review. The PDF extraction/review track is
suspended; these commands apply only to explicitly resumed work. Read the
[resumption safeguards](../docs/releases/v1.4/phb-source-and-errata-plan.md#paused-workflow-execution-safeguards)
before using real sources or queues. Dice work does not require this console;
it is not part of the public app.

## Commands

Install dependencies from the repository root. From this directory, use the
commands defined in [package.json](./package.json):

| Task | Command |
| --- | --- |
| Develop with Vite | `npm run dev` |
| Build the browser shell | `npm run build` |
| Preview after building | `npm run start` |
| Typecheck | `npm run typecheck` |
| Run tests | `npm run test` |
| Explicit read-only real-data smoke | `npm run smoke:local` |

Launch, typecheck, and test scripts build the `data-tools/phb-review` public
entry before consuming it. The real-data smoke requires the nested data repo
and pinned PHB sources; it checks token handoff, layout detail, PDF byte ranges,
and either current English detail or the expected `stale-queue` response. It
never submits a decision. Documentation-only edits need link, command, and
diff checks, not a source run.

## Runtime And Decision Boundary

The launcher binds literal `127.0.0.1`, default port `4174`; use a numeric
`PHB_REVIEW_PORT` to override it. The Node API imports only `data-tools/phb-review`.
Source PDFs are selected through verified source ids; requests and responses
never accept or expose filesystem paths.

Every API request requires the process-local `x-phb-review-token`; mutations
also require an exact same-origin `Origin`. There are no CORS headers. The
launcher injects the token into a `phb-review-token` HTML meta tag at runtime,
never into build output, URLs, or logs.

The browser displays evidence and submits explicit decisions. It does not
choose candidates, eligible targets, fingerprints, source authority, or terminal
validity. The service rebuilds candidates, verifies evidence and review-state
fingerprints, validates the queue, and atomically writes only the selected
nested-data decision file (`full-mineru-layout-review.jsonl` or
`full-row-review.jsonl`). Stale responses preserve drafts and refresh evidence;
they do not overwrite newer decisions.

A layout save invalidates English review until the canonical chain reruns from
`phb:source:extract`. For English-only decision batches, rerun
`phb:source:compare` before `phb:source:report`. The English queue requires the
code-owned `official-srd-default-v1` authority reference. Pre-authority queues
fail closed; the legacy adjudicator cannot make them current by rerunning.
Do not treat these command names as proof that suspended/unmerged authority
work has been accepted. A console save is a decision-file edit, never Gate 2
acceptance or permission to write runtime DBs.
