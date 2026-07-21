import assert from "node:assert/strict";

import {
  parsePhbFullExtractionManifestText,
  validatePhbFullExtractionManifest,
} from "./full-manifest";

const manifest = {
  schemaVersion: 1,
  workspace: "phb35",
  sourceManifest: {
    relativePath: "phb35/source/source-manifest.json",
    sha256: "a".repeat(64),
  },
  gate1Review: {
    relativePath: "phb35/review/pilot-e2e-review.json",
    sha256: "b".repeat(64),
    status: "accepted",
  },
  sources: [
    {
      sourceId: "phb35-core",
      ranges: [
        {
          kind: "class-list",
          startPageIndex: 181,
          endPageIndex: 196,
          printedPageOffset: 0,
        },
        {
          kind: "description",
          startPageIndex: 196,
          endPageIndex: 303,
          printedPageOffset: 0,
        },
      ],
    },
    {
      sourceId: "phb35-errata",
      ranges: [
        {
          kind: "errata",
          startPageIndex: 0,
          endPageIndex: 2,
          printedPageOffset: 1,
        },
      ],
    },
  ],
  specialHandlers: [
    {
      id: "summon-monster-table",
      sourceId: "phb35-core",
      sourcePageIndex: 287,
    },
  ],
  expectedCounts: {
    descriptionSpells: 605,
    printedListRows: 1216,
    listOccurrences: 1235,
    uniqueListSpellNames: 605,
    classAssociations: 1037,
    domainAssociations: 198,
  },
};

assert.deepEqual(
  parsePhbFullExtractionManifestText(JSON.stringify(manifest)),
  manifest,
);

const reversed = structuredClone(manifest);
reversed.sources[0]!.ranges[0]!.startPageIndex = 200;
assert.match(
  validatePhbFullExtractionManifest(reversed).join("\n"),
  /reversed page range/u,
);

const missingKind = structuredClone(manifest);
missingKind.sources[0]!.ranges = missingKind.sources[0]!.ranges.filter(
  (range) => range.kind !== "description",
);
assert.match(
  validatePhbFullExtractionManifest(missingKind).join("\n"),
  /missing description coverage/u,
);

console.log("PHB full manifest portable tests passed");
