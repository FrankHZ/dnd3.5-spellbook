import assert from "node:assert/strict";

import {
  compareFullCorpus,
  validateFullComparisonBalance,
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
