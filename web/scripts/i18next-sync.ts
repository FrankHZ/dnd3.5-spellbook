import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const publicLocalesDir = join(webDir, "public", "locales");
const extractedDir = join(webDir, "extracted");
const configPath = join(webDir, "i18next.config.ts");

function readIgnoredNamespaces(): Set<string> {
  const configText = readFileSync(configPath, "utf8");
  const match = configText.match(
    /export const IGNORED\s*=\s*\[(?<items>[^\]]*)\]/m,
  );
  if (!match?.groups?.items) {
    throw new Error("Failed to read IGNORED from i18next.config.ts");
  }

  const items = Array.from(
    match.groups.items.matchAll(/"([^"]+)"|'([^']+)'/g),
    (entry) => entry[1] ?? entry[2],
  );
  return new Set(items);
}

const ignoredNamespaces = readIgnoredNamespaces();

function isIgnoredLocaleFile(path: string): boolean {
  if (!path.endsWith(".json")) return false;
  return ignoredNamespaces.has(basename(path, ".json"));
}

function listLocaleFiles(rootDir: string): string[] {
  const out: string[] = [];

  function walk(currentDir: string) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && fullPath.endsWith(".json")) {
        out.push(fullPath);
      }
    }
  }

  if (existsSync(rootDir)) {
    walk(rootDir);
  }

  return out.sort();
}

function copyLocaleFiles(fromRoot: string, toRoot: string) {
  for (const filePath of listLocaleFiles(fromRoot)) {
    if (isIgnoredLocaleFile(filePath)) continue;

    const relPath = relative(fromRoot, filePath);
    const destPath = join(toRoot, relPath);
    mkdirSync(dirname(destPath), { recursive: true });
    cpSync(filePath, destPath);
  }
}

function clearExtractedLocales() {
  rmSync(extractedDir, { recursive: true, force: true });
  mkdirSync(extractedDir, { recursive: true });
}

function runExtract(options?: { dryRun?: boolean; ci?: boolean }) {
  const extraArgs = [
    options?.dryRun ? "--dry-run" : "",
    options?.ci ? "--ci" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const command = extraArgs
    ? `npm run i18n:extract -- ${extraArgs}`
    : "npm run i18n:extract";

  execSync(command, {
    cwd: webDir,
    stdio: "inherit",
  });
}

function backupExtracted(): string | null {
  if (!existsSync(extractedDir)) return null;

  const backupRoot = mkdtempSync(join(tmpdir(), "dnd-i18next-sync-"));
  const backupDir = join(backupRoot, "extracted");
  cpSync(extractedDir, backupDir, { recursive: true });
  return backupDir;
}

function restoreExtracted(backupDir: string | null) {
  rmSync(extractedDir, { recursive: true, force: true });
  if (backupDir) {
    cpSync(backupDir, extractedDir, { recursive: true });
  }
}

function runSync() {
  clearExtractedLocales();
  copyLocaleFiles(publicLocalesDir, extractedDir);
  runExtract();
  copyLocaleFiles(extractedDir, publicLocalesDir);
}

function runCheck() {
  const backupDir = backupExtracted();

  try {
    clearExtractedLocales();
    copyLocaleFiles(publicLocalesDir, extractedDir);
    runExtract({ dryRun: true, ci: true });
  } finally {
    restoreExtracted(backupDir);
  }
}

function main() {
  const isCheckMode = process.argv.includes("--check");
  if (isCheckMode) {
    runCheck();
    return;
  }

  runSync();
}

main();
