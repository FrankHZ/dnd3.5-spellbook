import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { localDataDir, repoRoot } from "../shared/env";
import { importClassSources, loadAcceptedClassSources } from "./import";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "class-sources:import --rules-db <file> --content-db <file> [--apply]\nDefault: readonly exact accepted handoff check. Relative DB paths resolve from checkout root; DATA_REPO_PATH selects private Git inputs. --apply requires migrated content schema and separate operator write authorization.",
  );
} else {
  let rules: Database.Database | undefined,
    content: Database.Database | undefined;
  try {
    const apply = args.includes("--apply");
    const values: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
      const key = args[i]!;
      if (key === "--apply") {
        if (args.indexOf(key) !== i) throw new Error("Duplicate --apply");
        continue;
      }
      if (
        !["--rules-db", "--content-db"].includes(key) ||
        values[key] ||
        !args[i + 1] ||
        args[i + 1]!.startsWith("--")
      )
        throw new Error("Unknown, duplicate or missing argument; see --help");
      values[key] = args[++i]!;
    }
    if (!values["--rules-db"] || !values["--content-db"])
      throw new Error("Both DB paths required");
    const rulesPath = fs.realpathSync(
      path.resolve(repoRoot(), values["--rules-db"]),
    );
    const contentPath = fs.realpathSync(
      path.resolve(repoRoot(), values["--content-db"]),
    );
    if (
      rulesPath === contentPath ||
      path.basename(contentPath).startsWith("app-state")
    )
      throw new Error(
        "Require distinct rules and content DBs; app-state forbidden",
      );
    rules = new Database(rulesPath, { readonly: true, fileMustExist: true });
    const handoff = loadAcceptedClassSources(localDataDir(), rules);
    content = new Database(contentPath, {
      readonly: !apply,
      fileMustExist: true,
    });
    // Role check before any write, including accidentally supplied app-state DBs.
    if (
      !content
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SpellContent'",
        )
        .get()
    )
      throw new Error("Target is not normalized content");
    console.log(
      JSON.stringify(
        {
          handoffRevision: handoff.revision,
          ...importClassSources(content, handoff, apply),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    content?.close();
    rules?.close();
  }
}
