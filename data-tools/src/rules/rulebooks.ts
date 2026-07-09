import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";
import {
  parseRulebookPatchJsonlText,
  validateInsertRulebookShape,
  type InsertRulebookOperation,
} from "./rulebooks-schema";

type Mode = "validate" | "apply";

type ResolvedInsertRulebook = {
  line: number;
  op: InsertRulebookOperation;
  id: number;
  dndEditionId: number;
  name: string;
  abbr: string;
  slug: string;
  description: string;
  year: string | null;
  officialUrl: string;
  image: string | null;
  published: string | null;
};

type ValidationResult = {
  patchPath: string;
  operations: ResolvedInsertRulebook[];
  errors: string[];
  warnings: string[];
  maxIds: Record<string, number>;
};

const PATCH_ROOT = path.join(localDataDir(), "rules-patches");
const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "rules-patches");

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:rulebooks:validate -- pending/rulebooks/example.jsonl
  npm run -w data-tools rules:rulebooks:apply -- --dry-run pending/rulebooks/example.jsonl
  npm run -w data-tools rules:rulebooks:apply -- pending/rulebooks/example.jsonl

Patch paths are resolved under data/rules-patches/.
`);
  process.exit(1);
}

function rulesDbPath() {
  loadServerEnv();
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function resolvePatchPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) {
    throw new Error("Patch path must be relative to data/rules-patches");
  }

  const resolved = path.resolve(PATCH_ROOT, rawPath);
  const relative = path.relative(PATCH_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Patch path escapes patch root: ${rawPath}`);
  }
  if (!resolved.toLowerCase().endsWith(".jsonl")) {
    throw new Error(`Patch path must end with .jsonl: ${rawPath}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Patch file not found: ${resolved}`);
  }
  return resolved;
}

function tempDbPath(sourceDbPath: string) {
  const base = path.basename(sourceDbPath).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-rules-rulebooks-"));
  return path.join(dir, base);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readMaxIds(db: Database.Database) {
  const row = db
    .prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM dnd_rulebook")
    .get() as { maxId: number };
  return { dnd_rulebook: row.maxId };
}

function countRulebooks(db: Database.Database) {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM dnd_rulebook")
    .get() as { count: number };
  return row.count;
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function validatePatch(db: Database.Database, patchPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseRulebookPatchJsonlText(
    fs.readFileSync(patchPath, "utf-8"),
    errors,
  );
  const maxIds = readMaxIds(db);
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  const seenAbbrs = new Set<string>();
  const seenSlugs = new Set<string>();
  const resolved: ResolvedInsertRulebook[] = [];

  for (const { line, value } of parsed) {
    const shape = validateInsertRulebookShape(value, line, errors);
    const {
      id,
      dndEditionId,
      name,
      abbr,
      slug,
      description,
      year,
      officialUrl,
      image,
      published,
    } = shape;

    if (id === undefined || dndEditionId === undefined || !name || !abbr || !slug) {
      continue;
    }

    if (seenIds.has(id)) errors.push(`line ${line}: duplicate rulebook id in patch: ${id}`);
    seenIds.add(id);
    const nameKey = normalized(name);
    if (seenNames.has(nameKey)) {
      errors.push(`line ${line}: duplicate rulebook name in patch: ${name}`);
    }
    seenNames.add(nameKey);
    const abbrKey = normalized(abbr);
    if (seenAbbrs.has(abbrKey)) {
      errors.push(`line ${line}: duplicate rulebook abbr in patch: ${abbr}`);
    }
    seenAbbrs.add(abbrKey);
    if (seenSlugs.has(slug)) {
      errors.push(`line ${line}: duplicate rulebook slug in patch: ${slug}`);
    }
    seenSlugs.add(slug);

    const edition = db
      .prepare("SELECT id, name FROM dnd_dndedition WHERE id = ?")
      .get(dndEditionId) as { id: number; name: string } | undefined;
    if (!edition) {
      errors.push(`line ${line}: dndEditionId does not exist: ${dndEditionId}`);
    }

    const idCollision = db
      .prepare("SELECT name FROM dnd_rulebook WHERE id = ?")
      .get(id) as { name: string } | undefined;
    if (idCollision) {
      errors.push(`line ${line}: rulebook id already exists: ${id} (${idCollision.name})`);
    }

    const nameCollision = db
      .prepare("SELECT id, abbr FROM dnd_rulebook WHERE lower(name) = lower(?)")
      .get(name) as { id: number; abbr: string } | undefined;
    if (nameCollision) {
      errors.push(
        `line ${line}: rulebook name already exists: ${name} (${nameCollision.id}, ${nameCollision.abbr})`,
      );
    }

    const abbrCollision = db
      .prepare("SELECT id, name FROM dnd_rulebook WHERE lower(abbr) = lower(?)")
      .get(abbr) as { id: number; name: string } | undefined;
    if (abbrCollision) {
      errors.push(
        `line ${line}: rulebook abbr already exists: ${abbr} (${abbrCollision.id}, ${abbrCollision.name})`,
      );
    }

    const slugCollision = db
      .prepare("SELECT id, name FROM dnd_rulebook WHERE slug = ?")
      .get(slug) as { id: number; name: string } | undefined;
    if (slugCollision) {
      errors.push(
        `line ${line}: rulebook slug already exists: ${slug} (${slugCollision.id}, ${slugCollision.name})`,
      );
    }

    if (id > maxIds.dnd_rulebook + 500) {
      warnings.push(
        `line ${line}: rulebook id ${id} is far above current max ${maxIds.dnd_rulebook}`,
      );
    }

    resolved.push({
      line,
      op: value,
      id,
      dndEditionId,
      name,
      abbr,
      slug,
      description,
      year: year ?? null,
      officialUrl,
      image: image ?? null,
      published: published ?? null,
    });
  }

  return { patchPath, operations: resolved, errors, warnings, maxIds };
}

function insertRulebooks(
  db: Database.Database,
  operations: ResolvedInsertRulebook[],
) {
  const insertRulebook = db.prepare(`
    INSERT INTO dnd_rulebook (
      id, dnd_edition_id, name, abbr, description, year, official_url,
      slug, image, published
    ) VALUES (
      @id, @dnd_edition_id, @name, @abbr, @description, @year, @official_url,
      @slug, @image, @published
    )
  `);

  const run = db.transaction(() => {
    for (const op of operations) {
      insertRulebook.run({
        id: op.id,
        dnd_edition_id: op.dndEditionId,
        name: op.name,
        abbr: op.abbr,
        description: op.description,
        year: op.year,
        official_url: op.officialUrl,
        slug: op.slug,
        image: op.image,
        published: op.published,
      });
    }
  });
  run();
}

function writeReport(report: unknown, mode: Mode) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const reportPath = path.join(REPORT_ROOT, `${timestamp()}-rulebooks-${mode}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function validateOnly(dbPath: string, patchPath: string) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const validation = validatePatch(db, patchPath);
    const reportPath = writeReport(
      {
        mode: "validate",
        patchPath,
        targetDbPath: dbPath,
        operationCount: validation.operations.length,
        maxIds: validation.maxIds,
        warnings: validation.warnings,
        errors: validation.errors,
        count: countRulebooks(db),
      },
      "validate",
    );

    console.log(`Validation ${validation.errors.length === 0 ? "OK" : "failed"}`);
    console.log(`Patch: ${patchPath}`);
    console.log(`Operations: ${validation.operations.length}`);
    console.log(`Warnings: ${validation.warnings.length}`);
    console.log(`Errors: ${validation.errors.length}`);
    console.log(`Report: ${reportPath}`);
    if (validation.errors.length > 0) process.exit(1);
  } finally {
    db.close();
  }
}

function applyPatch(targetDbPath: string, patchPath: string, dryRun: boolean) {
  const db = new Database(targetDbPath);
  try {
    const validation = validatePatch(db, patchPath);
    const before = countRulebooks(db);
    if (validation.errors.length > 0) {
      const reportPath = writeReport(
        {
          mode: "apply",
          dryRun,
          patchPath,
          targetDbPath,
          operationCount: validation.operations.length,
          maxIds: validation.maxIds,
          warnings: validation.warnings,
          errors: validation.errors,
          before,
        },
        "apply",
      );
      console.error("Validation failed; no rulebooks inserted");
      console.error(`Report: ${reportPath}`);
      process.exit(1);
    }

    insertRulebooks(db, validation.operations);
    const after = countRulebooks(db);
    const insertedRulebooks = validation.operations.map((op) => ({
      id: op.id,
      abbr: op.abbr,
      name: op.name,
      dndEditionId: op.dndEditionId,
    }));
    const reportPath = writeReport(
      {
        mode: "apply",
        dryRun,
        patchPath,
        targetDbPath,
        operationCount: validation.operations.length,
        insertedRulebooks,
        maxIds: validation.maxIds,
        warnings: validation.warnings,
        errors: validation.errors,
        before,
        after,
      },
      "apply",
    );

    console.log(dryRun ? "Rulebook patch dry-run OK" : "Rulebook patch apply OK");
    console.log(`Patch: ${patchPath}`);
    console.log(`Target DB: ${targetDbPath}`);
    console.log(`Operations: ${validation.operations.length}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function main() {
  const [, , command, ...args] = process.argv;
  if (command !== "validate" && command !== "apply") usage();

  const dryRun = args.includes("--dry-run");
  const patchArg = args.find((arg) => arg !== "--dry-run");
  if (!patchArg) usage();

  const configuredDbPath = rulesDbPath();
  const patchPath = resolvePatchPath(patchArg);

  if (command === "validate") {
    validateOnly(configuredDbPath, patchPath);
    return;
  }

  if (dryRun) {
    const dryRunDbPath = tempDbPath(configuredDbPath);
    fs.copyFileSync(configuredDbPath, dryRunDbPath);
    applyPatch(dryRunDbPath, patchPath, true);
    console.log(`Source DB unchanged: ${configuredDbPath}`);
    console.log(`Temporary DB: ${dryRunDbPath}`);
    return;
  }

  console.log("Applying structured rulebook patch");
  console.log(`Target DB: ${configuredDbPath}`);
  applyPatch(configuredDbPath, patchPath, false);
}

main();
