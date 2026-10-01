import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { localDataDir } from "../shared/env";

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error("npm_execpath is not set; run this command through npm.");
}
const dataToolsRoot = path.resolve(__dirname, "..", "..");

function collectJsonlFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  if (fs.statSync(root).isFile()) return root.endsWith(".jsonl") ? [root] : [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) return collectJsonlFiles(filePath);
    return entry.isFile() && entry.name.endsWith(".jsonl") ? [filePath] : [];
  });
}

function verifyFixtureMappings() {
  const dataRoot = localDataDir();
  assert.ok(fs.existsSync(dataRoot), `Data repository is unavailable: ${dataRoot}`);
  const manifestPath = path.join(
    dataToolsRoot, "..", "server", "db", "fixtures.manifest.json",
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    dataRoots: string[];
    mappings: Array<{ dataPath: string }>;
  };
  const mapped = new Set(manifest.mappings.map((entry) => entry.dataPath));
  const actual = manifest.dataRoots.flatMap((root) =>
    collectJsonlFiles(path.join(dataRoot, root.replace(/^data\//, "")))
      .map((filePath) => `data/${path.relative(dataRoot, filePath).replace(/\\/g, "/")}`),
  );
  assert.deepEqual(
    actual.filter((filePath) => !mapped.has(filePath)),
    [],
    "maintained data JSONL files need server DB portable fixture mappings",
  );
  for (const filePath of mapped) {
    assert.ok(
      fs.existsSync(path.join(dataRoot, filePath.replace(/^data\//, ""))),
      `fixture manifest maps a missing data repo file: ${filePath}`,
    );
  }
}

verifyFixtureMappings();

const commands: Array<{ label: string; args: string[] }> = [
  { label: "typecheck", args: ["run", "typecheck"] },
  { label: "rules manifest verify", args: ["run", "rules:manifest:verify"] },
  { label: "rules content audit", args: ["run", "rules:content:audit"] },
  { label: "rules content generate", args: ["run", "rules:content:generate"] },
  { label: "rules content parity", args: ["run", "rules:content:parity"] },
  { label: "rulebook label audit", args: ["run", "rulebooks:labels:audit"] },
  { label: "short-description QA", args: ["run", "summaries:qa"] },
  {
    label: "short-description import dry-run",
    args: ["run", "summaries:import", "--", "--dry-run"],
  },
];

for (const command of commands) {
  console.log(`\n== ${command.label} ==`);
  const result = spawnSync(process.execPath, [npmCliPath, ...command.args], {
    cwd: dataToolsRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nLocal data-tools acceptance OK");
