import assert from "node:assert/strict";

import type { PhbErrataInventoryRow } from "./errata-inventory";
import {
  buildPilotErrataOverlays,
  extractErrataSection,
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

const divineFavor: PhbErrataInventoryRow = {
  ...animal,
  entryId: "divine-favor",
  printedName: "Divine Favor",
  errataPages: [2, 3],
};

const nextSpell: PhbErrataInventoryRow = {
  ...animal,
  entryId: "next-spell",
  printedName: "Next Spell",
  errataPages: [3],
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
        { text: "Divine Favor", fontName: "g_f7", hasEol: false },
        {
          text: "Change the bonus from +1 per three levels",
          fontName: "g_f5",
          hasEol: true,
        },
      ],
    },
  },
  {
    sourceId: "phb35-errata-2006-02-17",
    printedPageNumber: 3,
    pdfjs: {
      items: [
        { text: "Player's Handbook", fontName: "g_f1", hasEol: false },
        { text: "Errata", fontName: "g_f2", hasEol: false },
        {
          text: "©2006 Wizards of the Coast, Inc. All rights reserved.",
          fontName: "g_f3",
          hasEol: true,
        },
        {
          text: "to +1 per three caster levels.",
          fontName: "g_f5",
          hasEol: true,
        },
        { text: "Next Spell", fontName: "g_f7", hasEol: false },
        {
          text: "This text belongs to the next section.",
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

assert.equal(
  extractErrataSection(divineFavor, pages, [
    animal,
    polymorph,
    divineFavor,
    nextSpell,
  ]),
  "Change the bonus from +1 per three levels to +1 per three caster levels.",
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

const fieldReplacement = parseErrataOperations(
  { ...animal, entryId: "field", overlayPolicy: "field-replacement" },
  "Range and area differ. Change range from 30 ft. to 40 ft.",
);
assert.deepEqual(fieldReplacement, [
  { kind: "replace-text", target: "30 ft.", replacement: "40 ft" },
]);

const sentenceOperations = parseErrataOperations(
  { ...animal, entryId: "sentences" },
  "Delete the two sentences beginning with “A slowed creature.” Insert “(see the slow spell)” just before the end of the first sentence of this paragraph.",
);
const sentenceRow = {
  ...animal,
  entryId: "sentences",
  printedName: "Sentence Spell",
};
assert.deepEqual(
  buildPilotErrataOverlays(
    [
      {
        caseId: "sentences",
        printedName: "Sentence Spell",
        fields: {},
        bodyText:
          "The spell slows them for 1d6 rounds. A slowed creature acts once. In addition, it takes a penalty. The spell then ends.",
      },
    ],
    [sentenceRow],
    [
      {
        sourceId: "phb35-errata-2006-02-17",
        printedPageNumber: 2,
        pdfjs: {
          items: [
            { text: "Sentence Spell", fontName: "g_f7", hasEol: false },
            {
              text: "Delete the two sentences beginning with “A slowed creature.” Insert “(see the slow spell)” just before the end of the first sentence of this paragraph.",
              fontName: "g_f5",
              hasEol: true,
            },
          ],
        },
      },
    ],
  )[0]?.effectiveBodyText,
  "The spell slows them for 1d6 rounds (see the slow spell). The spell then ends.",
);
assert.deepEqual(
  sentenceOperations.map((operation) => operation.kind),
  ["insert-before-previous-sentence-end", "delete-sentences"],
);
assert.deepEqual(
  parseErrataOperations(
    sentenceRow,
    "Delete the two sentences beginning with “A slowed creature.” Insert the following text just before the end of the first sentence of this paragraph: (see the slow spell)",
  ).map((operation) => operation.kind),
  ["insert-before-previous-sentence-end", "delete-sentences"],
);

assert.deepEqual(
  parseErrataOperations(
    { ...animal, entryId: "boldface" },
    "Changes to the spell’s description are noted in boldface type: Replacement body.",
  ),
  [{ kind: "replace-full-body", replacement: "Replacement body." }],
);

console.log("PHB pilot errata portable tests passed");
