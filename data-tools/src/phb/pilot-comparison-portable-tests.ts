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
  compareComponent("components", "V, S, XP; see text", "V, S, XP").category,
  "exact-match",
);
assert.equal(
  compareComponent("body", "1d4×10 feet", "1d4x10 feet").category,
  "formatting-only",
);
assert.equal(
  compareComponent("body", "_dispel magic_", "dispel magic").category,
  "formatting-only",
);
assert.equal(
  compareComponent("range", "30-foot radius", "20-foot radius").category,
  "substantive-mismatch",
);
assert.equal(
  compareComponent("body", "first row second row", "second row first row")
    .category,
  "substantive-mismatch",
);
assert.equal(
  compareComponent(
    "school",
    "Illusion (Phantasm) [Mind Affecting, Evil]",
    "Illusion (Phantasm) [Evil, Mind-Affecting]",
  ).category,
  "formatting-only",
);
assert.equal(
  compareComponent(
    "school",
    "Illusion (Figment, Glamer)",
    "Illusion (Figment and Glamer)",
  ).category,
  "formatting-only",
);
assert.equal(
  compareComponent(
    "body",
    "deity—or agents thereof —and powdered",
    "deity--or agents thereof--and pow-dered",
  ).category,
  "formatting-only",
);
assert.equal(
  compareComponent(
    "body",
    "This spell functions like sample spell.",
    "This spell functions like sample spell. Inherited focus: A token.",
    { allowDbExpansion: true },
  ).category,
  "formatting-only",
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
  effectiveSchool: "Evocation",
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
const inheritedFields = compareSpell(
  {
    caseId: "spell",
    printedName: "Spell",
    sourcePages: [1],
    school: "Evocation",
    fields: { level: "Sor/Wiz 1" },
    bodyText: "Body",
    reviewFlags: [],
  },
  { ...overlay, effectiveFields: { level: "Sor/Wiz 1" } },
  [],
  [
    {
      ...dbSpell,
      classLevels: [
        { owner: "Sorcerer", level: 1 },
        { owner: "Wizard", level: 1 },
      ],
    },
  ],
);
assert.equal(inheritedFields.category, "exact-match");
assert.equal(
  inheritedFields.components.some((row) => row.component === "components"),
  false,
);
const wizardAlias = compareSpell(
  {
    caseId: "wizard-alias",
    printedName: "Spell",
    sourcePages: [1],
    school: "Evocation",
    fields: { level: "Wiz 1" },
    bodyText: "Body",
    reviewFlags: [],
  },
  { ...overlay, caseId: "wizard-alias", effectiveFields: { level: "Wiz 1" } },
  [],
  [{ ...dbSpell, classLevels: [{ owner: "Wizard", level: 1 }] }],
);
assert.equal(wizardAlias.category, "exact-match");
const combinedTarget = compareSpell(
  {
    caseId: "combined-target",
    printedName: "Spell",
    sourcePages: [1],
    school: "Evocation",
    fields: { targetOrArea: "One creature or a 10-ft. burst" },
    bodyText: "Body",
    reviewFlags: ["uncertain:combined-target-effect-area-field"],
  },
  {
    ...overlay,
    caseId: "combined-target",
    effectiveFields: { targetOrArea: "One creature or a 10-ft. burst" },
  },
  [],
  [
    {
      ...dbSpell,
      target: "One creature or a 10-ft. burst",
    },
  ],
);
assert.equal(combinedTarget.category, "manual-review");
assert.equal(
  combinedTarget.components.find(
    (component) => component.component === "targetEffectArea",
  )?.category,
  "substantive-mismatch",
);
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

assert.equal(
  compareComponent(
    "body",
    "Dispelling effect-tively ends it.",
    "Dispelling effectively ends it.",
  ).category,
  "formatting-only",
);
assert.equal(
  compareComponent("body", "A shell-like field.", "A shelllike field.")
    .category,
  "formatting-only",
);
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
