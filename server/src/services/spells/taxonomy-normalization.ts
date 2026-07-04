import type { SpellDescriptorBucketKey } from "@dnd/contracts";

const SCHOOL_QUERY_ID_EXPANSIONS: Record<number, number[]> = {
  1: [16],
  2: [10, 12],
  3: [13, 15],
  5: [10, 11, 13, 14, 16],
  6: [12],
  7: [11, 14, 15],
};

const SUBSCHOOL_QUERY_ID_EXPANSIONS: Record<number, number[]> = {
  2: [20],
  3: [20],
  7: [21],
  12: [21],
};

const DESCRIPTOR_QUERY_ID_EXPANSIONS: Record<SpellDescriptorBucketKey, number[]> = {
  other: [22, 23, 35, 37, 38, 39, 40, 43, 44],
};

export const COMBINED_SCHOOL_IDS = new Set(
  Object.values(SCHOOL_QUERY_ID_EXPANSIONS).flat(),
);

export const COMBINED_SUBSCHOOL_IDS = new Set(
  Object.values(SUBSCHOOL_QUERY_ID_EXPANSIONS).flat(),
);

export const OTHER_DESCRIPTOR_BUCKET: SpellDescriptorBucketKey = "other";

export const OTHER_DESCRIPTOR_LEGACY_IDS = new Set(
  DESCRIPTOR_QUERY_ID_EXPANSIONS[OTHER_DESCRIPTOR_BUCKET],
);

export const OTHER_DESCRIPTOR_VOCABULARY = {
  facetType: "descriptor" as const,
  key: "other",
  slug: "other",
  name: "Other",
  bucketKey: OTHER_DESCRIPTOR_BUCKET,
  queryParam: "descriptorBuckets" as const,
  queryValue: OTHER_DESCRIPTOR_BUCKET,
};

export function expandSchoolFilterIds(ids: number[]) {
  return expandTaxonomyIds(ids, SCHOOL_QUERY_ID_EXPANSIONS);
}

export function expandSubschoolFilterIds(ids: number[]) {
  return expandTaxonomyIds(ids, SUBSCHOOL_QUERY_ID_EXPANSIONS);
}

export function expandDescriptorBucketFilterIds(
  buckets: SpellDescriptorBucketKey[],
) {
  return Array.from(
    new Set(
      buckets.flatMap((bucket) => DESCRIPTOR_QUERY_ID_EXPANSIONS[bucket] ?? []),
    ),
  ).sort((a, b) => a - b);
}

export function isCombinedTaxonomyFacet(
  facetType: "school" | "subschool" | "descriptor",
  legacyFacetId: number | null,
) {
  if (legacyFacetId === null) return false;
  if (facetType === "school") return COMBINED_SCHOOL_IDS.has(legacyFacetId);
  if (facetType === "subschool") {
    return COMBINED_SUBSCHOOL_IDS.has(legacyFacetId);
  }
  return false;
}

export function isOtherDescriptorFacet(input: {
  facetType: "school" | "subschool" | "descriptor";
  legacyFacetId: number | null;
  key?: string | null | undefined;
}) {
  if (input.facetType !== "descriptor") return false;
  if (
    input.legacyFacetId !== null &&
    OTHER_DESCRIPTOR_LEGACY_IDS.has(input.legacyFacetId)
  ) {
    return true;
  }
  return input.key === "other" || input.key?.startsWith("see-text") === true;
}

function expandTaxonomyIds(
  ids: number[],
  expansions: Record<number, number[]>,
) {
  return Array.from(
    new Set(ids.flatMap((id) => [id, ...(expansions[id] ?? [])])),
  ).sort((a, b) => a - b);
}
