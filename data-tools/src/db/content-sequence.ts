import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import { normalizedImportStep, type NormalizedImportStepResult } from "../rules-content/import-step";
import { readGenerated } from "../rules-content/cli";
import { preflightSummaryImport, summaryImportStep, type SummaryImportStepResult } from "../short-desc/import-step";
import { loadServerEnv, resolveServerRelativePath } from "../shared/env";
import { plannedContentSearchSource } from "./content-search";
import { contentSearchStep, requireContentSearchSource, type ContentSearchStepResult } from "./content-search-step";

export type ContentSequenceInputs = {
  normalizedInput: string;
  previousNormalizedInput: string;
  summaryInput: string;
  previousSummaryInput: string;
};
type Stage<T> = {
  preflight?: T;
  application: "not-attempted" | "committed" | "no-op" | "failed";
  result?: T;
  final?: T;
};
export type ContentSequenceResult = {
  mode: "check" | "apply";
  complete: boolean;
  normalized: Stage<NormalizedImportStepResult>;
  summaries: Stage<SummaryImportStepResult>;
  search: Stage<ContentSearchStepResult>;
  summaryRecheckRequired: boolean;
  searchRecheckRequired: boolean;
};

/** Earlier committed stages remain committed. This report is invocation evidence,
 * never a resume ledger or authority to skip the next invocation's DB checks. */
export class ContentSequenceError extends Error {
  constructor(public readonly phase: "preflight" | "apply" | "final-check",
    public readonly stage: "inputs" | "target" | "normalized" | "summaries" | "search",
    public readonly result: ContentSequenceResult, cause: unknown) {
    super(`Content sequence failed during ${phase}/${stage}: ${String(cause)}`, {cause});
  }
}

/** All file API paths are resolved by the caller. Source QA, accepted pairs,
 * prepared rules/manifest/generation and write authority are prerequisites. */
export function runContentSequenceFile(dbPath: string, inputs: ContentSequenceInputs,
  mode: "check" | "apply" = "check"): ContentSequenceResult {
  const report: ContentSequenceResult = {mode, complete: false,
    normalized: {application: "not-attempted"}, summaries: {application: "not-attempted"},
    search: {application: "not-attempted"}, summaryRecheckRequired: false, searchRecheckRequired: false};
  let phase: ContentSequenceError["phase"] = "preflight", stage: ContentSequenceError["stage"] = "inputs";
  let db: Database.Database | undefined;
  try {
    assert(mode === "check" || mode === "apply", "Unknown content sequence mode");
    // Direct byte comparison for the whole invocation; stage-local pinning and
    // transactional rechecks remain in force as well. Both pairs are mandatory.
    assert(Object.keys(inputs).sort().join(",") ===
      "normalizedInput,previousNormalizedInput,previousSummaryInput,summaryInput", "Both accepted input pairs are required");
    const pinned = Object.fromEntries(Object.entries(inputs).map(([key, file]) => [key, fs.readFileSync(file)])) as
      Record<keyof ContentSequenceInputs, Buffer>;
    const normalizedBytes = {input: pinned.normalizedInput, previous: pinned.previousNormalizedInput};
    const summaryBytes = {input: pinned.summaryInput, previous: pinned.previousSummaryInput};
    const requireInputs = () => {
      stage = "inputs";
      for (const [key, file] of Object.entries(inputs)) assert(fs.readFileSync(file).equals(pinned[key as keyof ContentSequenceInputs]),
        `Accepted sequence input changed during invocation: ${file}`);
    };
    stage = "target";
    loadServerEnv();
    const target = fs.realpathSync(dbPath);
    const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
    for (const key of ["RULES_DATABASE_URL", "APP_STATE_DATABASE_URL"]) {
      const url = process.env[key];
      if (url?.startsWith("file:")) {
        const other = resolveServerRelativePath(url.slice(5));
        if (fs.existsSync(other) && comparable(fs.realpathSync(other)) === comparable(target)) {
          throw new Error(`Content target must differ from ${key}`);
        }
      }
    }
    db = new Database(target, {readonly: true, fileMustExist: true});
    const preflight = () => db!.transaction(() => {
      // Report this attempt's observations if the writable-connection recheck
      // fails; an earlier snapshot cannot fill in unverified downstream stages.
      delete report.normalized.preflight; delete report.summaries.preflight; delete report.search.preflight;
      report.summaryRecheckRequired = false; report.searchRecheckRequired = false;
      requireInputs(); stage = "normalized";
      report.normalized.preflight = normalizedImportStep(db!, inputs.normalizedInput, inputs.previousNormalizedInput, "check", undefined, normalizedBytes);
      report.summaryRecheckRequired = report.normalized.preflight.state === "before";
      report.searchRecheckRequired = report.summaryRecheckRequired;
      requireInputs(); stage = "summaries";
      const planned = readGenerated(inputs.normalizedInput, normalizedBytes.input);
      const summary = preflightSummaryImport(db!, inputs.summaryInput, inputs.previousSummaryInput, planned, summaryBytes);
      report.summaries.preflight = summary.result;
      report.searchRecheckRequired = report.summaryRecheckRequired || summary.result.state === "before";
      requireInputs(); stage = "search";
      report.search.preflight = contentSearchStep(db!);
      requireContentSearchSource(plannedContentSearchSource(db!, planned, summary.next));
      requireInputs();
    })();
    preflight();
    const pending = report.normalized.preflight!.wouldChange || report.summaries.preflight!.wouldChange ||
      report.search.preflight!.wouldChange;
    if (mode === "check" && pending) return report;
    if (mode === "apply") {
      if (pending) {
        db.close(); stage = "target";
        db = new Database(target, {fileMustExist: true});
        // Recheck all downstream blockers on the newly opened connection before
        // any stage writes. Each stage still owns its own immediate transaction.
        preflight();
      }
      phase = "apply";
      requireInputs(); stage = "normalized";
      report.normalized.application = "failed";
      const normalized = normalizedImportStep(db, inputs.normalizedInput, inputs.previousNormalizedInput, "apply", undefined, normalizedBytes);
      report.normalized.result = normalized;
      report.normalized.application = normalized.changed ? "committed" : "no-op";
      requireInputs(); stage = "summaries";
      report.summaries.application = "failed";
      const summaries = summaryImportStep(db, inputs.summaryInput, inputs.previousSummaryInput, "apply", summaryBytes);
      report.summaries.result = summaries;
      report.summaries.application = summaries.changed ? "committed" : "no-op";
      // Search always runs, including both upstream changed=false repeats.
      requireInputs(); stage = "search";
      report.search.application = "failed";
      const search = contentSearchStep(db, "apply");
      report.search.result = search;
      report.search.application = search.changed ? "committed" : "no-op";
    }
    phase = "final-check";
    db.transaction(() => {
      requireInputs(); stage = "normalized";
      report.normalized.final = normalizedImportStep(db!, inputs.normalizedInput, inputs.previousNormalizedInput, "check", undefined, normalizedBytes);
      assert.equal(report.normalized.final.state, "after", "Final normalized stage is not after");
      requireInputs(); stage = "summaries";
      report.summaries.final = summaryImportStep(db!, inputs.summaryInput, inputs.previousSummaryInput, "check", summaryBytes);
      assert.equal(report.summaries.final.state, "after", "Final summary stage is not after");
      requireInputs(); stage = "search";
      report.search.final = contentSearchStep(db!);
      assert.equal(report.search.final.state, "current", "Final search stage is not current");
      requireInputs();
    })();
    report.complete = true;
    return report;
  } catch (error) {throw new ContentSequenceError(phase, stage, report, error);}
  finally {db?.close();}
}
