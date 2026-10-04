-- Separate source occurrences from generated relationship rows and component flags.
CREATE TABLE "SpellListMarker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceKey" TEXT NOT NULL,
    "rulebookId" INTEGER NOT NULL,
    "listEntryId" TEXT,
    "markers" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'candidate',
    "sourceJson" TEXT NOT NULL,
    "bindingJson" TEXT,
    CONSTRAINT "SpellListMarker_markers_check" CHECK (
        "markers" IS NULL OR "markers" IN ('', 'M', 'F', 'X', 'MF', 'MX', 'FX', 'MFX')
    ),
    CONSTRAINT "SpellListMarker_review_check" CHECK (
        "reviewStatus" IN ('candidate', 'accepted', 'rejected')
        AND ("reviewStatus" <> 'accepted' OR (
            "markers" IS NOT NULL AND "listEntryId" IS NOT NULL AND "bindingJson" IS NOT NULL
        ))
    )
);

CREATE INDEX "SpellListMarker_rulebookId_listEntryId_idx" ON "SpellListMarker"("rulebookId", "listEntryId");
CREATE UNIQUE INDEX "SpellListMarker_sourceKey_listEntryId_key" ON "SpellListMarker"("sourceKey", "listEntryId");
