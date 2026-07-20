import assert from "node:assert/strict";

import {
  compareComponent,
  compareSpell,
  dbSummonTable,
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

assert.equal(
  dbSummonTable(
    "Body\nh4. 1ST LEVEL\n| Monster | Alignement |\n| Dog | LG |\nh4. 2ND LEVEL\n| Squid^1^ | LE |\n",
  ),
  "1\tDog\tLG\n2\tSquid\tLE",
);

console.log("PHB pilot comparison portable tests passed");
