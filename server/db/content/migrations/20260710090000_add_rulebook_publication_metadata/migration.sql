-- AlterTable
ALTER TABLE "RulebookContent" ADD COLUMN "publicationCategory" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "RulebookContent" ADD COLUMN "publicationFamily" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "RulebookContent" ADD COLUMN "publicationSourceKind" TEXT NOT NULL DEFAULT 'rulebook';
ALTER TABLE "RulebookContent" ADD COLUMN "publicationDisplayOrder" INTEGER NOT NULL DEFAULT 90000;
ALTER TABLE "RulebookContent" ADD COLUMN "publicationReviewStatus" TEXT NOT NULL DEFAULT 'accepted';

-- CreateIndex
CREATE INDEX "RulebookContent_publicationCategory_publicationDisplayOrder_idx" ON "RulebookContent"("publicationCategory", "publicationDisplayOrder");

-- CreateIndex
CREATE INDEX "RulebookContent_publicationFamily_publicationDisplayOrder_idx" ON "RulebookContent"("publicationFamily", "publicationDisplayOrder");
