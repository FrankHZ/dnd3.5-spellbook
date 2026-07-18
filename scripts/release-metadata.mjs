import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageJsonPath = fileURLToPath(
  new URL("../package.json", import.meta.url),
);

export function getReleaseVersion() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const version = packageJson.version;

  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("Root package.json must define a SemVer release version");
  }

  return version;
}

export function getReleaseLabel() {
  return `v${getReleaseVersion()}`;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== "--label") {
    throw new Error("Usage: node scripts/release-metadata.mjs --label");
  }
  process.stdout.write(`${getReleaseLabel()}\n`);
}
