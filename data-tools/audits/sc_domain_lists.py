"""Inventory SC domain occurrences from explicit-page PdfPage JSONL.

Preserves raw span locators; cleaned strings are lookup aids, not acceptance.
No DB or PDF access. The caller owns source/page/edition verification.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path


def clean(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def name_key(text):
    text = clean(text).replace("’", "'").lower().replace("†", "")
    # Printed inverted qualifiers ("Spell, Greater") retain their identity.
    if ", " in text:
        base, qualifier = text.rsplit(", ", 1)
        if qualifier in {"greater", "lesser", "mass", "legion"}:
            text = qualifier + " " + base
    return text


def inventory(pages):
    indices = [p["page_index"] for p in pages]
    if len(indices) != len(set(indices)):
        raise ValueError("Duplicate source page")
    rows, headings, excluded = [], [], []
    owner = None
    current = None
    level = None
    active = False
    for page in sorted(pages, key=lambda p: p["page_index"]):
        lines = []
        # SOURCES spans both columns below the final domain. Reading the whole
        # left column first must not discard the right-column 5–9 continuation.
        source_top = min((line["spans"][0]["bbox"][1]
                          for block in page["blocks"] for line in block["lines"]
                          if clean("".join(s["text"] for s in line["spans"])) == "SOURCES"),
                         default=float("inf"))
        for bi, block in enumerate(page["blocks"]):
            for li, line in enumerate(block["lines"]):
                spans = line["spans"]
                if not spans:
                    continue
                x, y = spans[0]["bbox"][:2]
                lines.append((x >= 280, y, bi, li, block["number"], spans))
        for _, _, bi, li, bn, spans in sorted(lines):
            text = "".join(s["text"] for s in spans)
            loc = {"pageIndex": page["page_index"], "blockIndex": bi,
                   "blockNumber": bn, "lineIndex": li,
                   "spanIndices": list(range(len(spans)))}
            if spans[0]["bbox"][1] >= source_top or any("Indecision" in s["font"] for s in spans):
                excluded.append({"kind": "sources-or-decoration", "locator": loc})
                continue
            heading = re.fullmatch(r"(.+?) Domain Spells", clean(text), re.IGNORECASE)
            if heading:
                owner = heading[1].title()
                level, current, active = None, None, True
                headings.append({"owner": owner, "locator": loc})
                continue
            if all("Pterra" in s["font"] for s in spans):
                # Running APPENDIX headers do not break page continuation.
                if clean(text) != "APPENDIX":
                    active, current = False, None
                excluded.append({"kind": "heading", "locator": loc})
                continue
            if all(s["size"] > 18 or "Alchemy" in s["font"] for s in spans):
                excluded.append({"kind": "page-number", "locator": loc})
                continue
            if not active:
                excluded.append({"kind": "outside-list", "locator": loc})
                continue
            if clean(text).startswith("*"):
                rows[-1].setdefault("listFootnotes", []).append({"text": text, "locator": loc})
                excluded.append({"kind": "list-footnote", "locator": loc})
                continue
            bold = [i for i, s in enumerate(spans) if s["flags"] & 16 and not s["flags"] & 1]
            numbered = re.match(r"\s*([1-9])\s+", text)
            if bold:
                continuing_label = current is not None and not current["labelComplete"] and not numbered
                if not continuing_label:
                    if numbered:
                        level = int(numbered[1])
                    if level is None:
                        raise ValueError(f"Unnumbered row without level: {loc}")
                    current = {"sourceKey": f"book:86:p{page['page_index']}:b{bn}:l{li}",
                               "owner": owner, "level": level, "printedName": "",
                               "summaryText": "", "labelComplete": False,
                               "labelLocators": [], "summaryLocators": [], "lineLocators": [],
                               "superscripts": []}
                    rows.append(current)
                label = "".join(spans[i]["text"] for i in bold)
                if numbered:
                    # The digit and the separating space can have different
                    # fonts; only the digit then survives the bold-span join.
                    label = re.sub(r"^\s*[1-9]\s*", "", label)
                label = label.rstrip()
                current["printedName"] += (" " if continuing_label else "") + label.rstrip(": ")
                current["labelLocators"].append({**loc, "spanIndices": bold})
                last = bold[-1]
                desc = []
                for i, span in enumerate(spans):
                    if span["flags"] & 1:
                        current["superscripts"].append({"text": span["text"],
                                                       "locator": {**loc, "spanIndices": [i]}})
                    elif i > last:
                        desc.append(i)
                description = "".join(spans[i]["text"] for i in desc).lstrip(": ")
                current["labelComplete"] = ":" in label or bool(description)
                if description:
                    current["summaryText"] += description
                    current["summaryLocators"].append({**loc, "spanIndices": desc})
            elif current:
                current["summaryText"] += "\n" + text
                current["summaryLocators"].append(loc)
            else:
                excluded.append({"kind": "unassigned-list-line", "locator": loc})
                continue
            current["lineLocators"].append(loc)
    for row in rows:
        row["nameKey"] = name_key(row["printedName"])
        row["summaryText"] = re.sub(r"-\s+", "-", clean(row["summaryText"]))
        row["printedName"] = clean(row["printedName"])
    return {"schemaVersion": 1, "occurrences": rows, "headings": headings, "excludedLines": excluded}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", action="append", type=Path, required=True)
    parser.add_argument("--start-page-index", type=int, required=True)
    parser.add_argument("--end-page-index", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.start_page_index < 0 or args.end_page_index < args.start_page_index:
        parser.error("Page indices must form a non-negative inclusive range")
    pages = [json.loads(line) for file in args.input for line in file.read_text(encoding="utf8").splitlines()]
    pages = [p for p in pages if args.start_page_index <= p["page_index"] <= args.end_page_index]
    if sorted(p["page_index"] for p in pages) != list(range(args.start_page_index, args.end_page_index + 1)):
        raise ValueError("Missing/duplicate explicit source page")
    result = inventory(pages)
    with args.output.open("x", encoding="utf8") as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps({"pages": len(pages), "occurrences": len(result["occurrences"]),
                      "owners": len(result["headings"])}))


if __name__ == "__main__":
    main()
