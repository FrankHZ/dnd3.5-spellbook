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
  slug?: string;
  extraComponents?: string;
  description?: string;
  descriptionHtml?: string;
};

export type UpdateSpellOperation = {
  op: "updateSpell";
  id?: number;
  source?: {
    provenance?: string;
  };
  spell?: SpellUpdateFields;
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
): InsertSpellShape {
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
    };
  }

  const spellId = asInteger(value.id);
  if (spellId === undefined || spellId <= 0) {
    errors.push(`line ${line}: id must be a positive integer`);
  }

  if (!isObject(value.spell)) {
    errors.push(`line ${line}: spell update fields are required`);
    return { spellId, fields: {} };
  }

  const allowedFields = new Set([
    "slug",
    "extraComponents",
    "description",
    "descriptionHtml",
  ]);
  for (const field of Object.keys(value.spell)) {
    if (!allowedFields.has(field)) {
      errors.push(`line ${line}: unsupported spell update field: ${field}`);
    }
  }

  const fields: SpellUpdateFields = {};
  if ("slug" in value.spell) {
    const slug = asString(value.spell.slug);
    if (!slug) {
      errors.push(`line ${line}: spell.slug must be a non-empty string`);
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`line ${line}: spell.slug is not normalized: ${slug}`);
    } else {
      fields.slug = slug;
    }
  }

  if ("extraComponents" in value.spell) {
    const extraComponents = asString(value.spell.extraComponents);
    if (!extraComponents) {
      errors.push(
        `line ${line}: spell.extraComponents must be a non-empty string`,
      );
    } else {
      fields.extraComponents = extraComponents;
    }
  }

  if ("description" in value.spell) {
    const description = asString(value.spell.description);
    if (!description) {
      errors.push(`line ${line}: spell.description must be a non-empty string`);
    } else {
      fields.description = description;
    }
  }

  if ("descriptionHtml" in value.spell) {
    const descriptionHtml = asString(value.spell.descriptionHtml);
    if (!descriptionHtml) {
      errors.push(
        `line ${line}: spell.descriptionHtml must be a non-empty string`,
      );
    } else {
      fields.descriptionHtml = descriptionHtml;
    }
  }

  const hasDescription = "description" in value.spell;
  const hasDescriptionHtml = "descriptionHtml" in value.spell;
  if (hasDescription !== hasDescriptionHtml) {
    errors.push(
      `line ${line}: spell.description and spell.descriptionHtml must be updated together`,
    );
  }

  if (Object.keys(value.spell).length === 0) {
    errors.push(`line ${line}: at least one spell update field is required`);
  }

  return { spellId, fields };
}

export type ExistingSpellUpdateValues = {
  slug: string;
  extraComponents: string | null;
  description: string;
  descriptionHtml: string;
};

export function isSpellUpdateNoop(
  fields: SpellUpdateFields,
  existing: ExistingSpellUpdateValues,
) {
  const updates = Object.entries(fields) as Array<
    [keyof SpellUpdateFields, string]
  >;
  return (
    updates.length > 0 &&
    updates.every(([field, value]) => existing[field] === value)
  );
}
