import assert from "node:assert/strict";

import {
  compareFullCorpus,
  validateFullComparisonBalance,
  validateFullComparisonSourceEvidence,
} from "./full-comparison";
import type { FullSpellEntity } from "./full-extraction";
import type { PilotErrataOverlayRow } from "./pilot-errata";
import type { DbSpell } from "./pilot-comparison";

const source = spell("Source and DB");
const sourceOnly = spell("Source Only");
const db = dbSpell(1, "Source and DB");
const dbOnly = dbSpell(2, "DB Only");
const rows = compareFullCorpus({
  spells: [source, sourceOnly],
  overlays: [overlay(source), overlay(sourceOnly)],
  classListOccurrences: [],
  dbSpells: [db, dbOnly],
});

assert.equal(rows.length, 3);
assert.equal(
  rows.find((row) => row.printedName === "Source Only")!.category,
  "missing-in-db",
);
assert.equal(
  rows.find((row) => row.printedName === "DB Only")!.category,
  "extra-in-db",
);
assert.deepEqual(
  validateFullComparisonBalance({
    rows,
    sourceSpellCount: 2,
    dbSpellCount: 2,
  }),
  [],
);

const summon = spell("Summon Nature’s Ally V");
const mineruTable = {
  schemaVersion: 1 as const,
  rowId: "mineru-table:phb35-core:200:7",
  sourceId: "phb35-core",
  sourcePageIndex: 200,
  printedPageNumber: 200,
  blockIndex: 7,
  bbox: [10, 20, 30, 40] as [number, number, number, number],
  tableHtml: "<table><tr><td>Level</td></tr></table>",
  captions: [],
  footnotes: [],
  projectedText: "Level Creature",
  evidenceSha256: "c".repeat(64),
};
summon.mineruTableEvidence = [
  { rowId: mineruTable.rowId, evidenceSha256: mineruTable.evidenceSha256 },
];
const summonRows = compareFullCorpus({
  spells: [summon],
  overlays: [overlay(summon)],
  classListOccurrences: [],
  dbSpells: [dbSpell(3, "Summon Nature’s Ally V")],
  detachedTables: [
    {
      schemaVersion: 1,
      rowId: "detached-table:summon-nature-s-ally",
      printedName: "Summon Nature’s Ally",
      attachToSpell: false,
      sourcePages: summon.sourcePages,
      sourceText: "Level Creature",
      lines: [],
    },
  ],
});
assert.equal(summonRows[0]!.category, "manual-review");
assert.deepEqual(summonRows[0]!.sourceEvidence, [
  {
    rowId: "detached-table:summon-nature-s-ally",
    kind: "detached-table",
    sha256: summonRows[0]!.sourceEvidence[0]!.sha256,
  },
  {
    rowId: mineruTable.rowId,
    kind: "mineru-table",
    sha256: mineruTable.evidenceSha256,
  },
]);
assert.ok(
  summonRows[0]!.reviewFlags.includes("uncertain:shared-summon-table-unparsed"),
);
assert.deepEqual(
  validateFullComparisonSourceEvidence(
    summonRows,
    [
      {
        schemaVersion: 1,
        rowId: "detached-table:summon-nature-s-ally",
        printedName: "Summon Nature’s Ally",
        attachToSpell: false,
        sourcePages: summon.sourcePages,
        sourceText: "Level Creature",
        lines: [],
      },
    ],
    [mineruTable],
  ),
  [],
);
assert.match(
  validateFullComparisonSourceEvidence(
    summonRows,
    [
      {
        schemaVersion: 1,
        rowId: "detached-table:summon-nature-s-ally",
        printedName: "Summon Nature’s Ally",
        attachToSpell: false,
        sourcePages: summon.sourcePages,
        sourceText: "Changed",
        lines: [],
      },
    ],
    [mineruTable],
  ).join("\n"),
  /source evidence is stale/u,
);
assert.match(
  validateFullComparisonSourceEvidence(summonRows, [], []).join("\n"),
  /source evidence is missing/u,
);

console.log("PHB full comparison portable tests passed");

function spell(printedName: string): FullSpellEntity {
  return {
    schemaVersion: 1,
    rowId: `spell:${printedName.toLowerCase().replaceAll(" ", "-")}`,
    entityType: "spell",
    printedName,
    sourcePages: [
      {
        sourceId: "phb35-core",
        sourceArtifactSha256: "a".repeat(64),
        sourcePageIndex: 200,
        printedPageNumber: 200,
        textLayerSha256: "b".repeat(64),
      },
    ],
    school: "Evocation",
    fields: { level: "Sor/Wiz 1", spellResistance: "Yes" },
    bodyText: "Body text.",
    sourceText: "Source text.",
    mineruTableEvidence: [],
    reviewFlags: [],
  };
}

function overlay(source: FullSpellEntity): PilotErrataOverlayRow {
  return {
    schemaVersion: 1,
    caseId: source.rowId,
    printedName: source.printedName,
    entryId: null,
    disposition: "not-listed",
    overlayPolicy: "none",
    errataPages: [],
    sourceInstruction: null,
    operations: [],
    operationResults: [],
    effectiveFields: { ...source.fields },
    effectiveSchool: source.school,
    effectiveBodyText: source.bodyText,
    reviewRequired: false,
    reviewFlags: [],
  };
}

function dbSpell(id: number, name: string): DbSpell {
  return {
    id,
    rulebookId: 6,
    page: 200,
    name,
    school: "Evocation",
    subschool: null,
    components: "",
    castingTime: "",
    range: "",
    target: "",
    effect: "",
    area: "",
    duration: "",
    savingThrow: "",
    spellResistance: "Yes",
    description: "Body text.",
    classLevels: [],
    domainLevels: [],
    descriptors: [],
    summaryText: null,
  };
}
