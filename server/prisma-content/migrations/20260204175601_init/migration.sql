-- CreateTable
CREATE TABLE "I18nSpellText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" INTEGER NOT NULL,
    "rulebookId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "sourceKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I18nSpellNameAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spellId" INTEGER NOT NULL,
    "rulebookId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'import',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "I18nCharacterClassText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "shortDescriptionText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I18nDomainText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I18nSpellSchoolText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I18nSpellSubschoolText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subschoolId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I18nDescriptorText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descriptorId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
CREATE INDEX "I18nSpellText_lang_variant_rulebookId_idx" ON "I18nSpellText"("lang", "variant", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nSpellText_lang_rulebookId_idx" ON "I18nSpellText"("lang", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nSpellText_rulebookId_spellId_idx" ON "I18nSpellText"("rulebookId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nSpellText_spellId_lang_variant_key" ON "I18nSpellText"("spellId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nSpellNameAlias_lang_rulebookId_idx" ON "I18nSpellNameAlias"("lang", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nSpellNameAlias_lang_rulebookId_aliasName_idx" ON "I18nSpellNameAlias"("lang", "rulebookId", "aliasName");

-- CreateIndex
CREATE INDEX "I18nSpellNameAlias_rulebookId_spellId_idx" ON "I18nSpellNameAlias"("rulebookId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nSpellNameAlias_spellId_lang_aliasName_key" ON "I18nSpellNameAlias"("spellId", "lang", "aliasName");

-- CreateIndex
CREATE INDEX "I18nCharacterClassText_lang_classId_idx" ON "I18nCharacterClassText"("lang", "classId");

-- CreateIndex
CREATE INDEX "I18nCharacterClassText_classId_idx" ON "I18nCharacterClassText"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nCharacterClassText_classId_lang_variant_key" ON "I18nCharacterClassText"("classId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nDomainText_lang_domainId_idx" ON "I18nDomainText"("lang", "domainId");

-- CreateIndex
CREATE INDEX "I18nDomainText_domainId_idx" ON "I18nDomainText"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nDomainText_domainId_lang_variant_key" ON "I18nDomainText"("domainId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nSpellSchoolText_lang_schoolId_idx" ON "I18nSpellSchoolText"("lang", "schoolId");

-- CreateIndex
CREATE INDEX "I18nSpellSchoolText_schoolId_idx" ON "I18nSpellSchoolText"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nSpellSchoolText_schoolId_lang_variant_key" ON "I18nSpellSchoolText"("schoolId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nSpellSubschoolText_lang_subschoolId_idx" ON "I18nSpellSubschoolText"("lang", "subschoolId");

-- CreateIndex
CREATE INDEX "I18nSpellSubschoolText_subschoolId_idx" ON "I18nSpellSubschoolText"("subschoolId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nSpellSubschoolText_subschoolId_lang_variant_key" ON "I18nSpellSubschoolText"("subschoolId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nDescriptorText_lang_descriptorId_idx" ON "I18nDescriptorText"("lang", "descriptorId");

-- CreateIndex
CREATE INDEX "I18nDescriptorText_descriptorId_idx" ON "I18nDescriptorText"("descriptorId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nDescriptorText_descriptorId_lang_variant_key" ON "I18nDescriptorText"("descriptorId", "lang", "variant");

-- CreateIndex
CREATE INDEX "I18nRulebookText_lang_rulebookId_idx" ON "I18nRulebookText"("lang", "rulebookId");

-- CreateIndex
CREATE INDEX "I18nRulebookText_rulebookId_idx" ON "I18nRulebookText"("rulebookId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nRulebookText_rulebookId_lang_variant_key" ON "I18nRulebookText"("rulebookId", "lang", "variant");
