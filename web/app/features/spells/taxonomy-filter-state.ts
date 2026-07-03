import type { SpellTaxonomyFilterIds } from "@dnd/contracts";
import { normalizeIds, parseIdList, setOrDelete } from "~/lib/utils";

export const emptyTaxonomyFilters = (): SpellTaxonomyFilterIds => ({
  schoolIds: [],
  subschoolIds: [],
  descriptorIds: [],
});

function normalizePositiveIds(ids: number[]) {
  return normalizeIds(ids.filter((id) => Number.isInteger(id) && id > 0));
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
  };
}

export function normalizeTaxonomyFilters(
  filters: Partial<SpellTaxonomyFilterIds>,
): SpellTaxonomyFilterIds {
  return {
    schoolIds: normalizePositiveIds(filters.schoolIds ?? []),
    subschoolIds: normalizePositiveIds(filters.subschoolIds ?? []),
    descriptorIds: normalizePositiveIds(filters.descriptorIds ?? []),
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
}

export function hasTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length > 0 ||
    filters.subschoolIds.length > 0 ||
    filters.descriptorIds.length > 0
  );
}

export function countTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length +
    filters.subschoolIds.length +
    filters.descriptorIds.length
  );
}
