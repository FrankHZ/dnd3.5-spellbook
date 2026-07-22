import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("review-console runtime correspondence", () => {
  it("uses no deep data-tools source imports", () => {
    const prohibitedImport = ["data-tools", "src"].join("/");
    const matches = sourceFiles().flatMap((filePath) =>
      fs.readFileSync(filePath, "utf8").includes(prohibitedImport)
        ? [filePath]
        : [],
    );
    expect(matches).toEqual([]);
  });

  it("keeps the Node review-service runtime out of the browser graph", () => {
    const clientFiles = sourceFiles(path.join(workspaceRoot, "src", "client"));
    const runtimeImports = clientFiles.flatMap((filePath) => {
      const source = fs.readFileSync(filePath, "utf8");
      return /import\s+(?!type\s)[^;]*?from\s+["']data-tools\/phb-review["']/u.test(
        source,
      )
        ? [filePath]
        : [];
    });
    expect(runtimeImports).toEqual([]);
  });
});

function sourceFiles(root = path.join(workspaceRoot, "src")): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.isFile() && /\.[cm]?[tj]sx?$/u.test(entry.name)
      ? [entryPath]
      : [];
  });
}
