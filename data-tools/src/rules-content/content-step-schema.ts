import assert from "node:assert/strict";
import type Database from "better-sqlite3";

// The complete current importer-owned column boundary, including empty tables.
// Reject schema drift rather than silently comparing only artifact-selected columns.
export const contentStepColumns = {
  RulesContentBuild: "id sourceKind sourceSha256 generatorVersion generatedAt spellCount issueCount parentRepoCommit dataRepoCommit rulesManifestSha256 rulesDbSha256 migrationSetSha256 buildMetaJson",
  RulebookContent: "id legacyRulebookId editionId name abbr slug displayName displayAbbr publicationCategory publicationFamily publicationSourceKind publicationDisplayOrder publicationYear publicationDate publicationUrl publicationImage publicationReviewStatus rawJson",
  SpellContent: "id legacySpellId canonicalName slug sourceRulebookId sourcePage schoolRaw subschoolRaw castingTimeRaw rangeRaw targetRaw effectRaw areaRaw durationRaw savingThrowRaw resistanceRaw componentsRaw corruptLevel descriptionText descriptionHtml descriptionHash addedAt verified verifiedAuthorId verifiedTime rawJson",
  SpellAppearance: "id spellId legacySpellId rulebookId page printedName sourceSlug sourceKey sourceNote",
  SpellTaxonomyFacet: "id spellId facetType facetKey legacyFacetId name slug sortOrder rawText sourceField reviewStatus issueCode",
  SpellListEntry: "id spellId listType ownerLegacyId ownerName ownerSlug ownerPrestige level rulebookId rawExtra variantLabel note sourceRowId sourceTable reviewStatus issueCode",
  SpellComponent: "id spellId componentType present rawText detailText sourceField reviewStatus issueCode",
  SpellMechanicFacet: "id spellId mechanicType rawText category amount unit flagsJson normalizedText displayCoverage sourceField reviewStatus issueCode",
  RulesContentIssue: "id spellId sourceTable sourceField rawText issueCode severity detail",
} as const;

export function requireContentStepSchema(db: Database.Database) {
  for (const table of ["dnd_spell", "dnd_rulebook", "User", "FavoriteSpell", "SpellNote"]) {
    assert(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=? COLLATE NOCASE").get(table),
      "Normalized import step requires the content DB role");
  }
  for (const [table, names] of Object.entries(contentStepColumns)) {
    const schema = db.pragma(`table_info(${table})`) as {name: string; pk: number}[];
    assert.deepEqual(schema.map(c => c.name).sort(), names.split(" ").sort(), `Incomplete/drifted content schema: ${table}`);
    assert.deepEqual(schema.filter(c => c.pk).map(c => [c.name, c.pk]), [["id", 1]], `Wrong content key: ${table}`);
  }
}
