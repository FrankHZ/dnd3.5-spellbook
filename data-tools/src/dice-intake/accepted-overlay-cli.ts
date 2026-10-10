import assert from "node:assert/strict";
import {existsSync, mkdirSync, statSync, writeFileSync} from "node:fs";
import {join, resolve} from "node:path";
import Database from "better-sqlite3";
import {loadServerEnv, resolveServerRelativePath} from "../shared/env";
import {dicePaths, isolatedOutputs, noAlias, pathArg, within} from "./paths";
import {requireHandoffDbRoles} from "./db-english-handoff";
import {acceptedOverlay, AcceptedOverlayError, type AcceptedOverlayInput} from "./accepted-overlay";

export function checkAcceptedOverlayArguments(argv: string[], acceptedRevision: string) {
  const allowed = ["data-root", "rules-db", "content-db", "report-dir", "accepted-revision", "apply"];
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]!.slice(2);
    assert(argv[i] === `--${key}` && allowed.includes(key) && !seen.has(key), "unknown/repeated overlay option");
    seen.add(key);
    if (key !== "apply") assert(argv[++i] && !argv[i]!.startsWith("--"), "missing overlay option value");
  }
  const at = argv.indexOf("--accepted-revision");
  assert(at < 0 || argv[at + 1] === acceptedRevision, "only exact accepted revision supported");
}

/** Shared maintained path; source authentication is selected by a fixed owner wrapper. */
export function runAcceptedOverlay(argv: string[], owner: {
  directory: "issue-529" | "issue-587" | "issue-629" | "issue-637";
  acceptedRevision: string;
  schema: string;
  reportFacts?: Record<string, unknown>;
  authenticate: (dataRoot: string, rules: Database.Database, content: Database.Database,
    rulesPath: string, contentPath: string) => AcceptedOverlayInput;
}) {
  const {acceptedRevision} = owner;
  const started = performance.now();
  checkAcceptedOverlayArguments(argv, acceptedRevision);
  const {dataRoot} = dicePaths(argv);
  const rulesPath = pathArg("rules-db", argv), contentPath = pathArg("content-db", argv);
  const reportDir = pathArg("report-dir", argv), owned = join(dataRoot, "dice-handoffs", owner.directory);
  const baselineDir = join(dataRoot, "dice-baselines/issue-520");
  for (const file of [dataRoot, rulesPath, contentPath, reportDir]) noAlias(file);
  assert(within(owned, reportDir) && resolve(owned) !== reportDir, `report directory must belong to private dice-handoffs/${owner.directory}`);
  assert(!existsSync(reportDir), "overlay requires a fresh report directory; reports never authorize resume");
  isolatedOutputs(dataRoot, owned, [reportDir], [baselineDir, join(dataRoot, "spells-dice-db-by-mo"),
    join(dataRoot, "dice-intake"), join(dataRoot, "dice-qa"), join(dataRoot, "chm-mapping"), rulesPath, contentPath]);
  // Content is an output in apply, so reject collisions with every source root.
  isolatedOutputs(dataRoot, owned, [contentPath], [baselineDir, join(dataRoot, "spells-dice-db-by-mo"),
    join(dataRoot, "dice-intake"), join(dataRoot, "dice-qa"), join(dataRoot, "chm-mapping"), rulesPath]);
  const identity = (file: string) => {const s = statSync(file); return [s.dev, s.ino];};
  assert.notDeepEqual(identity(rulesPath), identity(contentPath), "rules/content alias the same file");
  assert.equal(statSync(contentPath).nlink, 1, "content hard-link aliases are unsupported");
  loadServerEnv();
  const comparable = (file: string) => process.platform === "win32" ? resolve(file).toLowerCase() : resolve(file);
  for (const key of ["RULES_DATABASE_URL", "APP_STATE_DATABASE_URL"]) {
    const url = process.env[key];
    if (url?.startsWith("file:")) assert.notEqual(comparable(contentPath), comparable(resolveServerRelativePath(url.slice(5))), `content target aliases ${key}`);
  }
  const mode = argv.includes("--apply") ? "apply" : "check";
  const stamp = (file: string) => {const s = statSync(file); return [s.dev, s.ino, s.size, s.mtimeMs];};
  const beforeFiles = [stamp(rulesPath), stamp(contentPath)];
  const rules = new Database(rulesPath, {readonly: true, fileMustExist: true});
  let content = new Database(contentPath, {readonly: true, fileMustExist: true});
  rules.pragma("query_only=ON"); content.pragma("query_only=ON");
  try {
    requireHandoffDbRoles(rules, content);
    // Read canonical rules from one held readonly transaction. Content baseline
    // QA reads use the overlay's actual transaction snapshot, never a second DB.
    return rules.transaction(() => {
      const authenticate = () => owner.authenticate(dataRoot, rules, content, rulesPath, contentPath);
      // Authenticate and verify every blocker readonly before opening a writer.
      const check = acceptedOverlay(content, authenticate);
      assert.deepEqual([stamp(rulesPath), stamp(contentPath)], beforeFiles, "DB changed during readonly preflight");
      if (mode === "apply") {
        assert.deepEqual(identity(contentPath), beforeFiles[1]!.slice(0, 2), "target file replaced");
        content.close(); content = new Database(contentPath, {fileMustExist: true});
      }
      let result = check;
      try {
        result = mode === "apply" ? acceptedOverlay(content, authenticate, mode) : check;
        assert.deepEqual(stamp(rulesPath), beforeFiles[0], "rules changed during overlay invocation");
        const report = {schema: owner.schema, ...result, acceptedRevision, ...owner.reportFacts,
          owner: owner.directory, activation: false,
          resources: {elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS / 1024}};
        try {
          mkdirSync(reportDir, {recursive: true});
          writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
        } catch (error) {throw new AcceptedOverlayError("report", result, error);}
        return report;
      } catch (error) {
        const failure = error instanceof AcceptedOverlayError ? error : new AcceptedOverlayError("final-check", result, error);
        if (failure.stage !== "report") {
          try {
            mkdirSync(reportDir, {recursive: true});
            writeFileSync(join(reportDir, "report.json"), JSON.stringify({schema: owner.schema,
              ...failure.result, failedStage: failure.stage, error: failure.message, activation: false}, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
          } catch (reportError) {throw new AcceptedOverlayError("report", failure.result, reportError);}
        }
        throw failure;
      }
    })();
  } finally {rules.close(); content.close();}
}
