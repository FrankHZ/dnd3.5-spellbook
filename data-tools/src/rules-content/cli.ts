import Database from "better-sqlite3";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  auditNormalizedContent,
  normalizeRulesContent,
  type LegacyDescriptorRow,
  type LegacyListEntryRow,
  type LegacyRulebookRow,
  type LegacyRulesContentInput,
  type LegacySpellRow,
  type NormalizedRulesContent,
} from "./normalize";
import {
  loadServerEnv,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

const OUT_ROOT = path.join(repoRoot(), "data-tools", "out", "rules-content");
const DEFAULT_GENERATED_PATH = path.join(OUT_ROOT, "rules-content.generated.json");

const GENERATED_TABLES = [
  "RulesContentBuild",
  "RulesContentIssue",
  "SpellMechanicFacet",
  "SpellComponent",
  "SpellListEntry",
  "SpellTaxonomyFacet",
  "SpellAppearance",
  "SpellContent",
  "RulebookContent",
] as const;

const BASE_COMPONENT_TYPES = [
  "verbal",
  "somatic",
  "material",
  "arcane_focus",
  "divine_focus",
  "xp",
  "metabreath",
  "truename",
  "corrupt",
] as const;

type BuildProvenance = {
  parentRepoCommit: string | null;
  dataRepoCommit: string | null;
  rulesManifestSha256: string | null;
  rulesDbSha256: string | null;
  migrationSetSha256: string | null;
  buildMetaJson: string;
};

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:content:audit -- [--limit 100]
  npm run -w data-tools rules:content:generate -- [--limit 100] [--output data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:import -- --dry-run [--input data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:import -- [--input data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:parity

Audit and generate normalized spell-facing content from the local read-only rules
DB. Import replaces only the generated rules-content tables in
CONTENT_DATABASE_URL. Parity compares the current rules DB and content DB without
writing either database.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  let limit: number | null = null;
  let output = DEFAULT_GENERATED_PATH;
  let input = DEFAULT_GENERATED_PATH;
  let dryRun = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--limit") {
      const next = rest[index + 1];
      if (!next || !Number.isInteger(Number(next)) || Number(next) < 1) {
        usage();
      }
      limit = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--output") {
      const next = rest[index + 1];
      if (!next) usage();
      output = resolveCliPath(next);
      index += 1;
      continue;
    }
    if (arg === "--input") {
      const next = rest[index + 1];
      if (!next) usage();
      input = resolveCliPath(next);
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    usage();
  }

  if (
    command !== "audit" &&
    command !== "generate" &&
    command !== "import" &&
    command !== "parity"
  ) {
    usage();
  }

  return { command, limit, output, input, dryRun };
}

function resolveCliPath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
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

function contentDbPath() {
  loadServerEnv();
  const raw = process.env.CONTENT_DATABASE_URL ?? process.env.APP_DATABASE_URL;
  if (!raw) {
    throw new Error(
      "CONTENT_DATABASE_URL or transitional APP_DATABASE_URL is not set",
    );
  }
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function readLegacyInput(db: Database.Database, limit: number | null) {
  const limitClause = limit ? "LIMIT ?" : "";
  const limitArgs = limit ? [limit] : [];

  const rulebooks = db
    .prepare(
      `
      SELECT id, dnd_edition_id AS dndEditionId, name, abbr, slug, description
      FROM dnd_rulebook
      ORDER BY id
    `,
    )
    .all() as LegacyRulebookRow[];

  const spells = db
    .prepare(
      `
      SELECT s.id,
             s.added,
             s.rulebook_id AS rulebookId,
             s.page,
             s.name,
             s.slug,
             s.school_id AS schoolId,
             school.name AS schoolName,
             school.slug AS schoolSlug,
             s.sub_school_id AS subSchoolId,
             subschool.name AS subSchoolName,
             subschool.slug AS subSchoolSlug,
             s.verbal_component AS verbalComponent,
             s.somatic_component AS somaticComponent,
             s.material_component AS materialComponent,
             s.arcane_focus_component AS arcaneFocusComponent,
             s.divine_focus_component AS divineFocusComponent,
             s.xp_component AS xpComponent,
             s.meta_breath_component AS metaBreathComponent,
             s.true_name_component AS trueNameComponent,
             s.corrupt_component AS corruptComponent,
             s.corrupt_level AS corruptLevel,
             s.extra_components AS extraComponents,
             s.casting_time AS castingTime,
             s.range,
             s.target,
             s.effect,
             s.area,
             s.duration,
             s.saving_throw AS savingThrow,
             s.spell_resistance AS spellResistance,
             s.description,
             s.description_html AS descriptionHtml,
             s.verified,
             s.verified_author_id AS verifiedAuthorId,
             s.verified_time AS verifiedTime
      FROM dnd_spell s
      JOIN dnd_spellschool school ON school.id = s.school_id
      LEFT JOIN dnd_spellsubschool subschool ON subschool.id = s.sub_school_id
      ORDER BY s.id
      ${limitClause}
    `,
    )
    .all(...limitArgs)
    .map((row) => coerceSpellRow(row as Record<string, unknown>));

  const spellIds = spells.map((spell) => spell.id);
  const descriptors =
    spellIds.length === 0
      ? []
      : (db
          .prepare(
            `
            SELECT sd.spell_id AS spellId,
                   d.id AS descriptorId,
                   d.name,
                   d.slug
            FROM dnd_spell_descriptors sd
            JOIN dnd_spelldescriptor d ON d.id = sd.spelldescriptor_id
            WHERE sd.spell_id IN (${placeholders(spellIds)})
            ORDER BY sd.spell_id, d.name
          `,
          )
          .all(...spellIds) as LegacyDescriptorRow[]);

  const classEntries =
    spellIds.length === 0
      ? []
      : (db
          .prepare(
            `
            SELECT scl.id,
                   scl.spell_id AS spellId,
                   'class' AS listType,
                   c.id AS ownerId,
                   c.name AS ownerName,
                   c.slug AS ownerSlug,
                   c.prestige AS ownerPrestige,
                   scl.level,
                   idx.rulebook_id AS rulebookId,
                   scl.extra,
                   'dnd_spellclasslevel' AS sourceTable
            FROM dnd_spellclasslevel scl
            JOIN dnd_characterclass c ON c.id = scl.character_class_id
            LEFT JOIN idx_spell_class_level idx
              ON idx.spell_id = scl.spell_id
             AND idx.class_id = scl.character_class_id
             AND idx.level = scl.level
             AND COALESCE(idx.extra, '') = COALESCE(scl.extra, '')
            WHERE scl.spell_id IN (${placeholders(spellIds)})
            ORDER BY scl.spell_id, scl.level, c.name, scl.id
          `,
          )
          .all(...spellIds) as LegacyListEntryRow[]);

  const domainEntries =
    spellIds.length === 0
      ? []
      : (db
          .prepare(
            `
            SELECT sdl.id,
                   sdl.spell_id AS spellId,
                   'domain' AS listType,
                   d.id AS ownerId,
                   d.name AS ownerName,
                   d.slug AS ownerSlug,
                   0 AS ownerPrestige,
                   sdl.level,
                   idx.rulebook_id AS rulebookId,
                   sdl.extra,
                   'dnd_spelldomainlevel' AS sourceTable
            FROM dnd_spelldomainlevel sdl
            JOIN dnd_domain d ON d.id = sdl.domain_id
            LEFT JOIN idx_spell_domain_level idx
              ON idx.spell_id = sdl.spell_id
             AND idx.domain_id = sdl.domain_id
             AND idx.level = sdl.level
             AND COALESCE(idx.extra, '') = COALESCE(sdl.extra, '')
            WHERE sdl.spell_id IN (${placeholders(spellIds)})
            ORDER BY sdl.spell_id, sdl.level, d.name, sdl.id
          `,
          )
          .all(...spellIds) as LegacyListEntryRow[]);

  return {
    rulebooks,
    spells,
    descriptors,
    listEntries: [...classEntries, ...domainEntries],
  } satisfies LegacyRulesContentInput;
}

function coerceSpellRow(row: Record<string, unknown>): LegacySpellRow {
  return {
    id: Number(row.id),
    added: String(row.added),
    rulebookId: Number(row.rulebookId),
    page: nullableNumber(row.page),
    name: String(row.name),
    slug: String(row.slug),
    schoolId: Number(row.schoolId),
    schoolName: String(row.schoolName),
    schoolSlug: String(row.schoolSlug),
    subSchoolId: nullableNumber(row.subSchoolId),
    subSchoolName: nullableString(row.subSchoolName),
    subSchoolSlug: nullableString(row.subSchoolSlug),
    verbalComponent: Boolean(row.verbalComponent),
    somaticComponent: Boolean(row.somaticComponent),
    materialComponent: Boolean(row.materialComponent),
    arcaneFocusComponent: Boolean(row.arcaneFocusComponent),
    divineFocusComponent: Boolean(row.divineFocusComponent),
    xpComponent: Boolean(row.xpComponent),
    metaBreathComponent: Boolean(row.metaBreathComponent),
    trueNameComponent: Boolean(row.trueNameComponent),
    corruptComponent: Boolean(row.corruptComponent),
    corruptLevel: nullableNumber(row.corruptLevel),
    extraComponents: nullableString(row.extraComponents),
    castingTime: nullableString(row.castingTime),
    range: nullableString(row.range),
    target: nullableString(row.target),
    effect: nullableString(row.effect),
    area: nullableString(row.area),
    duration: nullableString(row.duration),
    savingThrow: nullableString(row.savingThrow),
    spellResistance: nullableString(row.spellResistance),
    description: String(row.description),
    descriptionHtml: nullableString(row.descriptionHtml),
    verified: Boolean(row.verified),
    verifiedAuthorId: nullableNumber(row.verifiedAuthorId),
    verifiedTime: nullableString(row.verifiedTime),
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function placeholders(values: unknown[]) {
  return values.map(() => "?").join(", ");
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readGenerated(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Generated content file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as NormalizedRulesContent;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function tableExists(db: Database.Database, table: string) {
  const row = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { ok: number } | undefined;
  return Boolean(row);
}

function assertGeneratedTables(db: Database.Database) {
  const missing = GENERATED_TABLES.filter((table) => !tableExists(db, table));
  if (missing.length > 0) {
    throw new Error(
      `Rules content tables are missing. Apply server/db/content migrations first: ${missing.join(", ")}`,
    );
  }
}

function importGenerated(
  db: Database.Database,
  content: NormalizedRulesContent,
  dryRun: boolean,
  inputPath: string,
) {
  assertGeneratedTables(db);
  const counts = content.counts;
  const inputSha256 = sha256File(inputPath);
  const provenance = collectBuildProvenance(inputPath);
  if (dryRun) return { ...counts, inputSha256, provenance };

  const run = db.transaction(() => {
    for (const table of GENERATED_TABLES) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }

    db.prepare(
      `
      INSERT INTO "RulesContentBuild" (
        id,
        sourceKind,
        sourceSha256,
        generatorVersion,
        generatedAt,
        spellCount,
        issueCount,
        parentRepoCommit,
        dataRepoCommit,
        rulesManifestSha256,
        rulesDbSha256,
        migrationSetSha256,
        buildMetaJson
      ) VALUES (
        @id,
        'rules-clean',
        @sourceSha256,
        @generatorVersion,
        @generatedAt,
        @spellCount,
        @issueCount,
        @parentRepoCommit,
        @dataRepoCommit,
        @rulesManifestSha256,
        @rulesDbSha256,
        @migrationSetSha256,
        @buildMetaJson
      )
    `,
    ).run({
      id: `rules-content:${content.generatedAt}`,
      sourceSha256: inputSha256,
      generatorVersion: content.generatorVersion,
      generatedAt: content.generatedAt,
      spellCount: content.counts.spells,
      issueCount: content.counts.issues,
      ...provenance,
    });

    insertRows(db, "RulebookContent", content.rulebooks);
    insertRows(db, "SpellContent", content.spells);
    insertRows(db, "SpellAppearance", content.appearances);
    insertRows(db, "SpellTaxonomyFacet", content.taxonomyFacets);
    insertRows(db, "SpellListEntry", content.listEntries);
    insertRows(db, "SpellComponent", content.components);
    insertRows(db, "SpellMechanicFacet", content.mechanicFacets);
    insertRows(db, "RulesContentIssue", content.issues);
  });

  run();
  return { ...counts, inputSha256, provenance };
}

function insertRows(
  db: Database.Database,
  table: string,
  rows: Array<Record<string, unknown>>,
) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0] ?? {});
  const columnSql = columns.map((column) => `"${column}"`).join(", ");
  const valueSql = columns.map((column) => `@${column}`).join(", ");
  const statement = db.prepare(
    `INSERT INTO "${table}" (${columnSql}) VALUES (${valueSql})`,
  );
  for (const row of rows) statement.run(toSqliteParams(row));
}

function toSqliteParams(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "boolean" ? (value ? 1 : 0) : value ?? null,
    ]),
  );
}

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectBuildProvenance(inputPath: string): BuildProvenance {
  const root = repoRoot();
  const dataRoot = path.join(root, "data");
  const rulesManifestPath = path.join(dataRoot, "rules-db-manifest.json");
  const contentMigrationsPath = path.join(root, "server", "db", "content", "migrations");
  const rulesManifest = readJsonIfExists(rulesManifestPath);
  const rulesDbHash =
    readManifestDatabaseHash(rulesManifest) ?? hashFileIfExists(rulesDbPath());

  const buildMeta = {
    schema: "rules-content-build-meta.v1",
    generatedInput: relativeRepoPath(inputPath),
    generatedInputSha256: sha256File(inputPath),
    rulesManifest: fs.existsSync(rulesManifestPath)
      ? relativeRepoPath(rulesManifestPath)
      : null,
    rulesDb: relativeRepoPath(rulesDbPath()),
    contentMigrations: relativeRepoPath(contentMigrationsPath),
    parentRepoDirty: gitDirty(root),
    dataRepoDirty: fs.existsSync(path.join(dataRoot, ".git"))
      ? gitDirty(dataRoot)
      : null,
  };

  return {
    parentRepoCommit: gitCommit(root),
    dataRepoCommit: fs.existsSync(path.join(dataRoot, ".git"))
      ? gitCommit(dataRoot)
      : null,
    rulesManifestSha256: hashFileIfExists(rulesManifestPath),
    rulesDbSha256: rulesDbHash,
    migrationSetSha256: hashDirectoryIfExists(contentMigrationsPath),
    buildMetaJson: JSON.stringify(buildMeta),
  };
}

function gitCommit(cwd: string) {
  return runGit(cwd, ["rev-parse", "HEAD"]);
}

function gitDirty(cwd: string) {
  const status = runGit(cwd, ["status", "--porcelain"]);
  return status === null ? null : status.length > 0;
}

function runGit(cwd: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function hashFileIfExists(filePath: string) {
  return fs.existsSync(filePath) ? sha256File(filePath) : null;
}

function hashDirectoryIfExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) return null;
  const hash = crypto.createHash("sha256");
  for (const filePath of listFilesRecursive(dirPath)) {
    hash.update(relativePath(dirPath, filePath), "utf8");
    hash.update("\0");
    hash.update(fs.readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function listFilesRecursive(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(entryPath);
      if (entry.isFile()) return [entryPath];
      return [];
    })
    .sort((left, right) => relativePath(dirPath, left).localeCompare(relativePath(dirPath, right)));
}

function readJsonIfExists(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function readManifestDatabaseHash(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const database = (value as { database?: unknown }).database;
  if (!database || typeof database !== "object") return null;
  const sha256 = (database as { sha256?: unknown }).sha256;
  return typeof sha256 === "string" ? sha256 : null;
}

function relativeRepoPath(filePath: string) {
  return relativePath(repoRoot(), filePath);
}

function relativePath(from: string, to: string) {
  const relative = path.relative(from, to);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.replace(/\\/g, "/")
    : path.basename(to);
}

function runAudit(limit: number | null) {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const content = normalizeRulesContent(readLegacyInput(db, limit));
    const report = auditNormalizedContent(content);
    const reportPath = path.join(OUT_ROOT, `${timestamp()}-audit.json`);
    writeJson(reportPath, report);
    console.log("Rules content audit OK");
    console.log(`Spells: ${content.counts.spells}`);
    console.log(`Issues: ${content.counts.issues}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function runGenerate(limit: number | null, output: string) {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const content = normalizeRulesContent(readLegacyInput(db, limit));
    writeJson(output, content);
    const reportPath = path.join(OUT_ROOT, `${timestamp()}-generate-summary.json`);
    writeJson(reportPath, auditNormalizedContent(content));
    console.log("Rules content generated");
    console.log(`Output: ${output}`);
    console.log(`Spells: ${content.counts.spells}`);
    console.log(`Issues: ${content.counts.issues}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function runImport(input: string, dryRun: boolean) {
  const content = readGenerated(input);
  const db = new Database(contentDbPath());
  try {
    const result = importGenerated(db, content, dryRun, input);
    const reportPath = path.join(
      OUT_ROOT,
      `${timestamp()}-${dryRun ? "import-dry-run" : "import"}.json`,
    );
    writeJson(reportPath, {
      mode: dryRun ? "dry-run" : "import",
      input,
      result,
    });
    console.log(dryRun ? "Rules content import dry-run OK" : "Rules content import OK");
    console.log(`Input: ${input}`);
    console.log(`Spells: ${content.counts.spells}`);
    console.log(`Issues: ${content.counts.issues}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function runParity() {
  const rulesDb = new Database(rulesDbPath(), {
    readonly: true,
    fileMustExist: true,
  });
  const contentDb = new Database(contentDbPath(), {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const report = buildParityReport(rulesDb, contentDb);
    const reportPath = path.join(OUT_ROOT, `${timestamp()}-parity.json`);
    writeJson(reportPath, report);
    if (report.issues.some((issue) => issue.severity === "error")) {
      console.error("Rules content parity failed");
      console.error(`Report: ${reportPath}`);
      process.exit(1);
    }
    console.log("Rules content parity OK");
    console.log(`Spells: ${report.counts.spells.legacy}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    rulesDb.close();
    contentDb.close();
  }
}

function buildParityReport(
  rulesDb: Database.Database,
  contentDb: Database.Database,
) {
  const issues: Array<{
    code: string;
    severity: "error" | "warning";
    detail: string;
    expected?: unknown;
    actual?: unknown;
    samples?: unknown[];
  }> = [];

  const legacySpellRows = rulesDb
    .prepare(
      `
      SELECT id,
             name,
             slug,
             rulebook_id AS rulebookId,
             page,
             corrupt_level AS corruptLevel,
             description,
             description_html AS descriptionHtml,
             added,
             verified,
             verified_author_id AS verifiedAuthorId,
             verified_time AS verifiedTime
      FROM dnd_spell
      ORDER BY id
    `,
    )
    .all() as Array<Record<string, unknown>>;
  const contentSpellRows = contentDb
    .prepare(
      `
      SELECT legacySpellId,
             canonicalName,
             slug,
             sourceRulebookId,
             sourcePage,
             corruptLevel,
             descriptionText,
             descriptionHtml,
             addedAt,
             verified,
             verifiedAuthorId,
             verifiedTime
      FROM SpellContent
      ORDER BY legacySpellId
    `,
    )
    .all() as Array<Record<string, unknown>>;

  const counts = {
    spells: compareCount(
      issues,
      "spell.count",
      legacySpellRows.length,
      contentSpellRows.length,
      "SpellContent row count must match dnd_spell.",
    ),
    rulebooks: compareCount(
      issues,
      "rulebook.count",
      count(rulesDb, "SELECT COUNT(*) AS count FROM dnd_rulebook"),
      count(contentDb, "SELECT COUNT(*) AS count FROM RulebookContent"),
      "RulebookContent row count must match dnd_rulebook.",
    ),
    descriptors: compareCount(
      issues,
      "descriptor.count",
      count(rulesDb, "SELECT COUNT(*) AS count FROM dnd_spell_descriptors"),
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellTaxonomyFacet WHERE facetType = 'descriptor'",
      ),
      "Descriptor facet count must match dnd_spell_descriptors.",
    ),
    classListEntries: compareCount(
      issues,
      "class-list.count",
      count(rulesDb, "SELECT COUNT(*) AS count FROM dnd_spellclasslevel"),
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellListEntry WHERE listType = 'class'",
      ),
      "Class list entry count must match dnd_spellclasslevel.",
    ),
    domainListEntries: compareCount(
      issues,
      "domain-list.count",
      count(rulesDb, "SELECT COUNT(*) AS count FROM dnd_spelldomainlevel"),
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellListEntry WHERE listType = 'domain'",
      ),
      "Domain list entry count must match dnd_spelldomainlevel.",
    ),
    corruptSpells: compareCount(
      issues,
      "corrupt-spell.count",
      count(
        rulesDb,
        "SELECT COUNT(*) AS count FROM dnd_spell WHERE corrupt_level IS NOT NULL",
      ),
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellContent WHERE corruptLevel IS NOT NULL",
      ),
      "Corrupt spell count must match.",
    ),
    prestigeClassListEntries: compareCount(
      issues,
      "prestige-list.count",
      count(
        rulesDb,
        `
        SELECT COUNT(*) AS count
        FROM dnd_spellclasslevel scl
        JOIN dnd_characterclass c ON c.id = scl.character_class_id
        WHERE c.prestige = 1
      `,
      ),
      count(
        contentDb,
        `
        SELECT COUNT(*) AS count
        FROM SpellListEntry
        WHERE listType = 'class' AND ownerPrestige = 1
      `,
      ),
      "Prestige class list entry count must match.",
    ),
    components: compareCount(
      issues,
      "component-base.count",
      legacySpellRows.length * BASE_COMPONENT_TYPES.length,
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellComponent WHERE componentType != 'other'",
      ),
      "Base component rows must include every component type for every spell.",
    ),
    extraComponents: compareCount(
      issues,
      "component-extra.count",
      count(
        rulesDb,
        `
        SELECT COUNT(*) AS count
        FROM dnd_spell
        WHERE extra_components IS NOT NULL AND TRIM(extra_components) != ''
      `,
      ),
      count(
        contentDb,
        "SELECT COUNT(*) AS count FROM SpellComponent WHERE componentType = 'other'",
      ),
      "Extra component rows must match non-empty extra_components values.",
    ),
  };

  const contentById = new Map(
    contentSpellRows.map((row) => [Number(row.legacySpellId), row]),
  );
  const fieldMismatches = [];
  for (const legacy of legacySpellRows) {
    const id = Number(legacy.id);
    const content = contentById.get(id);
    if (!content) {
      fieldMismatches.push({ id, reason: "missing-content-row" });
      continue;
    }
    const checks: Array<[string, unknown, unknown]> = [
      ["name", legacy.name, content.canonicalName],
      ["slug", legacy.slug, content.slug],
      ["rulebookId", Number(legacy.rulebookId), Number(content.sourceRulebookId)],
      ["page", normalizeNullableNumber(legacy.page), normalizeNullableNumber(content.sourcePage)],
      ["corruptLevel", normalizeNullableNumber(legacy.corruptLevel), normalizeNullableNumber(content.corruptLevel)],
      ["description", legacy.description, content.descriptionText],
      ["descriptionHtml", legacy.descriptionHtml, content.descriptionHtml],
      ["added", normalizeDateString(legacy.added), normalizeDateString(content.addedAt)],
      ["verified", Boolean(legacy.verified), Boolean(content.verified)],
      ["verifiedAuthorId", normalizeNullableNumber(legacy.verifiedAuthorId), normalizeNullableNumber(content.verifiedAuthorId)],
      ["verifiedTime", normalizeDateString(legacy.verifiedTime), normalizeDateString(content.verifiedTime)],
    ];
    for (const [field, expected, actual] of checks) {
      if (expected !== actual) {
        fieldMismatches.push({ id, field, expected, actual });
        break;
      }
    }
    if (fieldMismatches.length >= 20) break;
  }

  if (fieldMismatches.length > 0) {
    issues.push({
      code: "spell.field-mismatch",
      severity: "error",
      detail: "SpellContent key display/detail fields must match dnd_spell.",
      samples: fieldMismatches,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    ok: issues.every((issue) => issue.severity !== "error"),
    counts,
    issues,
  };
}

function count(db: Database.Database, sql: string) {
  const row = db.prepare(sql).get() as { count: number | bigint } | undefined;
  return Number(row?.count ?? 0);
}

function compareCount(
  issues: Array<{
    code: string;
    severity: "error" | "warning";
    detail: string;
    expected?: unknown;
    actual?: unknown;
    samples?: unknown[];
  }>,
  code: string,
  legacy: number,
  content: number,
  detail: string,
) {
  if (legacy !== content) {
    issues.push({
      code,
      severity: "error",
      detail,
      expected: legacy,
      actual: content,
    });
  }
  return { legacy, content };
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function normalizeDateString(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "audit") return runAudit(args.limit);
  if (args.command === "generate") return runGenerate(args.limit, args.output);
  if (args.command === "import") return runImport(args.input, args.dryRun);
  if (args.command === "parity") return runParity();
  usage();
}

main();
