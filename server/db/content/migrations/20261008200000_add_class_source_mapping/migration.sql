CREATE TABLE "ClassSourceImport" (
 "id" INTEGER NOT NULL PRIMARY KEY,
 "handoffRevision" TEXT NOT NULL,
 "sourceRevision" TEXT NOT NULL,
 "scope" TEXT NOT NULL
);
CREATE TABLE "ClassSourceMapping" (
 "variantId" INTEGER NOT NULL PRIMARY KEY,
 "classId" INTEGER NOT NULL,
 "rulebookId" INTEGER NOT NULL,
 "name" TEXT NOT NULL,
 "slug" TEXT NOT NULL,
 "prestige" BOOLEAN NOT NULL,
 "listKind" TEXT NOT NULL,
 "disposition" TEXT NOT NULL,
 "relation" TEXT,
 "evidenceJson" TEXT NOT NULL
);
CREATE INDEX "ClassSourceMapping_rulebookId_disposition_idx" ON "ClassSourceMapping"("rulebookId", "disposition");
