-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RulebookContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyRulebookId" INTEGER NOT NULL,
    "editionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT,
    "displayAbbr" TEXT,
    "publicationCategory" TEXT NOT NULL,
    "publicationFamily" TEXT NOT NULL,
    "publicationSourceKind" TEXT NOT NULL,
    "publicationDisplayOrder" INTEGER NOT NULL,
    "publicationYear" TEXT,
    "publicationDate" TEXT,
    "publicationUrl" TEXT,
    "publicationImage" TEXT,
    "publicationReviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "rawJson" TEXT
);
INSERT INTO "new_RulebookContent" ("abbr", "displayAbbr", "displayName", "editionId", "id", "legacyRulebookId", "name", "publicationCategory", "publicationDate", "publicationDisplayOrder", "publicationFamily", "publicationImage", "publicationReviewStatus", "publicationSourceKind", "publicationUrl", "publicationYear", "rawJson", "slug") SELECT "abbr", "displayAbbr", "displayName", "editionId", "id", "legacyRulebookId", "name", "publicationCategory", "publicationDate", "publicationDisplayOrder", "publicationFamily", "publicationImage", "publicationReviewStatus", "publicationSourceKind", "publicationUrl", "publicationYear", "rawJson", "slug" FROM "RulebookContent";
DROP TABLE "RulebookContent";
ALTER TABLE "new_RulebookContent" RENAME TO "RulebookContent";
CREATE UNIQUE INDEX "RulebookContent_legacyRulebookId_key" ON "RulebookContent"("legacyRulebookId");
CREATE INDEX "RulebookContent_editionId_idx" ON "RulebookContent"("editionId");
CREATE INDEX "RulebookContent_slug_idx" ON "RulebookContent"("slug");
CREATE INDEX "RulebookContent_publicationCategory_publicationDisplayOrder_idx" ON "RulebookContent"("publicationCategory", "publicationDisplayOrder");
CREATE INDEX "RulebookContent_publicationFamily_publicationDisplayOrder_idx" ON "RulebookContent"("publicationFamily", "publicationDisplayOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
