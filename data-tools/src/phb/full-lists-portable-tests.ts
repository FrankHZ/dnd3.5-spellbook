import assert from "node:assert/strict";

import { extractFullSpellLists } from "./full-lists";
import type { FullPageRow } from "./full-extraction";
import type { PilotPdfTextItem } from "./pilot-entities";

const classPages = [
  page(181, [
    line("BARD SPELLS", 403, 730, "heading", 18),
    line("0-LEVEL BARD SPELLS (CANTRIPS)", 292, 705, "heading", 12),
    line("Long Wrapped", 301, 680, "bold"),
    ...splitLine(
      [
        ["Spell:", "bold"],
        [" Starts here and", "body"],
      ],
      310,
      669,
    ),
    line("continues across", 310, 658, "body"),
  ]),
  page(182, [
    line("pages.", 70, 730, "body"),
    ...splitLine(
      [
        ["Protection from Chaos/Evil/Good/Law:", "bold"],
        [" Wards the subject.", "body"],
      ],
      70,
      719,
    ),
    line("1ST-LEVEL BARD SPELLS", 62, 690, "heading", 12),
    ...splitLine(
      [
        ["Lesser Confusion:", "bold"],
        [" Confuses one creature.", "body"],
      ],
      71,
      679,
    ),
    line("2ND-LEVEL BARD SPELLS", 329, 650, "heading", 12),
    line("unattached layout text", 338, 639, "body"),
    ...splitLine(
      [
        ["Blindness/Deafness:", "bold"],
        [" Afflicts the subject.", "body"],
      ],
      338,
      628,
    ),
  ]),
  page(191, [
    line("PALADIN SPELLS", 134, 730, "heading", 18),
    line("1ST-LEVEL PALADIN SPELLS", 25, 705, "heading", 12),
    ...splitLine(
      [
        ["Protection from Chaos/Evil:", "bold"],
        [" Wards the subject.", "body"],
      ],
      34,
      694,
    ),
  ]),
];

const classResult = extractFullSpellLists(classPages);
assert.equal(classResult.printedRows.length, 5);
assert.equal(classResult.occurrences.length, 9);
assert.equal(classResult.counts.classAssociations, 9);
assert.equal(classResult.counts.domainAssociations, 0);

const wrapped = classResult.printedRows.find(
  (row) => row.printedName === "Long Wrapped Spell",
);
assert.ok(wrapped);
assert.equal(wrapped.summaryText, "Starts here and continues across pages.");
assert.deepEqual(
  wrapped.sourcePages.map((source) => source.sourcePageIndex),
  [181, 182],
);
assert.ok(wrapped.reviewFlags.includes("wrapped-name"));
assert.ok(wrapped.reviewFlags.includes("cross-page"));

assert.deepEqual(
  classResult.occurrences
    .filter(
      (row) => row.sourcePrintedName === "Protection from Chaos/Evil/Good/Law",
    )
    .map((row) => row.printedName),
  [
    "Protection from Chaos",
    "Protection from Evil",
    "Protection from Good",
    "Protection from Law",
  ],
);
assert.equal(
  classResult.occurrences.find(
    (row) => row.sourcePrintedName === "Lesser Confusion",
  )?.printedName,
  "Confusion, Lesser",
);
assert.equal(
  classResult.occurrences.find(
    (row) => row.sourcePrintedName === "Blindness/Deafness",
  )?.expansionKind,
  "direct",
);
assert.deepEqual(
  classResult.occurrences
    .filter((row) => row.sourcePrintedName === "Protection from Chaos/Evil")
    .map((row) => row.printedName),
  ["Protection from Chaos", "Protection from Evil"],
);
assert.equal(
  classResult.issues.some((issue) => issue.kind === "orphan-list-text"),
  true,
);

const domainResult = extractFullSpellLists([
  page(185, [
    line("CLERIC DOMAINS", 390, 730, "heading", 18),
    line("AIR DOMAIN", 292, 705, "heading", 12),
    ...splitLine(
      [
        ["Deity:", "bold"],
        [" Obad-Hai.", "body"],
      ],
      310,
      694,
    ),
    line("Air Domain Spells", 292, 670, "heading", 11),
    line("1 Very Long", 301, 659, "bold"),
    ...splitLine(
      [
        ["Domain Spell:", "bold"],
        [" Does something useful.", "body"],
      ],
      310,
      648,
    ),
    ...splitLine(
      [
        ["9 Elemental Swarm*:", "bold"],
        [" Summons elementals.", "body"],
      ],
      301,
      637,
    ),
    line("*Cast as an air spell only.", 301, 626, "body"),
  ]),
]);

assert.equal(domainResult.printedRows.length, 2);
assert.equal(domainResult.occurrences.length, 2);
assert.equal(domainResult.counts.domainAssociations, 2);
assert.deepEqual(
  domainResult.printedRows.map((row) => [
    row.owner,
    row.level,
    row.printedName,
  ]),
  [
    ["Air domain", 1, "Very Long Domain Spell"],
    ["Air domain", 9, "Elemental Swarm"],
  ],
);
assert.deepEqual(domainResult.printedRows[1]?.footnotes, ["*"]);
assert.deepEqual(
  domainResult.footnotes.map((footnote) => [footnote.marker, footnote.text]),
  [["*", "Cast as an air spell only."]],
);
assert.equal(domainResult.issues.length, 0);

const materialMarkerResult = extractFullSpellLists([
  page(183, [
    line("CLERIC SPELLS", 416, 730, "heading", 18),
    line("1ST-LEVEL CLERIC SPELLS", 292, 705, "heading", 12),
    line("Bless Water", 301, 694, "bold"),
    line("M", 348, 697, "bold", 5.5),
    ...splitLine(
      [
        [":", "bold"],
        [" Makes holy water.", "body"],
      ],
      353,
      694,
    ),
  ]),
]);
assert.equal(materialMarkerResult.printedRows[0]?.printedName, "Bless Water");
assert.equal(
  materialMarkerResult.printedRows[0]?.summaryText,
  "Makes holy water.",
);
assert.equal(materialMarkerResult.issues.length, 0);

console.log("PHB full-list portable tests passed");

function page(sourcePageIndex: number, items: PilotPdfTextItem[]): FullPageRow {
  return {
    schemaVersion: 1,
    sourceId: "phb35-core",
    sourceArtifactSha256: "a".repeat(64),
    sourcePageIndex,
    printedPageNumber: sourcePageIndex,
    rangeKinds: ["class-list"],
    pdfjs: {
      extractor: { name: "pdfjs-dist", version: "portable" },
      width: 612,
      height: 792,
      textLayerSha256: "b".repeat(64),
      items,
    },
  };
}

function line(
  text: string,
  x: number,
  y: number,
  fontName: string,
  height = 9,
): PilotPdfTextItem {
  return {
    text,
    x,
    y,
    width: Math.max(2, text.length * (height / 2)),
    height,
    fontName,
    hasEol: true,
  };
}

function splitLine(
  parts: Array<[text: string, fontName: string]>,
  x: number,
  y: number,
): PilotPdfTextItem[] {
  let offset = x;
  return parts.map(([text, fontName], index) => {
    const item = line(text, offset, y, fontName);
    item.hasEol = index === parts.length - 1;
    offset += item.width;
    return item;
  });
}
