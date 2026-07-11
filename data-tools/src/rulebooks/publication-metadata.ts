export const PUBLICATION_CATEGORIES = [
  "core",
  "supplement",
  "setting",
  "magazine",
  "other",
] as const;

export const PUBLICATION_SOURCE_KINDS = [
  "rulebook",
  "magazine",
  "web",
  "other",
] as const;

export const PUBLICATION_REVIEW_STATUSES = [
  "accepted",
  "review",
  "deferred",
] as const;

export type PublicationCategory = (typeof PUBLICATION_CATEGORIES)[number];
export type PublicationSourceKind = (typeof PUBLICATION_SOURCE_KINDS)[number];
export type PublicationReviewStatus =
  (typeof PUBLICATION_REVIEW_STATUSES)[number];

export type RulebookPublicationMetadataInput = {
  id: number;
  name: string;
  abbr: string;
  slug: string;
  editionSlug?: string | null;
  editionCore?: boolean | number | null;
};

export type RulebookPublicationMetadataOverride = {
  category?: PublicationCategory | null | undefined;
  family?: string | null | undefined;
  sourceKind?: PublicationSourceKind | null | undefined;
  displayOrder?: number | null | undefined;
  reviewStatus?: PublicationReviewStatus | null | undefined;
};

export type RulebookPublicationMetadata = {
  category: PublicationCategory;
  family: string;
  sourceKind: PublicationSourceKind;
  displayOrder: number;
  reviewStatus: PublicationReviewStatus;
};

export type RulebookPublicationMetadataJsonlRow = {
  schemaVersion: 1;
  legacyRulebookId: number;
  source: string;
  name: string;
  abbr: string;
  displayAbbr?: string | undefined;
  zhName?: string | undefined;
  category: PublicationCategory;
  family: string;
  sourceKind: PublicationSourceKind;
  displayOrder: number;
  year?: string | null | undefined;
  published?: string | null | undefined;
  officialUrl?: string | null | undefined;
  image?: string | null | undefined;
  isbn10?: string | null | undefined;
  isbn13?: string | null | undefined;
  metadataSources?: string[] | undefined;
  reviewStatus: PublicationReviewStatus;
};

const CATEGORY_ORDER: Record<PublicationCategory, number> = {
  core: 10_000,
  supplement: 20_000,
  setting: 30_000,
  magazine: 40_000,
  other: 90_000,
};

export function deriveRulebookPublicationMetadata(
  input: RulebookPublicationMetadataInput,
  override: RulebookPublicationMetadataOverride = {},
): RulebookPublicationMetadata {
  const base = classifyRulebookPublication(input);
  const category = override.category ?? base.category;
  const family = cleanFamily(override.family) ?? base.family;
  const sourceKind = override.sourceKind ?? base.sourceKind;
  const displayOrder =
    override.displayOrder ?? CATEGORY_ORDER[category] + input.id;

  return {
    category,
    family,
    sourceKind,
    displayOrder,
    reviewStatus: override.reviewStatus ?? base.reviewStatus,
  };
}

export function isPublicationCategory(
  value: string,
): value is PublicationCategory {
  return (PUBLICATION_CATEGORIES as readonly string[]).includes(value);
}

export function isPublicationSourceKind(
  value: string,
): value is PublicationSourceKind {
  return (PUBLICATION_SOURCE_KINDS as readonly string[]).includes(value);
}

export function isPublicationReviewStatus(
  value: string,
): value is PublicationReviewStatus {
  return (PUBLICATION_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function readRulebookPublicationMetadataJsonlText(
  text: string,
  source = "rulebook-publications.jsonl",
) {
  const rows: RulebookPublicationMetadataJsonlRow[] = [];
  const errors: string[] = [];
  const seenIds = new Set<number>();

  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      errors.push(`${source}:${lineNumber}: invalid JSON`);
      return;
    }
    if (!isRecord(parsed)) {
      errors.push(`${source}:${lineNumber}: row must be a JSON object`);
      return;
    }

    const schemaVersion = parsed.schemaVersion;
    const legacyRulebookId = asPositiveInteger(parsed.legacyRulebookId);
    const rowSource = asNonEmptyString(parsed.source);
    const name = asNonEmptyString(parsed.name);
    const abbr = asNonEmptyString(parsed.abbr);
    const displayAbbr = asOptionalString(parsed.displayAbbr);
    const zhName = asOptionalString(parsed.zhName);
    const category = asOptionalString(parsed.category);
    const family = asNonEmptyString(parsed.family);
    const sourceKind = asOptionalString(parsed.sourceKind);
    const displayOrder = asNonNegativeInteger(parsed.displayOrder);
    const year = asNullableYear(parsed.year);
    const published = asNullableDate(parsed.published);
    const officialUrl = asOptionalString(parsed.officialUrl);
    const image = asOptionalString(parsed.image);
    const isbn10 = asNullableIsbn10(parsed.isbn10);
    const isbn13 = asNullableIsbn13(parsed.isbn13);
    const metadataSources = asOptionalUrlList(parsed.metadataSources);
    const reviewStatus = asOptionalString(parsed.reviewStatus);
    const validCategory =
      category && isPublicationCategory(category) ? category : undefined;
    const validSourceKind =
      sourceKind && isPublicationSourceKind(sourceKind) ? sourceKind : undefined;
    const validReviewStatus =
      reviewStatus && isPublicationReviewStatus(reviewStatus)
        ? reviewStatus
        : undefined;

    if (schemaVersion !== 1) {
      errors.push(`${source}:${lineNumber}: schemaVersion must be 1`);
    }
    if (legacyRulebookId === null) {
      errors.push(`${source}:${lineNumber}: legacyRulebookId must be positive`);
    }
    if (!rowSource) errors.push(`${source}:${lineNumber}: source is required`);
    if (!name) errors.push(`${source}:${lineNumber}: name is required`);
    if (!abbr) errors.push(`${source}:${lineNumber}: abbr is required`);
    if (!validCategory) errors.push(`${source}:${lineNumber}: category is invalid`);
    if (!family) errors.push(`${source}:${lineNumber}: family is required`);
    if (!validSourceKind) {
      errors.push(`${source}:${lineNumber}: sourceKind is invalid`);
    }
    if (displayOrder === null) {
      errors.push(
        `${source}:${lineNumber}: displayOrder must be a non-negative integer`,
      );
    }
    if (parsed.year !== undefined && year === undefined) {
      errors.push(`${source}:${lineNumber}: year must be YYYY or null`);
    }
    if (parsed.published !== undefined && published === undefined) {
      errors.push(`${source}:${lineNumber}: published must be YYYY-MM-DD or null`);
    }
    if (parsed.isbn10 !== undefined && isbn10 === undefined) {
      errors.push(`${source}:${lineNumber}: isbn10 must be ISBN-10 or null`);
    }
    if (parsed.isbn13 !== undefined && isbn13 === undefined) {
      errors.push(`${source}:${lineNumber}: isbn13 must be ISBN-13 or null`);
    }
    if (parsed.metadataSources !== undefined && metadataSources === undefined) {
      errors.push(
        `${source}:${lineNumber}: metadataSources must be an array of HTTP URLs`,
      );
    }
    if (!validReviewStatus) {
      errors.push(`${source}:${lineNumber}: reviewStatus is invalid`);
    }

    if (
      schemaVersion !== 1 ||
      legacyRulebookId === null ||
      !rowSource ||
      !name ||
      !abbr ||
      !validCategory ||
      !family ||
      !validSourceKind ||
      displayOrder === null ||
      (parsed.year !== undefined && year === undefined) ||
      (parsed.published !== undefined && published === undefined) ||
      (parsed.isbn10 !== undefined && isbn10 === undefined) ||
      (parsed.isbn13 !== undefined && isbn13 === undefined) ||
      (parsed.metadataSources !== undefined && metadataSources === undefined) ||
      !validReviewStatus
    ) {
      return;
    }

    if (seenIds.has(legacyRulebookId)) {
      errors.push(
        `${source}:${lineNumber}: duplicate legacyRulebookId ${legacyRulebookId}`,
      );
      return;
    }
    seenIds.add(legacyRulebookId);

    rows.push({
      schemaVersion: 1,
      legacyRulebookId,
      source: rowSource,
      name,
      abbr,
      ...(displayAbbr ? { displayAbbr } : {}),
      ...(zhName ? { zhName } : {}),
      category: validCategory,
      family,
      sourceKind: validSourceKind,
      displayOrder,
      year,
      published,
      officialUrl,
      image,
      isbn10,
      isbn13,
      ...(metadataSources ? { metadataSources } : {}),
      reviewStatus: validReviewStatus,
    });
  });

  return { rows, errors };
}

function classifyRulebookPublication(
  input: RulebookPublicationMetadataInput,
): RulebookPublicationMetadata {
  const editionSlug = normalizeToken(input.editionSlug);
  const slug = normalizeToken(input.slug);
  const name = input.name.toLowerCase();
  const editionCore = input.editionCore === true || input.editionCore === 1;

  if (
    editionCore ||
    editionSlug === "core-35" ||
    slug === "players-handbook" ||
    slug === "dungeon-masters-guide" ||
    slug === "monster-manual"
  ) {
    return base(input, "core", "core", "rulebook");
  }

  if (
    editionSlug.includes("magazine") ||
    slug.includes("dragon-magazine") ||
    slug.includes("dungeon-magazine") ||
    name.includes("dragon magazine") ||
    name.includes("dungeon magazine") ||
    /^dr[0-9]+$/i.test(input.abbr)
  ) {
    return base(input, "magazine", "magazine", "magazine");
  }

  if (
    editionSlug.includes("forgotten-realms") ||
    slug.includes("forgotten-realms") ||
    slug.includes("faerun") ||
    name.includes("forgotten realms") ||
    name.includes("faerun")
  ) {
    return base(input, "setting", "forgotten-realms", "rulebook");
  }

  if (
    editionSlug.includes("eberron") ||
    slug.includes("eberron") ||
    name.includes("eberron")
  ) {
    return base(input, "setting", "eberron", "rulebook");
  }

  if (
    editionSlug.includes("dragonlance") ||
    slug.includes("dragonlance") ||
    name.includes("dragonlance")
  ) {
    return base(input, "setting", "dragonlance", "rulebook");
  }

  if (
    editionSlug.includes("supplement") ||
    editionSlug.includes("35") ||
    name.includes("complete ") ||
    name.includes("compendium") ||
    name.includes("handbook")
  ) {
    return base(input, "supplement", "supplemental", "rulebook");
  }

  return base(input, "other", "other", "rulebook");
}

function base(
  input: RulebookPublicationMetadataInput,
  category: PublicationCategory,
  family: string,
  sourceKind: PublicationSourceKind,
): RulebookPublicationMetadata {
  return {
    category,
    family,
    sourceKind,
    displayOrder: CATEGORY_ORDER[category] + input.id,
    reviewStatus: "accepted",
  };
}

function cleanFamily(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/['’]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function asNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  return asNonEmptyString(value);
}

function asNullableYear(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  const text = asNonEmptyString(value);
  if (!text) return null;
  return /^\d{4}$/.test(text) ? text : undefined;
}

function asNullableDate(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  const text = asNonEmptyString(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}

function asNullableIsbn10(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  const text = asNonEmptyString(value)?.replace(/-/g, "").toUpperCase();
  if (!text) return null;
  return /^\d{9}[\dX]$/.test(text) ? text : undefined;
}

function asNullableIsbn13(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  const text = asNonEmptyString(value)?.replace(/-/g, "");
  if (!text) return null;
  return /^\d{13}$/.test(text) ? text : undefined;
}

function asOptionalUrlList(value: unknown) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return undefined;
  const urls: string[] = [];
  for (const item of value) {
    const url = asNonEmptyString(item);
    if (!url || !/^https?:\/\/\S+$/i.test(url)) return undefined;
    urls.push(url);
  }
  return urls;
}
