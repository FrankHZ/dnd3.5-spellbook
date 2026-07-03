-- Preserve detail-display fields directly on normalized spell content rows.
-- SQLite requires a table rewrite so the new non-null columns do not keep
-- migration-only defaults that drift from the Prisma schema.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SpellContent" (
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
    "descriptionText" TEXT NOT NULL,
    "descriptionHtml" TEXT,
    "descriptionHash" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAuthorId" INTEGER,
    "verifiedTime" DATETIME,
    "rawJson" TEXT
);

INSERT INTO "new_SpellContent" (
    "id",
    "legacySpellId",
    "canonicalName",
    "slug",
    "sourceRulebookId",
    "sourcePage",
    "schoolRaw",
    "subschoolRaw",
    "castingTimeRaw",
    "rangeRaw",
    "targetRaw",
    "effectRaw",
    "areaRaw",
    "durationRaw",
    "savingThrowRaw",
    "resistanceRaw",
    "componentsRaw",
    "descriptionText",
    "descriptionHtml",
    "descriptionHash",
    "addedAt",
    "verified",
    "verifiedAuthorId",
    "verifiedTime",
    "rawJson"
)
SELECT
    "id",
    "legacySpellId",
    "canonicalName",
    "slug",
    "sourceRulebookId",
    "sourcePage",
    "schoolRaw",
    "subschoolRaw",
    "castingTimeRaw",
    "rangeRaw",
    "targetRaw",
    "effectRaw",
    "areaRaw",
    "durationRaw",
    "savingThrowRaw",
    "resistanceRaw",
    "componentsRaw",
    '',
    NULL,
    "descriptionHash",
    '1970-01-01T00:00:00.000Z',
    false,
    NULL,
    NULL,
    "rawJson"
FROM "SpellContent";

DROP TABLE "SpellContent";
ALTER TABLE "new_SpellContent" RENAME TO "SpellContent";

CREATE UNIQUE INDEX "SpellContent_legacySpellId_key" ON "SpellContent"("legacySpellId");
CREATE INDEX "SpellContent_canonicalName_idx" ON "SpellContent"("canonicalName");
CREATE INDEX "SpellContent_slug_idx" ON "SpellContent"("slug");
CREATE INDEX "SpellContent_sourceRulebookId_idx" ON "SpellContent"("sourceRulebookId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
