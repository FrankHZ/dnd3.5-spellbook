import path from "node:path";
import { repoRoot } from "../shared/env";
import { ContentSequenceError, runContentSequenceFile, type ContentSequenceInputs } from "./content-sequence";

function main() {
  const args = process.argv.slice(2);
  let database: string | undefined, mode: "check" | "apply" = "check";
  const inputs: Partial<ContentSequenceInputs> = {};
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (seen.has(arg)) throw new Error(`Duplicate argument: ${arg}`);
    seen.add(arg);
    if (arg === "--apply") {mode = "apply"; continue;}
    if (!["--content-db", "--normalized-input", "--previous-normalized-input", "--summary-input", "--previous-summary-input"]
      .includes(arg) || !args[i + 1] || args[i + 1]!.startsWith("--")) {
      throw new Error("Usage: content:sequence -- --content-db <existing.sqlite> --previous-normalized-input <accepted-full.json> --normalized-input <accepted-full.json> --previous-summary-input <accepted-full.jsonl> --summary-input <accepted-full.jsonl> [--apply]");
    }
    const value = path.resolve(repoRoot(), args[++i]!);
    if (arg === "--content-db") database = value;
    else if (arg === "--normalized-input") inputs.normalizedInput = value;
    else if (arg === "--previous-normalized-input") inputs.previousNormalizedInput = value;
    else if (arg === "--summary-input") inputs.summaryInput = value;
    else inputs.previousSummaryInput = value;
  }
  if (!database || !inputs.normalizedInput || !inputs.previousNormalizedInput || !inputs.summaryInput || !inputs.previousSummaryInput) {
    throw new Error("Explicit existing --content-db and both accepted full normalized/summary pairs are required, including repeats");
  }
  console.log(JSON.stringify(runContentSequenceFile(database, inputs as ContentSequenceInputs, mode), null, 2));
}

if (require.main === module) {
  try {main();} catch (error) {
    console.error(JSON.stringify(error instanceof ContentSequenceError ?
      {error: error.message, phase: error.phase, stage: error.stage, ...error.result} : {error: String(error)}, null, 2));
    process.exitCode = 1;
  }
}
