import { existsSync, lstatSync, realpathSync, readdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { localDataDir } from "../shared/env";

export function pathArg(name: string, argv: string[]): string {
  const at = argv.indexOf(`--${name}`);
  const value = argv[at + 1];
  if (at < 0 || !value || value.startsWith("--")) throw new Error(`missing --${name}`);
  // Explicit CLI paths are cwd-relative; DATA_REPO_PATH remains repository-relative.
  return resolve(value);
}

export function destination(path: string): string {
  path = resolve(path);
  try { lstatSync(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || dirname(path) === path) throw error;
    return join(destination(dirname(path)), basename(path));
  }
  return realpathSync(path);
}

export function within(parent: string, child: string): boolean {
  const path = relative(resolve(parent), resolve(child));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

export function noAlias(path: string): void {
  if (relative(resolve(path), destination(path)) !== "") throw new Error(`filesystem alias is not allowed: ${path}`);
}

export function dicePaths(argv: string[]) {
  const baselineDir = argv.includes("--baseline-dir") ? pathArg("baseline-dir", argv) : undefined;
  const dataRoot = argv.includes("--data-root") || !baselineDir
    ? pathArg("data-root", argv) : localDataDir();
  const sourceDir = join(dataRoot, "spells-dice-db-by-mo");
  const mappingPath = join(dataRoot, "dice-intake", "publication-map.json");
  const aliasesPath = join(dataRoot, "chm-mapping", "enName-aliases-global.json");
  if (baselineDir) {
    noAlias(dataRoot); noAlias(baselineDir);
    if (!within(dataRoot, baselineDir) || relative(dataRoot, baselineDir) === "") {
      throw new Error("--baseline-dir must be a separate directory inside the private data root");
    }
    for (const protectedDir of [sourceDir, join(dataRoot, "dice-intake"), join(dataRoot, "dice-qa"), join(dataRoot, "chm-mapping")]) {
      if (within(protectedDir, baselineDir) || within(baselineDir, protectedDir)) {
        throw new Error("--baseline-dir overlaps source or preserved default inputs/outputs");
      }
    }
    for (const path of [sourceDir, mappingPath, aliasesPath]) noAlias(path);
    for (const file of readdirSync(sourceDir).filter(name => name.endsWith(".txt"))) noAlias(join(sourceDir, file));
  }
  return { dataRoot, baselineDir, sourceDir, mappingPath, aliasesPath,
    intakeDir: baselineDir ? join(baselineDir, "intake") : join(dataRoot, "dice-intake"),
    qaDir: baselineDir ? join(baselineDir, "qa") : join(dataRoot, "dice-qa") };
}

/** Check every filename before creating any output, including existing aliases. */
export function isolatedOutputs(dataRoot: string, allowedDir: string, outputs: string[], inputs: string[]): void {
  noAlias(allowedDir);
  for (const output of outputs) {
    noAlias(output);
    const actual = destination(output);
    if (within(dataRoot, actual) && !within(allowedDir, actual)) {
      throw new Error("isolated output must stay outside data or in its owned directory");
    }
    for (const input of inputs) {
      const source = destination(input);
      if (within(actual, source) || (existsSync(source) && lstatSync(source).isDirectory() && within(source, actual))) {
        throw new Error("source/output collision");
      }
    }
  }
}
