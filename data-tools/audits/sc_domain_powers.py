"""Inventory Granted Power and Requirement text from explicit SC PdfPage JSONL.

Raw lines and span locators remain evidence. No PDF, DB, or acceptance access.
"""
import argparse
import json
import re
from pathlib import Path

from sc_domain_lists import clean


def inventory_powers(pages):
    indices = [p["page_index"] for p in pages]
    if len(indices) != len(set(indices)):
        raise ValueError("Duplicate source page")
    domains, shared, excluded = [], [], []
    current = None
    section = None
    for page in sorted(pages, key=lambda p: p["page_index"]):
        lines = []
        source_top = min((line["spans"][0]["bbox"][1]
                          for block in page["blocks"] for line in block["lines"]
                          if clean("".join(s["text"] for s in line["spans"])) == "SOURCES"),
                         default=float("inf"))
        for bi, block in enumerate(page["blocks"]):
            for li, line in enumerate(block["lines"]):
                spans = line["spans"]
                if spans:
                    x, y = spans[0]["bbox"][:2]
                    lines.append((x >= 280, y, bi, li, block["number"], spans))
        for _, y, bi, li, bn, spans in sorted(lines):
            text = "".join(s["text"] for s in spans)
            normalized = clean(text)
            loc = {"pageIndex": page["page_index"], "blockIndex": bi,
                   "blockNumber": bn, "lineIndex": li,
                   "spanIndices": list(range(len(spans)))}
            raw = {"text": text, "locator": loc}
            if y >= source_top or any("Indecision" in s["font"] for s in spans):
                excluded.append({"kind": "sources-or-decoration", **raw})
                continue
            if all(s["size"] > 18 or "Alchemy" in s["font"] for s in spans):
                excluded.append({"kind": "page-number", **raw})
                continue
            if all("Pterra" in s["font"] for s in spans):
                heading = re.fullmatch(r"(.+?) DOMAIN", normalized, re.IGNORECASE)
                if heading:
                    current = {"sourceName": heading[1].title(), "heading": raw,
                               "requirementLines": [], "grantedPowerLines": []}
                    domains.append(current)
                    section = None
                elif normalized == "PLANAR DOMAINS":
                    current, section = None, "planar"
                elif normalized != "APPENDIX":
                    current, section = None, None
                excluded.append({"kind": "heading", **raw})
                continue
            if section == "planar":
                shared.append(raw)
                continue
            if current is not None:
                if re.match(r"Requirement\s*:", normalized):
                    section = "requirement"
                elif re.match(r"Granted Powers?(?:\s*\([A-Za-z]+\))?\s*:", normalized):
                    section = "power"
                if section in ("requirement", "power"):
                    key = "requirementLines" if section == "requirement" else "grantedPowerLines"
                    current[key].append(raw)
                    continue
            excluded.append({"kind": "outside-power", **raw})
    names = [d["sourceName"] for d in domains]
    if len(names) != len(set(names)):
        raise ValueError("Duplicate domain heading")
    for domain in domains:
        if not domain["grantedPowerLines"]:
            raise ValueError(f"Missing Granted Power: {domain['sourceName']}")
        for prefix in ("requirement", "grantedPower"):
            # Join for display only; line-end hyphens remain untouched. Exact
            # words/line breaks live in *Lines and the original span records.
            domain[prefix + "English"] = clean(" ".join(r["text"] for r in domain[prefix + "Lines"]))
    return {"schemaVersion": 1, "domains": domains,
            "sharedPlanarLines": shared, "excludedLines": excluded}


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
    result = inventory_powers(pages)
    with args.output.open("x", encoding="utf8") as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps({"pages": len(pages), "domains": len(result["domains"]),
                      "requirements": sum(bool(d["requirementLines"]) for d in result["domains"])}))


if __name__ == "__main__":
    main()
