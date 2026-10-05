import { exportOfflineHtml } from "./export";
import { readScIntroduction } from "./introduction";
import { readScDomainPowers } from "./domain-powers";
import { readScDomainLists } from "./domain-lists";
import { readScSourceQuestions } from "./source-questions";

export function main(args: string[]) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("offline:html --content-db <path> --book <id> --variant <zh-variant> --out <new-directory> [--introduction] [--domain-powers] [--domain-lists] [--source-questions]\nClass directories with levels 0–9, domain subsets with levels 1–9 and accepted Chinese summaries; 26 A–Z Chinese-body pages. --domain-lists selects complete mixed-book lists for the existing SC domain pages. --source-questions adds the existing SC/effective source-question review checklist. SC reader flags read fixed introduction/domain-power/domain-list/question content from DATA_REPO_PATH, without DB fields. Relative paths resolve from this checkout's repository root. Output must be a new child of data-tools/out; no overwrite. Read-only content DB; no content certification.");
    return;
  }
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length;) {
    const key = args[i++]!;
    if (key === "--introduction" || key === "--domain-powers" || key === "--domain-lists" || key === "--source-questions") {
      if (flags.has(key)) throw new Error("Use --help; duplicate argument");
      flags.set(key, "true"); continue;
    }
    const value = args[i++];
    if (!["--content-db", "--book", "--variant", "--out"].includes(key) || !value
      || value.startsWith("--") || flags.has(key)) throw new Error("Use --help; unknown, duplicate or missing argument");
    flags.set(key, value);
  }
  for (const key of ["--content-db", "--book", "--variant", "--out"]) {
    if (!flags.has(key)) throw new Error(`Required: ${key}`);
  }
  const book = Number(flags.get("--book"));
  if (flags.has("--introduction") && book !== 86) throw new Error("--introduction is available only for SC (book 86)");
  if (flags.has("--domain-powers") && book !== 86) throw new Error("--domain-powers is available only for SC (book 86)");
  if (flags.has("--domain-lists") && book !== 86) throw new Error("--domain-lists is available only for SC (book 86)");
  if (flags.has("--source-questions") && (book !== 86 || flags.get("--variant") !== "effective")) {
    throw new Error("--source-questions is available only for SC effective content");
  }
  console.log(JSON.stringify(exportOfflineHtml({ contentDb: flags.get("--content-db")!,
    book, variant: flags.get("--variant")!, outDir: flags.get("--out")! }, new Map(), undefined, [],
    flags.has("--introduction") ? readScIntroduction() : undefined,
    flags.has("--domain-powers") ? readScDomainPowers() : undefined,
    flags.has("--domain-lists") ? readScDomainLists() : undefined, [],
    flags.has("--source-questions") ? readScSourceQuestions() : undefined), null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  }
}
