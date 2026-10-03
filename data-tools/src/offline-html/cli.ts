import { exportOfflineHtml } from "./export";

export function main(args: string[]) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("offline:html --content-db <path> --book <id> --variant <zh-variant> --out <new-directory>\nClass directories with levels 0–9 and accepted bilingual summaries; 26 A–Z full-body pages. Relative paths resolve from this checkout's repository root. Output must be a new child of data-tools/out; no overwrite. Read-only content DB; PDF formatting awaits accepted source mapping; no content certification.");
    return;
  }
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]!, value = args[i + 1];
    if (!["--content-db", "--book", "--variant", "--out"].includes(key) || !value
      || value.startsWith("--") || flags.has(key)) throw new Error("Use --help; unknown, duplicate or missing argument");
    flags.set(key, value);
  }
  for (const key of ["--content-db", "--book", "--variant", "--out"]) {
    if (!flags.has(key)) throw new Error(`Required: ${key}`);
  }
  console.log(JSON.stringify(exportOfflineHtml({ contentDb: flags.get("--content-db")!,
    book: Number(flags.get("--book")), variant: flags.get("--variant")!, outDir: flags.get("--out")! }), null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  }
}
