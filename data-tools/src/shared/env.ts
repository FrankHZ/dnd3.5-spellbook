import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function repoRoot() {
  for (const start of [__dirname, process.cwd()]) {
    let current = path.resolve(start);
    while (true) {
      const packagePath = path.join(current, "package.json");
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packagePath, "utf8"),
        ) as { workspaces?: unknown };
        if (
          Array.isArray(packageJson.workspaces) &&
          packageJson.workspaces.includes("data-tools")
        ) {
          return current;
        }
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new Error("Could not locate the dnd-spellbook workspace root");
}

export function serverDir() {
  return path.join(repoRoot(), "server");
}

/** An explicit manifest override is repository-relative, like DATA_REPO_PATH. */
export function rulesManifestPath(root = repoRoot()) {
  const configured = process.env.RULES_MANIFEST_PATH;
  if (configured !== undefined && !configured.trim()) throw new Error("RULES_MANIFEST_PATH must name a file");
  return configured === undefined ? path.join(localDataDir(root), "rules-db-manifest.json")
    : path.resolve(root, configured);
}

export function localDataDir(root = repoRoot()) {
  const envPath = path.join(root, ".env");
  const rootEnv = fs.existsSync(envPath)
    ? dotenv.parse(fs.readFileSync(envPath, "utf8"))
    : {};
  const configured = process.env.DATA_REPO_PATH ?? rootEnv.DATA_REPO_PATH;
  if (configured === undefined) return path.join(root, "data");
  if (!configured.trim()) {
    throw new Error("DATA_REPO_PATH must name an existing directory.");
  }
  const dataPath = path.resolve(root, configured);
  if (!fs.existsSync(dataPath) || !fs.statSync(dataPath).isDirectory()) {
    throw new Error(`DATA_REPO_PATH is not an existing directory: ${dataPath}`);
  }
  return dataPath;
}

export function loadServerEnv() {
  const envPath = path.join(serverDir(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, quiet: true });
  } else {
    dotenv.config({ quiet: true });
  }
}

export function resolveServerRelativePath(filePath: string) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(serverDir(), filePath);
}
