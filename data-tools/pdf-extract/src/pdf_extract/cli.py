"""Native Python CLI; no default whole-document extraction."""

import argparse
import sys
from pathlib import Path

from .extraction import extract_pdf


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Extract PDF text/geometry facts for an explicit 0-based closed page range."
    )
    parser.add_argument("--input", required=True, type=Path, help="Read-only source PDF")
    parser.add_argument("--output", required=True, type=Path, help="New UTF-8 JSONL file; parent must exist")
    parser.add_argument("--start-page-index", required=True, type=int, help="0-based first PDF page index")
    parser.add_argument("--end-page-index", required=True, type=int, help="0-based last PDF page index (inclusive)")
    arguments = parser.parse_args(argv)
    try:
        count = extract_pdf(
            arguments.input,
            arguments.output,
            arguments.start_page_index,
            arguments.end_page_index,
        )
    except Exception as error:
        print(f"dnd-pdf-extract: {error}", file=sys.stderr)
        return 1
    print(f"Extracted {count} PDF page(s) to {arguments.output}")
    return 0
