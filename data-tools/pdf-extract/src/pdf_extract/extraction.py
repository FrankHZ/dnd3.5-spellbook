"""Keep PyMuPDF text order and coordinates without interpreting source content."""

import json
import platform
from pathlib import Path

import pymupdf


# Exclude image bytes; retain the engine's dictionary text defaults, including
# ligatures, whitespace, and unknown Unicode handling. No sorting/dehyphenation.
TEXT_FLAGS = pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES


def extract_page(page: pymupdf.Page, source: dict) -> dict:
    """Return only text blocks, preserving their block/line/span sequence."""
    text = page.get_text("dict", flags=TEXT_FLAGS, sort=False)
    blocks = []
    for block in text["blocks"]:
        if block["type"] != 0:
            continue
        blocks.append({
            "number": block["number"],
            "bbox": block["bbox"],
            "lines": [{
                "bbox": line["bbox"],
                "wmode": line["wmode"],
                "dir": line["dir"],
                "spans": [{
                    key: span[key]
                    for key in ("text", "bbox", "origin", "font", "size", "flags")
                } for span in line["spans"]],
            } for line in block["lines"]],
        })

    # page.rect alone reflects /Rotate; text bboxes do not. Undo rotation to
    # obtain the visible crop boundary in the same frame as text coordinates.
    bounds = page.rect * page.derotation_matrix
    has_text = any(
        span["text"]
        for block in blocks
        for line in block["lines"]
        for span in line["spans"]
    )
    return {
        "source": source,
        "extractor": {
            "name": "PyMuPDF",
            "version": pymupdf.VersionBind,
            "mupdf_version": pymupdf.VersionFitz,
            "python_version": platform.python_version(),
        },
        "options": {
            "format": "dict",
            "flags": TEXT_FLAGS,
            "sort": False,
            "clip": None,
        },
        "page_index": page.number,
        "pdf_page_label": page.get_label() or None,
        "geometry": {
            "coordinate_system": "pymupdf-unrotated-crop-relative",
            "unit": "pt",
            "bounds": list(bounds),
            "width": bounds.width,
            "height": bounds.height,
            "rotation": page.rotation,
            "cropbox": list(page.cropbox),
            "mediabox": list(page.mediabox),
            "cropbox_position": list(page.cropbox_position),
        },
        "text_status": "extracted" if has_text else "no-extractable-text",
        "blocks": blocks,
    }


def extract_pdf(
    input_path: Path,
    output_path: Path,
    start_page_index: int,
    end_page_index: int,
) -> int:
    """Write one JSONL row per page in an explicit 0-based inclusive range.

    Validation precedes output creation. Exclusive creation protects existing
    files; a failed write/extraction removes only this invocation's new output.
    The caller must provide an existing output directory.
    """
    if start_page_index < 0 or end_page_index < start_page_index:
        raise ValueError("Require 0 <= start-page-index <= end-page-index (inclusive)")
    source_path = input_path.resolve(strict=True)
    destination = output_path.resolve()
    if source_path == destination:
        raise ValueError("Output must not be the input PDF")
    if destination.exists():
        raise FileExistsError(f"Output already exists: {destination}")

    metadata = source_path.stat()
    with pymupdf.open(source_path) as document:
        if not document.is_pdf:
            raise ValueError("Input must be a PDF")
        if document.needs_pass:
            raise ValueError("Password-protected PDF is not supported")
        if end_page_index >= document.page_count:
            raise ValueError(
                f"Page index {end_page_index} is outside {document.page_count} PDF pages"
            )
        source = {
            "path": str(source_path),
            "size_bytes": metadata.st_size,
            "mtime_ns": metadata.st_mtime_ns,
            "page_count": document.page_count,
        }
        # Opening is outside the cleanup block: never remove an existing file
        # if another writer wins the exclusive-creation race.
        output = destination.open("x", encoding="utf-8", newline="\n")
        try:
            with output:
                for page_index in range(start_page_index, end_page_index + 1):
                    row = extract_page(document[page_index], source)
                    output.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + "\n")
        except BaseException:
            destination.unlink()
            raise
    return end_page_index - start_page_index + 1
