import Database from "better-sqlite3";
import crypto from "node:crypto";
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

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:content:audit -- [--limit 100]
  npm run -w data-tools rules:content:generate -- [--limit 100] [--output data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:import -- --dry-run [--input data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:import -- [--input data-tools/out/rules-content/rules-content.generated.json]

Audit and generate normalized spell-facing content from the local read-only rules
DB. Import replaces only the generated rules-content tables in
CONTENT_DATABASE_URL.
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
    command !== "import"
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
             s.description_html AS descriptionHtml
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
  if (dryRun) return { ...counts, inputSha256: sha256File(inputPath) };

  const run = db.transaction(() => {
    for (const table of GENERATED_TABLES) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }

    db.prepare(
      `
      INSERT INTO "RulesContentBuild" (
        id, sourceKind, sourceSha256, generatorVersion, generatedAt, spellCount, issueCount
      ) VALUES (
        @id, 'rules-clean', @sourceSha256, @generatorVersion, @generatedAt, @spellCount, @issueCount
      )
    `,
    ).run({
      id: `rules-content:${content.generatedAt}`,
      sourceSha256: sha256File(inputPath),
      generatorVersion: content.generatorVersion,
      generatedAt: content.generatedAt,
      spellCount: content.counts.spells,
      issueCount: content.counts.issues,
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
  return { ...counts, inputSha256: sha256File(inputPath) };
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "audit") return runAudit(args.limit);
  if (args.command === "generate") return runGenerate(args.limit, args.output);
  if (args.command === "import") return runImport(args.input, args.dryRun);
  usage();
}

main();
