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
  asBoolean,
  asInteger,
  asOptionalString,
  normalizeLookup,
  parsePatchJsonlText,
  validateInsertSpellShape,
  validateLevelShape,
  validateUpdateSpellShape,
  type InsertSpellOperation,
  type UpdateSpellOperation,
} from "./spells-schema";

type Mode = "validate" | "apply";

type LookupValue = {
  id: number;
  label: string;
};

type ResolvedInsertSpell = {
  kind: "insertSpell";
  line: number;
  op: InsertSpellOperation;
  spellId: number;
  rulebookId: number;
  schoolId: number;
  subschoolId: number | null;
  descriptorIds: number[];
  classLevels: Array<{ classId: number; level: number; extra: string }>;
  domainLevels: Array<{ domainId: number; level: number; extra: string }>;
};

type ResolvedUpdateSpell = {
  kind: "updateSpell";
  line: number;
  op: UpdateSpellOperation;
  spellId: number;
  slug: string;
};

type ResolvedOperation = ResolvedInsertSpell | ResolvedUpdateSpell;

type ValidationResult = {
  patchPath: string;
  operations: ResolvedOperation[];
  errors: string[];
  warnings: string[];
  maxIds: Record<string, number>;
};

type TableCounts = Record<string, number>;

const PATCH_ROOT = path.join(localDataDir(), "rules-patches");
const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "rules-patches");

const COUNT_TABLES = [
  "dnd_spell",
  "dnd_spellclasslevel",
  "dnd_spelldomainlevel",
  "dnd_spell_descriptors",
  "idx_spell_class_level",
  "idx_spell_domain_level",
] as const;

const INDEX_PATCHES = [
  "legacy-sql/create-idx-spell-class-level.sql",
  "legacy-sql/create-idx-spell-domain-level.sql",
  "legacy-sql/derive-spell-class-domain-mapping.sql",
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:spells:validate -- spells/missing-spells.jsonl
  npm run -w data-tools rules:spells:apply -- --dry-run spells/missing-spells.jsonl
  npm run -w data-tools rules:spells:apply -- spells/missing-spells.jsonl

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

function resolvePatchPath(rawPath: string, expectedExtension: ".jsonl" | ".sql") {
  if (path.isAbsolute(rawPath)) {
    throw new Error(
      "Patch path must be relative to data/rules-patches",
    );
  }

  const resolved = path.resolve(PATCH_ROOT, rawPath);
  const relative = path.relative(PATCH_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Patch path escapes patch root: ${rawPath}`);
  }
  if (!resolved.toLowerCase().endsWith(expectedExtension)) {
    throw new Error(`Patch path must end with ${expectedExtension}: ${rawPath}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Patch file not found: ${resolved}`);
  }
  return resolved;
}

function tempDbPath(sourceDbPath: string) {
  const base = path.basename(sourceDbPath).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-rules-spells-"));
  return path.join(dir, base);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function defaultAddedTime() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function parseJsonl(patchPath: string, errors: string[]) {
  return parsePatchJsonlText(fs.readFileSync(patchPath, "utf-8"), errors);
}

function loadLookup(
  db: Database.Database,
  table: string,
  column: string,
): Map<string, LookupValue> {
  const rows = db
    .prepare(`SELECT id, ${column} AS label FROM ${table}`)
    .all() as Array<{ id: number; label: string }>;
  const lookup = new Map<string, LookupValue>();
  for (const row of rows) {
    lookup.set(normalizeLookup(row.label), row);
  }
  return lookup;
}

function resolveLookup(
  lookup: Map<string, LookupValue>,
  raw: string | undefined,
  label: string,
  line: number,
  errors: string[],
) {
  if (!raw) {
    errors.push(`line ${line}: ${label} is required`);
    return undefined;
  }
  const found = lookup.get(normalizeLookup(raw));
  if (!found) {
    errors.push(`line ${line}: ${label} not found: ${raw}`);
    return undefined;
  }
  return found.id;
}

function readMaxIds(db: Database.Database) {
  const max = (table: string) => {
    const row = db
      .prepare(`SELECT COALESCE(MAX(id), 0) AS maxId FROM ${table}`)
      .get() as { maxId: number };
    return row.maxId;
  };

  return {
    dnd_spell: max("dnd_spell"),
    dnd_spellclasslevel: max("dnd_spellclasslevel"),
    dnd_spelldomainlevel: max("dnd_spelldomainlevel"),
    dnd_spell_descriptors: max("dnd_spell_descriptors"),
  };
}

function tableCounts(db: Database.Database): TableCounts {
  const counts: TableCounts = {};
  for (const table of COUNT_TABLES) {
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
      .get() as { count: number };
    counts[table] = row.count;
  }
  return counts;
}

function validatePatch(db: Database.Database, patchPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parseJsonl(patchPath, errors);
  const maxIds = readMaxIds(db);

  const rulebooks = loadLookup(db, "dnd_rulebook", "abbr");
  const schools = loadLookup(db, "dnd_spellschool", "name");
  const subschools = loadLookup(db, "dnd_spellsubschool", "name");
  const descriptors = loadLookup(db, "dnd_spelldescriptor", "name");
  const classes = loadLookup(db, "dnd_characterclass", "name");
  const domains = loadLookup(db, "dnd_domain", "name");

  const seenSpellIds = new Set<number>();
  const seenSpellKeys = new Set<string>();
  const seenSlugs = new Set<string>();
  const resolved: ResolvedOperation[] = [];

  for (const { line, value } of parsed) {
    if (value.op === "updateSpell") {
      const shape = validateUpdateSpellShape(value, line, errors);
      if (shape.spellId === undefined || !shape.slug) continue;
      const existing = db
        .prepare("SELECT id, name, slug FROM dnd_spell WHERE id = ?")
        .get(shape.spellId) as
        | { id: number; name: string; slug: string }
        | undefined;
      if (!existing) {
        errors.push(`line ${line}: spell id does not exist: ${shape.spellId}`);
        continue;
      }
      const slugCollision = db
        .prepare("SELECT id, name FROM dnd_spell WHERE slug = ? AND id <> ?")
        .get(shape.slug, shape.spellId) as
        | { id: number; name: string }
        | undefined;
      if (slugCollision) {
        warnings.push(
          `line ${line}: slug also exists on another spell: ${shape.slug} (${slugCollision.id}, ${slugCollision.name})`,
        );
      }
      if (existing.slug === shape.slug) {
        warnings.push(
          `line ${line}: spell ${shape.spellId} already has slug ${shape.slug}`,
        );
      }
      resolved.push({
        kind: "updateSpell",
        line,
        op: value,
        spellId: shape.spellId,
        slug: shape.slug,
      });
      continue;
    }

    const shape = validateInsertSpellShape(value, line, errors);
    const {
      spellId,
      name,
      slug,
      rulebook,
      school,
      subschool,
      description,
      descriptionHtml,
      classLevels,
      domainLevels,
    } = shape;
    if (spellId === undefined || spellId <= 0) continue;

    if (seenSpellIds.has(spellId)) {
      errors.push(`line ${line}: duplicate spell id in patch: ${spellId}`);
    }
    seenSpellIds.add(spellId);

    const spell = value.spell ?? {};

    const rulebookId = resolveLookup(rulebooks, rulebook, "source.rulebook", line, errors);
    const schoolId = resolveLookup(schools, school, "spell.school", line, errors);
    const subschoolId = subschool
      ? resolveLookup(subschools, subschool, "spell.subschool", line, errors)
      : null;

    if (rulebookId && name) {
      const existingName = db
        .prepare(
          "SELECT id FROM dnd_spell WHERE lower(name) = lower(?) AND rulebook_id = ?",
        )
        .get(name, rulebookId) as { id: number } | undefined;
      if (existingName) {
        errors.push(
          `line ${line}: spell already exists in rulebook: ${name} (${existingName.id})`,
        );
      }

      const spellKey = `${normalizeLookup(name)}:${rulebookId}`;
      if (seenSpellKeys.has(spellKey)) {
        errors.push(`line ${line}: duplicate name + rulebook in patch: ${name}`);
      }
      seenSpellKeys.add(spellKey);
    }

    const existingId = db
      .prepare("SELECT name FROM dnd_spell WHERE id = ?")
      .get(spellId) as { name: string } | undefined;
    if (existingId) {
      errors.push(`line ${line}: spell id already exists: ${spellId}`);
    }

    if (slug) {
      const existingSlug = db
        .prepare("SELECT id, name FROM dnd_spell WHERE slug = ?")
        .get(slug) as { id: number; name: string } | undefined;
      if (existingSlug) {
        warnings.push(
          `line ${line}: slug already exists: ${slug} (${existingSlug.id}, ${existingSlug.name})`,
        );
      }
      if (seenSlugs.has(slug)) {
        warnings.push(`line ${line}: duplicate slug in patch: ${slug}`);
      }
      seenSlugs.add(slug);
    }

    if (spellId > maxIds.dnd_spell + 1000) {
      warnings.push(
        `line ${line}: spell id ${spellId} is far above current max ${maxIds.dnd_spell}`,
      );
    }

    const resolvedClassLevels: ResolvedInsertSpell["classLevels"] = [];
    const seenClassLevels = new Set<string>();
    classLevels.forEach((level, index) => {
      const parsedLevel = validateLevelShape(
        level,
        line,
        "levels.classes",
        index,
        errors,
      );
      if (!parsedLevel) return;
      const classId = resolveLookup(
        classes,
        parsedLevel.class,
        `levels.classes[${index}].class`,
        line,
        errors,
      );
      if (classId === undefined || parsedLevel.level === undefined) return;
      const key = `${classId}:${parsedLevel.level}:${parsedLevel.extra}`;
      if (seenClassLevels.has(key)) {
        errors.push(`line ${line}: duplicate class level in patch for ${parsedLevel.class}`);
      }
      seenClassLevels.add(key);
      resolvedClassLevels.push({
        classId,
        level: parsedLevel.level,
        extra: parsedLevel.extra ?? "",
      });
    });

    const resolvedDomainLevels: ResolvedInsertSpell["domainLevels"] = [];
    const seenDomainLevels = new Set<string>();
    domainLevels.forEach((level, index) => {
      const parsedLevel = validateLevelShape(
        level,
        line,
        "levels.domains",
        index,
        errors,
      );
      if (!parsedLevel) return;
      const domainId = resolveLookup(
        domains,
        parsedLevel.domain,
        `levels.domains[${index}].domain`,
        line,
        errors,
      );
      if (domainId === undefined || parsedLevel.level === undefined) return;
      const key = `${domainId}:${parsedLevel.level}:${parsedLevel.extra}`;
      if (seenDomainLevels.has(key)) {
        errors.push(`line ${line}: duplicate domain level in patch for ${parsedLevel.domain}`);
      }
      seenDomainLevels.add(key);
      resolvedDomainLevels.push({
        domainId,
        level: parsedLevel.level,
        extra: parsedLevel.extra ?? "",
      });
    });

    const resolvedDescriptorIds: number[] = [];
    const seenDescriptors = new Set<number>();
    for (const descriptor of value.descriptors ?? []) {
      const descriptorId = resolveLookup(
        descriptors,
        descriptor,
        "descriptors[]",
        line,
        errors,
      );
      if (descriptorId === undefined) continue;
      if (seenDescriptors.has(descriptorId)) {
        errors.push(`line ${line}: duplicate descriptor: ${descriptor}`);
      }
      seenDescriptors.add(descriptorId);
      resolvedDescriptorIds.push(descriptorId);
    }

    if (
      rulebookId === undefined ||
      schoolId === undefined ||
      subschoolId === undefined ||
      !name ||
      !slug ||
      !description ||
      !descriptionHtml
    ) {
      continue;
    }

    resolved.push({
      kind: "insertSpell",
      line,
      op: value,
      spellId,
      rulebookId,
      schoolId,
      subschoolId,
      descriptorIds: resolvedDescriptorIds,
      classLevels: resolvedClassLevels,
      domainLevels: resolvedDomainLevels,
    });
  }

  return {
    patchPath,
    operations: resolved,
    errors,
    warnings,
    maxIds,
  };
}

function boolToInt(value: boolean | undefined) {
  return value === true ? 1 : 0;
}

function insertSpells(db: Database.Database, operations: ResolvedInsertSpell[]) {
  let nextDescriptorId =
    ((db
      .prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM dnd_spell_descriptors")
      .get() as { maxId: number }).maxId ?? 0) + 1;
  let nextClassLevelId =
    ((db
      .prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM dnd_spellclasslevel")
      .get() as { maxId: number }).maxId ?? 0) + 1;
  let nextDomainLevelId =
    ((db
      .prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM dnd_spelldomainlevel")
      .get() as { maxId: number }).maxId ?? 0) + 1;

  const insertSpell = db.prepare(`
    INSERT INTO dnd_spell (
      id, added, rulebook_id, page, name, school_id, sub_school_id,
      verbal_component, somatic_component, material_component,
      arcane_focus_component, divine_focus_component, xp_component,
      casting_time, range, target, effect, area, duration, saving_throw,
      spell_resistance, description, slug, meta_breath_component,
      true_name_component, extra_components, description_html,
      corrupt_component, corrupt_level, verified, verified_author_id,
      verified_time
    ) VALUES (
      @id, @added, @rulebook_id, @page, @name, @school_id, @sub_school_id,
      @verbal_component, @somatic_component, @material_component,
      @arcane_focus_component, @divine_focus_component, @xp_component,
      @casting_time, @range, @target, @effect, @area, @duration,
      @saving_throw, @spell_resistance, @description, @slug,
      @meta_breath_component, @true_name_component, @extra_components,
      @description_html, @corrupt_component, @corrupt_level, @verified,
      NULL, NULL
    )
  `);
  const insertDescriptor = db.prepare(`
    INSERT INTO dnd_spell_descriptors (id, spell_id, spelldescriptor_id)
    VALUES (?, ?, ?)
  `);
  const insertClassLevel = db.prepare(`
    INSERT INTO dnd_spellclasslevel (id, character_class_id, spell_id, level, extra)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertDomainLevel = db.prepare(`
    INSERT INTO dnd_spelldomainlevel (id, domain_id, spell_id, level, extra)
    VALUES (?, ?, ?, ?, ?)
  `);

  const run = db.transaction(() => {
    for (const op of operations) {
      const spell = op.op.spell ?? {};
      const source = op.op.source ?? {};
      const components = spell.components ?? {};
      insertSpell.run({
        id: op.spellId,
        added: spell.added ?? defaultAddedTime(),
        rulebook_id: op.rulebookId,
        page: asInteger(source.page) ?? null,
        name: spell.name,
        school_id: op.schoolId,
        sub_school_id: op.subschoolId,
        verbal_component: boolToInt(components.verbal),
        somatic_component: boolToInt(components.somatic),
        material_component: boolToInt(components.material),
        arcane_focus_component: boolToInt(components.arcaneFocus),
        divine_focus_component: boolToInt(components.divineFocus),
        xp_component: boolToInt(components.xp),
        casting_time: asOptionalString(spell.castingTime),
        range: asOptionalString(spell.range),
        target: asOptionalString(spell.target),
        effect: asOptionalString(spell.effect),
        area: asOptionalString(spell.area),
        duration: asOptionalString(spell.duration),
        saving_throw: asOptionalString(spell.savingThrow),
        spell_resistance: asOptionalString(spell.spellResistance),
        description: spell.description,
        slug: spell.slug,
        meta_breath_component: boolToInt(components.metaBreath),
        true_name_component: boolToInt(components.trueName),
        extra_components: asOptionalString(spell.extraComponents),
        description_html: spell.descriptionHtml,
        corrupt_component: boolToInt(components.corrupt),
        corrupt_level: asInteger(spell.corruptLevel) ?? null,
        verified: boolToInt(asBoolean(spell.verified)),
      });

      for (const descriptorId of op.descriptorIds) {
        insertDescriptor.run(nextDescriptorId, op.spellId, descriptorId);
        nextDescriptorId += 1;
      }
      for (const level of op.classLevels) {
        insertClassLevel.run(
          nextClassLevelId,
          level.classId,
          op.spellId,
          level.level,
          level.extra,
        );
        nextClassLevelId += 1;
      }
      for (const level of op.domainLevels) {
        insertDomainLevel.run(
          nextDomainLevelId,
          level.domainId,
          op.spellId,
          level.level,
          level.extra,
        );
        nextDomainLevelId += 1;
      }
    }
  });

  run();
}

function updateSpells(db: Database.Database, operations: ResolvedUpdateSpell[]) {
  const updateSpell = db.prepare(`
    UPDATE dnd_spell
    SET slug = @slug
    WHERE id = @id
  `);

  const run = db.transaction(() => {
    for (const op of operations) {
      updateSpell.run({ id: op.spellId, slug: op.slug });
    }
  });

  run();
}

function rebuildIndexes(db: Database.Database) {
  for (const patch of INDEX_PATCHES) {
    const sqlPath = resolvePatchPath(patch, ".sql");
    db.exec(fs.readFileSync(sqlPath, "utf-8"));
  }
}

function writeReport(report: unknown, mode: Mode) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const reportPath = path.join(REPORT_ROOT, `${timestamp()}-${mode}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function validateOnly(dbPath: string, patchPath: string) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const validation = validatePatch(db, patchPath);
    const counts = tableCounts(db);
    const reportPath = writeReport(
      {
        mode: "validate",
        patchPath,
        targetDbPath: dbPath,
        operationCount: validation.operations.length,
        maxIds: validation.maxIds,
        warnings: validation.warnings,
        errors: validation.errors,
        counts,
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
    // The legacy rules DB schema references auth_user, but the prepared rules
    // DB does not carry that app table. Validation above checks the rules-side
    // lookups we write, so keep SQLite FK enforcement out of this import path.
    db.pragma("foreign_keys = OFF");
    const validation = validatePatch(db, patchPath);
    const before = tableCounts(db);
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
      console.error(`Validation failed; no rows inserted`);
      console.error(`Report: ${reportPath}`);
      process.exit(1);
    }

    const insertOperations = validation.operations.filter(
      (op): op is ResolvedInsertSpell => op.kind === "insertSpell",
    );
    const updateOperations = validation.operations.filter(
      (op): op is ResolvedUpdateSpell => op.kind === "updateSpell",
    );

    insertSpells(db, insertOperations);
    updateSpells(db, updateOperations);
    rebuildIndexes(db);
    const after = tableCounts(db);
    const insertedSpells = insertOperations.map((op) => ({
      id: op.spellId,
      name: op.op.spell?.name,
      rulebook: op.op.source?.rulebook,
    }));
    const updatedSpells = updateOperations.map((op) => ({
      id: op.spellId,
      slug: op.slug,
    }));
    const reportPath = writeReport(
      {
        mode: "apply",
        dryRun,
        patchPath,
        targetDbPath,
        operationCount: validation.operations.length,
        insertedSpells,
        updatedSpells,
        insertedDescriptorRows: insertOperations.reduce(
          (total, op) => total + op.descriptorIds.length,
          0,
        ),
        insertedClassLevelRows: insertOperations.reduce(
          (total, op) => total + op.classLevels.length,
          0,
        ),
        insertedDomainLevelRows: insertOperations.reduce(
          (total, op) => total + op.domainLevels.length,
          0,
        ),
        maxIds: validation.maxIds,
        warnings: validation.warnings,
        errors: validation.errors,
        before,
        after,
      },
      "apply",
    );

    console.log(dryRun ? "Spell patch dry-run OK" : "Spell patch apply OK");
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
  const patchPath = resolvePatchPath(patchArg, ".jsonl");

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

  console.log(`Applying structured spell patch`);
  console.log(`Target DB: ${configuredDbPath}`);
  applyPatch(configuredDbPath, patchPath, false);
}

main();
