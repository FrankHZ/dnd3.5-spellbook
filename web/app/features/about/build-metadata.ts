import type { AppVersionMetadata } from "@dnd/contracts";

function envValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function shortSha(commitSha: string | undefined) {
  return commitSha ? commitSha.slice(0, 7) : undefined;
}

export function getFrontendVersionMetadata(): AppVersionMetadata {
  const env = import.meta.env;
  const commitSha =
    envValue(env.VITE_SPELLBOOK_FRONTEND_COMMIT_SHA) ??
    envValue(env.VITE_SPELLBOOK_COMMIT_SHA);
  const builtAt =
    envValue(env.VITE_SPELLBOOK_FRONTEND_BUILT_AT) ??
    envValue(env.VITE_SPELLBOOK_BUILT_AT);
  const githubRunId =
    envValue(env.VITE_SPELLBOOK_FRONTEND_GITHUB_RUN_ID) ??
    envValue(env.VITE_SPELLBOOK_GITHUB_RUN_ID);
  const githubRunAttempt =
    envValue(env.VITE_SPELLBOOK_FRONTEND_GITHUB_RUN_ATTEMPT) ??
    envValue(env.VITE_SPELLBOOK_GITHUB_RUN_ATTEMPT);
  const hasDeployMetadata = Boolean(commitSha || builtAt || githubRunId);

  return {
    versionLabel: envValue(env.VITE_SPELLBOOK_VERSION_LABEL) ?? "local",
    source: hasDeployMetadata ? "deploy" : "local",
    commitSha,
    shortSha:
      envValue(env.VITE_SPELLBOOK_FRONTEND_SHORT_SHA) ??
      envValue(env.VITE_SPELLBOOK_SHORT_SHA) ??
      shortSha(commitSha),
    ref:
      envValue(env.VITE_SPELLBOOK_FRONTEND_REF) ??
      envValue(env.VITE_SPELLBOOK_REF),
    builtAt,
    githubRunId,
    githubRunAttempt,
  };
}
