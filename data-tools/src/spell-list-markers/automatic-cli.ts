import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {localDataDir, repoRoot} from "../shared/env";
import {processAutomaticMarkers, type NamedEntry, type SpellName} from "./automatic";
import type {PdfPage} from "./markers";

export const SC_MARKER_INPUT_REVISION = "3109813da4b49d0e9c47ceeba44857a5a230b1e7";
const extraction = "dice-qa/books/86/issue-259/relation-authority/sc-lists-245-277.jsonl";
const normalizedPath = "dice-qa/books/86/issue-467/handoff-preparation/operator/operator.normalized.generated.json";

/** Read immutable Git inputs, then write one new private result. No working-input or DB writes. */
export function main(args: string[]) {
  const started = performance.now(), options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]!, value = args[i+1];
    assert(["--data-root", "--input-revision", "--output"].includes(flag) && value && !value.startsWith("--") && !options.has(flag),
      "Usage: sc:list-markers:auto --output <new data-relative JSON> [--data-root <absolute root>] [--input-revision <Git commit>]");
    options.set(flag, value);
  }
  const rootOption = options.get("--data-root");
  assert(rootOption === undefined || path.isAbsolute(rootOption), "Explicit data root must be absolute");
  const dataRoot = fs.realpathSync(rootOption ?? localDataDir(repoRoot()));
  const revision = options.get("--input-revision") ?? SC_MARKER_INPUT_REVISION;
  assert(/^[0-9a-f]{40}$/.test(revision), "Input revision must be a full Git commit");
  const output = options.get("--output"); assert(output && !path.isAbsolute(output), "Explicit data-relative output required");
  const file = path.resolve(dataRoot, output), relative = path.relative(dataRoot, file);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Output must remain inside data root");
  const parent = fs.realpathSync(path.dirname(file)), parentRelative = path.relative(dataRoot, parent);
  assert(!parentRelative.startsWith("..") && !path.isAbsolute(parentRelative), "Output parent cannot redirect outside data root");
  assert(!fs.existsSync(file), "Output already exists");
  const fixed = (name: string) => execFileSync("git", ["-C", dataRoot, "show", `${revision}:${name}`],
    {encoding: "utf8", maxBuffer: 100 * 1024 * 1024});
  const pages = fixed(extraction).trim().split(/\r?\n/).map(line => JSON.parse(line) as PdfPage);
  const normalized = JSON.parse(fixed(normalizedPath)) as {spells: SpellName[]; listEntries: NamedEntry[]};
  const result = processAutomaticMarkers(pages, extraction, normalized.spells, normalized.listEntries);
  const serialized = JSON.stringify({input: {revision, extraction, normalizedPath}, ...result}, null, 2) + "\n";
  fs.writeFileSync(file, serialized, {encoding: "utf8", flag: "wx"});
  const metrics = {elapsedMs: Math.round(performance.now()-started), peakRssBytes: process.resourceUsage().maxRSS * 1024,
    outputBytes: Buffer.byteLength(serialized), persistentDbOpened: false, humanAcceptedRecordsWritten: 0};
  process.stdout.write(JSON.stringify({coverage: result.coverage, machineBindings: result.machine.length, ...metrics}) + "\n");
  return {coverage: result.coverage, machineBindings: result.machine.length, ...metrics};
}
if (require.main === module) main(process.argv.slice(2));
