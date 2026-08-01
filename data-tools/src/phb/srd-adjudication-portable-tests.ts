import assert from "node:assert/strict";

import { buildEffectiveEnglishRow } from "./effective-english";
import type { FullDbComparisonRow } from "./full-comparison";
import type { FullSpellEntity } from "./full-extraction";
import type { FullRowReview } from "./full-row-review";
import {
  adjudicateComparison,
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
const phb: FullSpellEntity = {
  schemaVersion: 1,
  rowId: comparison.caseId,
  entityType: "spell",
  printedName: comparison.printedName,
  sourcePages: [
    {
      sourceId: "phb35-core",
      sourceArtifactSha256: "c".repeat(64),
      sourcePageIndex: 252,
      printedPageNumber: 253,
      textLayerSha256: "d".repeat(64),
    },
  ],
  school: "Conjuration (Creation) [Acid]",
  fields: {
    level: "Sorcerer/wizard 2",
    components: "V, S, M",
    range: "Long (400 ft. + 40 ft./level)",
  },
  bodyText: comparison.components[1]!.sourceValue,
  sourceText: comparison.components[1]!.sourceValue,
  reviewFlags: [],
  mineruTableEvidence: [],
  mineruLayoutEvidence: [],
};
const errata = {
  rowId: "errata-overlay:melf-s-acid-arrow",
  schemaVersion: 1 as const,
  caseId: comparison.caseId,
  printedName: comparison.printedName,
  entryId: null,
  disposition: "not-listed" as const,
  overlayPolicy: "none" as const,
  errataPages: [],
  sourceInstruction: null,
  operations: [],
  operationResults: [],
  effectiveFields: phb.fields as Record<string, string>,
  effectiveSchool: phb.school,
  effectiveBodyText: phb.bodyText,
  reviewRequired: false,
  reviewFlags: [],
};
const effective = buildEffectiveEnglishRow({
  phb,
  errata,
  srd: spell,
  alias,
  shortDescriptions: [],
  sourceEvidence: [
    {
      rowId: "detached-table:fixture",
      kind: "detached-table",
      sha256: "e".repeat(64),
    },
  ],
});
assert.equal(effective.effectiveName.value, "Melf’s Acid Arrow");
assert.equal(effective.authorityPolicy.revision, "official-srd-default-v1");
assert.match(effective.authorityPolicy.sha256, /^[a-f0-9]{64}$/u);
assert.equal(effective.effectiveName.rule, "product-identity-name");
assert.equal(effective.bodyText.value, spell.bodyText);
assert.equal(
  effective.fields.components?.authority,
  "phb-3.5-plus-accepted-errata",
);
assert.equal(effective.fields.components?.rule, "srd-omission");
assert.equal(
  effective.tableEvidence.value.references[0]?.rowId,
  "detached-table:fixture",
);
assert.ok(effective.evidenceRowIds.includes("detached-table:fixture"));
const result = adjudicateComparison({
  comparison,
  review,
  effective,
});
assert.equal(result.status, "terminal-candidate");
assert.equal(result.rule, "field-resolved-effective-row");
assert.equal(result.componentEvidence[0]?.disposition, "alias-backed");
assert.equal(result.componentEvidence[1]?.disposition, "srd-authoritative");

const unresolved = buildEffectiveEnglishRow({
  phb,
  errata,
  srd: spell,
  alias,
  shortDescriptions: [],
  sourceEvidence: [],
  sourceEvidenceReasons: [
    "source-evidence:uncertain:shared-summon-table-unparsed",
  ],
});
assert.equal(unresolved.resolutionStatus, "exception");
assert.equal(
  adjudicateComparison({ comparison, review, effective: unresolved }).status,
  "exception",
);

console.log("PHB SRD adjudication portable tests passed");
