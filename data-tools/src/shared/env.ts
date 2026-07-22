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

export function localDataDir() {
  return path.join(repoRoot(), "data");
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
