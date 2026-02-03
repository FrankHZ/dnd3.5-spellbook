-- CreateTable
CREATE TABLE "I18nRulebookText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rulebookId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "descriptionText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "I18nRulebookText_lang_rulebookId_idx" ON "I18nRulebookText"("lang", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nRulebookText_rulebookId_idx" ON "I18nRulebookText"("rulebookId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nRulebookText_rulebookId_lang_variant_key" ON "I18nRulebookText"("rulebookId", "lang", "variant");
