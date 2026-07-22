# PHB Review Console Module

## Role

`review-console/` is a private localhost-only workspace for reviewing current
PHB MinerU layout decisions and English Gate 2 residual exceptions. It is not
part of the public `web`, production `server`, or deployment build.

## Boundaries

- The Node launcher binds only `127.0.0.1` and serves the API and Vite/static
  shell from one origin.
- The API imports the Node runtime only through `data-tools/phb-review`.
  Browser code may import its DTOs with `import type`, but cannot import the
  service runtime or deep paths under `data-tools/src/`.
- `data-tools` owns candidate assembly, fingerprints, freshness, validation,
  full-queue merge rules, and atomic decision writes. The console does not
  reproduce those rules.
- The only write targets are the current MinerU layout and full-row review
  JSONL files in the nested `data/` repo. The console cannot write SQLite,
  manifests, source/extraction files, reports, or production state.
- Source PDFs are selected by verified source ID. The API receives a stream
  handle and never accepts or returns a filesystem path.

Every API request requires the process-local `x-phb-review-token`. The launcher
injects it into the local HTML at runtime without writing it to built files,
URLs, or logs. Mutating requests additionally require an exact same-origin
`Origin`; CORS is not enabled.

## Freshness

A layout decision immediately makes the English queue stale. Reopen it only
after the canonical chain starts at `phb:source:extract` and completes compare,
SRD adjudication, and SRD apply.

English residual decisions may be completed as one review batch while their
evidence fingerprints remain current. The decision JSONL intentionally makes
the row-review manifest stale; after the final residual decision, run
`phb:source:compare` to preserve terminal decisions and refresh that manifest
before `phb:source:report`.

Queue summaries and decision responses expose `canonicalRerunRequired` derived
from those current manifests. It remains `phb:source:extract` or
`phb:source:compare` across reloads and no-op submissions until the canonical
command refreshes the corresponding manifest.

## Browser Consumer

- Queue filters and previous/next navigation operate only on server-returned
  list items and preserve source order.
- PDF.js renders the verified source URL through the same token-protected
  origin. MinerU blocks, PDF.js items, and selected/eligible targets are
  independent display overlays; their geometry comes from item detail DTOs.
- Layout forms expose only server-returned eligible blocks or page anchors.
  English forms expose the server-returned allowed actions and joined
  PHB/SRD/DB evidence.
- Submission stays disabled until the visible decision, reviewer, note, and
  required target fields are present. The API still revalidates every value.
- A stale decision loads the API's current evidence while preserving draft
  form state. An unavailable English queue unloads list/detail state rather
  than leaving cached residual evidence visible.
- The responsive layout keeps the dense queue/PDF/evidence workspace on
  desktop and stacks the same surfaces at narrow widths. It is not treated as
  a general mobile product.

## Validation

```bash
npm run typecheck:review-console
npm run test:review-console
npm run build:review-console
npm run -w phb-review-console smoke:local
```

The root portable gates use synthetic fixtures. `smoke:local` is the explicit
read-only real-data API/PDF acceptance command.

## Related Docs

- [../../review-console/README.md](../../review-console/README.md)
- [../releases/v1.4/phb-pdf-review-console-plan.md](../releases/v1.4/phb-pdf-review-console-plan.md)
- [../operations/import-workflow.md](../operations/import-workflow.md)
- [data-tools.md](./data-tools.md)
