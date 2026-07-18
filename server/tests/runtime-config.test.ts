import { spawnSync } from "node:child_process";
import path from "node:path";

describe("server runtime configuration", () => {
  it("fails during startup when RULES_DATABASE_URL is missing", () => {
    const serverRoot = path.resolve(__dirname, "..");
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      DOTENV_CONFIG_PATH: path.join(
        serverRoot,
        "tests",
        "missing-runtime-config.env",
      ),
    };
    delete childEnv.RULES_DATABASE_URL;

    const result = spawnSync(
      process.execPath,
      ["--conditions=source", "--import", "tsx", "src/index.ts"],
      {
        cwd: serverRoot,
        env: childEnv,
        encoding: "utf8",
        timeout: 10_000,
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(output).toContain("RULES_DATABASE_URL is required");
    expect(output).not.toContain("Server is running");
  });
});
