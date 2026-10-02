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
  spellUpdateEntries,
  normalizeLookup,
  parsePatchJsonlText,
  validateInsertSpellShape,
  validateLevelShape,
  validateUpdateSpellShape,
  type InsertSpellOperation,
  type SpellUpdateFields,
  type UpdateSpellOperation,
  type ParsedPatchOperation,
  type PatchOperation,
  isObject,
} from "./spells-schema";

type Mode = "validate" | "apply";

type LookupValue = {
  id: number;
  label: string;
};

export type SpellInsertApplyOperation = {
  op: InsertSpellOperation;
  spellId: number;
  rulebookId: number;
  schoolId: number;
  subschoolId: number | null;
  descriptorIds: number[];
  classLevels: Array<{ classId: number; level: number; extra: string }>;
  domainLevels: Array<{ domainId: number; level: number; extra: string }>;
};

type ResolvedInsertSpell = SpellInsertApplyOperation & {
  kind: "insertSpell";
  line: number;
};

export type SpellUpdateApplyOperation = {
  spellId: number;
  fields: SpellUpdateFields;
  expected?: SpellUpdateFields;
  descriptorIds?: number[];
  expectedDescriptorIds?: number[];
  classLevels?: Array<{
    classId: number;
    extra: string;
    level: number;
    expectedLevel: number | null;
  }>;
};

export type SpellIndexSqlPatch = {
  sqlPath: string;
  sql: string;
};

type ResolvedUpdateSpell = SpellUpdateApplyOperation & {
  kind: "updateSpell";
  line: number;
  op: UpdateSpellOperation;
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
  "applied/legacy-sql/create-idx-spell-class-level.sql",
  "applied/legacy-sql/create-idx-spell-domain-level.sql",
  "applied/legacy-sql/derive-spell-class-domain-mapping.sql",
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:spells:validate -- pending/spells/example.jsonl
  npm run -w data-tools rules:spells:apply -- --dry-run pending/spells/example.jsonl
  npm run -w data-tools rules:spells:apply -- pending/spells/example.jsonl
  npm run -w data-tools rules:spells:step -- pending/spells/example-step.jsonl
  npm run -w data-tools rules:spells:step -- --apply pending/spells/example-step.jsonl

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

function loadIndexPatches(): SpellIndexSqlPatch[] {
  const sqlPaths = INDEX_PATCHES.map((patch) => resolvePatchPath(patch, ".sql"));
  const loadedPatches = sqlPaths.map((sqlPath) => ({
    sqlPath,
    sql: fs.readFileSync(sqlPath, "utf-8"),
  }));
  return loadedPatches.map(normalizeIndexSqlPatch);
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

export function validatePatch(
  db: Database.Database,
  patchPath: string,
  parsedOperations?: ParsedPatchOperation[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = parsedOperations ?? parseJsonl(patchPath, errors);
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
  const seenUpdateSpellIds = new Set<number>();
  const resolved: ResolvedOperation[] = [];

  for (const { line, value } of parsed) {
    if (value.op === "updateSpell") {
      const shape = validateUpdateSpellShape(value, line, errors);
      if (
        shape.spellId === undefined ||
        (Object.keys(shape.fields).length === 0 &&
          shape.classLevels.length === 0 &&
          shape.descriptors === undefined)
      ) {
        continue;
      }
      if (seenUpdateSpellIds.has(shape.spellId)) {
        errors.push(
          `line ${line}: duplicate spell id in update patch: ${shape.spellId}`,
        );
        continue;
      }
      seenUpdateSpellIds.add(shape.spellId);
      const existing = db
        .prepare("SELECT id, name, slug FROM dnd_spell WHERE id = ?")
        .get(shape.spellId) as
        { id: number; name: string; slug: string } | undefined;
      if (!existing) {
        errors.push(`line ${line}: spell id does not exist: ${shape.spellId}`);
        continue;
      }
      if (shape.fields.slug) {
        const slugCollision = db
          .prepare("SELECT id, name FROM dnd_spell WHERE slug = ? AND id <> ?")
          .get(shape.fields.slug, shape.spellId) as
          | { id: number; name: string }
          | undefined;
        if (slugCollision) {
          warnings.push(
            `line ${line}: slug also exists on another spell: ${shape.fields.slug} (${slugCollision.id}, ${slugCollision.name})`,
          );
        }
      }
      const classLevels: NonNullable<SpellUpdateApplyOperation["classLevels"]> =
        [];
      const classKeys = new Set<string>();
      for (const item of shape.classLevels) {
        const foundClassId = resolveLookup(
          classes,
          item.class,
          "class",
          line,
          errors,
        );
        if (foundClassId === undefined) continue;
        let classId: number;
        if (item.expectedLevel === null) {
          const matches = db
            .prepare(
              "SELECT id FROM dnd_characterclass WHERE LOWER(TRIM(name)) = ?",
            )
            .all(normalizeLookup(item.class)) as Array<{ id: number }>;
          if (matches.length !== 1) {
            errors.push(
              `line ${line}: class ${item.class} lookup is ambiguous`,
            );
            continue;
          }
          classId = matches[0]!.id;
        } else {
          // Resolve within this spell's memberships: editions can share class names.
          const memberships = db
            .prepare(
              `SELECT c.id AS classId FROM dnd_spellclasslevel scl
            JOIN dnd_characterclass c ON c.id = scl.character_class_id
            WHERE scl.spell_id = ? AND LOWER(TRIM(c.name)) = ? AND COALESCE(scl.extra, '') = ?`,
            )
            .all(
              shape.spellId,
              normalizeLookup(item.class),
              item.extra ?? "",
            ) as Array<{ classId: number }>;
          if (memberships.length !== 1) {
            errors.push(
              `line ${line}: class ${item.class}/${item.extra ?? ""} must match exactly one relationship`,
            );
            continue;
          }
          classId = memberships[0]!.classId;
        }
        const key = JSON.stringify([classId, item.extra]);
        if (classKeys.has(key))
          errors.push(
            `line ${line}: duplicate class update: ${item.class}/${item.extra}`,
          );
        classKeys.add(key);
        classLevels.push({
          classId,
          extra: item.extra ?? "",
          level: item.level,
          expectedLevel: item.expectedLevel,
        });
      }
      const resolveDescriptorNames = (names: string[]) =>
        names.flatMap((name) => {
          const id = resolveLookup(
            descriptors,
            name,
            "descriptor",
            line,
            errors,
          );
          return id === undefined ? [] : [id];
        });
      const operation: ResolvedUpdateSpell = {
        kind: "updateSpell",
        line,
        op: value,
        spellId: shape.spellId,
        fields: shape.fields,
        ...(shape.expected ? { expected: shape.expected } : {}),
        classLevels,
        ...(shape.descriptors !== undefined
          ? { descriptorIds: resolveDescriptorNames(shape.descriptors) }
          : {}),
        ...(shape.expectedDescriptors !== undefined
          ? {
              expectedDescriptorIds: resolveDescriptorNames(
                shape.expectedDescriptors,
              ),
            }
          : {}),
      };
      try {
        checkSpellUpdate(db, operation);
      } catch (error) {
        errors.push(
          `line ${line}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      resolved.push(operation);
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

function insertSpells(
  db: Database.Database,
  operations: readonly SpellInsertApplyOperation[],
) {
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
}

function checkSpellUpdate(
  db: Database.Database,
  op: SpellUpdateApplyOperation,
) {
  if (Object.keys(op.fields).length) {
    const errors: string[] = [];
    validateUpdateSpellShape(
      {
        op: "updateSpell",
        id: op.spellId,
        spell: op.fields,
        ...(op.expected ? { expected: { spell: op.expected } } : {}),
      },
      1,
      errors,
    );
    if (errors.length) throw new Error(errors.join("; "));
  }
  if (!db.prepare("SELECT id FROM dnd_spell WHERE id = ?").get(op.spellId))
    throw new Error(`spell id does not exist: ${op.spellId}`);
  if (
    op.fields.subschoolId != null &&
    !db
      .prepare("SELECT id FROM dnd_spellsubschool WHERE id = ?")
      .get(op.fields.subschoolId)
  )
    throw new Error(
      `spell ${op.spellId}: subschool id does not exist: ${op.fields.subschoolId}`,
    );
  const entries = spellUpdateEntries(op.fields);
  const expected = spellUpdateEntries(op.expected ?? {});
  // Recheck conditions inside the apply transaction, after any earlier writes.
  for (const item of expected) {
    const row = db
      .prepare(`SELECT ${item.column} AS value FROM dnd_spell WHERE id = ?`)
      .get(op.spellId) as { value: unknown };
    if (row.value !== item.value)
      throw new Error(
        `spell ${op.spellId}: expected ${item.field} does not match current value`,
      );
  }
  let descriptorsChanged = false;
  if (op.descriptorIds !== undefined) {
    if (op.expectedDescriptorIds === undefined)
      throw new Error(`spell ${op.spellId}: expected descriptors are required`);
    const current = db
      .prepare(
        "SELECT spelldescriptor_id AS id FROM dnd_spell_descriptors WHERE spell_id = ? ORDER BY spelldescriptor_id",
      )
      .all(op.spellId) as Array<{ id: number }>;
    const exact = (ids: number[]) =>
      JSON.stringify([...ids].sort((a, b) => a - b));
    if (
      JSON.stringify(current.map((row) => row.id)) !==
      exact(op.expectedDescriptorIds)
    )
      throw new Error(
        `spell ${op.spellId}: expected descriptors do not match current set`,
      );
    descriptorsChanged =
      exact(op.descriptorIds) !== exact(op.expectedDescriptorIds);
  }
  let changed =
    descriptorsChanged ||
    entries.some((item) => {
      const row = db
        .prepare(`SELECT ${item.column} AS value FROM dnd_spell WHERE id = ?`)
        .get(op.spellId) as { value: unknown };
      return row.value !== item.value;
    });
  for (const level of op.classLevels ?? []) {
    const rows = db
      .prepare(
        `SELECT id, level FROM dnd_spellclasslevel
      WHERE spell_id = ? AND character_class_id = ? AND COALESCE(extra, '') = ?`,
      )
      .all(op.spellId, level.classId, level.extra) as Array<{
      id: number;
      level: number;
    }>;
    if (level.expectedLevel === null) {
      if (rows.length !== 0)
        throw new Error(
          `spell ${op.spellId}: expected class ${level.classId}/${level.extra} relationship to be absent`,
        );
      changed = true;
      continue;
    }
    if (rows.length !== 1)
      throw new Error(
        `spell ${op.spellId}: class ${level.classId}/${level.extra} must match exactly one relationship`,
      );
    if (rows[0]!.level !== level.expectedLevel)
      throw new Error(
        `spell ${op.spellId}: expected class ${level.classId}/${level.extra} level does not match current value`,
      );
    if (level.level !== level.expectedLevel) changed = true;
  }
  if (!changed)
    throw new Error(
      `spell update does not change any listed field or relationship`,
    );
}

function updateSpells(
  db: Database.Database,
  operations: readonly SpellUpdateApplyOperation[],
) {
  for (const op of operations) {
    checkSpellUpdate(db, op);
    const entries = spellUpdateEntries(op.fields);
    if (entries.length) {
      db.prepare(
        `UPDATE dnd_spell SET ${entries.map((item) => `${item.column} = ?`).join(", ")} WHERE id = ?`,
      ).run(...entries.map((item) => item.value), op.spellId);
    }
    if (op.descriptorIds !== undefined) {
      db.prepare("DELETE FROM dnd_spell_descriptors WHERE spell_id=?").run(
        op.spellId,
      );
      const next =
        (
          db
            .prepare(
              "SELECT COALESCE(MAX(id),0) AS id FROM dnd_spell_descriptors",
            )
            .get() as { id: number }
        ).id + 1;
      const insert = db.prepare(
        "INSERT INTO dnd_spell_descriptors (id,spell_id,spelldescriptor_id) VALUES (?,?,?)",
      );
      for (const [index, id] of op.descriptorIds.entries())
        insert.run(next + index, op.spellId, id);
    }
    for (const level of op.classLevels ?? []) {
      if (level.expectedLevel === null) {
        const next =
          (
            db
              .prepare(
                "SELECT COALESCE(MAX(id),0) AS id FROM dnd_spellclasslevel",
              )
              .get() as { id: number }
          ).id + 1;
        db.prepare(
          "INSERT INTO dnd_spellclasslevel (id,spell_id,character_class_id,level,extra) VALUES (?,?,?,?,?)",
        ).run(next, op.spellId, level.classId, level.level, level.extra);
        continue;
      }
      db.prepare(
        `UPDATE dnd_spellclasslevel SET level = ?
        WHERE spell_id = ? AND character_class_id = ? AND COALESCE(extra, '') = ?`,
      ).run(level.level, op.spellId, level.classId, level.extra);
    }
  }
}

export function applySpellUpdates(
  db: Database.Database,
  operations: readonly SpellUpdateApplyOperation[],
) {
  db.transaction(() => updateSpells(db, operations))();
}

function maskSqlCommentsAndQuotedText(sql: string) {
  return sql.replace(
    /--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:\]\]|[^\]])*\]/g,
    (match) => {
      const mask = match.startsWith("--") || match.startsWith("/*") ? " " : "x";
      return match.replace(/[^\r\n]/g, mask);
    },
  );
}

function normalizeIndexSqlPatch(
  patch: SpellIndexSqlPatch,
): SpellIndexSqlPatch {
  const maskedSql = maskSqlCommentsAndQuotedText(patch.sql);
  // Legacy rebuild SQL may wrap the whole file in BEGIN/COMMIT. Strip only
  // those verified boundaries; interior BEGIN/END can belong to a trigger.
  const beginMatch =
    /^\s*(BEGIN(?:\s+(?:DEFERRED|IMMEDIATE|EXCLUSIVE))?(?:\s+TRANSACTION)?\s*;)/i.exec(
      maskedSql,
    );
  const commitMatch =
    /(COMMIT(?:\s+TRANSACTION)?\s*;)\s*$/i.exec(maskedSql);

  let normalizedSql = patch.sql;
  if (beginMatch && commitMatch && commitMatch.index >= beginMatch[0].length) {
    const beginStatement = beginMatch[1];
    const commitStatement = commitMatch[1];
    if (!beginStatement || !commitStatement) {
      throw new Error(`Unable to parse index SQL transaction wrapper: ${patch.sqlPath}`);
    }
    const beginStart = beginMatch[0].length - beginStatement.length;
    const beginEnd = beginMatch[0].length;
    const commitStart = commitMatch.index;
    const commitEnd = commitStart + commitStatement.length;
    normalizedSql =
      patch.sql.slice(0, beginStart) +
      patch.sql.slice(beginEnd, commitStart) +
      patch.sql.slice(commitEnd);
  }

  const unexpectedControl =
    /(?:^|;)\s*(BEGIN(?:\s+(?:DEFERRED|IMMEDIATE|EXCLUSIVE))?(?:\s+TRANSACTION)?\b|COMMIT(?:\s+TRANSACTION)?\b|END\s+TRANSACTION\b|ROLLBACK\b|SAVEPOINT\b|RELEASE(?:\s+SAVEPOINT)?\b)/i.exec(
      maskSqlCommentsAndQuotedText(normalizedSql),
    );
  if (unexpectedControl) {
    throw new Error(
      `Index SQL contains unexpected transaction control outside a whole-script wrapper: ${patch.sqlPath}`,
    );
  }

  return { ...patch, sql: normalizedSql };
}

function rebuildIndexes(
  db: Database.Database,
  indexPatches: readonly SpellIndexSqlPatch[],
) {
  for (const patch of indexPatches) {
    db.exec(patch.sql);
  }
}

export function applySpellPatchAtomically(
  db: Database.Database,
  insertOperations: readonly SpellInsertApplyOperation[],
  updateOperations: readonly SpellUpdateApplyOperation[],
  indexPatches: readonly SpellIndexSqlPatch[],
) {
  const normalizedIndexPatches = indexPatches.map(normalizeIndexSqlPatch);
  db.transaction(() => {
    insertSpells(db, insertOperations);
    updateSpells(db, updateOperations);
    rebuildIndexes(db, normalizedIndexPatches);
  })();
}

type SqlRow = Record<string, string | number | null>;
type LevelGuard = { entityId: number; level: number; extra: string };
export type SpellStepGuard = {
  spell: SqlRow | null;
  descriptors: number[];
  classes: LevelGuard[];
  domains: LevelGuard[];
};
export type SpellBookIdentity = {
  id: number;
  abbr: string;
  editionId: number;
  editionSlug: string;
  system: string;
};
export type SpellStepOperation = {
  patch:
    | PatchOperation
    | {
        op: "moveSpellRulebook";
        id: number;
        from: SpellBookIdentity;
        to: SpellBookIdentity;
      };
  before: SpellStepGuard;
};

const STEP_RELATIONS = [
  ["dnd_spell_descriptors", "spelldescriptor_id", "descriptors"],
  ["dnd_spellclasslevel", "character_class_id", "classes"],
  ["dnd_spelldomainlevel", "domain_id", "domains"],
] as const;

function exact(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(exact).sort());
  if (isObject(value))
    return JSON.stringify(
      Object.keys(value)
        .sort()
        .map((key) => [key, exact(value[key])]),
    );
  return JSON.stringify(value);
}

/** Complete row and natural relationship keys, including NULL versus empty text. */
export function readSpellStepGuard(
  db: Database.Database,
  spellId: number,
): SpellStepGuard {
  const levels = (table: string, column: string) =>
    db
      .prepare(
        `SELECT ${column} AS entityId, level, extra FROM ${table} WHERE spell_id=?`,
      )
      .all(spellId) as LevelGuard[];
  return {
    spell:
      (db.prepare("SELECT * FROM dnd_spell WHERE id=?").get(spellId) as
        SqlRow | undefined) ?? null,
    descriptors: (
      db
        .prepare(
          "SELECT spelldescriptor_id AS id FROM dnd_spell_descriptors WHERE spell_id=?",
        )
        .all(spellId) as { id: number }[]
    ).map((row) => row.id),
    classes: levels("dnd_spellclasslevel", "character_class_id"),
    domains: levels("dnd_spelldomainlevel", "domain_id"),
  };
}

function requireStepSchema(db: Database.Database) {
  // A content/app-state DB is never a rules maintenance target, even if it
  // happens to contain copied legacy tables.
  for (const table of [
    "SpellContent",
    "RulesContentBuild",
    "I18nSpellText",
    "User",
    "FavoriteSpell",
    "SpellNote",
  ]) {
    if (
      db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? COLLATE NOCASE",
        )
        .get(table)
    )
      throw new Error("Spell step requires the rules DB role");
  }
  for (const [table, columns] of [
    ["dnd_spell", ["id", "added", "name", "slug", "rulebook_id", "school_id"]],
    ["dnd_rulebook", ["id", "abbr", "dnd_edition_id"]],
    ["dnd_dndedition", ["id", "slug", "system"]],
    ...STEP_RELATIONS.map(
      ([table, entity]) => [table, ["id", "spell_id", entity]] as const,
    ),
  ] as const) {
    const found = db.pragma(`table_info(${table})`) as {
      name: string;
      pk: number;
    }[];
    if (
      !columns.every((column) => found.some((item) => item.name === column)) ||
      !found.some((item) => item.name === "id" && item.pk === 1)
    )
      throw new Error(`Spell step requires rules schema: ${table}`);
  }
  for (const [table, entity] of [
    ["idx_spell_class_level", "class_id"],
    ["idx_spell_domain_level", "domain_id"],
  ] as const) {
    const found = db.pragma(`table_info(${table})`) as {
      name: string;
      pk: number;
    }[];
    const keys = found
      .filter((item) => item.pk)
      .sort((a, b) => a.pk - b.pk)
      .map((item) => item.name);
    if (
      exact(keys) !==
        exact(["spell_id", entity, "level", "rulebook_id", "extra"]) ||
      !found.some((item) => item.name === "edition_id")
    )
      throw new Error(`Spell step requires derived index keys: ${table}`);
  }
}

function validateStepOperations(
  db: Database.Database,
  operations: readonly SpellStepOperation[],
) {
  if (!Array.isArray(operations as unknown) || !operations.length)
    throw new Error("Spell step must not be empty");
  const isRecord = (value: unknown): boolean => isObject(value);
  const seen = new Set<number>();
  const spellColumns = (
    db.pragma("table_info(dnd_spell)") as { name: string }[]
  ).map((row) => row.name);
  for (const operation of operations) {
    if (
      !isRecord(operation) ||
      exact(Object.keys(operation)) !== exact(["patch", "before"]) ||
      !isRecord(operation.patch) ||
      !isRecord(operation.before)
    )
      throw new Error("Spell step requires patch and complete before guard");
    const { patch, before } = operation;
    if (!Number.isInteger(patch.id) || patch.id! <= 0 || seen.has(patch.id!))
      throw new Error("Spell step requires unique positive spell IDs");
    seen.add(patch.id!);
    if (
      exact(Object.keys(before)) !==
      exact(["spell", "descriptors", "classes", "domains"])
    )
      throw new Error("Incomplete before guard");
    if (patch.op === "insertSpell") {
      const errors: string[] = [];
      validateInsertSpellShape(patch, 1, errors, true);
      if (errors.length) throw new Error(errors.join("; "));
      if (before.spell !== null || !patch.spell?.added)
        throw new Error(
          "Insert step requires absent before and explicit added timestamp",
        );
    } else if (
      !before.spell ||
      !isRecord(before.spell) ||
      before.spell.id !== patch.id ||
      exact(Object.keys(before.spell)) !== exact(spellColumns) ||
      Object.values(before.spell).some(
        (value) =>
          value !== null &&
          typeof value !== "string" &&
          (typeof value !== "number" || !Number.isFinite(value)),
      )
    ) {
      throw new Error("Complete before spell row is required");
    }
    if (
      !Array.isArray(before.descriptors) ||
      before.descriptors.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(before.descriptors).size !== before.descriptors.length
    )
      throw new Error("Invalid or duplicate descriptor guard");
    for (const kind of ["classes", "domains"] as const) {
      const levels = before[kind];
      if (
        !Array.isArray(levels as unknown) ||
        levels.some(
          (item) =>
            !isRecord(item) ||
            exact(Object.keys(item)) !==
              exact(["entityId", "level", "extra"]) ||
            !Number.isInteger(item.entityId) ||
            item.entityId <= 0 ||
            !Number.isInteger(item.level) ||
            item.level < 0 ||
            item.level > 9 ||
            typeof item.extra !== "string",
        ) ||
        new Set(levels.map((item) => exact([item.entityId, item.extra])))
          .size !== levels.length
      )
        throw new Error(`Invalid or duplicate ${kind} guard`);
    }
    if (
      before.spell === null &&
      (before.descriptors.length ||
        before.classes.length ||
        before.domains.length)
    )
      throw new Error("Absent spell cannot have guarded relationships");
    if (patch.op === "moveSpellRulebook") {
      if (exact(Object.keys(patch)) !== exact(["op", "id", "from", "to"]))
        throw new Error("Unsupported moveSpellRulebook field");
      for (const book of [patch.from, patch.to]) {
        if (
          !isRecord(book) ||
          exact(Object.keys(book)) !==
            exact(["id", "abbr", "editionId", "editionSlug", "system"]) ||
          !Number.isInteger(book.id) ||
          book.id <= 0 ||
          !Number.isInteger(book.editionId) ||
          book.editionId <= 0 ||
          [book.abbr, book.editionSlug, book.system].some(
            (value) => typeof value !== "string" || !value.trim(),
          )
        )
          throw new Error("Complete rulebook identity is required");
        const rows = db
          .prepare(
            `SELECT b.id,b.abbr,b.dnd_edition_id AS editionId,e.slug AS editionSlug,e.system
          FROM dnd_rulebook b JOIN dnd_dndedition e ON e.id=b.dnd_edition_id WHERE LOWER(TRIM(b.abbr))=?`,
          )
          .all(normalizeLookup(book.abbr));
        if (rows.length !== 1 || exact(rows[0]) !== exact(book))
          throw new Error("Rulebook identity is missing, ambiguous or changed");
        const editions = db
          .prepare("SELECT id FROM dnd_dndedition WHERE slug=? AND system=?")
          .all(book.editionSlug, book.system);
        if (editions.length !== 1)
          throw new Error("Edition identity is ambiguous");
      }
      if (
        patch.from.id === patch.to.id ||
        patch.from.system !== patch.to.system ||
        before.spell?.rulebook_id !== patch.from.id
      )
        throw new Error("Invalid guarded rulebook move");
    } else if (patch.op === "updateSpell") {
      const errors: string[] = [];
      const shape = validateUpdateSpellShape(patch, 1, errors);
      if (errors.length) throw new Error(errors.join("; "));
      for (const name of [
        ...(shape.descriptors ?? []),
        ...(shape.expectedDescriptors ?? []),
      ]) {
        const matches = db
          .prepare(
            "SELECT id FROM dnd_spelldescriptor WHERE LOWER(TRIM(name))=?",
          )
          .all(normalizeLookup(name));
        if (matches.length !== 1)
          throw new Error(`Ambiguous spell step descriptor lookup: ${name}`);
      }
    } else if (patch.op !== "insertSpell")
      throw new Error("Unsupported spell step operation");
  }
}

// Restore guards only in the disposable in-memory replay. The target writer
// never writes caller-provided row snapshots; it uses the maintained patch API.
function restoreStepBefore(
  memory: Database.Database,
  operations: readonly SpellStepOperation[],
) {
  for (const { patch, before } of operations) {
    for (const [table] of STEP_RELATIONS)
      memory.prepare(`DELETE FROM ${table} WHERE spell_id=?`).run(patch.id);
    memory.prepare("DELETE FROM dnd_spell WHERE id=?").run(patch.id);
    if (before.spell) {
      const columns = Object.keys(before.spell);
      memory
        .prepare(
          `INSERT INTO dnd_spell (${columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
        )
        .run(...columns.map((column) => before.spell![column]));
    }
    for (const [table, entity, kind] of STEP_RELATIONS) {
      const next = (
        memory
          .prepare(`SELECT COALESCE(MAX(id),0)+1 AS id FROM ${table}`)
          .get() as { id: number }
      ).id;
      for (const [index, value] of before[kind].entries()) {
        if (kind === "descriptors")
          memory
            .prepare(
              `INSERT INTO ${table} (id,spell_id,${entity}) VALUES (?,?,?)`,
            )
            .run(next + index, patch.id, value);
        else {
          const level = value as LevelGuard;
          memory
            .prepare(
              `INSERT INTO ${table} (id,spell_id,${entity},level,extra) VALUES (?,?,?,?,?)`,
            )
            .run(
              next + index,
              patch.id,
              level.entityId,
              level.level,
              level.extra,
            );
        }
      }
    }
  }
}

function checkStepEntities(
  db: Database.Database,
  operations: readonly SpellStepOperation[],
) {
  for (const { patch } of operations) {
    const guard = readSpellStepGuard(db, patch.id!);
    if (!guard.spell) throw new Error("Missing step spell");
    for (const levels of [guard.classes, guard.domains]) {
      if (
        new Set(levels.map((item) => exact([item.entityId, item.extra])))
          .size !== levels.length
      )
        throw new Error("Duplicate spell relationship key");
    }
    if (new Set(guard.descriptors).size !== guard.descriptors.length)
      throw new Error("Duplicate spell descriptor key");
    for (const [table, id] of [
      ["dnd_rulebook", guard.spell.rulebook_id],
      ["dnd_spellschool", guard.spell.school_id],
      ...(guard.spell.sub_school_id == null
        ? []
        : [["dnd_spellsubschool", guard.spell.sub_school_id]]),
      ...guard.descriptors.map((id) => ["dnd_spelldescriptor", id]),
      ...guard.classes.map((item) => ["dnd_characterclass", item.entityId]),
      ...guard.domains.map((item) => ["dnd_domain", item.entityId]),
    ]) {
      if (db.prepare(`SELECT id FROM ${table} WHERE id=?`).all(id).length !== 1)
        throw new Error(`Missing or ambiguous related entity: ${table}/${id}`);
    }
    const book = db
      .prepare(
        "SELECT e.id FROM dnd_rulebook b JOIN dnd_dndedition e ON e.id=b.dnd_edition_id WHERE b.id=?",
      )
      .all(guard.spell.rulebook_id);
    if (book.length !== 1)
      throw new Error("Missing or ambiguous spell edition");
    if (
      db
        .prepare(
          "SELECT id FROM dnd_spell WHERE LOWER(name)=LOWER(?) AND rulebook_id=? AND id<>?",
        )
        .get(guard.spell.name, guard.spell.rulebook_id, patch.id)
    )
      throw new Error("Spell name/rulebook identity collision");
  }
}

function stepIndexState(db: Database.Database) {
  return ["idx_spell_class_level", "idx_spell_domain_level"].map((table) => ({
    schema: db
      .prepare(
        "SELECT type,name,sql FROM sqlite_master WHERE tbl_name=? ORDER BY name",
      )
      .all(table),
    columns: db.pragma(`table_info(${table})`),
    indexes: (db.pragma(`index_list(${table})`) as { name: string }[]).map(
      (index) => ({
        ...index,
        columns: db.pragma(`index_xinfo('${index.name.replace(/'/g, "''")}')`),
      }),
    ),
    rows: db.prepare(`SELECT * FROM ${table}`).all(),
  }));
}

function stepProtectedState(
  db: Database.Database,
  operations: readonly SpellStepOperation[],
) {
  const ids = operations.map((item) => item.patch.id!);
  const indexes = ["idx_spell_class_level", "idx_spell_domain_level"];
  const schema = db
    .prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY name")
    .all() as {
    type: string;
    name: string;
    tbl_name: string;
    sql: string | null;
  }[];
  return {
    schema: schema.filter((row) => !indexes.includes(row.tbl_name)),
    rows: schema
      .filter((row) => row.type === "table" && !indexes.includes(row.name))
      .map((row) => {
        const column = !ids.length
          ? null
          : row.name === "dnd_spell"
            ? "id"
            : STEP_RELATIONS.some(([table]) => table === row.name)
              ? "spell_id"
              : null;
        const table = `"${row.name.replace(/"/g, '""')}"`;
        return {
          table: row.name,
          rows: db
            .prepare(
              `SELECT * FROM ${table}${column ? ` WHERE ${column} NOT IN (${ids.map(() => "?").join(",")})` : ""}`,
            )
            .all(...(column ? ids : [])),
        };
      }),
  };
}

function rebuildStepIndexes(
  db: Database.Database,
  indexes: readonly SpellIndexSqlPatch[],
) {
  // Index SQL has no authority to change base rows, even targeted rows or
  // relationship surrogate IDs. Reuse the same direct state comparison with
  // no typed-operation exclusions for this stage.
  const before = exact(stepProtectedState(db, []));
  rebuildIndexes(db, indexes);
  if (exact(stepProtectedState(db, [])) !== before)
    throw new Error(
      "Index rebuild changed base rules, relationships or protected schema",
    );
}

/** Default check and explicit apply share the same replay and exact guards.
 * Mixed/unknown states are rejected; this does not recover partial histories.
 */
export function maintainSpellStep(
  db: Database.Database,
  operations: readonly SpellStepOperation[],
  indexPatches: readonly SpellIndexSqlPatch[],
  mode: "check" | "apply" = "check",
) {
  if (mode !== "check" && mode !== "apply")
    throw new Error("Invalid spell step mode");
  const indexes = indexPatches.map(normalizeIndexSqlPatch);
  if (!indexes.length)
    throw new Error("Spell step requires maintained index rebuild SQL");
  const execute = () => {
    requireStepSchema(db);
    validateStepOperations(db, operations);
    const protectedState = exact(stepProtectedState(db, operations));
    const memory = new Database(db.serialize());
    try {
      memory.pragma("foreign_keys=OFF");
      restoreStepBefore(memory, operations);
      const parsed: ParsedPatchOperation[] = operations.flatMap(
        ({ patch }, index) =>
          patch.op === "moveSpellRulebook"
            ? []
            : [{ line: index + 1, value: patch }],
      );
      const validation = validatePatch(memory, "spell-step", parsed);
      if (validation.errors.length)
        throw new Error(validation.errors.join("; "));
      // Snapshot guards must agree with the existing shape/expected contract.
      checkStepEntities(
        memory,
        operations.filter((item) => item.patch.op !== "insertSpell"),
      );
      const inserts = validation.operations.filter(
        (op): op is ResolvedInsertSpell => op.kind === "insertSpell",
      );
      // Legacy name maps choose a single value; the new step must reject an
      // ambiguous insert instead of silently choosing one edition's entity.
      for (const { op } of inserts) {
        const names = [
          ["dnd_rulebook", "abbr", op.source?.rulebook],
          ["dnd_spellschool", "name", op.spell?.school],
          ...(op.spell?.subschool
            ? [["dnd_spellsubschool", "name", op.spell.subschool]]
            : []),
          ...(op.descriptors ?? []).map((name) => [
            "dnd_spelldescriptor",
            "name",
            name,
          ]),
          ...(op.levels?.classes ?? []).map((level) => [
            "dnd_characterclass",
            "name",
            level.class,
          ]),
          ...(op.levels?.domains ?? []).map((level) => [
            "dnd_domain",
            "name",
            level.domain,
          ]),
        ];
        for (const [table, column, name] of names) {
          if (
            memory
              .prepare(`SELECT id FROM ${table} WHERE LOWER(TRIM(${column}))=?`)
              .all(normalizeLookup(name!)).length !== 1
          )
            throw new Error(`Ambiguous spell step lookup: ${table}/${name}`);
        }
      }
      const updates = validation.operations.filter(
        (op): op is ResolvedUpdateSpell => op.kind === "updateSpell",
      );
      const moves = operations.flatMap(({ patch }) =>
        patch.op === "moveSpellRulebook" ? [patch] : [],
      );
      const move = (target: Database.Database) => {
        for (const item of moves) {
          if (
            (
              target
                .prepare("SELECT rulebook_id AS id FROM dnd_spell WHERE id=?")
                .get(item.id) as { id: number }
            ).id !== item.from.id
          )
            throw new Error("Rulebook move precondition changed");
          target
            .prepare("UPDATE dnd_spell SET rulebook_id=? WHERE id=?")
            .run(item.to.id, item.id);
        }
      };
      // Replay the real writer, including old whole-script SQL wrappers.
      const after = memory.transaction(() => {
        move(memory);
        applySpellPatchAtomically(memory, inserts, updates, []);
        checkStepEntities(memory, operations);
        const typedAfter = operations.map(({ patch }) =>
          readSpellStepGuard(memory, patch.id!),
        );
        rebuildStepIndexes(memory, indexes);
        return typedAfter;
      })();
      requireStepSchema(memory);
      if (exact(stepProtectedState(memory, operations)) !== protectedState)
        throw new Error(
          "Spell step changed protected rules or schema in replay",
        );
      const current = operations.map(({ patch }) =>
        readSpellStepGuard(db, patch.id!),
      );
      const isBefore =
        exact(current) === exact(operations.map((item) => item.before));
      const isAfter = exact(current) === exact(after);
      if (!isBefore && !isAfter)
        throw new Error(
          "Spell step is mixed or drifted; expected exact before or after",
        );
      // Verify indexes against a rebuild of the actual current rules, including
      // all natural keys, extra labels, edition/book IDs and schema constraints.
      const currentReplay = new Database(db.serialize());
      try {
        currentReplay.pragma("foreign_keys=OFF");
        rebuildStepIndexes(currentReplay, indexes);
        requireStepSchema(currentReplay);
        if (exact(stepIndexState(db)) !== exact(stepIndexState(currentReplay)))
          throw new Error(
            "Spell step derived indexes are missing, drifted or incomplete",
          );
      } finally {
        currentReplay.close();
      }
      if (isBefore && isAfter)
        throw new Error("Spell step does not change state");
      if (isAfter) return { state: "after" as const, changed: false };
      if (mode === "check") return { state: "before" as const, changed: false };
      move(db);
      applySpellPatchAtomically(db, inserts, updates, []);
      rebuildStepIndexes(db, indexes);
      requireStepSchema(db);
      if (
        exact(
          operations.map(({ patch }) => readSpellStepGuard(db, patch.id!)),
        ) !== exact(after) ||
        exact(stepIndexState(db)) !== exact(stepIndexState(memory))
      )
        throw new Error("Spell step failed exact after verification");
      if (exact(stepProtectedState(db, operations)) !== protectedState)
        throw new Error("Spell step changed protected rules or schema");
      return { state: "after" as const, changed: true };
    } finally {
      memory.close();
    }
  };
  // Apply classification/replay/preconditions occur under the write lock.
  return mode === "apply"
    ? db.transaction(execute).immediate()
    : db.transaction(execute).deferred();
}

export function maintainSpellStepFile(
  dbPath: string,
  operations: readonly SpellStepOperation[],
  indexes: readonly SpellIndexSqlPatch[],
  mode: "check" | "apply" = "check",
) {
  const target = path.resolve(dbPath);
  for (const role of ["CONTENT_DATABASE_URL", "APP_STATE_DATABASE_URL"]) {
    const url = process.env[role];
    if (
      url?.startsWith("file:") &&
      path.resolve(resolveServerRelativePath(url.slice(5))).toLowerCase() ===
        target.toLowerCase()
    )
      throw new Error(`Spell step target must not be ${role}`);
  }
  const db = new Database(dbPath, {
    readonly: mode === "check",
    fileMustExist: true,
  });
  try {
    db.pragma("foreign_keys=OFF");
    return maintainSpellStep(db, operations, indexes, mode);
  } finally {
    db.close();
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
  const indexPatches = loadIndexPatches();
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

    applySpellPatchAtomically(
      db,
      insertOperations,
      updateOperations,
      indexPatches,
    );
    const after = tableCounts(db);
    const insertedSpells = insertOperations.map((op) => ({
      id: op.spellId,
      name: op.op.spell?.name,
      rulebook: op.op.source?.rulebook,
    }));
    const updatedSpells = updateOperations.map((op) => ({
      id: op.spellId,
      fields: op.fields,
      classLevels: op.classLevels,
      descriptorIds: op.descriptorIds,
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
  if (command === "step") {
    if (
      args.some((arg) => arg.startsWith("--") && arg !== "--apply") ||
      args.filter((arg) => arg !== "--apply").length !== 1
    )
      usage();
    const patchPath = resolvePatchPath(
      args.find((arg) => arg !== "--apply")!,
      ".jsonl",
    );
    const operations = fs
      .readFileSync(patchPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as SpellStepOperation);
    console.log(
      JSON.stringify(
        maintainSpellStepFile(
          rulesDbPath(),
          operations,
          loadIndexPatches(),
          args.includes("--apply") ? "apply" : "check",
        ),
      ),
    );
    return;
  }

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

if (require.main === module) {
  main();
}
