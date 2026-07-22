import assert from "node:assert/strict";

import type { FullDbComparisonRow } from "./full-comparison";
import type { FullRowReview } from "./full-row-review";
import {
  adjudicateComparison,
  isSrdAdjudicationInput,
  validateSrdAliases,
  type SrdNameAlias,
} from "./srd-adjudication";
import type { SrdSpellEntity } from "./srd-extraction";

const alias: SrdNameAlias = {
  schemaVersion: 1,
  aliasId: "srd-alias:melf-s-acid-arrow",
  phbName: "Melf’s Acid Arrow",
  srdName: "Acid Arrow",
  kind: "product-identity",
  status: "accepted",
  decisionNote: "Portable Product Identity fixture.",
};
assert.deepEqual(
  validateSrdAliases({
    aliases: [alias],
    phbNames: ["Melf’s Acid Arrow", "Aid"],
    srdNames: ["Acid Arrow", "Aid"],
  }),
  [],
);

const comparison: FullDbComparisonRow = {
  schemaVersion: 1,
  caseId: "spell:melf-s-acid-arrow",
  printedName: "Melf’s Acid Arrow",
  category: "substantive-mismatch",
  setMembership: "both",
  sourceEvidence: [],
  sourcePages: [253],
  dbSpellIds: [1],
  components: [
    {
      component: "name",
      category: "exact-match",
      sourceValue: "Melf’s Acid Arrow",
      dbValue: "Melf’s Acid Arrow",
    },
    {
      component: "body",
      category: "substantive-mismatch",
      sourceValue: "Melf’s acid arrow deals 2d4 acid damage.",
      dbValue: "Melf’s acid arrow deals 2d6 acid damage.",
    },
  ],
  shortDescriptions: {
    occurrenceCount: 0,
    wordingGroupCount: 0,
    wordingGroupKeys: [],
    dbSummaryText: null,
  },
  reviewFlags: [],
};
const review: FullRowReview = {
  schemaVersion: 1,
  caseId: comparison.caseId,
  printedName: comparison.printedName,
  proposedCategory: comparison.category,
  status: "proposed",
  reviewer: null,
  decisionNote: null,
  evidenceRowIds: [comparison.caseId],
  evidenceFingerprintSha256: "a".repeat(64),
  reviewFlags: [],
};
assert.equal(isSrdAdjudicationInput(review), true);
assert.equal(
  isSrdAdjudicationInput({
    ...review,
    status: "accepted",
    reviewer: "data-tools:srd-adjudication",
  }),
  true,
);
assert.equal(
  isSrdAdjudicationInput({
    ...review,
    status: "accepted",
    reviewer: "data-tools:auto",
  }),
  false,
);
const spell: SrdSpellEntity = {
  schemaVersion: 1,
  rowId: "srd-spell:acid-arrow",
  printedName: "Acid Arrow",
  sourceFile: "SpellsA-B.rtf",
  sourceFileSha256: "b".repeat(64),
  sourceParagraphStart: 1,
  sourceParagraphEnd: 2,
  school: "Conjuration (Creation) [Acid]",
  fields: { level: "Sor/Wiz 2" },
  bodyText: "Acid arrow deals 2d4 acid damage.",
  bodyBlocks: [
    { kind: "paragraph", text: "Acid arrow deals 2d4 acid damage." },
  ],
  reviewFlags: [],
};
const result = adjudicateComparison({
  comparison,
  review,
  aliases: [alias],
  alias,
  spellByName: new Map([["acid arrow", spell]]),
  summariesByName: new Map(),
});
assert.equal(result.status, "terminal-candidate");
assert.equal(result.rule, "source-backed-db-correction");
assert.equal(result.componentEvidence[0]?.disposition, "alias-backed");
assert.equal(
  result.componentEvidence[1]?.disposition,
  "phb-srd-agree-db-drift",
);

console.log("PHB SRD adjudication portable tests passed");
