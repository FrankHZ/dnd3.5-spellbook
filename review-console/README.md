# PHB Review Console

Private localhost-only shell for the PHB Gate 2 review service. It is not part
of the public web app or production server.

The React consumer presents the current MinerU layout and English residual
queues as a dense review workspace. Queue/status/kind/category filters and
stable previous/next navigation sit beside an actual PDF.js-rendered PHB page,
independent MinerU/PDF.js/target overlays, joined PHB/SRD/DB evidence, and an
explicit decision form. The browser owns only display, navigation, filters,
draft form values, and stale-response recovery; the API remains authoritative
for candidates, eligible targets, fingerprints, validation, and writes.
The active queue and stable item id are reflected in the URL so a local review
position can be refreshed or shared without depending on queue ordinals.
The loaded PDF document is reused while navigating within a source. Queue,
item, and selection-changing filter navigation warns before discarding an
unsaved decision draft, and browser unload receives the same protection.
During a page transition, old canvas pixels and overlays stay covered until
the current render request completes; stale render completions are ignored.

From this directory, run `npm run dev` for the Vite-backed local shell, or run
`npm run build` followed by `npm run start` for a production-like local smoke.
Set `PHB_REVIEW_PORT` to a numeric port when the default `4174` is unavailable.
The launcher always binds the literal `127.0.0.1` address.

The Node API imports only `data-tools/phb-review`. The data-tools build runs
before launch, typecheck, and tests so its public Node package entry exists in
a clean workspace. Source PDFs are selected only through verified source ids;
the API never accepts or returns a filesystem path.

All API requests require the per-process `x-phb-review-token`; mutating calls
also require an exact same-origin `Origin` header. The API emits no CORS
headers. The launcher injects the token into a `phb-review-token` HTML meta tag
at runtime for the same-origin client. It is never written to the built files,
a URL, or console output.

Saving a layout decision unloads the English queue until the canonical full
chain is current again. A stale decision response refreshes the displayed
evidence while preserving unsaved note, decision, and target fields.
The English queue also requires the current code-owned source-authority policy
reference; pre-authority snapshots are unavailable and reject decision writes.
Every save remains a decision-file edit; it is not Gate 2 acceptance.

Validate with:

```text
npm run typecheck
npm run test
npm run build
```

With the nested data repo and pinned PHB source available, run the read-only
real-data API/PDF acceptance smoke with `npm run smoke:local`. It starts an
ephemeral loopback server, checks layout detail and a verified PDF byte range,
then checks either current English detail or the expected structured
`stale-queue` response while the authority gate is closed. It never submits a
decision.
