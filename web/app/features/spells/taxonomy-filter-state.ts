import {
  SPELL_COMPONENT_FILTER_KEYS,
  type SpellComponentFilterKey,
  type SpellComponentFilters,
  type SpellNormalizedFilterScope,
  type SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { normalizeIds, parseIdList, setOrDelete } from "~/lib/utils";

export const emptyTaxonomyFilters = (): SpellTaxonomyFilterIds => ({
  schoolIds: [],
  subschoolIds: [],
  descriptorIds: [],
  descriptorBuckets: [],
});

export const emptyComponentFilters = (): SpellComponentFilters => ({
  componentKeys: [],
});

export const emptyNormalizedFilters = (): SpellNormalizedFilterScope => ({
  ...emptyTaxonomyFilters(),
  ...emptyComponentFilters(),
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

function normalizeComponentKeys(
  values: string[] | undefined,
): SpellComponentFilterKey[] {
  const selected = new Set(
    (values ?? []).map((value) => value.trim().toLowerCase()),
  );
  return SPELL_COMPONENT_FILTER_KEYS.filter((key) => selected.has(key));
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

export function parseComponentFilters(
  params: URLSearchParams,
): SpellComponentFilters {
  return {
    componentKeys: normalizeComponentKeys(
      params.get("componentKeys")?.split(","),
    ),
  };
}

export function parseNormalizedFilters(
  params: URLSearchParams,
): SpellNormalizedFilterScope {
  return {
    ...parseTaxonomyFilters(params),
    ...parseComponentFilters(params),
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

export function normalizeComponentFilters(
  filters: Partial<SpellComponentFilters>,
): SpellComponentFilters {
  return {
    componentKeys: normalizeComponentKeys(filters.componentKeys),
  };
}

export function normalizeNormalizedFilters(
  filters: Partial<SpellNormalizedFilterScope>,
): SpellNormalizedFilterScope {
  return {
    ...normalizeTaxonomyFilters(filters),
    ...normalizeComponentFilters(filters),
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

export function setComponentFilterParams(
  params: URLSearchParams,
  filters: Partial<SpellComponentFilters>,
) {
  const normalized = normalizeComponentFilters(filters);
  setOrDelete(
    params,
    "componentKeys",
    normalized.componentKeys.length ? normalized.componentKeys.join(",") : null,
  );
}

export function setNormalizedFilterParams(
  params: URLSearchParams,
  filters: Partial<SpellNormalizedFilterScope>,
) {
  const normalized = normalizeNormalizedFilters(filters);
  setTaxonomyFilterParams(params, normalized);
  setComponentFilterParams(params, normalized);
}

export function hasTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length > 0 ||
    filters.subschoolIds.length > 0 ||
    filters.descriptorIds.length > 0 ||
    filters.descriptorBuckets.length > 0
  );
}

export function hasComponentFilters(filters: SpellComponentFilters) {
  return filters.componentKeys.length > 0;
}

export function hasNormalizedFilters(filters: SpellNormalizedFilterScope) {
  return hasTaxonomyFilters(filters) || hasComponentFilters(filters);
}

export function countTaxonomyFilters(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length +
    filters.subschoolIds.length +
    filters.descriptorIds.length +
    filters.descriptorBuckets.length
  );
}

export function countComponentFilters(filters: SpellComponentFilters) {
  return filters.componentKeys.length;
}

export function countNormalizedFilters(filters: SpellNormalizedFilterScope) {
  return countTaxonomyFilters(filters) + countComponentFilters(filters);
}
