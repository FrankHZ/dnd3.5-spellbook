-- CreateTable
CREATE TABLE "RulesContentBuild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceKind" TEXT NOT NULL DEFAULT 'rules-clean',
    "sourceSha256" TEXT,
    "generatorVersion" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spellCount" INTEGER NOT NULL,
    "issueCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "RulebookContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyRulebookId" INTEGER NOT NULL,
    "editionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT,
    "displayAbbr" TEXT,
    "rawJson" TEXT
);

-- CreateTable
CREATE TABLE "SpellContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacySpellId" INTEGER NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceRulebookId" INTEGER NOT NULL,
    "sourcePage" INTEGER,
    "schoolRaw" TEXT,
    "subschoolRaw" TEXT,
    "castingTimeRaw" TEXT,
    "rangeRaw" TEXT,
    "targetRaw" TEXT,
    "effectRaw" TEXT,
    "areaRaw" TEXT,
    "durationRaw" TEXT,
    "savingThrowRaw" TEXT,
    "resistanceRaw" TEXT,
    "componentsRaw" TEXT,
    "descriptionHash" TEXT NOT NULL,
    "rawJson" TEXT
);

-- CreateTable
CREATE TABLE "SpellAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT NOT NULL,
    "legacySpellId" INTEGER NOT NULL,
    "rulebookId" INTEGER NOT NULL,
    "page" INTEGER,
    "printedName" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "sourceKey" TEXT,
    "sourceNote" TEXT
);

-- CreateTable
CREATE TABLE "SpellTaxonomyFacet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT NOT NULL,
    "facetType" TEXT NOT NULL,
    "facetKey" TEXT NOT NULL,
    "legacyFacetId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rawText" TEXT,
    "sourceField" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "issueCode" TEXT
);

-- CreateTable
CREATE TABLE "SpellListEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT NOT NULL,
    "listType" TEXT NOT NULL,
    "ownerLegacyId" INTEGER NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerSlug" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rulebookId" INTEGER,
    "rawExtra" TEXT,
    "variantLabel" TEXT,
    "note" TEXT,
    "sourceRowId" INTEGER,
    "sourceTable" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "issueCode" TEXT
);

-- CreateTable
CREATE TABLE "SpellComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "rawText" TEXT,
    "detailText" TEXT,
    "sourceField" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "issueCode" TEXT
);

-- CreateTable
CREATE TABLE "SpellMechanicFacet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT NOT NULL,
    "mechanicType" TEXT NOT NULL,
    "rawText" TEXT,
    "category" TEXT NOT NULL,
    "amount" INTEGER,
    "unit" TEXT,
    "flagsJson" TEXT,
    "sourceField" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "issueCode" TEXT
);

-- CreateTable
CREATE TABLE "RulesContentIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" TEXT,
    "sourceTable" TEXT NOT NULL,
    "sourceField" TEXT NOT NULL,
    "rawText" TEXT,
    "issueCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detail" TEXT
);

-- CreateIndex
CREATE INDEX "RulesContentBuild_sourceKind_generatedAt_idx" ON "RulesContentBuild"("sourceKind", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RulebookContent_legacyRulebookId_key" ON "RulebookContent"("legacyRulebookId");

-- CreateIndex
CREATE INDEX "RulebookContent_editionId_idx" ON "RulebookContent"("editionId");

-- CreateIndex
CREATE INDEX "RulebookContent_slug_idx" ON "RulebookContent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpellContent_legacySpellId_key" ON "SpellContent"("legacySpellId");

-- CreateIndex
CREATE INDEX "SpellContent_canonicalName_idx" ON "SpellContent"("canonicalName");

-- CreateIndex
CREATE INDEX "SpellContent_slug_idx" ON "SpellContent"("slug");

-- CreateIndex
CREATE INDEX "SpellContent_sourceRulebookId_idx" ON "SpellContent"("sourceRulebookId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellAppearance_legacySpellId_rulebookId_printedName_key" ON "SpellAppearance"("legacySpellId", "rulebookId", "printedName");

-- CreateIndex
CREATE INDEX "SpellAppearance_spellId_idx" ON "SpellAppearance"("spellId");

-- CreateIndex
CREATE INDEX "SpellAppearance_rulebookId_idx" ON "SpellAppearance"("rulebookId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellTaxonomyFacet_spellId_facetType_facetKey_sortOrder_key" ON "SpellTaxonomyFacet"("spellId", "facetType", "facetKey", "sortOrder");

-- CreateIndex
CREATE INDEX "SpellTaxonomyFacet_facetType_facetKey_idx" ON "SpellTaxonomyFacet"("facetType", "facetKey");

-- CreateIndex
CREATE INDEX "SpellTaxonomyFacet_spellId_idx" ON "SpellTaxonomyFacet"("spellId");

-- CreateIndex
CREATE INDEX "SpellListEntry_listType_ownerLegacyId_level_idx" ON "SpellListEntry"("listType", "ownerLegacyId", "level");

-- CreateIndex
CREATE INDEX "SpellListEntry_spellId_idx" ON "SpellListEntry"("spellId");

-- CreateIndex
CREATE INDEX "SpellListEntry_rulebookId_idx" ON "SpellListEntry"("rulebookId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellComponent_spellId_componentType_sourceField_key" ON "SpellComponent"("spellId", "componentType", "sourceField");

-- CreateIndex
CREATE INDEX "SpellComponent_componentType_present_idx" ON "SpellComponent"("componentType", "present");

-- CreateIndex
CREATE INDEX "SpellComponent_spellId_idx" ON "SpellComponent"("spellId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellMechanicFacet_spellId_mechanicType_key" ON "SpellMechanicFacet"("spellId", "mechanicType");

-- CreateIndex
CREATE INDEX "SpellMechanicFacet_mechanicType_category_idx" ON "SpellMechanicFacet"("mechanicType", "category");

-- CreateIndex
CREATE INDEX "SpellMechanicFacet_spellId_idx" ON "SpellMechanicFacet"("spellId");

-- CreateIndex
CREATE INDEX "RulesContentIssue_issueCode_idx" ON "RulesContentIssue"("issueCode");

-- CreateIndex
CREATE INDEX "RulesContentIssue_severity_idx" ON "RulesContentIssue"("severity");

-- CreateIndex
CREATE INDEX "RulesContentIssue_spellId_idx" ON "RulesContentIssue"("spellId");
