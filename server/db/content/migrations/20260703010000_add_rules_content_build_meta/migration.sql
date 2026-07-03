-- Track the exact local inputs used for each generated rules-content import.
ALTER TABLE "RulesContentBuild" ADD COLUMN "parentRepoCommit" TEXT;
ALTER TABLE "RulesContentBuild" ADD COLUMN "dataRepoCommit" TEXT;
ALTER TABLE "RulesContentBuild" ADD COLUMN "rulesManifestSha256" TEXT;
ALTER TABLE "RulesContentBuild" ADD COLUMN "rulesDbSha256" TEXT;
ALTER TABLE "RulesContentBuild" ADD COLUMN "migrationSetSha256" TEXT;
ALTER TABLE "RulesContentBuild" ADD COLUMN "buildMetaJson" TEXT;

CREATE INDEX "RulesContentBuild_parentRepoCommit_idx" ON "RulesContentBuild"("parentRepoCommit");
CREATE INDEX "RulesContentBuild_dataRepoCommit_idx" ON "RulesContentBuild"("dataRepoCommit");
