import type { AppVersionMetadata } from "@dnd/contracts";
import { dbStatusService } from "~/services/db-status.service";

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function shortSha(commitSha: string | undefined) {
  return commitSha ? commitSha.slice(0, 7) : undefined;
}

export function getBackendVersionMetadata(): AppVersionMetadata {
  const commitSha =
    envValue("SPELLBOOK_BACKEND_COMMIT_SHA") ?? envValue("SPELLBOOK_COMMIT_SHA");
  const deployedAt =
    envValue("SPELLBOOK_BACKEND_DEPLOYED_AT") ??
    envValue("SPELLBOOK_DEPLOYED_AT");
  const githubRunId =
    envValue("SPELLBOOK_BACKEND_GITHUB_RUN_ID") ??
    envValue("SPELLBOOK_GITHUB_RUN_ID");
  const githubRunAttempt =
    envValue("SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT") ??
    envValue("SPELLBOOK_GITHUB_RUN_ATTEMPT");
  const hasDeployMetadata = Boolean(commitSha || deployedAt || githubRunId);

  return {
    versionLabel: envValue("SPELLBOOK_VERSION_LABEL") ?? "local",
    source: hasDeployMetadata ? "deploy" : "local",
    commitSha,
    shortSha:
      envValue("SPELLBOOK_BACKEND_SHORT_SHA") ??
      envValue("SPELLBOOK_SHORT_SHA") ??
      shortSha(commitSha),
    ref: envValue("SPELLBOOK_BACKEND_REF") ?? envValue("SPELLBOOK_REF"),
    deployedAt,
    githubRunId,
    githubRunAttempt,
  };
}

export const appStatusService = {
  async getAppStatus() {
    return {
      backend: getBackendVersionMetadata(),
      content: await dbStatusService.getPublicContentStatus(),
    };
  },
};
