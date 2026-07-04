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

export type AppStatusResponse = {
  backend: AppVersionMetadata;
};
