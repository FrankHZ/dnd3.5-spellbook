export type Components = {
  verbal?: boolean;
  somatic?: boolean;
  material?: boolean;
  arcaneFocus?: boolean;
  divineFocus?: boolean;
  xp?: boolean;
  metaBreath?: boolean;
  trueName?: boolean;
  corrupt?: boolean;
};

export type SpellLevel = {
  class?: string | undefined;
  domain?: string | undefined;
  level?: number | undefined;
  extra?: string | undefined;
};

export type InsertSpellOperation = {
  op: "insertSpell";
  id?: number;
  browseVisible?: boolean;
  source?: {
    rulebook?: string;
    page?: number | null;
    provenance?: string;
  };
  spell?: {
    name?: string;
    slug?: string;
    school?: string;
    subschool?: string | null;
    components?: Components;
    castingTime?: string | null;
    range?: string | null;
    target?: string | null;
    effect?: string | null;
    area?: string | null;
    duration?: string | null;
    savingThrow?: string | null;
    spellResistance?: string | null;
    extraComponents?: string | null;
    description?: string;
    descriptionHtml?: string;
    corruptLevel?: number | null;
    verified?: boolean;
    added?: string;
  };
  levels?: {
    classes?: SpellLevel[];
    domains?: SpellLevel[];
  };
  descriptors?: string[];
};

export type SpellUpdateFields = {
  page?: number | null;
  subschoolId?: number | null;
  slug?: string;
  extraComponents?: string | null;
  description?: string;
  descriptionHtml?: string;
  castingTime?: string | null;
  range?: string | null;
  target?: string | null;
  effect?: string | null;
  area?: string | null;
  duration?: string | null;
  savingThrow?: string | null;
  spellResistance?: string | null;
  components?: Components;
};

export const SPELL_UPDATE_COLUMNS = {
  page: "page",
  subschoolId: "sub_school_id",
  slug: "slug",
  extraComponents: "extra_components",
  description: "description",
  descriptionHtml: "description_html",
  castingTime: "casting_time",
  range: "range",
  target: "target",
  effect: "effect",
  area: "area",
  duration: "duration",
  savingThrow: "saving_throw",
  spellResistance: "spell_resistance",
} as const;

export const COMPONENT_COLUMNS = {
  verbal: "verbal_component",
  somatic: "somatic_component",
  material: "material_component",
  arcaneFocus: "arcane_focus_component",
  divineFocus: "divine_focus_component",
  xp: "xp_component",
  metaBreath: "meta_breath_component",
  trueName: "true_name_component",
  corrupt: "corrupt_component",
} as const;

export type ClassLevelUpdate = {
  class: string;
  extra?: string;
  level: number;
  expectedLevel: number | null;
};

export type UpdateSpellOperation = {
  op: "updateSpell";
  id?: number;
  source?: {
    provenance?: string;
  };
  spell?: SpellUpdateFields;
  expected?: { spell?: SpellUpdateFields; descriptors?: string[] };
  descriptors?: string[];
  levels?: { classes?: ClassLevelUpdate[] };
};

export type PatchOperation = InsertSpellOperation | UpdateSpellOperation;

export type ParsedPatchOperation = {
  line: number;
  value: PatchOperation;
};

export type InsertSpellShape = {
  spellId: number | undefined;
  name: string | undefined;
  slug: string | undefined;
  rulebook: string | undefined;
  school: string | undefined;
  subschool: string | null | undefined;
  description: string | undefined;
  descriptionHtml: string | undefined;
  classLevels: SpellLevel[];
  domainLevels: SpellLevel[];
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

export function asOptionalString(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function asInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

export function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

export function parsePatchJsonlText(raw: string, errors: string[]) {
  const operations: ParsedPatchOperation[] = [];

  raw.split(/\r?\n/).forEach((line, index) => {
    const text = line.trim();
    if (!text) return;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (!isObject(parsed)) {
        errors.push(`line ${index + 1}: operation must be a JSON object`);
        return;
      }
      if (parsed.op !== "insertSpell" && parsed.op !== "updateSpell") {
        errors.push(
          `line ${index + 1}: unsupported operation ${String(parsed.op)}`,
        );
        return;
      }
      operations.push({ line: index + 1, value: parsed as PatchOperation });
    } catch (error) {
      errors.push(
        `line ${index + 1}: invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  return operations;
}

export function validateLevelShape(
  level: unknown,
  line: number,
  label: string,
  index: number,
  errors: string[],
): SpellLevel | undefined {
  if (!isObject(level)) {
    errors.push(`line ${line}: ${label}[${index}] must be an object`);
    return undefined;
  }

  const numericLevel = asInteger(level.level);
  if (numericLevel === undefined || numericLevel < 0 || numericLevel > 9) {
    errors.push(`line ${line}: ${label}[${index}].level must be 0..9`);
  }

  return {
    class: asString(level.class),
    domain: asString(level.domain),
    level: numericLevel,
    extra: asString(level.extra) ?? "",
  };
}

export function validateInsertSpellShape(
  value: InsertSpellOperation,
  line: number,
  errors: string[],
  strict = false,
): InsertSpellShape {
  if (strict) {
    rejectUnknown(
      value as unknown as Record<string, unknown>,
      ["op", "id", "browseVisible", "source", "spell", "levels", "descriptors"],
      "insertSpell",
      line,
      errors,
    );
    const object = (raw: unknown, keys: string[], label: string) => {
      if (!isObject(raw))
        errors.push(`line ${line}: ${label} must be an object`);
      else rejectUnknown(raw, keys, label, line, errors);
    };
    object(value.source, ["rulebook", "page", "provenance"], "source");
    object(
      value.spell,
      [
        "name",
        "slug",
        "school",
        "subschool",
        "components",
        "castingTime",
        "range",
        "target",
        "effect",
        "area",
        "duration",
        "savingThrow",
        "spellResistance",
        "extraComponents",
        "description",
        "descriptionHtml",
        "corruptLevel",
        "verified",
        "added",
      ],
      "spell",
    );
    if (
      value.browseVisible !== undefined &&
      typeof value.browseVisible !== "boolean"
    )
      errors.push(`line ${line}: browseVisible must be boolean`);
    if (isObject(value.source)) {
      for (const key of ["rulebook", "provenance"] as const)
        if (key in value.source && typeof value.source[key] !== "string")
          errors.push(`line ${line}: source.${key} must be string`);
      const page = value.source.page;
      if (
        page !== undefined &&
        page !== null &&
        (asInteger(page) === undefined || (page as number) <= 0)
      )
        errors.push(
          `line ${line}: source.page must be positive integer or null`,
        );
    }
    if (isObject(value.spell)) {
      for (const [key, item] of Object.entries(value.spell)) {
        if (key === "components") {
          object(item, Object.keys(COMPONENT_COLUMNS), "spell.components");
          if (
            isObject(item) &&
            Object.values(item).some((flag) => typeof flag !== "boolean")
          )
            errors.push(`line ${line}: components must be boolean`);
        } else if (key === "verified") {
          if (typeof item !== "boolean")
            errors.push(`line ${line}: verified must be boolean`);
        } else if (key === "corruptLevel") {
          if (
            item !== null &&
            (asInteger(item) === undefined || (item as number) < 0)
          )
            errors.push(
              `line ${line}: corruptLevel must be nonnegative integer or null`,
            );
        } else if (
          typeof item !== "string" &&
          !(
            item === null &&
            ![
              "name",
              "slug",
              "school",
              "description",
              "descriptionHtml",
              "added",
            ].includes(key)
          )
        )
          errors.push(`line ${line}: spell.${key} has invalid text type`);
      }
    }
    if (value.levels !== undefined) {
      object(value.levels, ["classes", "domains"], "levels");
      if (isObject(value.levels))
        for (const [kind, items] of Object.entries(value.levels)) {
          if (!Array.isArray(items))
            errors.push(`line ${line}: levels.${kind} must be array`);
          else
            for (const item of items) {
              object(
                item,
                [kind === "classes" ? "class" : "domain", "level", "extra"],
                `levels.${kind}`,
              );
              if (
                isObject(item) &&
                item.extra !== undefined &&
                typeof item.extra !== "string"
              )
                errors.push(`line ${line}: level extra must be string`);
            }
        }
    }
    if (
      value.descriptors !== undefined &&
      (!Array.isArray(value.descriptors) ||
        value.descriptors.some(
          (name) => typeof name !== "string" || !name.trim(),
        ))
    )
      errors.push(`line ${line}: descriptors must be array of names`);
    if (errors.length)
      return {
        spellId: undefined,
        name: undefined,
        slug: undefined,
        rulebook: undefined,
        school: undefined,
        subschool: undefined,
        description: undefined,
        descriptionHtml: undefined,
        classLevels: [],
        domainLevels: [],
      };
  }
  const spellId = asInteger(value.id);
  if (spellId === undefined || spellId <= 0) {
    errors.push(`line ${line}: id must be a positive integer`);
  }

  const spell = value.spell ?? {};
  const source = value.source ?? {};
  const name = asString(spell.name);
  const slug = asString(spell.slug);
  const rulebook = asString(source.rulebook);
  const school = asString(spell.school);
  const subschool = asString(spell.subschool ?? undefined);
  const description = asString(spell.description);
  const descriptionHtml = asString(spell.descriptionHtml);

  if (!name) errors.push(`line ${line}: spell.name is required`);
  if (!slug) errors.push(`line ${line}: spell.slug is required`);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`line ${line}: spell.slug is not normalized: ${slug}`);
  }
  if (!description) errors.push(`line ${line}: spell.description is required`);
  if (!descriptionHtml) {
    errors.push(`line ${line}: spell.descriptionHtml is required`);
  }

  const classLevels = Array.isArray(value.levels?.classes)
    ? value.levels.classes
    : [];
  const domainLevels = Array.isArray(value.levels?.domains)
    ? value.levels.domains
    : [];

  if (
    value.browseVisible !== false &&
    classLevels.length === 0 &&
    domainLevels.length === 0
  ) {
    errors.push(
      `line ${line}: at least one class or domain level is required unless browseVisible is false`,
    );
  }

  return {
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
  };
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  line: number,
  errors: string[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      errors.push(`line ${line}: unsupported ${label} field: ${key}`);
  }
}

function parseUpdateFields(
  raw: unknown,
  label: string,
  line: number,
  errors: string[],
  expected = false,
  exactText = false,
): SpellUpdateFields {
  if (!isObject(raw)) {
    errors.push(`line ${line}: ${label} must be an object`);
    return {};
  }
  rejectUnknown(
    raw,
    [...Object.keys(SPELL_UPDATE_COLUMNS), "components"],
    label,
    line,
    errors,
  );
  const fields: SpellUpdateFields = {};
  for (const field of Object.keys(SPELL_UPDATE_COLUMNS) as Array<
    keyof typeof SPELL_UPDATE_COLUMNS
  >) {
    if (!(field in raw)) continue;
    const value = raw[field];
    if (field === "page" || field === "subschoolId") {
      const page = asInteger(value);
      if (value === null || (page !== undefined && page > 0))
        fields[field] = value as number | null;
      else
        errors.push(
          `line ${line}: ${label}.${field} must be a positive integer or null`,
        );
      continue;
    }
    const nullable = !["slug", "description", "descriptionHtml"].includes(
      field,
    );
    if ((nullable && value === null) || typeof value === "string") {
      if (!expected && !nullable && !(value as string).trim()) {
        errors.push(
          `line ${line}: ${label}.${field} must be a non-empty string`,
        );
      } else {
        // Expected strings compare exactly, including NULL versus empty string.
        Object.assign(fields, {
          [field]:
            value === null ||
            expected ||
            (nullable && field !== "extraComponents") ||
            (exactText && field !== "slug")
              ? value
              : (value as string).trim(),
        });
      }
    } else {
      errors.push(
        `line ${line}: ${label}.${field} must be ${nullable ? "a string or null" : "a string"}`,
      );
    }
  }
  if (
    fields.slug &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug) &&
    !expected
  ) {
    errors.push(
      `line ${line}: ${label}.slug is not normalized: ${fields.slug}`,
    );
  }
  if ("components" in raw) {
    if (!isObject(raw.components))
      errors.push(`line ${line}: ${label}.components must be an object`);
    else {
      rejectUnknown(
        raw.components,
        Object.keys(COMPONENT_COLUMNS),
        `${label}.components`,
        line,
        errors,
      );
      const components: Components = {};
      for (const key of Object.keys(raw.components) as Array<
        keyof Components
      >) {
        if (!(key in COMPONENT_COLUMNS)) continue;
        if (typeof raw.components[key] !== "boolean")
          errors.push(
            `line ${line}: ${label}.components.${key} must be a boolean`,
          );
        else components[key] = raw.components[key] as boolean;
      }
      if (!Object.keys(components).length)
        errors.push(`line ${line}: ${label}.components must not be empty`);
      fields.components = components;
    }
  }
  return fields;
}

export function validateUpdateSpellShape(
  value: PatchOperation,
  line: number,
  errors: string[],
) {
  if (value.op !== "updateSpell") {
    errors.push(`line ${line}: expected updateSpell operation`);
    return {
      spellId: undefined,
      fields: {},
      expected: undefined,
      classLevels: [],
      descriptors: undefined,
      expectedDescriptors: undefined,
    };
  }
  rejectUnknown(
    value as unknown as Record<string, unknown>,
    ["op", "id", "source", "spell", "expected", "levels", "descriptors"],
    "updateSpell",
    line,
    errors,
  );
  if (value.source !== undefined) {
    if (!isObject(value.source))
      errors.push(`line ${line}: source must be an object`);
    else rejectUnknown(value.source, ["provenance"], "source", line, errors);
  }
  const spellId = asInteger(value.id);
  if (spellId === undefined || spellId <= 0)
    errors.push(`line ${line}: id must be a positive integer`);
  const fields =
    value.spell === undefined
      ? {}
      : parseUpdateFields(
          value.spell,
          "spell update",
          line,
          errors,
          false,
          value.expected !== undefined,
        );
  if ("description" in fields !== "descriptionHtml" in fields) {
    errors.push(
      `line ${line}: spell.description and spell.descriptionHtml must be updated together`,
    );
  }
  const parseDescriptors = (raw: unknown, label: string) => {
    if (
      !Array.isArray(raw) ||
      raw.some((item) => typeof item !== "string" || !item.trim())
    ) {
      errors.push(
        `line ${line}: ${label} must be an array of non-empty descriptor names`,
      );
      return [];
    }
    const names = raw.map((item) => item.trim() as string);
    if (new Set(names.map(normalizeLookup)).size !== names.length)
      errors.push(`line ${line}: duplicate ${label} descriptor`);
    return names;
  };
  const descriptors =
    value.descriptors === undefined
      ? undefined
      : parseDescriptors(value.descriptors, "descriptors");
  let expectedDescriptors: string[] | undefined;
  let expected: SpellUpdateFields | undefined;
  if (value.expected !== undefined) {
    if (!isObject(value.expected))
      errors.push(`line ${line}: expected must be an object`);
    else {
      rejectUnknown(
        value.expected,
        ["spell", "descriptors"],
        "expected",
        line,
        errors,
      );
      if (value.expected.descriptors !== undefined)
        expectedDescriptors = parseDescriptors(
          value.expected.descriptors,
          "expected.descriptors",
        );
      if (value.expected.spell !== undefined)
        expected = parseUpdateFields(
          value.expected.spell,
          "expected.spell",
          line,
          errors,
          true,
        );
    }
  }
  if (descriptors !== undefined && expectedDescriptors === undefined)
    errors.push(
      `line ${line}: expected.descriptors is required for this update`,
    );
  if (expectedDescriptors !== undefined && descriptors === undefined)
    errors.push(
      `line ${line}: expected.descriptors has no corresponding update`,
    );
  const legacy = ["slug", "extraComponents", "description", "descriptionHtml"];
  for (const key of Object.keys(fields) as Array<keyof SpellUpdateFields>) {
    if (
      !legacy.includes(key) ||
      value.expected !== undefined ||
      (key === "extraComponents" && !fields.extraComponents)
    ) {
      if (!(key in (expected ?? {})))
        errors.push(
          `line ${line}: expected.spell.${key} is required for this update`,
        );
      if (key === "components") {
        for (const component of Object.keys(fields.components ?? {}) as Array<
          keyof Components
        >) {
          if (!(component in (expected?.components ?? {})))
            errors.push(
              `line ${line}: expected.spell.components.${component} is required for this update`,
            );
        }
      }
    }
  }
  for (const key of Object.keys(expected ?? {}) as Array<
    keyof SpellUpdateFields
  >) {
    if (!(key in fields))
      errors.push(
        `line ${line}: expected.spell.${key} has no corresponding update`,
      );
    if (key === "components")
      for (const component of Object.keys(expected?.components ?? {})) {
        if (!(component in (fields.components ?? {})))
          errors.push(
            `line ${line}: expected component ${component} has no corresponding update`,
          );
      }
  }
  const classLevels: ClassLevelUpdate[] = [];
  if (value.levels !== undefined) {
    if (!isObject(value.levels))
      errors.push(`line ${line}: levels must be an object`);
    else {
      rejectUnknown(value.levels, ["classes"], "levels", line, errors);
      if (!Array.isArray(value.levels.classes) || !value.levels.classes.length)
        errors.push(`line ${line}: levels.classes must be a non-empty array`);
      else
        for (const [index, item] of value.levels.classes.entries()) {
          const label = `levels.classes[${index}]`;
          if (!isObject(item)) {
            errors.push(`line ${line}: ${label} must be an object`);
            continue;
          }
          rejectUnknown(
            item,
            ["class", "extra", "level", "expectedLevel"],
            label,
            line,
            errors,
          );
          const className = asString(item.class);
          const level = asInteger(item.level),
            expectedLevel = asInteger(item.expectedLevel);
          if (!className)
            errors.push(`line ${line}: ${label}.class is required`);
          if (item.extra !== undefined && typeof item.extra !== "string")
            errors.push(`line ${line}: ${label}.extra must be a string`);
          for (const [key, n] of [
            ["level", level],
            ["expectedLevel", expectedLevel],
          ] as const) {
            if (
              !(key === "expectedLevel" && item.expectedLevel === null) &&
              (n === undefined || n < 0 || n > 9)
            )
              errors.push(`line ${line}: ${label}.${key} must be 0..9`);
          }
          if (
            className &&
            level !== undefined &&
            (expectedLevel !== undefined || item.expectedLevel === null)
          )
            classLevels.push({
              class: className,
              extra: item.extra ?? "",
              level,
              expectedLevel:
                item.expectedLevel === null ? null : expectedLevel!,
            });
        }
    }
  }
  if (
    !Object.keys(fields).length &&
    !classLevels.length &&
    descriptors === undefined
  )
    errors.push(
      `line ${line}: at least one spell update field or class level is required`,
    );
  return {
    spellId,
    fields,
    expected,
    classLevels,
    descriptors,
    expectedDescriptors,
  };
}

export type ExistingSpellUpdateValues = SpellUpdateFields;

export function spellUpdateEntries(fields: SpellUpdateFields) {
  const entries: Array<{
    field: string;
    column: string;
    value: string | number | null;
  }> = [];
  for (const key of Object.keys(SPELL_UPDATE_COLUMNS) as Array<
    keyof typeof SPELL_UPDATE_COLUMNS
  >) {
    if (key in fields)
      entries.push({
        field: key,
        column: SPELL_UPDATE_COLUMNS[key],
        value: fields[key]!,
      });
  }
  for (const key of Object.keys(fields.components ?? {}) as Array<
    keyof Components
  >) {
    entries.push({
      field: `components.${key}`,
      column: COMPONENT_COLUMNS[key],
      value: fields.components![key] ? 1 : 0,
    });
  }
  return entries;
}

export function isSpellUpdateNoop(
  fields: SpellUpdateFields,
  existing: ExistingSpellUpdateValues,
) {
  const updates = spellUpdateEntries(fields);
  const values = new Map(
    spellUpdateEntries(existing).map((item) => [item.field, item.value]),
  );
  return (
    updates.length > 0 &&
    updates.every((item) => values.get(item.field) === item.value)
  );
}
