import { scan } from "./scanner";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("class-sources:scan --chm-root <repo> --rules-db <file> --content-db <file> --scope <json> --out <new-private-directory> [--proposals <json>]\nAll relative paths resolve from this code checkout root. DATA_REPO_PATH selects publication metadata and the private output boundary. Read-only DB/source inputs; proposed evidence only.");
} else {
  try {
    const values: Record<string, string> = {};
    const keys = ["chm-root", "rules-db", "content-db", "scope", "out", "proposals"];
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace(/^--/, "");
      if (!key || args[i] !== `--${key}` || !keys.includes(key) || values[key] || !args[i + 1] || args[i + 1]!.startsWith("--")) throw new Error("Unknown, duplicate or missing argument; see --help");
      values[key] = args[i + 1]!;
    }
    for (const key of keys.slice(0, 5)) if (!values[key]) throw new Error(`Missing --${key}`);
    const report = scan({ chmRoot: values["chm-root"]!, rulesDb: values["rules-db"]!, contentDb: values["content-db"]!, scope: values.scope!, out: values.out!, ...(values.proposals ? { proposals: values.proposals } : {}) });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
