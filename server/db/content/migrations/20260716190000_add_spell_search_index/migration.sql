CREATE VIRTUAL TABLE "SpellSearchDocument" USING fts5(
    "spellId" UNINDEXED,
    "lang" UNINDEXED,
    "variant" UNINDEXED,
    "name",
    "aliases",
    "summary",
    "mechanics",
    "body",
    tokenize = 'trigram'
);

CREATE TABLE "SpellSearchIndexState" (
    "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
    "schemaVersion" INTEGER NOT NULL,
    "rebuiltAt" DATETIME NOT NULL,
    "documentCount" INTEGER NOT NULL
);
