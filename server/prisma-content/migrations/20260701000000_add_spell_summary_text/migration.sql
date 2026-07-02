-- CreateTable
CREATE TABLE "I18nSpellSummaryText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" INTEGER NOT NULL,
    "rulebookId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "summaryText" TEXT NOT NULL,
    "sourceKey" TEXT,
    "sourceName" TEXT,
    "sourceKind" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "I18nSpellSummaryText_lang_variant_rulebookId_idx" ON "I18nSpellSummaryText"("lang", "variant", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nSpellSummaryText_lang_rulebookId_idx" ON "I18nSpellSummaryText"("lang", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nSpellSummaryText_rulebookId_spellId_idx" ON "I18nSpellSummaryText"("rulebookId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nSpellSummaryText_spellId_lang_variant_key" ON "I18nSpellSummaryText"("spellId", "lang", "variant");
