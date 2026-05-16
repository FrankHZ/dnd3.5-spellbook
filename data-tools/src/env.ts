import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

export function serverDir() {
  return path.join(repoRoot(), "server");
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
