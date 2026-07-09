import { asInteger, asOptionalString, asString, isObject } from "./spells-schema";

export type InsertRulebookOperation = {
  op: "insertRulebook";
  id?: number;
  dndEditionId?: number;
  rulebook?: {
    name?: string;
    abbr?: string;
    slug?: string;
    description?: string;
    year?: string | null;
    officialUrl?: string;
    image?: string | null;
    published?: string | null;
  };
  source?: {
    sourceLabel?: string;
    provenance?: string;
  };
};

export type RulebookPatchOperation = InsertRulebookOperation;

export type ParsedRulebookPatchOperation = {
  line: number;
  value: RulebookPatchOperation;
};

export type InsertRulebookShape = {
  id: number | undefined;
  dndEditionId: number | undefined;
  name: string | undefined;
  abbr: string | undefined;
  slug: string | undefined;
  description: string;
  year: string | null | undefined;
  officialUrl: string;
  image: string | null | undefined;
  published: string | null | undefined;
};

export function isInsertRulebook(value: unknown): value is InsertRulebookOperation {
  return isObject(value) && value.op === "insertRulebook";
}

export function parseRulebookPatchJsonlText(raw: string, errors: string[]) {
  const operations: ParsedRulebookPatchOperation[] = [];

  raw.split(/\r?\n/).forEach((line, index) => {
    const text = line.trim();
    if (!text) return;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (!isObject(parsed)) {
        errors.push(`line ${index + 1}: operation must be a JSON object`);
        return;
      }
      if (parsed.op !== "insertRulebook") {
        errors.push(
          `line ${index + 1}: unsupported operation ${String(parsed.op)}`,
        );
        return;
      }
      operations.push({
        line: index + 1,
        value: parsed as RulebookPatchOperation,
      });
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

export function validateInsertRulebookShape(
  value: InsertRulebookOperation,
  line: number,
  errors: string[],
): InsertRulebookShape {
  const id = asInteger(value.id);
  const dndEditionId = asInteger(value.dndEditionId);
  const rulebook = value.rulebook ?? {};
  const name = asString(rulebook.name);
  const abbr = asString(rulebook.abbr);
  const slug = asString(rulebook.slug);
  const description = asOptionalString(rulebook.description) ?? "";
  const year = asOptionalString(rulebook.year);
  const officialUrl = asOptionalString(rulebook.officialUrl) ?? "";
  const image = asOptionalString(rulebook.image);
  const published = asOptionalString(rulebook.published);

  if (id === undefined || id <= 0) {
    errors.push(`line ${line}: id must be a positive integer`);
  }
  if (dndEditionId === undefined || dndEditionId <= 0) {
    errors.push(`line ${line}: dndEditionId must be a positive integer`);
  }
  if (!name) errors.push(`line ${line}: rulebook.name is required`);
  if (!abbr) errors.push(`line ${line}: rulebook.abbr is required`);
  if (abbr && abbr.length > 7) {
    errors.push(`line ${line}: rulebook.abbr must be 7 characters or fewer`);
  }
  if (!slug) errors.push(`line ${line}: rulebook.slug is required`);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`line ${line}: rulebook.slug is not normalized: ${slug}`);
  }
  if (year !== null && year !== undefined && !/^\d{4}$/.test(year)) {
    errors.push(`line ${line}: rulebook.year must be a four-digit year`);
  }
  if (
    published !== null &&
    published !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(published)
  ) {
    errors.push(`line ${line}: rulebook.published must use YYYY-MM-DD`);
  }

  return {
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
  };
}
