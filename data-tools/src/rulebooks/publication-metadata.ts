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
