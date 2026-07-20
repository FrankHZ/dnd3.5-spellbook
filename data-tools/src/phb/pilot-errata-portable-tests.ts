import assert from "node:assert/strict";

import type { PhbErrataInventoryRow } from "./errata-inventory";
import {
  buildPilotErrataOverlays,
  parseErrataOperations,
  type PilotErrataPage,
} from "./pilot-errata";

const animal: PhbErrataInventoryRow = {
  schemaVersion: 1,
  entryId: "animal-shapes",
  printedName: "Animal Shapes",
  phbPages: [198],
  errataPages: [2],
  disposition: "applicable",
  overlayPolicy: "targeted-replacement",
  reviewRequired: false,
  note: "test",
};

const polymorph: PhbErrataInventoryRow = {
  ...animal,
  entryId: "polymorph-any-object",
  printedName: "Polymorph Any Object",
  textTargetOccurrence: "last",
  insertBeforeSeparator: "comma",
};

const pages: PilotErrataPage[] = [
  {
    sourceId: "phb35-errata-2006-02-17",
    printedPageNumber: 2,
    pdfjs: {
      items: [
        { text: "Animal Shapes", fontName: "g_f7", hasEol: false },
        {
          text: "Replace the first sentence of the spell with the following text:",
          fontName: "g_f5",
          hasEol: true,
        },
        {
          text: "You transform willing creatures. Use alternate form.",
          fontName: "g_f5",
          hasEol: true,
        },
        { text: "Polymorph Any Object", fontName: "g_f7", hasEol: false },
        {
          text: "Insert “baleful polymorph” in front of “polymorph”. Change “water to dust” to “metal to wood.”",
          fontName: "g_f5",
          hasEol: true,
        },
      ],
    },
  },
];

const overlays = buildPilotErrataOverlays(
  [
    {
      caseId: "animal",
      printedName: "Animal Shapes",
      fields: {},
      bodyText: "Old first sentence. Remaining sentence.",
    },
    {
      caseId: "polymorph",
      printedName: "Polymorph Any Object",
      fields: {},
      bodyText:
        "This functions like polymorph and changes water to dust. It duplicates polymorph.",
    },
  ],
  [animal, polymorph],
  pages,
);

assert.equal(
  overlays[0]?.effectiveBodyText,
  "You transform willing creatures. Use alternate form. Remaining sentence.",
);
assert.deepEqual(
  overlays[1]?.operationResults.map((result) => result.status),
  ["applied", "applied"],
);
assert.equal(
  overlays[1]?.effectiveBodyText,
  "This functions like polymorph and changes metal to wood. It duplicates baleful polymorph, polymorph.",
);
assert.equal(
  overlays[1]?.operations[1]?.kind === "insert-before"
    ? overlays[1].operations[1].occurrence
    : null,
  "last",
);
assert.match(overlays[1]?.effectiveBodyText ?? "", /metal to wood/);

const noOp = parseErrataOperations(
  { ...animal, disposition: "already-incorporated", overlayPolicy: "none" },
  "Delete “Saving Throw: None”",
);
assert.deepEqual(noOp, [{ kind: "delete-text", target: "Saving Throw: None" }]);

console.log("PHB pilot errata portable tests passed");
