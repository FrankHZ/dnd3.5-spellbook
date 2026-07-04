import type { SpellTaxonomyFilterIds } from "@dnd/contracts";
import { normalizeIds, parseIdList, setOrDelete } from "~/lib/utils";

export const emptyTaxonomyFilters = (): SpellTaxonomyFilterIds => ({
  schoolIds: [],
  subschoolIds: [],
  descriptorIds: [],
  descriptorBuckets: [],
});

function normalizePositiveIds(ids: number[]) {
  return normalizeIds(ids.filter((id) => Number.isInteger(id) && id > 0));
}

function normalizeDescriptorBuckets(values: string[] | undefined) {
  const allowed = new Set(["other"]);
  return Array.from(
    new Set((values ?? []).map((value) => value.trim().toLowerCase())),
  )
    .filter((value) => allowed.has(value))
    .sort() as SpellTaxonomyFilterIds["descriptorBuckets"];
}

export function parseTaxonomyFilters(
  params: URLSearchParams,
): SpellTaxonomyFilterIds {
  return {
    schoolIds: normalizePositiveIds(parseIdList(params.get("schoolIds"))),
    subschoolIds: normalizePositiveIds(parseIdList(params.get("subschoolIds"))),
    descriptorIds: normalizePositiveIds(
      parseIdList(params.get("descriptorIds")),
    ),
    descriptorBuckets: normalizeDescriptorBuckets(
      params.get("descriptorBuckets")?.split(","),
    ),
  };
}

export function normalizeTaxonomyFilters(
  filters: Partial<SpellTaxonomyFilterIds>,
): SpellTaxonomyFilterIds {
  return {
    schoolIds: normalizePositiveIds(filters.schoolIds ?? []),
    subschoolIds: normalizePositiveIds(filters.subschoolIds ?? []),
    descriptorIds: normalizePositiveIds(filters.descriptorIds ?? []),
    descriptorBuckets: normalizeDescriptorBuckets(filters.descriptorBuckets),
  };
}

export function setTaxonomyFilterParams(
  params: URLSearchParams,
  filters: Partial<SpellTaxonomyFilterIds>,
) {
  const normalized = normalizeTaxonomyFilters(filters);
  setOrDelete(
    params,
    "schoolIds",
    normalized.schoolIds.length ? normalized.schoolIds.join(",") : null,
  );
  setOrDelete(
    params,
    "subschoolIds",
    normalized.subschoolIds.length ? normalized.subschoolIds.join(",") : null,
  );
  setOrDelete(
    params,
    "descriptorIds",
    normalized.descriptorIds.length ? normalized.descriptorIds.join(",") : null,
  );
  setOrDelete(
    params,
    "descriptorBuckets",
    normalized.descriptorBuckets.length
      ? normalized.descriptorBuckets.join(",")
      : null,
  );
}

export function hasTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length > 0 ||
    filters.subschoolIds.length > 0 ||
    filters.descriptorIds.length > 0 ||
    filters.descriptorBuckets.length > 0
  );
}

export function countTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length +
    filters.subschoolIds.length +
    filters.descriptorIds.length +
    filters.descriptorBuckets.length
  );
}
