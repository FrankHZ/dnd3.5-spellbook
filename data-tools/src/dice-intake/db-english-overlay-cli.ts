import assert from "node:assert/strict";
import {existsSync, mkdirSync, statSync, writeFileSync} from "node:fs";
import {join, resolve} from "node:path";
import Database from "better-sqlite3";
import {loadServerEnv, resolveServerRelativePath} from "../shared/env";
import {dicePaths, isolatedOutputs, noAlias, pathArg, within} from "./paths";
import {cityscapeAcceptance as a, requireHandoffDbRoles} from "./db-english-handoff";
import {authenticateCityscapeInputs} from "./db-english-authentication";
import {loadEnglishRecords, type QaRecords} from "./qa";
import {cityscapeOverlay, CityscapeOverlayError} from "./db-english-overlay";

export function checkOverlayArguments(argv: string[]) {
  const allowed = ["data-root", "rules-db", "content-db", "report-dir", "accepted-revision", "apply"];
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]!.slice(2);
    assert(argv[i] === `--${key}` && allowed.includes(key) && !seen.has(key), "unknown/repeated overlay option");
    seen.add(key);
    if (key !== "apply") assert(argv[++i] && !argv[i]!.startsWith("--"), "missing overlay option value");
  }
  const at = argv.indexOf("--accepted-revision");
  assert(at < 0 || argv[at + 1] === a.revision, "only exact accepted Cityscape revision supported");
}

export function runCityscapeOverlay(argv: string[]) {
  const started = performance.now();
  checkOverlayArguments(argv);
  const {dataRoot} = dicePaths(argv);
  const rulesPath = pathArg("rules-db", argv), contentPath = pathArg("content-db", argv);
  const reportDir = pathArg("report-dir", argv), owned = join(dataRoot, "dice-handoffs/issue-529");
  const baselineDir = join(dataRoot, "dice-baselines/issue-520");
  for (const file of [dataRoot, rulesPath, contentPath, reportDir]) noAlias(file);
  assert(within(owned, reportDir) && resolve(owned) !== reportDir, "report directory must belong to private dice-handoffs/issue-529");
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
      const authenticate = () => {
        const loaded: QaRecords = {english: loadEnglishRecords(rules), englishHtml: new Map(),
          chinese: new Map((content.prepare("SELECT spellId,name,descriptionText,descriptionHtml FROM I18nSpellText WHERE lang='zh' AND variant='chm'")
            .all() as {spellId: number; name: string | null; descriptionText: string | null; descriptionHtml: string | null}[]).map(r => [r.spellId, r])),
          books: rules.prepare("SELECT id,dnd_edition_id AS editionId,name FROM dnd_rulebook").all() as QaRecords["books"]};
        return authenticateCityscapeInputs(dataRoot, rulesPath, contentPath, loaded).evidence;
      };
      // Authenticate and verify every blocker readonly before opening a writer.
      const check = cityscapeOverlay(content, authenticate);
      assert.deepEqual([stamp(rulesPath), stamp(contentPath)], beforeFiles, "DB changed during readonly preflight");
      if (mode === "apply") {
        assert.deepEqual(identity(contentPath), beforeFiles[1]!.slice(0, 2), "target file replaced");
        content.close(); content = new Database(contentPath, {fileMustExist: true});
      }
      let result = check;
      try {
        result = mode === "apply" ? cityscapeOverlay(content, authenticate, mode) : check;
        assert.deepEqual(stamp(rulesPath), beforeFiles[0], "rules changed during overlay invocation");
        const report = {schema: "cityscape-overlay-run.v1", ...result, acceptedRevision: a.revision,
          targets: a.targets, names: 8, fullyChineseBodies: 7, mixedBodies: 1, residualOwnerIssue: 160,
          activation: false, resources: {elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS / 1024}};
        try {
          mkdirSync(reportDir, {recursive: true});
          writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
        } catch (error) {throw new CityscapeOverlayError("report", result, error);}
        return report;
      } catch (error) {
        const failure = error instanceof CityscapeOverlayError ? error : new CityscapeOverlayError("final-check", result, error);
        if (failure.stage !== "report") {
          try {
            mkdirSync(reportDir, {recursive: true});
            writeFileSync(join(reportDir, "report.json"), JSON.stringify({schema: "cityscape-overlay-run.v1",
              ...failure.result, failedStage: failure.stage, error: failure.message, activation: false}, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
          } catch (reportError) {throw new CityscapeOverlayError("report", failure.result, reportError);}
        }
        throw failure;
      }
    })();
  } finally {rules.close(); content.close();}
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/dice-intake/db-english-overlay-cli.ts")) {
  try {console.log(JSON.stringify(runCityscapeOverlay(process.argv.slice(2))));}
  catch (error) {
    console.error(error instanceof CityscapeOverlayError
      ? JSON.stringify({...error.result, failedStage: error.stage, error: error.message}) : String(error));
    process.exitCode = 1;
  }
}
