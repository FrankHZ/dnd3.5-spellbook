import assert from "node:assert/strict";

import {
  compareComponent,
  compareSummaryOnlyCase,
  compareSpell,
  dbSummonTable,
  type DbSpell,
  type PilotComparisonDatabaseIdentity,
  validateComparisonDatabaseIdentities,
} from "./pilot-comparison";
import type { PilotErrataOverlayRow } from "./pilot-errata";

assert.equal(
  compareComponent("body", "can't", "can’t").category,
  "exact-match",
);
assert.equal(
  compareComponent("body", "_dispel magic_", "dispel magic").category,
  "formatting-only",
);
assert.equal(
  compareComponent("range", "30-foot radius", "20-foot radius").category,
  "substantive-mismatch",
);

const overlay: PilotErrataOverlayRow = {
  schemaVersion: 1,
  caseId: "spell",
  printedName: "Spell",
  entryId: null,
  disposition: "not-listed",
  overlayPolicy: "none",
  errataPages: [],
  sourceInstruction: null,
  operations: [],
  operationResults: [],
  effectiveFields: {},
  effectiveBodyText: "Body",
  reviewRequired: false,
  reviewFlags: [],
};

const missing = compareSpell(
  {
    caseId: "spell",
    printedName: "Spell",
    sourcePages: [1],
    school: "Evocation",
    fields: {},
    bodyText: "Body",
    reviewFlags: [],
  },
  overlay,
  [],
  [],
);
assert.equal(missing.category, "missing-in-db");

const dbSpell: DbSpell = {
  id: 1,
  rulebookId: 1,
  page: 1,
  name: "Spell",
  school: "Evocation",
  subschool: null,
  components: "V",
  castingTime: "1 action",
  range: "Close",
  target: "One creature",
  effect: "",
  area: "",
  duration: "Instantaneous",
  savingThrow: "None",
  spellResistance: "No",
  description: "Body",
  classLevels: [],
  domainLevels: [],
  descriptors: [],
  summaryText: "DB wording.",
};
const summaryMismatch = compareSummaryOnlyCase(
  { caseId: "summary", printedName: "Spell", reviewFlags: [] },
  [
    {
      caseId: "summary",
      printedName: "Spell",
      owner: "Wizard",
      level: 1,
      sourcePage: 1,
      summaryText: "Source wording.",
      wordingGroupKey: "source wording.",
    },
  ],
  [dbSpell],
);
assert.equal(summaryMismatch.category, "substantive-mismatch");
assert.equal(summaryMismatch.components[0]?.component, "shortDescription:1");
assert.equal(summaryMismatch.components[0]?.category, "substantive-mismatch");

assert.equal(
  dbSummonTable(
    "Body\nh4. 1ST LEVEL\n| Monster | Alignement |\n| Dog | LG |\nh4. 2ND LEVEL\n| Squid^1^ | LE |\n",
  ),
  "1\tDog\tLG\n2\tSquid\tLE",
);

const currentIdentity: PilotComparisonDatabaseIdentity = {
  environmentVariable: "RULES_DATABASE_URL",
  logicalName: "rules.sqlite",
  bytes: 100,
  sha256: "a".repeat(64),
};
assert.deepEqual(
  validateComparisonDatabaseIdentities([currentIdentity], [currentIdentity]),
  [],
);
assert.match(
  validateComparisonDatabaseIdentities(
    [{ ...currentIdentity, sha256: "b".repeat(64) }],
    [currentIdentity],
  ).join("\n"),
  /sha256 is stale/,
);

console.log("PHB pilot comparison portable tests passed");
