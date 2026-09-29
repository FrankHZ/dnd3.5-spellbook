"""Portable synthetic PDF contract tests; never read private sources or DBs."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from pdf_extract.extraction import extract_pdf, extract_page


def span_texts(row):
    return [
        span["text"]
        for block in row["blocks"]
        for line in block["lines"]
        for span in line["spans"]
    ]


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "synthetic.pdf"
        self.output = self.root / "pages.jsonl"
        with pymupdf.open() as document:
            page = document.new_page(width=600, height=800)
            # Image-only content is not a blank page, despite having no text.
            image = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 10, 10), False)
            image.clear_with(80)
            page.insert_image(pymupdf.Rect(20, 20, 120, 120), pixmap=image)

            page = document.new_page(width=600, height=800)
            # PDF insertion order deliberately differs from reading order.
            page.insert_text((330, 90), "RIGHT FIRST", fontname="hebo", fontsize=14)
            page.insert_text((40, 90), "LEFT SECOND", fontname="heit", fontsize=11)
            page.insert_text((40, 160), "hyphen-", fontsize=11)
            page.insert_text((40, 180), "ated", fontsize=11)
            font = pymupdf.Font("cjk")
            page.insert_font(fontname="fixture", fontbuffer=font.buffer)
            page.insert_text((40, 210), "caf\u00e9 \u03a9 \ufb01", fontname="fixture")

            page = document.new_page(width=600, height=800)
            page.insert_text((40, 80), "CONTINUED ON NEXT PAGE")
            page = document.new_page(width=600, height=800)
            page.insert_text((120, 180), "CROP WITNESS")
            page.set_cropbox(pymupdf.Rect(100, 150, 500, 700))
            page.set_rotation(90)
            document.set_page_labels([{"startpage": 0, "prefix": "fixture-", "style": "D", "firstpagenum": 1}])
            document.save(self.source)
        self.original = self.source.read_bytes()

    def rows(self):
        return [json.loads(line) for line in self.output.read_text("utf-8").splitlines()]

    def command(self, *arguments):
        return subprocess.run(
            [sys.executable, "-m", "pdf_extract", "--input", str(self.source),
             "--output", str(self.output), *arguments],
            capture_output=True, text=True, encoding="utf-8",
        )

    def test_cli_selects_closed_range_without_merging_pages(self):
        result = self.command("--start-page-index", "1", "--end-page-index", "2")
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = self.rows()
        self.assertEqual([row["page_index"] for row in rows], [1, 2])
        self.assertNotIn("CONTINUED ON NEXT PAGE", span_texts(rows[0]))
        self.assertEqual(span_texts(rows[1]), ["CONTINUED ON NEXT PAGE"])
        self.assertEqual(rows[0]["pdf_page_label"], "fixture-2")
        self.assertEqual(rows[0]["source"]["path"], str(self.source.resolve()))
        self.assertEqual(rows[0]["source"]["size_bytes"], len(self.original))
        self.assertEqual(rows[0]["source"]["page_count"], 4)
        self.assertEqual(rows[0]["extractor"]["version"], pymupdf.VersionBind)
        self.assertEqual(self.source.read_bytes(), self.original)

    def test_text_unicode_hyphenation_fonts_and_insertion_order(self):
        extract_pdf(self.source, self.output, 1, 1)
        row = self.rows()[0]
        texts = span_texts(row)
        self.assertEqual(texts[:2], ["RIGHT FIRST", "LEFT SECOND"])
        self.assertIn("hyphen-", texts)
        self.assertIn("ated", texts)
        self.assertIn("caf\u00e9 \u03a9 \ufb01", texts)
        self.assertIn("caf\u00e9 \u03a9 \ufb01".encode("utf-8"), self.output.read_bytes())
        with pymupdf.open(self.source) as document:
            native = document[1].get_text(
                "dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES,
                sort=False,
            )
        # Compare the public facts to the engine, including floating-point
        # coordinates, without accepting/reconstructing a book reading order.
        for actual, expected in zip(row["blocks"], native["blocks"], strict=True):
            self.assertEqual(actual["bbox"], list(expected["bbox"]))
            for line, native_line in zip(actual["lines"], expected["lines"], strict=True):
                self.assertEqual(line["dir"], list(native_line["dir"]))
                for span, native_span in zip(line["spans"], native_line["spans"], strict=True):
                    for key in ("text", "font", "size", "flags"):
                        self.assertEqual(span[key], native_span[key])
                    for key in ("bbox", "origin"):
                        self.assertEqual(span[key], list(native_span[key]))

    def test_image_only_page_has_no_extractable_text_without_image_bytes(self):
        extract_pdf(self.source, self.output, 0, 0)
        row = self.rows()[0]
        self.assertEqual(row["text_status"], "no-extractable-text")
        self.assertEqual(row["blocks"], [])
        self.assertFalse(row["options"]["flags"] & pymupdf.TEXT_PRESERVE_IMAGES)

    def test_rotation_and_offset_crop_use_unrotated_text_frame(self):
        extract_pdf(self.source, self.output, 3, 3)
        row = self.rows()[0]
        geometry = row["geometry"]
        self.assertEqual(geometry["rotation"], 90)
        self.assertEqual(geometry["bounds"], [0, 0, 400, 550])
        self.assertEqual((geometry["width"], geometry["height"]), (400, 550))
        self.assertEqual(geometry["cropbox"], [100, 150, 500, 700])
        self.assertEqual(geometry["mediabox"], [0, 0, 600, 800])
        self.assertEqual(geometry["cropbox_position"], [100, 150])
        span = row["blocks"][0]["lines"][0]["spans"][0]
        self.assertEqual(span["text"], "CROP WITNESS")
        self.assertEqual(span["origin"], [20, 30])
        self.assertGreaterEqual(span["bbox"][0], 0)
        self.assertLessEqual(span["bbox"][2], 400)
        with pymupdf.open(self.source) as document:
            page = document[3]
            # A consumer's rotation mapping lands the text at the displayed
            # position, not at media coordinates or swapped text dimensions.
            point = pymupdf.Point(span["origin"]) * page.rotation_matrix
            self.assertEqual(list(point), [520, 20])
            self.assertEqual(list(page.rect), [0, 0, 550, 400])

    def test_invalid_ranges_fail_before_creating_output(self):
        for start, end in [(-1, 1), (2, 1), (0, 4), (4, 4)]:
            with self.subTest(start=start, end=end):
                result = self.command("--start-page-index", str(start), "--end-page-index", str(end))
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.output.exists())
        self.assertEqual(self.source.read_bytes(), self.original)

    def test_selection_is_required_and_arguments_are_integers(self):
        for arguments in [(), ("--start-page-index", "0"),
                          ("--start-page-index", "1.5", "--end-page-index", "2")]:
            with self.subTest(arguments=arguments):
                self.assertNotEqual(self.command(*arguments).returncode, 0)
                self.assertFalse(self.output.exists())

    def test_existing_destination_and_input_are_never_overwritten(self):
        self.output.write_bytes(b"existing artifact")
        with self.assertRaises(FileExistsError):
            extract_pdf(self.source, self.output, 0, 0)
        self.assertEqual(self.output.read_bytes(), b"existing artifact")
        with self.assertRaises(ValueError):
            extract_pdf(self.source, self.source, 0, 0)
        self.assertEqual(self.source.read_bytes(), self.original)

    def test_failed_later_page_removes_partial_new_output(self):
        def fail_second_page(page, source):
            if page.number == 2:
                raise RuntimeError("synthetic extraction failure")
            return extract_page(page, source)

        with patch("pdf_extract.extraction.extract_page", side_effect=fail_second_page):
            with self.assertRaisesRegex(RuntimeError, "synthetic extraction failure"):
                extract_pdf(self.source, self.output, 1, 2)
        self.assertFalse(self.output.exists())
        self.assertEqual(self.source.read_bytes(), self.original)

    def test_exclusive_creation_race_preserves_other_writer(self):
        original_open = Path.open
        resolved_output = self.output.resolve()

        def competing_open(path, mode="r", *args, **kwargs):
            if path == resolved_output and mode == "x":
                path.write_bytes(b"other writer")
            return original_open(path, mode, *args, **kwargs)

        with patch.object(Path, "open", competing_open):
            with self.assertRaises(FileExistsError):
                extract_pdf(self.source, self.output, 0, 0)
        self.assertEqual(self.output.read_bytes(), b"other writer")

    def test_broken_input_and_missing_output_directory_fail_without_output(self):
        broken = self.root / "broken.pdf"
        broken.write_bytes(b"not a PDF")
        with self.assertRaises(Exception):
            extract_pdf(broken, self.output, 0, 0)
        self.assertFalse(self.output.exists())
        with self.assertRaises(FileNotFoundError):
            extract_pdf(self.source, self.root / "missing" / "pages.jsonl", 0, 0)


if __name__ == "__main__":
    unittest.main()
