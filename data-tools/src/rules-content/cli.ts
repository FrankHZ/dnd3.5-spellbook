import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  assertImportableRulesContentArtifact,
  assertRulesContentArtifact,
  collectRulesContentArtifactProvenance,
  createRulesContentArtifactMetadata,
  resolveRulesContentGenerationOutput,
  sha256File,
  verifyRulesContentArtifactProvenance,
  type RulesContentArtifactProvenance,
  type RulesContentProvenancePaths,
  type RulesContentSourceTotals,
} from "./artifact";
import {
  auditNormalizedContent,
  normalizeRulesContent,
  RULES_CONTENT_GENERATOR_VERSION,
  type LegacyDescriptorRow,
  type LegacyListEntryRow,
  type LegacyRulebookRow,
  type LegacyRulesContentInput,
  type LegacySpellRow,
  type NormalizedRulesContent,
} from "./normalize";
import { validateMechanicDisplayValue } from "./mechanics";
import {
  localDataDir,
  loadServerEnv,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";
import {
  normalizePublicationName,
  readRulebookPublicationJsonlText,
} from "../rulebooks/labels-audit";
import {
  deriveRulebookPublicationMetadata,
  readRulebookPublicationMetadataJsonlText,
  type RulebookPublicationMetadataJsonlRow,
} from "../rulebooks/publication-metadata";

const OUT_ROOT = path.join(repoRoot(), "data-tools", "out", "rules-content");
const DEFAULT_GENERATED_PATH = path.join(OUT_ROOT, "rules-content.generated.json");
const DEFAULT_LIMITED_GENERATED_PATH = path.join(
  OUT_ROOT,
  "rules-content.limited.generated.json",
);
const RULEBOOK_PUBLICATION_METADATA_JSONL_PATH = path.join(
  localDataDir(),
  "rulebook-publications",
  "publications.jsonl",
);
const CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH = path.join(
  localDataDir(),
  "rulebook-labels",
  "chm-publications.jsonl",
);
const RULES_MANIFEST_PATH = path.join(localDataDir(), "rules-db-manifest.json");
const CONTENT_MIGRATIONS_PATH = path.join(
  repoRoot(),
  "server",
  "db",
  "content",
  "migrations",
);

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

export type RulesContentImportContext = {
  currentProvenance: RulesContentArtifactProvenance;
  importedAt: string;
};

type RulesContentBuildMetaRow = {
  id: string;
  sourceKind: string;
  sourceSha256: string | null;
  generatorVersion: string;
  generatedAt: string;
  spellCount: number;
  issueCount: number;
  parentRepoCommit: string | null;
  dataRepoCommit: string | null;
  rulesManifestSha256: string | null;
  rulesDbSha256: string | null;
  migrationSetSha256: string | null;
  buildMetaJson: unknown;
};

type CountRow = Record<string, unknown> & {
  count: number | bigint;
};

type ReviewReadiness = {
  family: string;
  status: "ready" | "needs_normalization" | "defer" | "detail_only";
  reason: string;
  evidence: Record<string, unknown>;
};

type RulebookPublicationMetadataRow = {
  displayAbbr: string;
  zhName?: string | undefined;
  category?: RulebookPublicationMetadataJsonlRow["category"];
  family?: RulebookPublicationMetadataJsonlRow["family"];
  sourceKind?: RulebookPublicationMetadataJsonlRow["sourceKind"];
  displayOrder?: RulebookPublicationMetadataJsonlRow["displayOrder"];
  year?: RulebookPublicationMetadataJsonlRow["year"];
  published?: RulebookPublicationMetadataJsonlRow["published"];
  officialUrl?: RulebookPublicationMetadataJsonlRow["officialUrl"];
  image?: RulebookPublicationMetadataJsonlRow["image"];
  reviewStatus?: RulebookPublicationMetadataJsonlRow["reviewStatus"];
};

const TOME_OF_BATTLE_DISCIPLINES = [
  "desert wind",
  "devoted spirit",
  "diamond mind",
  "iron heart",
  "setting sun",
  "shadow hand",
  "stone dragon",
  "tiger claw",
  "white raven",
] as const;

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:content:audit -- [--limit 100]
  npm run -w data-tools rules:content:generate -- [--output data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:generate -- --audit-only [--limit 100] [--output data-tools/out/rules-content/rules-content.limited.generated.json]
  npm run -w data-tools rules:content:import -- --dry-run [--input data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:import -- [--input data-tools/out/rules-content/rules-content.generated.json]
  npm run -w data-tools rules:content:meta
  npm run -w data-tools rules:content:parity
  npm run -w data-tools rules:content:review

Audit and generate normalized spell-facing content from the local read-only rules
DB. Import replaces only the generated rules-content tables in
CONTENT_DATABASE_URL. Parity compares the current rules DB and content DB without
writing either database. Review inventories normalized taxonomy, component, and
mechanic facets from CONTENT_DATABASE_URL without writing the database.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  let limit: number | null = null;
  let output: string | null = null;
  let input = DEFAULT_GENERATED_PATH;
  let dryRun = false;
  let auditOnly = false;

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
    if (arg === "--audit-only") {
      auditOnly = true;
      continue;
    }
    usage();
  }

  if (
    command !== "audit" &&
    command !== "generate" &&
    command !== "import" &&
    command !== "meta" &&
    command !== "parity" &&
    command !== "review"
  ) {
    usage();
  }

  if (command !== "generate" && auditOnly) usage();

  const resolvedOutput =
    command === "generate"
      ? resolveRulesContentGenerationOutput({
          auditOnly,
          limit,
          requestedOutput: output,
          fullOutput: DEFAULT_GENERATED_PATH,
          limitedOutput: DEFAULT_LIMITED_GENERATED_PATH,
        })
      : (output ?? DEFAULT_GENERATED_PATH);

  return {
    command,
    limit,
    output: resolvedOutput,
    input,
    dryRun,
    auditOnly,
  };
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

function readLegacyInput(
  db: Database.Database,
  limit: number | null,
  requirePublicationMetadata = false,
) {
  const limitClause = limit ? "LIMIT ?" : "";
  const limitArgs = limit ? [limit] : [];

  const rulebookPublicationMetadata = readRulebookPublicationRowsById(
    requirePublicationMetadata,
  );
  const chmPublicationLabels = readChmRulebookPublicationRowsByName();
  const legacyRulebooks = db
    .prepare(
      `
      SELECT rb.id,
             rb.dnd_edition_id AS dndEditionId,
             rb.name,
             rb.abbr,
             rb.slug,
             rb.description,
             NULLIF(TRIM(rb.year), '') AS year,
             rb.published,
             NULLIF(TRIM(rb.official_url), '') AS officialUrl,
             NULLIF(TRIM(rb.image), '') AS image,
             e.slug AS editionSlug,
             e.core AS editionCore
      FROM dnd_rulebook rb
      JOIN dnd_dndedition e ON e.id = rb.dnd_edition_id
      ORDER BY rb.id
    `,
    )
    .all() as LegacyRulebookRow[];
  if (requirePublicationMetadata) {
    const missingRulebookIds = legacyRulebooks
      .map((row) => row.id)
      .filter((id) => !rulebookPublicationMetadata.has(id));
    if (missingRulebookIds.length > 0) {
      throw new Error(
        `Canonical publication metadata is incomplete; missing legacyRulebookId rows: ${missingRulebookIds.join(", ")}`,
      );
    }
  }

  const rulebooks = legacyRulebooks.map((row) => {
    const publicationRow = rulebookPublicationMetadata.get(row.id);
    const chmLabel = chmPublicationLabels.get(normalizePublicationName(row.name));
    const publicationMetadata = deriveRulebookPublicationMetadata(row, {
      category: publicationRow?.category,
      family: publicationRow?.family,
      sourceKind: publicationRow?.sourceKind,
      displayOrder: publicationRow?.displayOrder,
      reviewStatus: publicationRow?.reviewStatus,
    });
    const displayAbbr =
      displayOverride(publicationRow?.displayAbbr, row.abbr) ??
      displayOverride(chmLabel?.displayAbbr, row.abbr);
    const acceptedPublicationFields =
      publicationRow?.reviewStatus === "accepted" ? publicationRow : null;
    return {
      ...row,
      displayAbbr,
      publicationCategory: publicationMetadata.category,
      publicationFamily: publicationMetadata.family,
      publicationSourceKind: publicationMetadata.sourceKind,
      publicationDisplayOrder: publicationMetadata.displayOrder,
      publicationYear: acceptedPublicationFields?.year ?? null,
      publicationDate: acceptedPublicationFields?.published ?? null,
      publicationUrl: acceptedPublicationFields?.officialUrl ?? null,
      publicationImage: acceptedPublicationFields?.image ?? null,
      publicationReviewStatus: publicationMetadata.reviewStatus,
    };
  });

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

function readLegacySourceTotals(db: Database.Database): RulesContentSourceTotals {
  const tableCount = (table: string) =>
    Number(
      (
        db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as {
          count: number | bigint;
        }
      ).count,
    );
  return {
    rulebooks: tableCount("dnd_rulebook"),
    spells: tableCount("dnd_spell"),
    descriptors: tableCount("dnd_spell_descriptors"),
    classListEntries: tableCount("dnd_spellclasslevel"),
    domainListEntries: tableCount("dnd_spelldomainlevel"),
  };
}

function readRulebookPublicationRowsById(required = false) {
  const byId = new Map<number, RulebookPublicationMetadataRow>();
  if (!fs.existsSync(RULEBOOK_PUBLICATION_METADATA_JSONL_PATH)) {
    if (required) {
      throw new Error(
        `Importable rules-content generation requires canonical publication metadata: ${RULEBOOK_PUBLICATION_METADATA_JSONL_PATH}`,
      );
    }
    return byId;
  }

  const sourcePath = path.relative(
    localDataDir(),
    RULEBOOK_PUBLICATION_METADATA_JSONL_PATH,
  );
  const parsed = readRulebookPublicationMetadataJsonlText(
    fs.readFileSync(RULEBOOK_PUBLICATION_METADATA_JSONL_PATH, "utf8"),
    sourcePath,
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      `Invalid rulebook publication metadata JSONL ${RULEBOOK_PUBLICATION_METADATA_JSONL_PATH}:\n${parsed.errors.join("\n")}`,
    );
  }

  for (const row of parsed.rows) {
    byId.set(row.legacyRulebookId, {
      displayAbbr: row.displayAbbr ?? row.abbr,
      zhName: row.zhName,
      category: row.category,
      family: row.family,
      sourceKind: row.sourceKind,
      displayOrder: row.displayOrder,
      year: row.year,
      published: row.published,
      officialUrl: row.officialUrl,
      image: row.image,
      reviewStatus: row.reviewStatus,
    });
  }
  return byId;
}

function readChmRulebookPublicationRowsByName() {
  const byName = new Map<string, Pick<RulebookPublicationMetadataRow, "displayAbbr">>();
  if (!fs.existsSync(CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH)) return byName;

  const sourcePath = path.relative(
    localDataDir(),
    CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH,
  );
  const parsed = readRulebookPublicationJsonlText(
    fs.readFileSync(CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH, "utf8"),
    sourcePath,
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      `Invalid CHM rulebook publication JSONL ${CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH}:\n${parsed.errors.join("\n")}`,
    );
  }

  for (const row of parsed.rows) {
    byName.set(normalizePublicationName(row.englishName), {
      displayAbbr: row.displayAbbr,
    });
  }
  return byName;
}

function displayOverride(value: string | null | undefined, sourceAbbr: string) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === sourceAbbr) return null;
  return trimmed;
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

export function readGenerated(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Generated content file not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Generated content must be a JSON object.");
  }
  const content = parsed as NormalizedRulesContent;
  if (content.generatorVersion !== RULES_CONTENT_GENERATOR_VERSION) {
    throw new Error(
      `Generated content uses ${content.generatorVersion ?? "an unknown generator"}; rerun rules:content:generate with ${RULES_CONTENT_GENERATOR_VERSION}.`,
    );
  }
  assertRulesContentArtifact(content);
  if (!Array.isArray(content.mechanicFacets)) {
    throw new Error("Generated content mechanicFacets must be an array.");
  }
  const mechanicErrors = content.mechanicFacets.flatMap((row, index) =>
    validateMechanicDisplayValue(row).map(
      (error) => `mechanicFacets[${index}] ${error}`,
    ),
  );
  if (mechanicErrors.length > 0) {
    throw new Error(
      `Generated mechanics display contract is invalid:\n${mechanicErrors
        .slice(0, 20)
        .join("\n")}`,
    );
  }
  return content;
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

function assertMechanicDisplayColumns(db: Database.Database) {
  const columns = new Set(
    (db.prepare(`PRAGMA table_info("SpellMechanicFacet")`).all() as Array<{
      name: string;
    }>).map((row) => row.name),
  );
  const missing = ["normalizedText", "displayCoverage"].filter(
    (column) => !columns.has(column),
  );
  if (missing.length > 0) {
    throw new Error(
      `SpellMechanicFacet display columns are missing. Apply server/db/content migrations first: ${missing.join(", ")}`,
    );
  }
}

export function importGenerated(
  db: Database.Database,
  content: NormalizedRulesContent,
  dryRun: boolean,
  inputPath: string,
  importContext?: RulesContentImportContext,
) {
  assertImportableRulesContentArtifact(content);
  assertGeneratedTables(db);
  assertMechanicDisplayColumns(db);
  const resolvedImportContext = importContext ?? collectImportContext();
  const counts = content.counts;
  const inputSha256 = sha256File(inputPath);
  const provenance = collectBuildProvenance(
    content,
    inputPath,
    resolvedImportContext,
  );
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

function collectBuildProvenance(
  content: NormalizedRulesContent & {
    artifact: NonNullable<NormalizedRulesContent["artifact"]>;
  },
  inputPath: string,
  importContext: RulesContentImportContext,
): BuildProvenance {
  const generation = content.artifact.provenance;
  verifyRulesContentArtifactProvenance(
    generation,
    importContext.currentProvenance,
  );

  return {
    parentRepoCommit: generation.parentRepo.commit,
    dataRepoCommit: generation.dataRepo?.commit ?? null,
    rulesManifestSha256:
      generation.canonicalInputs.rulesManifest?.sha256 ?? null,
    rulesDbSha256: generation.rulesDb.sha256,
    migrationSetSha256: generation.contentMigrations.sha256,
    buildMetaJson: JSON.stringify({
      schema: "rules-content-build-meta.v2",
      artifact: {
        scope: content.artifact.scope,
        sourceTotals: content.artifact.sourceTotals,
        generation,
      },
      importer: {
        importedAt: importContext.importedAt,
        generatedInput: relativeRepoPath(inputPath),
        generatedInputSha256: sha256File(inputPath),
        current: importContext.currentProvenance,
      },
    }),
  };
}

function collectImportContext(): RulesContentImportContext {
  return {
    currentProvenance: collectRulesContentArtifactProvenance(
      provenancePaths(),
      {
        requireDataRepo: true,
        requireRulesManifest: true,
        requirePublicationMetadata: true,
      },
    ),
    importedAt: new Date().toISOString(),
  };
}

function provenancePaths(): RulesContentProvenancePaths {
  const root = repoRoot();
  return {
    parentRepoRoot: root,
    dataRepoRoot: localDataDir(),
    rulesDbPath: rulesDbPath(),
    rulesManifestPath: RULES_MANIFEST_PATH,
    rulebookPublicationMetadataPath: RULEBOOK_PUBLICATION_METADATA_JSONL_PATH,
    chmRulebookPublicationsPath: CHM_RULEBOOK_PUBLICATIONS_JSONL_PATH,
    contentMigrationsPath: CONTENT_MIGRATIONS_PATH,
  };
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

function runGenerate(
  limit: number | null,
  output: string,
  auditOnly: boolean,
) {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const sourceTotals = readLegacySourceTotals(db);
    const content = normalizeRulesContent(
      readLegacyInput(db, limit, !auditOnly),
    );
    const limitations = [
      ...(auditOnly ? ["audit-only generation"] : []),
      ...(limit === null ? [] : [`spell query limited to ${limit} rows`]),
    ];
    content.artifact = createRulesContentArtifactMetadata({
      scope: auditOnly ? "limited" : "full",
      sourceTotals,
      provenance: collectRulesContentArtifactProvenance(provenancePaths(), {
        requireDataRepo: !auditOnly,
        requireRulesManifest: !auditOnly,
        requirePublicationMetadata: !auditOnly,
      }),
      limitations,
    });
    assertRulesContentArtifact(content);
    writeJson(output, content);
    const reportPath = path.join(OUT_ROOT, `${timestamp()}-generate-summary.json`);
    writeJson(reportPath, auditNormalizedContent(content));
    console.log("Rules content generated");
    console.log(`Artifact scope: ${content.artifact.scope}`);
    console.log(`Importable: ${content.artifact.importable ? "yes" : "no"}`);
    console.log(`Output: ${output}`);
    console.log(`Spells: ${content.counts.spells}`);
    console.log(`Source spells: ${content.artifact.sourceTotals.spells}`);
    console.log(`Issues: ${content.counts.issues}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function runImport(input: string, dryRun: boolean) {
  const content = readGenerated(input);
  assertImportableRulesContentArtifact(content);
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

function runMeta() {
  const contentPath = contentDbPath();
  const db = new Database(contentPath, { readonly: true, fileMustExist: true });
  try {
    const report = buildContentDbMetaReport(db, contentPath);
    const reportPath = path.join(OUT_ROOT, `${timestamp()}-content-db-meta.json`);
    writeJson(reportPath, report);
    console.log("Rules content DB meta OK");
    console.log(`Content DB: ${contentPath}`);
    console.log(`Build parent commit: ${report.rulesContentBuild?.parentRepoCommit ?? "none"}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function runReview() {
  const contentPath = contentDbPath();
  const db = new Database(contentPath, { readonly: true, fileMustExist: true });
  try {
    assertGeneratedTables(db);
    assertMechanicDisplayColumns(db);
    const report = buildNormalizedRulesReviewReport(db, contentPath);
    const reportPath = path.join(
      OUT_ROOT,
      `${timestamp()}-normalized-rules-review.json`,
    );
    writeJson(reportPath, report);
    console.log("Normalized rules review inventory OK");
    console.log(`Content DB: ${contentPath}`);
    console.log(
      `Taxonomy review rows: ${report.taxonomy.reviewStatusCounts.review ?? 0}`,
    );
    console.log(
      `Component review rows: ${report.components.reviewStatusCounts.review ?? 0}`,
    );
    console.log(
      `Mechanic review rows: ${report.mechanics.reviewStatusCounts.review ?? 0}`,
    );
    console.log(
      `Mechanic complete coverage rows: ${report.mechanics.displayCoverageCounts.complete ?? 0}`,
    );
    console.log(`Report: ${reportPath}`);
  } finally {
    db.close();
  }
}

function buildContentDbMetaReport(db: Database.Database, contentPath: string) {
  const build: RulesContentBuildMetaRow | null = tableExists(db, "RulesContentBuild")
    ? (normalizeBuildMetaRow(
        db
        .prepare(
          `
          SELECT id,
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
          FROM RulesContentBuild
          ORDER BY generatedAt DESC
          LIMIT 1
        `,
        )
        .get() as Record<string, unknown> | undefined,
      ))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    contentDb: {
      path: relativeRepoPath(contentPath),
      sha256: sha256File(contentPath),
    },
    rulesContentBuild: build
      ? {
          ...build,
          buildMetaJson: build.buildMetaJson,
        }
      : null,
    counts: Object.fromEntries(
      GENERATED_TABLES.filter((table) => tableExists(db, table)).map((table) => [
        table,
        count(db, `SELECT COUNT(*) AS count FROM "${table}"`),
      ]),
    ),
  };
}

function buildNormalizedRulesReviewReport(
  db: Database.Database,
  contentPath: string,
) {
  assertGeneratedTables(db);
  const meta = buildContentDbMetaReport(db, contentPath);
  const taxonomyByFacetType = queryCountRows(
    db,
    `
    SELECT facetType, COUNT(*) AS count
    FROM SpellTaxonomyFacet
    GROUP BY facetType
    ORDER BY facetType
  `,
  );
  const taxonomyByStatus = queryCountRows(
    db,
    `
    SELECT reviewStatus, COUNT(*) AS count
    FROM SpellTaxonomyFacet
    GROUP BY reviewStatus
    ORDER BY reviewStatus
  `,
  );
  const taxonomyByIssue = queryCountRows(
    db,
    `
    SELECT COALESCE(issueCode, '') AS issueCode, COUNT(*) AS count
    FROM SpellTaxonomyFacet
    GROUP BY COALESCE(issueCode, '')
    ORDER BY count DESC, issueCode
  `,
  );
  const taxonomyValues = queryCountRows(
    db,
    `
    SELECT facetType,
           facetKey,
           name,
           COALESCE(slug, '') AS slug,
           reviewStatus,
           COALESCE(issueCode, '') AS issueCode,
           COUNT(*) AS count
    FROM SpellTaxonomyFacet
    GROUP BY facetType, facetKey, name, COALESCE(slug, ''), reviewStatus, COALESCE(issueCode, '')
    ORDER BY facetType, count DESC, name
  `,
  );
  const tomeOfBattleNames = TOME_OF_BATTLE_DISCIPLINES.map((value) =>
    value.toLowerCase(),
  );
  const tomeOfBattleLikeTaxonomy =
    tomeOfBattleNames.length === 0
      ? []
      : queryCountRows(
          db,
          `
          SELECT facetType,
                 facetKey,
                 name,
                 COALESCE(slug, '') AS slug,
                 reviewStatus,
                 COALESCE(issueCode, '') AS issueCode,
                 COUNT(*) AS count
          FROM SpellTaxonomyFacet
          WHERE lower(name) IN (${placeholders(tomeOfBattleNames)})
             OR lower(name) LIKE '%discipline%'
             OR lower(name) LIKE '%maneuver%'
          GROUP BY facetType, facetKey, name, COALESCE(slug, ''), reviewStatus, COALESCE(issueCode, '')
          ORDER BY count DESC, facetType, name
        `,
          tomeOfBattleNames,
        );

  const componentByType = queryCountRows(
    db,
    `
    SELECT componentType,
           present,
           reviewStatus,
           COALESCE(issueCode, '') AS issueCode,
           COUNT(*) AS count
    FROM SpellComponent
    GROUP BY componentType, present, reviewStatus, COALESCE(issueCode, '')
    ORDER BY componentType, present DESC, reviewStatus, issueCode
  `,
  );
  const componentReviewSamples = queryCountRows(
    db,
    `
    SELECT componentType,
           rawText,
           reviewStatus,
           COALESCE(issueCode, '') AS issueCode,
           COUNT(*) AS count
    FROM SpellComponent
    WHERE reviewStatus = 'review' OR componentType = 'other' OR issueCode IS NOT NULL
    GROUP BY componentType, rawText, reviewStatus, COALESCE(issueCode, '')
    ORDER BY count DESC, componentType, rawText
    LIMIT 100
  `,
  );

  const mechanicByType = queryCountRows(
    db,
    `
    SELECT mechanicType,
           category,
           displayCoverage,
           reviewStatus,
           COALESCE(issueCode, '') AS issueCode,
           COUNT(*) AS count
    FROM SpellMechanicFacet
    GROUP BY mechanicType, category, displayCoverage, reviewStatus, COALESCE(issueCode, '')
    ORDER BY mechanicType, count DESC, category, displayCoverage, reviewStatus, issueCode
  `,
  );
  const mechanicReviewSamples = queryCountRows(
    db,
    `
    SELECT mechanicType,
           category,
           reviewStatus,
           COALESCE(issueCode, '') AS issueCode,
           rawText,
           COUNT(*) AS count
    FROM SpellMechanicFacet
    WHERE reviewStatus = 'review'
       OR issueCode IS NOT NULL
       OR category IN ('special', 'text')
    GROUP BY mechanicType, category, reviewStatus, COALESCE(issueCode, ''), rawText
    ORDER BY count DESC, mechanicType, category, rawText
    LIMIT 200
  `,
  );
  const mechanicCoverageSamples = queryCountRows(
    db,
    `
    WITH grouped AS (
      SELECT mechanicType,
             displayCoverage,
             category,
             normalizedText,
             rawText,
             COUNT(*) AS count
      FROM SpellMechanicFacet
      WHERE displayCoverage <> 'empty'
      GROUP BY mechanicType, displayCoverage, category, normalizedText, rawText
    ), ranked AS (
      SELECT *,
             ROW_NUMBER() OVER (
               PARTITION BY mechanicType, displayCoverage
               ORDER BY count DESC, category, rawText
             ) AS sampleRank
      FROM grouped
    )
    SELECT mechanicType,
           displayCoverage,
           category,
           normalizedText,
           rawText,
           count
    FROM ranked
    WHERE sampleRank <= 10
    ORDER BY mechanicType, displayCoverage, sampleRank
  `,
  );

  const issuesByCode = queryCountRows(
    db,
    `
    SELECT issueCode,
           severity,
           sourceField,
           COUNT(*) AS count
    FROM RulesContentIssue
    GROUP BY issueCode, severity, sourceField
    ORDER BY count DESC, issueCode, sourceField
  `,
  );
  const issueSamples = queryCountRows(
    db,
    `
    SELECT issueCode,
           severity,
           sourceField,
           rawText,
           COUNT(*) AS count
    FROM RulesContentIssue
    GROUP BY issueCode, severity, sourceField, rawText
    ORDER BY count DESC, issueCode, sourceField, rawText
    LIMIT 200
  `,
  );

  const taxonomyReviewStatusCounts = countMap(taxonomyByStatus, "reviewStatus");
  const componentReviewStatusCounts = countMap(componentByType, "reviewStatus");
  const componentReviewByType = groupedCountMap(
    componentByType.filter((row) => String(row.reviewStatus) === "review"),
    "componentType",
  );
  const mechanicReviewStatusCounts = countMap(mechanicByType, "reviewStatus");
  const mechanicReviewByType = groupedCountMap(
    mechanicByType.filter((row) => String(row.reviewStatus) === "review"),
    "mechanicType",
  );
  const mechanicDisplayCoverageCounts = countMap(
    mechanicByType,
    "displayCoverage",
  );
  const mechanicDisplayCoverageByType = nestedCountMap(
    mechanicByType,
    "mechanicType",
    "displayCoverage",
  );
  const issueCountsByCode = groupedCountMap(issuesByCode, "issueCode");
  const readiness = buildReviewReadiness({
    taxonomyReviewRows: taxonomyReviewStatusCounts.review ?? 0,
    componentReviewByType,
    mechanicReviewByType,
    issueCountsByCode,
    tomeOfBattleLikeCount: sumCounts(tomeOfBattleLikeTaxonomy),
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      contentDb: meta.contentDb,
      rulesContentBuild: meta.rulesContentBuild,
      tableCounts: meta.counts,
    },
    taxonomy: {
      byFacetType: taxonomyByFacetType,
      byIssue: taxonomyByIssue,
      reviewStatusCounts: taxonomyReviewStatusCounts,
      topValuesByFacetType: topRowsByKey(taxonomyValues, "facetType", 25),
      tomeOfBattleLike: tomeOfBattleLikeTaxonomy,
    },
    components: {
      byType: componentByType,
      reviewStatusCounts: componentReviewStatusCounts,
      reviewSamples: componentReviewSamples,
    },
    mechanics: {
      byType: mechanicByType,
      reviewStatusCounts: mechanicReviewStatusCounts,
      reviewRowsByMechanicType: mechanicReviewByType,
      reviewSamples: mechanicReviewSamples,
      displayCoverageCounts: mechanicDisplayCoverageCounts,
      displayCoverageByMechanicType: mechanicDisplayCoverageByType,
      displayCoverageSamples: mechanicCoverageSamples,
    },
    issues: {
      byCode: issuesByCode,
      countsByCode: issueCountsByCode,
      samples: issueSamples,
    },
    readiness,
  };
}

function buildReviewReadiness(input: {
  taxonomyReviewRows: number;
  componentReviewByType: Record<string, number>;
  mechanicReviewByType: Record<string, number>;
  issueCountsByCode: Record<string, number>;
  tomeOfBattleLikeCount: number;
}): ReviewReadiness[] {
  const mechanicReview = (type: string) => input.mechanicReviewByType[type] ?? 0;
  const componentReview = (type: string) => input.componentReviewByType[type] ?? 0;
  const baseComponentReviewRows = BASE_COMPONENT_TYPES.reduce(
    (total, type) => total + componentReview(type),
    0,
  );
  const otherComponentReviewRows = Object.entries(input.componentReviewByType)
    .filter(
      ([type]) =>
        !(BASE_COMPONENT_TYPES as readonly string[]).includes(type),
    )
    .reduce((total, [, count]) => total + count, 0);
  return [
    {
      family: "taxonomy.school_subschool_descriptor",
      status: input.taxonomyReviewRows === 0 ? "ready" : "needs_normalization",
      reason:
        input.taxonomyReviewRows === 0
          ? "Existing taxonomy rows have no review-status debt for the current contract."
          : "Taxonomy has review rows that should be resolved before expanding grouping semantics.",
      evidence: {
        reviewRows: input.taxonomyReviewRows,
        tomeOfBattleLikeRows: input.tomeOfBattleLikeCount,
      },
    },
    {
      family: "taxonomy.tome_of_battle_source_kind",
      status: input.tomeOfBattleLikeCount > 0 ? "needs_normalization" : "defer",
      reason:
        "Tome of Battle disciplines and maneuver categories need a source-kind boundary before UI grouping changes.",
      evidence: {
        tomeOfBattleLikeRows: input.tomeOfBattleLikeCount,
      },
    },
    {
      family: "components.base_flags",
      status:
        baseComponentReviewRows === 0 ? "ready" : "needs_normalization",
      reason:
        baseComponentReviewRows === 0
          ? "Base component flags are typed booleans in SpellComponent and do not require frontend string parsing."
          : "Base component flags have review rows that should be resolved before becoming public filter vocabulary.",
      evidence: {
        baseComponentTypes: BASE_COMPONENT_TYPES,
        reviewRows: baseComponentReviewRows,
      },
    },
    {
      family: "components.other_or_extra",
      status: "detail_only",
      reason:
        "Extra component text is intentionally preserved for detail/raw display and is not public filter vocabulary.",
      evidence: {
        reviewRows: otherComponentReviewRows,
        componentExtraIssues:
          input.issueCountsByCode["component.extra.review"] ?? 0,
        decision: "detail_raw_only",
      },
    },
    {
      family: "mechanics.casting_time",
      status: "ready",
      reason:
        "Casting-time public filter buckets are promoted; remaining review rows stay excluded from public vocabulary.",
      evidence: {
        publicQueryParam: "castingTimeKeys",
        reviewRowsExcludedFromVocabulary: mechanicReview("casting_time"),
      },
    },
    {
      family: "mechanics.range",
      status: "ready",
      reason:
        "Range public filter buckets are promoted; remaining review rows stay excluded from public vocabulary.",
      evidence: {
        publicQueryParam: "rangeKeys",
        reviewRowsExcludedFromVocabulary: mechanicReview("range"),
      },
    },
    {
      family: "mechanics.target_effect_area",
      status: "defer",
      reason:
        "Target, effect, and area remain high-volume free-text mechanics and are not ready for broad filters.",
      evidence: {
        targetReviewRows: mechanicReview("target"),
        effectReviewRows: mechanicReview("effect"),
        areaReviewRows: mechanicReview("area"),
      },
    },
    {
      family: "mechanics.duration_save_sr",
      status: "ready",
      reason:
        "Duration, saving throw, and spell resistance public filters are promoted; remaining review rows stay excluded from public vocabulary.",
      evidence: {
        publicQueryParams: [
          "durationKeys",
          "savingThrowKeys",
          "spellResistanceKeys",
        ],
        durationReviewRowsExcludedFromVocabulary: mechanicReview("duration"),
        savingThrowReviewRowsExcludedFromVocabulary:
          mechanicReview("saving_throw"),
        spellResistanceReviewRowsExcludedFromVocabulary:
          mechanicReview("spell_resistance"),
      },
    },
  ];
}

function normalizeBuildMetaRow(
  row: Record<string, unknown> | undefined,
): RulesContentBuildMetaRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    sourceKind: String(row.sourceKind),
    sourceSha256: nullableString(row.sourceSha256),
    generatorVersion: String(row.generatorVersion),
    generatedAt: String(row.generatedAt),
    spellCount: Number(row.spellCount),
    issueCount: Number(row.issueCount),
    parentRepoCommit: nullableString(row.parentRepoCommit),
    dataRepoCommit: nullableString(row.dataRepoCommit),
    rulesManifestSha256: nullableString(row.rulesManifestSha256),
    rulesDbSha256: nullableString(row.rulesDbSha256),
    migrationSetSha256: nullableString(row.migrationSetSha256),
    buildMetaJson: parseJsonString(row.buildMetaJson),
  };
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

function queryCountRows(
  db: Database.Database,
  sql: string,
  params: unknown[] = [],
) {
  return (db.prepare(sql).all(...params) as CountRow[]).map((row) =>
    normalizeCountRow(row),
  );
}

function normalizeCountRow(row: CountRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      key === "count" ? Number(value ?? 0) : value,
    ]),
  ) as Record<string, unknown> & { count: number };
}

function countMap(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    const mapKey = String(row[key] ?? "");
    accumulator[mapKey] = (accumulator[mapKey] ?? 0) + Number(row.count ?? 0);
    return accumulator;
  }, {});
}

function groupedCountMap(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    const mapKey = String(row[key] ?? "");
    accumulator[mapKey] = (accumulator[mapKey] ?? 0) + Number(row.count ?? 0);
    return accumulator;
  }, {});
}

function nestedCountMap(
  rows: Array<Record<string, unknown>>,
  groupKey: string,
  valueKey: string,
) {
  return rows.reduce<Record<string, Record<string, number>>>(
    (accumulator, row) => {
      const group = String(row[groupKey] ?? "");
      const value = String(row[valueKey] ?? "");
      const counts = (accumulator[group] ??= {});
      counts[value] = (counts[value] ?? 0) + Number(row.count ?? 0);
      return accumulator;
    },
    {},
  );
}

function topRowsByKey(
  rows: Array<Record<string, unknown>>,
  key: string,
  limitPerKey: number,
) {
  const buckets = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const bucketKey = String(row[key] ?? "");
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(bucketKey, [row]);
    }
  }
  return Object.fromEntries(
    [...buckets.entries()].map(([bucketKey, bucketRows]) => [
      bucketKey,
      bucketRows.slice(0, limitPerKey),
    ]),
  );
}

function sumCounts(rows: Array<Record<string, unknown>>) {
  return rows.reduce((total, row) => total + Number(row.count ?? 0), 0);
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

function parseJsonString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "audit") return runAudit(args.limit);
  if (args.command === "generate") {
    return runGenerate(args.limit, args.output, args.auditOnly);
  }
  if (args.command === "import") return runImport(args.input, args.dryRun);
  if (args.command === "meta") return runMeta();
  if (args.command === "parity") return runParity();
  if (args.command === "review") return runReview();
  usage();
}

if (require.main === module) main();
