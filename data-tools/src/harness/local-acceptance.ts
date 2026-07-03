import { spawnSync } from "node:child_process";
import path from "node:path";

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error("npm_execpath is not set; run this command through npm.");
}
const dataToolsRoot = path.resolve(__dirname, "..", "..");

const commands: Array<{ label: string; args: string[] }> = [
  { label: "typecheck", args: ["run", "typecheck"] },
  { label: "rules manifest verify", args: ["run", "rules:manifest:verify"] },
  { label: "rules content audit", args: ["run", "rules:content:audit"] },
  { label: "rules content generate", args: ["run", "rules:content:generate"] },
  { label: "rules content parity", args: ["run", "rules:content:parity"] },
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
