import { execFileSync, spawnSync } from "node:child_process";

import { getReleaseLabel } from "./release-metadata.mjs";

function envValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function gitValue(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function runNpm(args, env) {
  const npmExecPath = envValue(process.env.npm_execpath);
  const executable = npmExecPath ? process.execPath : "npm";
  const executableArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const commitSha =
  envValue(process.env.WORKERS_CI_COMMIT_SHA) ??
  gitValue(["rev-parse", "HEAD"]);
const ref =
  envValue(process.env.WORKERS_CI_BRANCH) ??
  gitValue(["rev-parse", "--abbrev-ref", "HEAD"]);

const buildEnv = {
  ...process.env,
  VITE_SPELLBOOK_VERSION_LABEL: getReleaseLabel(),
  VITE_SPELLBOOK_FRONTEND_COMMIT_SHA: commitSha ?? "",
  VITE_SPELLBOOK_FRONTEND_REF: ref ?? "",
  VITE_SPELLBOOK_FRONTEND_BUILT_AT: new Date().toISOString(),
};

runNpm(["run", "build:contracts"], buildEnv);
runNpm(["run", "-w", "web", "build"], buildEnv);
