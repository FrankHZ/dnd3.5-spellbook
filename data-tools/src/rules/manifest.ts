import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

type Mode = "write" | "verify";

type InsertSpellOperation = {
  op?: string;
  id?: number;
  source?: {
    rulebook?: string;
  };
  spell?: {
    name?: string;
    slug?: string;
  };
  levels?: {
    classes?: Array<{ class?: string; level?: number; extra?: string }>;
    domains?: Array<{ domain?: string; level?: number; extra?: string }>;
  };
  descriptors?: string[];
};

type SpellOperationCheck = {
  patchPath: string;
  line: number;
  id: number | null;
  name: string | null;
  rulebook: string | null;
  status: "verified" | "missing" | "mismatch";
  issues: string[];
};

type PatchManifest = {
  path: string;
  kind: "legacy-sql" | "spell-jsonl";
  sha256: string;
  bytes: number;
  operations?: {
    total: number;
    verified: number;
    missing: number;
    mismatch: number;
  };
};

type RulesManifest = {
  schemaVersion: 1;
  generatedAt: string;
  database: {
    logicalName: "rules-clean.sqlite";
    relativePath: string;
    size: number;
    mtime: string;
    sha256: string;
    sqlite: {
      userVersion: number;
      applicationId: number;
      schemaVersion: number;
    };
    tableCounts: Record<string, number>;
  };
  patches: PatchManifest[];
  checks: {
    legacySql: {
      indexTablesPresent: boolean;
      classIndexRowsMatch: boolean;
      domainIndexRowsMatch: boolean;
    };
    spellJsonl: {
      totalOperations: number;
      verified: number;
      missing: number;
      mismatch: number;
      issues: SpellOperationCheck[];
    };
  };
};

const PATCH_ROOT = path.join(localDataDir(), "rules-patches");
const MANIFEST_PATH = path.join(localDataDir(), "rules-db-manifest.json");
const DB_RELATIVE_PATH = path.join("server", "data", "db", "rules-clean.sqlite");
const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "rules-manifest");
const COUNT_TABLES = [
  "dnd_spell",
  "dnd_spellclasslevel",
  "dnd_spelldomainlevel",
  "dnd_spell_descriptors",
  "idx_spell_class_level",
  "idx_spell_domain_level",
  "dnd_rulebook",
  "dnd_characterclass",
  "dnd_domain",
  "dnd_spellschool",
  "dnd_spellsubschool",
  "dnd_spelldescriptor",
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:manifest:write
  npm run -w data-tools rules:manifest:verify

Writes or verifies data/rules-db-manifest.json against the local rules DB and
data/rules-patches/.
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function relativeToData(filePath: string) {
  return path.relative(localDataDir(), filePath).replace(/\\/g, "/");
}

function readJsonl(filePath: string) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .flatMap((line, index) => {
      const text = line.trim();
      if (!text) return [];
      try {
        return [{ line: index + 1, value: JSON.parse(text) as unknown }];
      } catch (error) {
        throw new Error(
          `${filePath}:${index + 1}: invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
}

function isInsertSpell(value: unknown): value is InsertSpellOperation {
  return typeof value === "object" && value !== null && (value as { op?: unknown }).op === "insertSpell";
}

function listPatchFiles() {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && /\.(jsonl|sql)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  visit(PATCH_ROOT);
  return files.sort((a, b) => relativeToData(a).localeCompare(relativeToData(b)));
}

function tableExists(db: Database.Database, table: string) {
  const row = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?")
    .get(table) as { ok: number } | undefined;
  return Boolean(row);
}

function countRows(db: Database.Database, table: string) {
  if (!tableExists(db, table)) return 0;
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
    count: number;
  };
  return row.count;
}

function normalized(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function verifySpellOperation(
  db: Database.Database,
  patchPath: string,
  line: number,
  op: InsertSpellOperation,
): SpellOperationCheck {
  const id = typeof op.id === "number" ? op.id : null;
  const name = typeof op.spell?.name === "string" ? op.spell.name : null;
  const rulebook = typeof op.source?.rulebook === "string" ? op.source.rulebook : null;
  const issues: string[] = [];

  if (id === null) issues.push("operation id is missing");
  if (!name) issues.push("spell name is missing");
  if (!rulebook) issues.push("source rulebook is missing");

  const spell =
    id === null
      ? undefined
      : (db
          .prepare(
            `
            SELECT s.id, s.name, s.slug, rb.abbr AS rulebook
            FROM dnd_spell s
            JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
            WHERE s.id = ?
          `,
          )
          .get(id) as
          | { id: number; name: string; slug: string; rulebook: string }
          | undefined);

  if (!spell) {
    issues.push("spell id is missing from dnd_spell");
  } else {
    if (name && spell.name !== name) {
      issues.push(`name mismatch: db=${spell.name}`);
    }
    if (rulebook && spell.rulebook !== rulebook) {
      issues.push(`rulebook mismatch: db=${spell.rulebook}`);
    }
    if (op.spell?.slug && spell.slug !== op.spell.slug) {
      issues.push(`slug mismatch: db=${spell.slug}`);
    }
  }

  for (const level of op.levels?.classes ?? []) {
    if (!level.class || typeof level.level !== "number") continue;
    const row = db
      .prepare(
        `
        SELECT 1 AS ok
        FROM dnd_spellclasslevel scl
        JOIN dnd_characterclass cc ON cc.id = scl.character_class_id
        WHERE scl.spell_id = ?
          AND lower(cc.name) = lower(?)
          AND scl.level = ?
          AND COALESCE(scl.extra, '') = ?
      `,
      )
      .get(id, level.class, level.level, level.extra ?? "") as
      | { ok: number }
      | undefined;
    if (!row) {
      issues.push(`missing class level: ${level.class} ${level.level}`);
    }
  }

  for (const level of op.levels?.domains ?? []) {
    if (!level.domain || typeof level.level !== "number") continue;
    const row = db
      .prepare(
        `
        SELECT 1 AS ok
        FROM dnd_spelldomainlevel sdl
        JOIN dnd_domain d ON d.id = sdl.domain_id
        WHERE sdl.spell_id = ?
          AND lower(d.name) = lower(?)
          AND sdl.level = ?
          AND COALESCE(sdl.extra, '') = ?
      `,
      )
      .get(id, level.domain, level.level, level.extra ?? "") as
      | { ok: number }
      | undefined;
    if (!row) {
      issues.push(`missing domain level: ${level.domain} ${level.level}`);
    }
  }

  for (const descriptor of op.descriptors ?? []) {
    const row = db
      .prepare(
        `
        SELECT 1 AS ok
        FROM dnd_spell_descriptors sd
        JOIN dnd_spelldescriptor d ON d.id = sd.spelldescriptor_id
        WHERE sd.spell_id = ? AND lower(d.name) = lower(?)
      `,
      )
      .get(id, descriptor) as { ok: number } | undefined;
    if (!row) issues.push(`missing descriptor: ${descriptor}`);
  }

  const status =
    !spell || issues.includes("spell id is missing from dnd_spell")
      ? "missing"
      : issues.length > 0
        ? "mismatch"
        : "verified";

  return { patchPath, line, id, name, rulebook, status, issues };
}

function buildManifest() {
  const dbPath = rulesDbPath();
  const stat = fs.statSync(dbPath);
  const db = new Database(dbPath, { readonly: true });
  try {
    const spellChecks: SpellOperationCheck[] = [];
    const patches = listPatchFiles().map((filePath): PatchManifest => {
      const relativePath = relativeToData(filePath);
      const patchStat = fs.statSync(filePath);
      const kind = filePath.toLowerCase().endsWith(".sql")
        ? "legacy-sql"
        : "spell-jsonl";

      if (kind === "spell-jsonl") {
        const operations = readJsonl(filePath).filter((entry) =>
          isInsertSpell(entry.value),
        );
        const checks = operations.map((entry) =>
          verifySpellOperation(
            db,
            relativePath,
            entry.line,
            entry.value as InsertSpellOperation,
          ),
        );
        spellChecks.push(...checks);
        return {
          path: relativePath,
          kind,
          sha256: sha256(filePath),
          bytes: patchStat.size,
          operations: {
            total: checks.length,
            verified: checks.filter((check) => check.status === "verified").length,
            missing: checks.filter((check) => check.status === "missing").length,
            mismatch: checks.filter((check) => check.status === "mismatch").length,
          },
        };
      }

      return {
        path: relativePath,
        kind,
        sha256: sha256(filePath),
        bytes: patchStat.size,
      };
    });

    const tableCounts = Object.fromEntries(
      COUNT_TABLES.map((table) => [table, countRows(db, table)]),
    );
    const classIndexRowsMatch =
      tableCounts.idx_spell_class_level === tableCounts.dnd_spellclasslevel;
    const domainIndexRowsMatch =
      tableCounts.idx_spell_domain_level === tableCounts.dnd_spelldomainlevel;

    const manifest: RulesManifest = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      database: {
        logicalName: "rules-clean.sqlite",
        relativePath: DB_RELATIVE_PATH.replace(/\\/g, "/"),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        sha256: sha256(dbPath),
        sqlite: {
          userVersion: db.pragma("user_version", { simple: true }) as number,
          applicationId: db.pragma("application_id", { simple: true }) as number,
          schemaVersion: db.pragma("schema_version", { simple: true }) as number,
        },
        tableCounts,
      },
      patches,
      checks: {
        legacySql: {
          indexTablesPresent:
            tableExists(db, "idx_spell_class_level") &&
            tableExists(db, "idx_spell_domain_level"),
          classIndexRowsMatch,
          domainIndexRowsMatch,
        },
        spellJsonl: {
          totalOperations: spellChecks.length,
          verified: spellChecks.filter((check) => check.status === "verified").length,
          missing: spellChecks.filter((check) => check.status === "missing").length,
          mismatch: spellChecks.filter((check) => check.status === "mismatch").length,
          issues: spellChecks.filter((check) => check.status !== "verified"),
        },
      },
    };

    return manifest;
  } finally {
    db.close();
  }
}

function stableManifestForCompare(manifest: RulesManifest) {
  const { generatedAt: _generatedAt, database, ...rest } = manifest;
  const { mtime: _mtime, ...stableDatabase } = database;
  return { ...rest, database: stableDatabase };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeReport(mode: Mode, manifest: RulesManifest, errors: string[]) {
  const reportPath = path.join(REPORT_ROOT, `${timestamp()}-${mode}.json`);
  writeJson(reportPath, { mode, errors, manifest });
  return reportPath;
}

function runWrite() {
  const manifest = buildManifest();
  writeJson(MANIFEST_PATH, manifest);
  const reportPath = writeReport("write", manifest, []);
  console.log("Rules DB manifest written");
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Report: ${reportPath}`);
  console.log(
    JSON.stringify(
      {
        dbSha256: manifest.database.sha256,
        patches: manifest.patches.length,
        spellOperations: manifest.checks.spellJsonl,
        legacySql: manifest.checks.legacySql,
      },
      null,
      2,
    ),
  );
}

function runVerify() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }
  const expected = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as RulesManifest;
  const actual = buildManifest();
  const errors: string[] = [];

  if (
    JSON.stringify(stableManifestForCompare(expected)) !==
    JSON.stringify(stableManifestForCompare(actual))
  ) {
    errors.push("rules DB manifest differs from current DB or patch files");
  }
  if (!actual.checks.legacySql.indexTablesPresent) {
    errors.push("legacy SQL index tables are missing");
  }
  if (!actual.checks.legacySql.classIndexRowsMatch) {
    errors.push("class index row count does not match dnd_spellclasslevel");
  }
  if (!actual.checks.legacySql.domainIndexRowsMatch) {
    errors.push("domain index row count does not match dnd_spelldomainlevel");
  }
  if (actual.checks.spellJsonl.missing > 0 || actual.checks.spellJsonl.mismatch > 0) {
    errors.push("one or more structured spell patch operations are not present in rules DB");
  }

  const reportPath = writeReport("verify", actual, errors);
  if (errors.length > 0) {
    console.error("Rules DB manifest verification failed");
    for (const error of errors) console.error(`- ${error}`);
    console.error(`Report: ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  console.log("Rules DB manifest verification OK");
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Report: ${reportPath}`);
  console.log(
    JSON.stringify(
      {
        dbSha256: actual.database.sha256,
        patches: actual.patches.length,
        spellOperations: actual.checks.spellJsonl,
        legacySql: actual.checks.legacySql,
      },
      null,
      2,
    ),
  );
}

function main() {
  const command = process.argv[2];
  if (command === "write") {
    runWrite();
    return;
  }
  if (command === "verify") {
    runVerify();
    return;
  }
  usage();
}

main();
