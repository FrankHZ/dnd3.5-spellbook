import type { ContentDbStatus, DbStatusReadSource } from "./db-status.js";

export type AppVersionMetadataSource = "deploy" | "local";

export type AppVersionMetadata = {
  versionLabel: string;
  source: AppVersionMetadataSource;
  commitSha?: string | undefined;
  shortSha?: string | undefined;
  ref?: string | undefined;
  builtAt?: string | undefined;
  deployedAt?: string | undefined;
  githubRunId?: string | undefined;
  githubRunAttempt?: string | undefined;
};

export type PublicContentBuildStatus = {
  generatorVersion: string;
  generatedAt: string;
  spellCount: number;
  issueCount: number;
};

export type PublicContentStatus = {
  activeSpellReadSource: DbStatusReadSource;
  status: ContentDbStatus["status"];
  latestBuild: PublicContentBuildStatus | null;
};

export type AppStatusResponse = {
  backend: AppVersionMetadata;
  content: PublicContentStatus;
};
