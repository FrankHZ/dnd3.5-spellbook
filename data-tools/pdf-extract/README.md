# PDF Extract

Independent Python subproject for explicit-page, read-only PDF text extraction.
It belongs to data-tools and emits extraction facts for later book-specific QA.
It does not parse spells, decide English corrections, apply errata, or import DBs.
The PHB/MinerU/SRD workflow and its review console remain suspended and separate.

## Environment And Tests

Supported Python: **3.13**. Runtime dependency: **PyMuPDF 1.28.2**, pinned in
[pyproject.toml](./pyproject.toml). Use an isolated environment; npm installation
does not install Python or this package. From the repository root on Windows:

```powershell
python --version # Must be Python 3.13
python -m venv data-tools/pdf-extract/.venv
$pdfPython = './data-tools/pdf-extract/.venv/Scripts/python.exe'
& $pdfPython -m pip install ./data-tools/pdf-extract
& $pdfPython -m unittest discover -s data-tools/pdf-extract/tests -v
& $pdfPython -m pdf_extract --help
```

On Linux/macOS, create the environment with `python3.13 -m venv
data-tools/pdf-extract/.venv` and invoke `data-tools/pdf-extract/.venv/bin/python`
for the same pip, unittest, and module commands. Reinstall the package after
source changes, or use `pip install -e ./data-tools/pdf-extract` for development.
The installed console command is `dnd-pdf-extract`; the module entry is equivalent.

Tests create temporary synthetic PDFs, including image-only, deliberately
misordered columns, Unicode, and rotated/cropped pages. They require no private
corpus or DB. GitHub CI installs this package and runs the Python tests in
addition to the unchanged npm `ci:portable` gate.

## Extract An Explicit Page Range

Real-source operations require an authorized book, page scope, and private output
location. The following command illustrates extraction after those are selected:

```powershell
& $pdfPython -m pdf_extract `
  --input 'D:/private/source.pdf' `
  --output 'D:/private/new-run/pages.jsonl' `
  --start-page-index 10 `
  --end-page-index 11
```

Both indices are mandatory **0-based physical PDF page indices**, with an
**inclusive** end: this selects exactly two pages. There is no default whole-book
run. An index is not a printed page number. `pdf_page_label` is the optional label
stored in the PDF, not an inferred identity or validated printed page number.

The source is opened read-only. The output directory must already exist; the
output file must be new. The command rejects input/output equality, an existing
output, invalid/out-of-range indices, non-PDF inputs, and PDFs needing a password.
Errors return nonzero. Validation precedes output creation; if extraction or
writing fails, the command removes its newly created partial file. No source file
is saved, and no existing artifact is replaced.

## JSONL Contract

Each selected page produces one UTF-8 JSON object followed by LF, in ascending
selected page-index order. The page contains:

| Field | Meaning |
| --- | --- |
| `source` | Resolved source path, byte size, modification time in nanoseconds, and document page count |
| `extractor` | PyMuPDF, MuPDF, and Python versions |
| `options` | `dict` format, numeric engine flags, `sort: false`, and `clip: null` (engine default visible-page clipping) |
| `page_index`, `pdf_page_label` | Physical 0-based index and optional native PDF label |
| `geometry` | Coordinate convention, same-frame bounds/width/height, rotation, native cropbox/mediabox metadata, and cropbox offset |
| `text_status` | `extracted` if any returned span has text, otherwise `no-extractable-text` |
| `blocks` | Engine-ordered text blocks with number/bbox, ordered lines with bbox/writing-mode/direction, and spans with text/bbox/origin/font/size/flags |

Image bytes, vectors, character-level records, and redundant page-level full text
are omitted. An image-only page can have `blocks: []` and
`text_status: "no-extractable-text"`; this does **not** establish a blank page or
complete source recall. There is no OCR.

Text is emitted as returned by the pinned engine. The flags are `TEXTFLAGS_DICT`
with `TEXT_PRESERVE_IMAGES` disabled; this keeps its text defaults, including
ligature and whitespace preservation. The tool does not sort columns, remove
headers, merge pages, dehyphenate, normalize Unicode, repair encoding, or infer
table cells. The engine's order may differ from human reading order, and its
Unicode mapping may itself be incomplete. Spans and font flags are evidence, not
accepted spell headers or mechanics.

### Coordinates

Text bboxes and origins use **PyMuPDF's unrotated, crop-relative page coordinates**:
points (1/72 inch), top-left origin, x right, y down. Line `dir` is the engine's
direction vector. `geometry.bounds` is `page.rect * page.derotation_matrix`, so it
shares this text frame; its width/height do not swap with page rotation.

`cropbox`, `mediabox`, and `cropbox_position` retain PyMuPDF's native box metadata.
Their offsets must not be mistaken for text origins. For example, cropping a
600-by-800 page to `[100,150,500,700]` gives text-frame bounds `[0,0,400,550]`.
An original text origin `[120,180]` becomes `[20,30]`. With 90-degree rotation,
the displayed page is 550-by-400, but the text frame remains 400-by-550. Consumers
displaying the original page may use PyMuPDF's `page.rotation_matrix` to map text
coordinates to the rotated view; no new coordinate framework is provided here.
The synthetic test verifies that mapping as well as the nonzero crop offset.

See the upstream [page coordinates](https://pymupdf.readthedocs.io/en/latest/page.html)
and [TextPage structure](https://pymupdf.readthedocs.io/en/latest/textpage.html).

## Private Data And Acceptance

Raw PDFs, source text, extracted JSONL, and page images remain private under the
operator's nested `data/` repo. Use a separately authorized, new ignored
`data/artifacts/` output directory; durable experiment handoffs also belong in
that private repo. Do not commit real source output, logs, environments, or
credentials to this public project. Public tests and examples use synthetic text.

Source metadata is a locator for reproducing this extraction, not a substitute
for accepted source identity, fingerprint, freshness, or review decisions. These
JSONL rows do not enter the PHB interfaces, dice accepted exports, or runtime
DBs. Future use as accepted evidence must follow the existing source verification
and acceptance workflow. Extraction and small visual samples cannot certify a
whole book, resolve edition/errata conflicts, or authorize DB/production writes.

## Supplemental Review Verification

Book-specific private evidence can additionally be checked against fresh PDF
extraction and the current scoped field decisions:

```powershell
& $pdfPython -m pdf_extract.verify_evidence `
  --evidence 'D:/private/book/pdf-evidence.json' `
  --decisions 'D:/private/book/decisions.jsonl' `
  --source 'book=D:/private/source.pdf' `
  --source 'errata=D:/private/errata.pdf'
```

The schema-1 evidence object has `pages` and `bindings`. Each page records an
explicit `sourceId`, `pageIndex`, `pageCount`, extraction `extractor`, `options`,
`geometry`, and selected `spans`. A span has zero-based block/line/span array
indices plus its exact extracted `value` (including text, bbox, origin, font,
size, and flags). Each binding records `sourceKey`, `targetId`, `field`, `status`,
exact `effectiveText`, semantic `reason`, `visualReview`, and `pages` with source
IDs, indices, and `spanRefs` pointing to the persisted spans. Persist only the
source fragments actually needed for the authorized review in the private repo.

Verification reopens caller-supplied PDFs, compares engine/options/geometry and
every saved span, then binds accepted replacement text or deferred baseline text
to the current decision. It rejects stale field text/status/identity, altered
fragments or layout, and missing page/span associations. It prints source-free
counts and writes nothing. Reinstall the Python package after code changes.

This check supplements the existing dice DB alignment, source freshness,
correction and full-body audit checks. It does not establish source authority,
prove a human visual review occurred, decide semantics, or certify unsampled
content. Record publication/version applicability, observed printed page numbers,
full-context visual findings, and unresolved source contradictions in the
book-specific review as well.

The [book86 issue #257 report](../reports/dice-qa/books/86/pdf-qa.json) records a scoped
review proposal and its precise private evidence commit. It contains source-free
selection, dispositions and validation results; it does not authorize import or
certify unsampled entries.
