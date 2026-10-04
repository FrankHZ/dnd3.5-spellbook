import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { localDataDir, repoRoot } from "../shared/env";
import { candidateRecord, scanMarkerCandidates, type PdfPage } from "./markers";

export function collectCandidates(inputPath: string, extractionPath: string, rulebookId: number) {
  const pages = fs.readFileSync(inputPath, "utf8").split(/\r?\n/).filter(line => line.trim())
    .map(line => JSON.parse(line) as PdfPage);
  return { pages: pages.length, records: scanMarkerCandidates(pages, extractionPath, rulebookId).map(candidateRecord) };
}

export function main(args: string[]) {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]!, value = args[i + 1];
    assert(["--input", "--output", "--data-root"].includes(flag) && value && !value.startsWith("--") && !options.has(flag),
      "Usage: sc:list-markers:candidates --output <new data-relative JSON> [--input <data-relative JSONL>] [--data-root <absolute root>]");
    options.set(flag, value);
  }
  const dataRoot = fs.realpathSync(options.get("--data-root") ?? localDataDir(repoRoot()));
  const input = options.get("--input") ?? "dice-qa/books/86/issue-259/relation-authority/sc-lists-245-277.jsonl";
  const output = options.get("--output"); assert(output, "Explicit new private output required");
  function relativeFile(value: string) {
    assert(!path.isAbsolute(value), "Paths must be data-root-relative");
    const file = path.resolve(dataRoot, value), relative = path.relative(dataRoot, file);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Path must remain inside data root");
    const parent = fs.realpathSync(path.dirname(file)), parentRelative = path.relative(dataRoot, parent);
    assert(!parentRelative.startsWith("..") && !path.isAbsolute(parentRelative), "Private path cannot redirect outside data root");
    return file;
  }
  const inputPath = relativeFile(input), outputPath = relativeFile(output);
  assert(!fs.lstatSync(inputPath).isSymbolicLink(), "Input cannot redirect outside data root");
  const result = collectCandidates(inputPath, path.relative(dataRoot, inputPath).split(path.sep).join("/"), 86);
  fs.writeFileSync(outputPath, JSON.stringify({schemaVersion: 1, rulebookId: 86,
    coverage: "marked-occurrence-candidates-only", ...result}, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
  process.stdout.write(JSON.stringify({pages: result.pages, candidates: result.records.length,
    accepted: 0, persistentDbOpened: false}) + "\n");
}
if (require.main === module) main(process.argv.slice(2));
